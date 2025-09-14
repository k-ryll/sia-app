import { getApiUrl, API_CONFIG } from '../config/api';

class TranslationService {
  // Map frontend language codes to backend language codes
  mapLanguageCode(frontendLang) {
    const mapping = {
      'tl': 'fil',  // Frontend uses 'tl' for Filipino, backend uses 'fil'
      'en': 'en',
      'ceb': 'ceb',
      'ilo': 'ilo',
      'pag': 'pag',
      'zh': 'zh',
      'ja': 'ja',
      'ko': 'ko'
    };
    return mapping[frontendLang] || 'en';
  }

  async saveMessage(text, targetLang = 'en') {
    const apiUrl = getApiUrl('/send');  // ✅ use /send instead of /messages
    const backendLang = this.mapLanguageCode(targetLang);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, target_lang: backendLang })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Save message error:', error);
      throw new Error(`Save message failed: ${error.message}`);
    }
  }

  async getMessages(lang = 'en') {
    const backendLang = this.mapLanguageCode(lang);
    const apiUrl = getApiUrl(`/messages?lang=${backendLang}`); // ✅ correct endpoint
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data.messages || []; // ✅ unwrap messages
    } catch (error) {
      console.error('Get messages error:', error);
      throw new Error(`Get messages failed: ${error.message}`);
    }
  }
}

export default new TranslationService();
