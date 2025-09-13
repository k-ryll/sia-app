import { getApiUrl, API_CONFIG } from '../config/api';

class TranslationService {
  async translate(text, fromLang = 'en', toLang) {
    if (fromLang === toLang) return text;

    const apiUrl = getApiUrl(API_CONFIG.ENDPOINTS.TRANSLATE);
    console.log('Attempting to translate:', { text, fromLang, toLang, apiUrl });

    try {
      let targetLang = toLang;
      if (targetLang === 'tl') targetLang = 'fil'; // normalize

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, target: targetLang }) // ✅ only "target"
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      return data.translated || text;
    } catch (error) {
      console.error('Translation API error:', error);
      throw new Error(`Translation failed: ${error.message}`);
    }
  }

  async getSupportedLanguages() {
    const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.LANGUAGES));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.languages || [];
  }

  async isAvailable() {
    try {
      const response = await fetch(getApiUrl('/'));
      return response.ok;
    } catch {
      return false;
    }
  }

  async testConnection() {
    try {
      const response = await fetch(getApiUrl('/'));
      const data = await response.json();
      return { success: true, status: response.status, message: data.message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new TranslationService();
