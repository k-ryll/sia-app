from fastapi import FastAPI
from pydantic import BaseModel
from transformers import pipeline

app = FastAPI()

# Load OPUS-MT models for Philippine languages
translator_en_tl = pipeline("translation", model="Helsinki-NLP/opus-mt-en-tl")
translator_tl_en = pipeline("translation", model="Helsinki-NLP/opus-mt-tl-en")
translator_en_ceb = pipeline("translation", model="Helsinki-NLP/opus-mt-en-ceb")
translator_en_ilo = pipeline("translation", model="Helsinki-NLP/opus-mt-en-ilo")
translator_en_pag = pipeline("translation", model="Helsinki-NLP/opus-mt-en-pag")

# Load MBART for international languages
translator_mbart = pipeline("translation", model="facebook/mbart-large-50-many-to-many-mmt")

# Language mapping
LANGUAGE_MAP = {
    "en": "en_XX",
    "tl": "tl",
    "ceb": "ceb",
    "ilo": "ilo",
    "pag": "pag",
    "zh": "zh_CN",
    "ja": "ja_XX",
    "ko": "ko_KR"
}

SUPPORTED_LANGUAGES = [
    {"code": "en", "name": "English"},
    {"code": "tl", "name": "Filipino / Tagalog"},
    {"code": "ceb", "name": "Cebuano / Bisaya"},
    {"code": "ilo", "name": "Ilocano"},
    {"code": "pag", "name": "Pangasinan"},
    {"code": "zh", "name": "Chinese"},
    {"code": "ja", "name": "Japanese"},
    {"code": "ko", "name": "Korean"}
]

class TranslationRequest(BaseModel):
    text: str
    from_lang: str
    to_lang: str

@app.get("/")
def read_root():
    return {"message": "Translation microservice is running!"}

@app.get("/languages")
def get_languages():
    return {"languages": SUPPORTED_LANGUAGES}

@app.post("/translate")
def translate(req: TranslationRequest):
    text = req.text
    from_lang = LANGUAGE_MAP.get(req.from_lang, req.from_lang)
    to_lang = LANGUAGE_MAP.get(req.to_lang, req.to_lang)

    # OPUS-MT routes
    if req.from_lang == "en" and req.to_lang == "tl":
        result = translator_en_tl(text)
    elif req.from_lang == "tl" and req.to_lang == "en":
        result = translator_tl_en(text)
    elif req.from_lang == "en" and req.to_lang == "ceb":
        result = translator_en_ceb(text)
    elif req.from_lang == "en" and req.to_lang == "ilo":
        result = translator_en_ilo(text)
    elif req.from_lang == "en" and req.to_lang == "pag":
        result = translator_en_pag(text)
    # MBART routes
    elif req.from_lang in ["en", "en_XX"] and to_lang in ["zh_CN", "ja_XX", "ko_KR"]:
        result = translator_mbart(text, src_lang="en_XX", tgt_lang=to_lang)
    elif from_lang in ["zh_CN", "ja_XX", "ko_KR"] and to_lang == "en_XX":
        result = translator_mbart(text, src_lang=from_lang, tgt_lang="en_XX")
    else:
        return {"error": f"Unsupported language pair: {req.from_lang}-{req.to_lang}"}

    return {
        "originalText": text,
        "translatedText": result[0]["translation_text"],
        "fromLanguage": req.from_lang,
        "toLanguage": req.to_lang
    }
