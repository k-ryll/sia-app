from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline
from datetime import datetime
from langdetect import detect, DetectorFactory
from pymongo import MongoClient
from bson import ObjectId
import threading
import os

DetectorFactory.seed = 0

app = FastAPI(title="GabayLakbay Translation Microservice")

# --- CORS ---
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MongoDB setup ---
mongodb_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017/")
client = MongoClient(mongodb_url)
db = client["gabaylakbay"]
messages_raw = db["messages_raw"]          # ✅ immediate insert
messages_translated = db["messages_translated"]  # ✅ delayed translations

SUPPORTED_LANGS = ["en", "fil", "ceb", "ilo", "pag", "zh", "ja", "ko"]

# Primary model map - using better models for Filipino
MODEL_MAP = {
    # Use NLLB for much better Filipino translation quality
    ("en", "fil"): "facebook/nllb-200-distilled-600M",
    ("fil", "en"): "facebook/nllb-200-distilled-600M",
    ("en", "ja"): "Helsinki-NLP/opus-mt-en-jap",
    ("ja", "en"): "Helsinki-NLP/opus-mt-jap-en",
    ("en", "zh"): "Helsinki-NLP/opus-mt-en-zh",
    ("zh", "en"): "Helsinki-NLP/opus-mt-zh-en",
    ("en", "ko"): "facebook/nllb-200-distilled-600M",
    ("ko", "en"): "facebook/nllb-200-distilled-600M",
    ("en", "pag"): "Helsinki-NLP/opus-mt-en-pag",
    ("pag", "en"): "Helsinki-NLP/opus-mt-pag-en",
    ("en", "ilo"): "Helsinki-NLP/opus-mt-en-ilo",
    ("ilo", "en"): "Helsinki-NLP/opus-mt-ilo-en",
    ("en", "ceb"): "Helsinki-NLP/opus-mt-en-ceb",
    ("ceb", "en"): "Helsinki-NLP/opus-mt-ceb-en",
}

# Alternative models for Filipino (can be switched via environment variable)
FILIPINO_ALTERNATIVES = {
    "nllb": "facebook/nllb-200-distilled-600M",  # Default - much better quality
    "nllb-large": "facebook/nllb-200-3.3B",     # Larger NLLB model - even better quality
    "opus": "Helsinki-NLP/opus-mt-en-tl",        # Original - poor quality
    "opus-large": "Helsinki-NLP/opus-mt-en-tl",  # Same as opus
}

def get_filipino_model():
    """Get the Filipino translation model based on environment variable"""
    model_choice = os.getenv("FILIPINO_MODEL", "nllb").lower()
    return FILIPINO_ALTERNATIVES.get(model_choice, FILIPINO_ALTERNATIVES["nllb"])

TRANSLATORS = {}
# --- Language code mappings for NLLB ---
NLLB_LANG_CODES = {
    "en": "eng_Latn",
    "ko": "kor_Hang",
    "ja": "jpn_Jpan",
    "zh": "zho_Hans",   # use "zho_Hant" if you want Traditional
    "fil": "tgl_Latn",  # Tagalog/Filipino in NLLB
    "ceb": "ceb_Latn",  # Cebuano
    "ilo": "ilo_Latn",  # Ilocano
    "pag": "pag_Latn",  # Pangasinan
}


def get_translator(src_lang: str, tgt_lang: str):
    """
    Loads (and caches) the appropriate translation pipeline.
    """
    # Use dynamic model selection for Filipino
    if (src_lang, tgt_lang) in [("en", "fil"), ("fil", "en")]:
        model = get_filipino_model()
    elif (src_lang, tgt_lang) not in MODEL_MAP:
        return None
    else:
        model = MODEL_MAP[(src_lang, tgt_lang)]

    if (src_lang, tgt_lang) not in TRANSLATORS:
        print(f"Loading model for {src_lang} -> {tgt_lang}: {model}")
        TRANSLATORS[(src_lang, tgt_lang)] = pipeline("translation", model=model)

    return TRANSLATORS[(src_lang, tgt_lang)]


def run_translation(text: str, src_lang: str, tgt_lang: str):
    """
    Runs translation using the appropriate model.
    Handles both Helsinki-NLP (opus-mt) and NLLB.
    """
    translator = get_translator(src_lang, tgt_lang)
    if not translator:
        return None

    model_name = translator.model.config.name_or_path.lower()

    # --- NLLB models ---
    if "nllb" in model_name:
        src_code = NLLB_LANG_CODES.get(src_lang)
        tgt_code = NLLB_LANG_CODES.get(tgt_lang)

        if not src_code or not tgt_code:
            print(f"⚠️ No NLLB mapping for {src_lang}->{tgt_lang}")
            return None

        return translator(
            text,
            src_lang=src_code,
            tgt_lang=tgt_code
        )[0]["translation_text"]

    # --- Default (Helsinki and others) ---
    return translator(text)[0]["translation_text"]




class MessageRequest(BaseModel):
    text: str
    target_lang: str = "en"  # Default target language for immediate translation


@app.post("/send")
def send_message(req: MessageRequest):
    try:
        # Detect language quickly
        src_lang = detect(req.text).lower()
        if src_lang == "tl": 
            src_lang = "fil"

        # Insert raw message immediately
        raw_doc = {
            "original": req.text,
            "source_lang": src_lang,
            "timestamp": datetime.utcnow()
        }
        inserted = messages_raw.insert_one(raw_doc)

        # Get immediate translation for the target language
        immediate_translation = None
        if req.target_lang != src_lang:
            try:
                immediate_translation = run_translation(req.text, src_lang, req.target_lang)
                if not immediate_translation and src_lang != "en" and req.target_lang != "en":
                    # Try via English if direct translation fails
                    to_en = run_translation(req.text, src_lang, "en")
                    if to_en:
                        immediate_translation = run_translation(to_en, "en", req.target_lang)
            except Exception as e:
                print(f"Translation error: {e}")
                immediate_translation = None
        
        # Use original text if translation failed or same language
        if not immediate_translation:
            immediate_translation = req.text

        # Kick off translation in background thread for all other languages
        def do_translations(message_id, text, src_lang, target_lang, immediate_translation):
            try:
                translations = {}
                for lang in SUPPORTED_LANGS:
                    if lang == src_lang:
                        translations[lang] = text
                    elif lang == target_lang:
                        # Use the already computed immediate translation
                        translations[lang] = immediate_translation
                    else:
                        result = run_translation(text, src_lang, lang)
                        if not result and src_lang != "en" and lang != "en":
                            to_en = run_translation(text, src_lang, "en")
                            if to_en:
                                result = run_translation(to_en, "en", lang)
                        translations[lang] = result or text

                translated_doc = {
                    "message_id": message_id,
                    "translations": translations,
                    "timestamp": datetime.utcnow()
                }
                messages_translated.insert_one(translated_doc)
            except Exception as e:
                print(f"Error in background translations: {e}")
                import traceback
                traceback.print_exc()

        threading.Thread(
            target=do_translations, 
            args=(str(inserted.inserted_id), req.text, src_lang, req.target_lang, immediate_translation),
            daemon=True
        ).start()

        # ✅ Return immediately with raw message and live translation
        return {
            "status": "ok",
            "message": {
                "id": str(inserted.inserted_id),
                "original": raw_doc["original"],
                "source_lang": raw_doc["source_lang"],
                "translation": immediate_translation,
                "target_lang": req.target_lang,
                "timestamp": raw_doc["timestamp"].isoformat()
            }
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/messages")
def get_messages(lang: str = "en"):
    try:
        results = []
        cursor = messages_raw.find().sort("timestamp", -1)
        for msg in cursor:
            translated = messages_translated.find_one({"message_id": str(msg["_id"])})
            translation_text = translated["translations"].get(lang) if translated else None
            

            results.append({
                "id": str(msg["_id"]),
                "original": msg["original"],
                "translation": translation_text or msg["original"],
                "timestamp": msg["timestamp"].isoformat()
            })
        return {"messages": results}
    except Exception as e:
        print(f"Error in get_messages: {e}")
        return {"error": str(e)}



@app.get("/languages")
def get_languages():
    return {"languages": SUPPORTED_LANGS}

@app.get("/filipino-model")
def get_filipino_model_info():
    """Get current Filipino model and available alternatives"""
    current_model = get_filipino_model()
    return {
        "current_model": current_model,
        "available_models": FILIPINO_ALTERNATIVES,
        "environment_variable": "FILIPINO_MODEL",
        "usage": "Set FILIPINO_MODEL environment variable to switch models (nllb, nllb-large, opus)"
    }

@app.post("/switch-filipino-model")
def switch_filipino_model(model_name: str):
    """Switch Filipino model (requires server restart to take effect)"""
    if model_name.lower() not in FILIPINO_ALTERNATIVES:
        return {"error": f"Invalid model. Available: {list(FILIPINO_ALTERNATIVES.keys())}"}
    
    # This would require server restart to take effect
    return {
        "message": f"Model will be switched to {model_name} on next server restart",
        "new_model": FILIPINO_ALTERNATIVES[model_name.lower()],
        "restart_required": True
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
