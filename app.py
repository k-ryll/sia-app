from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline
from datetime import datetime
from langdetect import detect, DetectorFactory

DetectorFactory.seed = 0

app = FastAPI(title="GabayLakbay Translation Microservice")

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for development, allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

def run_translation(text, src, tgt):
    if (src, tgt) in MODEL_MAP:
        if (src, tgt) not in TRANSLATORS:
            model = MODEL_MAP[(src, tgt)]
            print(f"Loading model for {src} -> {tgt}: {model}")
            TRANSLATORS[(src, tgt)] = pipeline("translation", model=model)
        translator = TRANSLATORS[(src, tgt)]
        return translator(text)[0]['translation_text']
    return None

class TranslationRequest(BaseModel):
    text: str
    target: str   # ✅ only "target"

@app.get("/")
def root():
    return {"message": "Translation microservice running."}

@app.post("/translate")
@app.post("/translate/")
def translate(req: TranslationRequest):
    try:
        src_lang = detect(req.text).lower()
        tgt_lang = req.target.lower()

        # --- normalize "tl" to "fil"
        if src_lang == "tl": src_lang = "fil"
        if tgt_lang == "tl": tgt_lang = "fil"

        if src_lang == tgt_lang:
            return {"original": req.text, "translated": req.text, "target_lang": tgt_lang}

        result = run_translation(req.text, src_lang, tgt_lang)

        if not result and src_lang != "en" and tgt_lang != "en":
            to_en = run_translation(req.text, src_lang, "en")
            if to_en:
                result = run_translation(to_en, "en", tgt_lang)

        if not result:
            return {"error": f"Unsupported language pair: {src_lang}-{tgt_lang}"}

        return {"original": req.text, "translated": result, "target_lang": tgt_lang}
    except Exception as e:
        return {"error": str(e)}

@app.get("/languages")
def get_languages():
    return {"languages": SUPPORTED_LANGS}
