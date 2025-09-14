import { getApiUrl, API_CONFIG } from '../config/api';

class TranslationService {
  async saveMessage(text) {
    const apiUrl = getApiUrl('/send');  // ✅ use /send instead of /messages
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
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
    const apiUrl = getApiUrl(`/messages?lang=${lang}`); // ✅ correct endpoint
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
