from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline
from datetime import datetime
from langdetect import detect, DetectorFactory
from pymongo import MongoClient
from bson import ObjectId
import threading
import os
import asyncio
from concurrent.futures import ThreadPoolExecutor
import functools
from typing import Optional, Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DetectorFactory.seed = 0

app = FastAPI(title="GabayLakbay Translation Microservice")

# MongoDB setup
mongodb_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017/")
client = MongoClient(mongodb_url)
db = client["gabaylakbay"]
messages_raw = db["messages_raw"]
messages_translated = db["messages_translated"]

# Create indexes for better query performance
try:
    messages_raw.create_index([("timestamp", -1)])
    messages_translated.create_index([("message_id", 1)])
    logger.info("Database indexes created successfully")
except Exception as e:
    logger.warning(f"Index creation failed: {e}")

# CORS
cors_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://72.60.194.243:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPPORTED_LANGS = ["en", "fil", "ceb", "ilo", "pag", "zh", "ja", "ko"]

# Optimized model loading with priorities
PRIORITY_MODELS = {
    ("en", "fil"): "facebook/nllb-200-distilled-600M",
    ("fil", "en"): "facebook/nllb-200-distilled-600M",
    ("en", "ja"): "Helsinki-NLP/opus-mt-en-jap",
    ("ja", "en"): "Helsinki-NLP/opus-mt-jap-en",
    ("en", "zh"): "Helsinki-NLP/opus-mt-en-zh",
    ("zh", "en"): "Helsinki-NLP/opus-mt-zh-en",
}

SECONDARY_MODELS = {
    ("en", "ko"): "facebook/nllb-200-distilled-600M",
    ("ko", "en"): "facebook/nllb-200-distilled-600M",
    ("en", "pag"): "Helsinki-NLP/opus-mt-en-pag",
    ("pag", "en"): "Helsinki-NLP/opus-mt-pag-en",
    ("en", "ilo"): "Helsinki-NLP/opus-mt-en-ilo",
    ("ilo", "en"): "Helsinki-NLP/opus-mt-ilo-en",
    ("en", "ceb"): "Helsinki-NLP/opus-mt-en-ceb",
    ("ceb", "en"): "Helsinki-NLP/opus-mt-ceb-en",
}

MODEL_MAP = {**PRIORITY_MODELS, **SECONDARY_MODELS}

NLLB_LANG_CODES = {
    "en": "eng_Latn",
    "ko": "kor_Hang",
    "ja": "jpn_Jpan",
    "zh": "zho_Hans",
    "fil": "tgl_Latn",
    "ceb": "ceb_Latn",
    "ilo": "ilo_Latn",
    "pag": "pag_Latn",
}

# Global translator cache
TRANSLATORS = {}
PRELOAD_LOCK = threading.Lock()
PRELOADED = False

# Thread pool for translations
TRANSLATION_EXECUTOR = ThreadPoolExecutor(max_workers=4)

def preload_priority_models():
    """Preload most commonly used translation models at startup"""
    global PRELOADED
    with PRELOAD_LOCK:
        if PRELOADED:
            return
        
        logger.info("Preloading priority translation models...")
        for (src, tgt) in PRIORITY_MODELS.keys():
            try:
                get_translator(src, tgt)
                logger.info(f"✅ Preloaded {src} -> {tgt}")
            except Exception as e:
                logger.error(f"❌ Failed to preload {src} -> {tgt}: {e}")
        
        PRELOADED = True
        logger.info("Priority models preloading completed")

def get_translator(src_lang: str, tgt_lang: str):
    """Get cached translator with lazy loading"""
    cache_key = (src_lang, tgt_lang)
    
    if cache_key not in TRANSLATORS:
        model_name = MODEL_MAP.get(cache_key)
        if not model_name:
            return None
        
        logger.info(f"Loading model for {src_lang} -> {tgt_lang}: {model_name}")
        try:
            TRANSLATORS[cache_key] = pipeline(
                "translation", 
                model=model_name,
                device=-1,  # Use CPU for stability
                return_tensors="pt"
            )
        except Exception as e:
            logger.error(f"Failed to load model {model_name}: {e}")
            return None

    return TRANSLATORS[cache_key]

@functools.lru_cache(maxsize=1000)
def cached_language_detection(text: str) -> str:
    """Cache language detection results to avoid repeated computation"""
    try:
        detected = detect(text).lower()
        return "fil" if detected == "tl" else detected
    except Exception as e:
        logger.warning(f"Language detection failed: {e}")
        return "en"  # Default fallback

def run_translation_sync(text: str, src_lang: str, tgt_lang: str) -> Optional[str]:
    """Synchronous translation with error handling"""
    if src_lang == tgt_lang:
        return text
    
    translator = get_translator(src_lang, tgt_lang)
    if not translator:
        return None

    try:
        model_name = translator.model.config.name_or_path.lower()
        
        if "nllb" in model_name:
            src_code = NLLB_LANG_CODES.get(src_lang)
            tgt_code = NLLB_LANG_CODES.get(tgt_lang)
            
            if not src_code or not tgt_code:
                return None
            
            result = translator(text, src_lang=src_code, tgt_lang=tgt_code)
        else:
            result = translator(text)
        
        return result[0]["translation_text"]
    
    except Exception as e:
        logger.error(f"Translation error {src_lang}->{tgt_lang}: {e}")
        return None

async def run_translation_async(text: str, src_lang: str, tgt_lang: str) -> Optional[str]:
    """Async wrapper for translation"""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        TRANSLATION_EXECUTOR, 
        run_translation_sync, 
        text, 
        src_lang, 
        tgt_lang
    )

def get_immediate_translation(text: str, src_lang: str, target_lang: str) -> str:
    """Get immediate translation with fallbacks"""
    if src_lang == target_lang:
        return text
    
    # Try direct translation first
    result = run_translation_sync(text, src_lang, target_lang)
    if result:
        return result
    
    # Fallback via English for non-English pairs
    if src_lang != "en" and target_lang != "en":
        to_en = run_translation_sync(text, src_lang, "en")
        if to_en:
            from_en = run_translation_sync(to_en, "en", target_lang)
            if from_en:
                return from_en
    
    return text  # Return original if all translations fail

async def background_translate_all(message_id: str, text: str, src_lang: str, 
                                 immediate_lang: str, immediate_translation: str):
    """Background task to translate to all supported languages"""
    try:
        translations = {src_lang: text, immediate_lang: immediate_translation}
        
        # Translate to remaining languages
        for lang in SUPPORTED_LANGS:
            if lang in translations:
                continue
            
            result = await run_translation_async(text, src_lang, lang)
            if not result and src_lang != "en" and lang != "en":
                # Try via English
                to_en = await run_translation_async(text, src_lang, "en")
                if to_en:
                    result = await run_translation_async(to_en, "en", lang)
            
            translations[lang] = result or text

        # Store complete translations
        translated_doc = {
            "message_id": message_id,
            "translations": translations,
            "timestamp": datetime.utcnow(),
            "source_lang": src_lang
        }
        
        messages_translated.insert_one(translated_doc)
        logger.info(f"✅ Background translations completed for message {message_id}")
        
    except Exception as e:
        logger.error(f"❌ Background translation failed for {message_id}: {e}")

class MessageRequest(BaseModel):
    text: str
    target_lang: str = "en"

class MessageResponse(BaseModel):
    status: str
    message: Dict[str, Any]

@app.on_event("startup")
async def startup_event():
    """Preload models on startup"""
    asyncio.create_task(asyncio.to_thread(preload_priority_models))

@app.post("/send", response_model=MessageResponse)
async def send_message(req: MessageRequest, background_tasks: BackgroundTasks):
    """Send message with immediate translation and background processing"""
    try:
        # Fast language detection
        src_lang = cached_language_detection(req.text)
        
        # Store raw message immediately
        raw_doc = {
            "original": req.text,
            "source_lang": src_lang,
            "timestamp": datetime.utcnow()
        }
        inserted = messages_raw.insert_one(raw_doc)
        message_id = str(inserted.inserted_id)
        
        # Get immediate translation (blocking but optimized)
        immediate_translation = get_immediate_translation(
            req.text, src_lang, req.target_lang
        )
        
        # Schedule background translations
        background_tasks.add_task(
            background_translate_all,
            message_id,
            req.text,
            src_lang,
            req.target_lang,
            immediate_translation
        )
        
        return MessageResponse(
            status="success",
            message={
                "id": message_id,
                "original": req.text,
                "source_lang": src_lang,
                "translation": immediate_translation,
                "target_lang": req.target_lang,
                "timestamp": raw_doc["timestamp"].isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"Error in send_message: {e}")
        return MessageResponse(
            status="error",
            message={"error": str(e)}
        )

@app.get("/messages")
async def get_messages(lang: str = "en", limit: int = 50, skip: int = 0):
    """Get messages with pagination and caching"""
    try:
        # Use aggregation pipeline for better performance
        pipeline = [
            {"$sort": {"timestamp": -1}},
            {"$skip": skip},
            {"$limit": limit},
            {"$lookup": {
                "from": "messages_translated",
                "localField": "_id",
                "foreignField": "message_id",
                "as": "translated",
                "pipeline": [{"$project": {"translations": 1}}]
            }}
        ]
        
        cursor = messages_raw.aggregate(pipeline)
        results = []
        
        for msg in cursor:
            # Get translation from joined data
            translation_text = msg["original"]  # fallback
            if msg.get("translated"):
                translations = msg["translated"][0].get("translations", {})
                translation_text = translations.get(lang, msg["original"])
            
            results.append({
                "id": str(msg["_id"]),
                "original": msg["original"],
                "source_lang": msg.get("source_lang", "unknown"),
                "translation": translation_text,
                "target_lang": lang,
                "timestamp": msg["timestamp"].isoformat()
            })
        
        return {"messages": results, "count": len(results)}
        
    except Exception as e:
        logger.error(f"Error in get_messages: {e}")
        return {"error": str(e), "messages": []}

@app.get("/message/{message_id}")
async def get_single_message(message_id: str, lang: str = "en"):
    """Get single message with all available translations"""
    try:
        # Get raw message
        raw_msg = messages_raw.find_one({"_id": ObjectId(message_id)})
        if not raw_msg:
            return {"error": "Message not found"}
        
        # Get translations
        translated = messages_translated.find_one({"message_id": message_id})
        translations = translated.get("translations", {}) if translated else {}
        
        return {
            "id": message_id,
            "original": raw_msg["original"],
            "source_lang": raw_msg.get("source_lang", "unknown"),
            "translations": translations,
            "current_translation": translations.get(lang, raw_msg["original"]),
            "target_lang": lang,
            "timestamp": raw_msg["timestamp"].isoformat(),
            "translation_complete": bool(translated)
        }
        
    except Exception as e:
        logger.error(f"Error getting message {message_id}: {e}")
        return {"error": str(e)}

@app.get("/languages")
def get_languages():
    """Get supported languages"""
    return {
        "languages": SUPPORTED_LANGS,
        "priority_pairs": list(PRIORITY_MODELS.keys())
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "preloaded_models": len(TRANSLATORS),
        "supported_languages": len(SUPPORTED_LANGS),
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)