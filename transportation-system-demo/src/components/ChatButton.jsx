import React, { useState, useContext } from 'react';
import { LanguageContext } from '../contexts/LanguageContext';
import translationService from '../services/translationService';
import './ChatButton.css';

function ChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [translatedMessage, setTranslatedMessage] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [apiError, setApiError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState(null);
  const { language, translations } = useContext(LanguageContext);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    setIsTranslating(true);
    setApiError('');
    try {
      const translated = await translateText(message, language);
      setTranslatedMessage(translated);
    } catch (error) {
      console.error('Translation error:', error);
      setApiError(error.message);
      setTranslatedMessage('');
    } finally {
      setIsTranslating(false);
    }
  };

  const translateText = async (text, targetLang) => {
    return await translationService.translate(text, 'en', targetLang);
  };

  const handleClear = () => {
    setMessage('');
    setTranslatedMessage('');
    setApiError('');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(translatedMessage);
  };

  const testConnection = async () => {
    const status = await translationService.testConnection();
    setConnectionStatus(status);
    console.log('Connection test result:', status);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button 
        className={`chat-button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={translations['translate_text'] || 'Translate Text'}
      >
        <i className={`fa-solid ${isOpen ? 'fa-times' : 'fa-comments'}`}></i>
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="chat-modal">
          <div className="chat-header">
            <h3>{translations['translate_text'] || 'Translate Text'}</h3>
            <button 
              className="close-button"
              onClick={() => setIsOpen(false)}
            >
              <i className="fa-solid fa-times"></i>
            </button>
          </div>
          
          <div className="chat-content">
            <p className="chat-description">
              {translations['translate_description'] || 'Enter your message and it will be translated to your preferred language'}
            </p>
            
            <div className="input-section">
              <label htmlFor="message-input">
                {translations['enter_text'] || 'Enter your text:'}
              </label>
              <textarea
                id="message-input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={translations['enter_text_placeholder'] || 'Type your message here...'}
                rows="3"
              />
              <div className="button-group">
                <button 
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isTranslating}
                  className="translate-btn"
                >
                  {isTranslating ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      {translations['translating'] || 'Translating...'}
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-language"></i>
                      {translations['translate'] || 'Translate'}
                    </>
                  )}
                </button>
                <button 
                  onClick={handleClear}
                  className="clear-btn"
                >
                  <i className="fa-solid fa-trash"></i>
                  {translations['clear'] || 'Clear'}
                </button>
              </div>
              
              {/* Connection Test Button */}
              <div className="connection-test">
                <button 
                  onClick={testConnection}
                  className="test-connection-btn"
                >
                  <i className="fa-solid fa-wifi"></i>
                  Test Connection
                </button>
              </div>
            </div>

            {connectionStatus && (
              <div className="connection-status">
                <div className={`status-message ${connectionStatus.success ? 'success' : 'error'}`}>
                  <i className={`fa-solid ${connectionStatus.success ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                  <div>
                    <strong>{connectionStatus.success ? 'Connected' : 'Connection Failed'}</strong>
                    <p>{connectionStatus.success ? connectionStatus.message : connectionStatus.error}</p>
                    {connectionStatus.suggestion && <p><em>{connectionStatus.suggestion}</em></p>}
                  </div>
                </div>
              </div>
            )}

            {apiError && (
              <div className="error-section">
                <div className="error-message">
                  <i className="fa-solid fa-exclamation-triangle"></i>
                  {apiError}
                </div>
              </div>
            )}

            {translatedMessage && (
              <div className="output-section">
                <label>
                  {translations['translated_text'] || 'Translated text:'}
                </label>
                <div className="translated-text">
                  {translatedMessage}
                </div>
                <button 
                  onClick={copyToClipboard}
                  className="copy-btn"
                >
                  <i className="fa-solid fa-copy"></i>
                  {translations['copy'] || 'Copy'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default ChatButton;
