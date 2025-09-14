from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline
from datetime import datetime
from langdetect import detect, DetectorFactory
from pymongo import MongoClient
from bson import ObjectId
import threading

DetectorFactory.seed = 0

app = FastAPI(title="GabayLakbay Translation Microservice")

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # ✅ React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MongoDB setup ---
client = MongoClient("mongodb://localhost:27017/")
db = client["gabaylakbay"]
messages_raw = db["messages_raw"]          # ✅ immediate insert
messages_translated = db["messages_translated"]  # ✅ delayed translations

SUPPORTED_LANGS = ["en", "fil", "ceb", "ilo", "pag", "zh", "ja", "ko"]

MODEL_MAP = {
    ("en", "fil"): "Helsinki-NLP/opus-mt-en-tl",
    ("fil", "en"): "Helsinki-NLP/opus-mt-tl-en",
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

TRANSLATORS = {}
# --- Language code mappings for NLLB ---
NLLB_LANG_CODES = {
    "en": "eng_Latn",
    "ko": "kor_Hang",
    "ja": "jpn_Jpan",
    "zh": "zho_Hans",   # use "zho_Hant" if you want Traditional
    "fil": "tgl_Latn",  # closest available code for Filipino/Tagalog
    "ceb": "ceb_Latn",  # Cebuano
    "ilo": "ilo_Latn",  # Ilocano
    "pag": "pag_Latn",  # Pangasinan
}


def get_translator(src_lang: str, tgt_lang: str):
    """
    Loads (and caches) the appropriate translation pipeline.
    """
    if (src_lang, tgt_lang) not in MODEL_MAP:
        return None

    if (src_lang, tgt_lang) not in TRANSLATORS:
        model = MODEL_MAP[(src_lang, tgt_lang)]
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

        # Kick off translation in background thread
        def do_translations(message_id, text, src_lang):
            translations = {}
            for lang in SUPPORTED_LANGS:
                if lang == src_lang:
                    translations[lang] = text
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

        threading.Thread(
            target=do_translations, 
            args=(str(inserted.inserted_id), req.text, src_lang),
            daemon=True
        ).start()

        # ✅ Return immediately with raw message
        return {
            "status": "ok",
            "message": {
                "id": str(inserted.inserted_id),
                "original": raw_doc["original"],
                "source_lang": raw_doc["source_lang"],
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
        return {"error": str(e)}



@app.get("/languages")
def get_languages():
    return {"languages": SUPPORTED_LANGS}
