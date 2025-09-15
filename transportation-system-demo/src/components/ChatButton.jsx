import React, { useState, useContext, useEffect } from 'react';
import { LanguageContext } from '../contexts/LanguageContext';
import translationService from '../services/translationService';
import './ChatButton.css';

function ChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [apiError, setApiError] = useState('');
  const { language, translations } = useContext(LanguageContext);
  const [showOriginalMap, setShowOriginalMap] = useState({});
  const [liveTranslations, setLiveTranslations] = useState({});

  useEffect(() => {
    fetchMessages();
  }, [language]);

  const fetchMessages = async () => {
    try {
      const res = await translationService.getMessages(language);
      const fetched = Array.isArray(res) ? res : res.messages ? res.messages : [];
      const enhancedMessages = fetched.map(msg => {
        const liveTranslation = liveTranslations[msg.id];
        return {
          ...msg,
          translation: msg.translation && msg.translation !== msg.original 
            ? msg.translation 
            : liveTranslation || msg.original
        };
      });
      setMessages(enhancedMessages);
    } catch (error) {
      console.error('Fetch messages error:', error);
      setApiError(error.message);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const optimisticMsg = {
      id: Date.now().toString(),
      original: message,
      translation: null,
      timestamp: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setApiError('');
    setIsSending(true);

    try {
      const response = await translationService.saveMessage(message, language);
      if (response && response.message) {
        const messageId = response.message.id;
        const liveTranslation = response.message.translation;
        setLiveTranslations(prev => ({ ...prev, [messageId]: liveTranslation }));
        setMessages((prev) => 
          prev.map((msg) => 
            msg.id === optimisticMsg.id 
              ? { ...msg, translation: liveTranslation, pending: false }
              : msg
          )
        );
        setTimeout(() => fetchMessages(), 100);
      }
      setTimeout(() => fetchMessages(), 800);
    } catch (error) {
      console.error('Send error:', error);
      setApiError(error.message);
    } finally {
      setMessage('');
      setIsSending(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setMessage('');
    setApiError('');
    setLiveTranslations({});
  };

  const handleDeleteMessage = (id) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
    setShowOriginalMap(prev => {
      const newMap = { ...prev };
      delete newMap[id];
      return newMap;
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  // Helper to convert timestamp to PHT
  const formatPHT = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    // Add 8 hours for Philippine time
    const phtDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    return phtDate.toLocaleTimeString();
  };

  return (
    <>
      <button
        className={`chat-button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={translations['send_message'] || 'Send Message'}
      >
        <i className={`fa-solid ${isOpen ? 'fa-times' : 'fa-comments'}`}></i>
      </button>

      {isOpen && (
        <div className="chat-modal">
          <div className="chat-header">
            <h3>{translations['send_message'] || 'Send Message'}</h3>
            <button className="close-button" onClick={() => setIsOpen(false)}>
              <i className="fa-solid fa-times"></i>
            </button>
          </div>

          <div className="chat-content">
            <div className="messages-container">
              {messages.length === 0 && (
                <p className="no-messages">No messages yet.</p>
              )}
              {messages.map((msg) => {
                const showOriginal = showOriginalMap[msg.id] || false;
                const liveTranslation = liveTranslations[msg.id];
                const bestTranslation = msg.translation && msg.translation !== msg.original 
                  ? msg.translation 
                  : liveTranslation || msg.original;
                const displayText = showOriginal ? msg.original : bestTranslation;

                return (
                  <div key={msg.id} className={`message-box ${msg.pending ? 'pending' : 'saved'}`}>
                    <p>{displayText}</p>
                    <small>
                      {formatPHT(msg.timestamp)}
                      {msg.pending && ' (sending...)'}
                      {liveTranslation && !msg.translation && ' (live translation)'}
                    </small>
                    <div className="message-actions">
                      <button
                        onClick={() =>
                          setShowOriginalMap(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))
                        }
                      >
                        {showOriginal ? 'Show Translated' : 'Show Original'}
                      </button>
                      <button onClick={() => handleDeleteMessage(msg.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {apiError && (
              <div className="error-section">
                <div className="error-message">
                  <i className="fa-solid fa-exclamation-triangle"></i>
                  {apiError}
                </div>
              </div>
            )}

            <div className="input-section">
              <textarea
                id="message-input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  translations['enter_text_placeholder'] ||
                  'Type your message here...'
                }
                rows="3"
              />
              <div className="button-group">
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isSending}
                  className="send-btn"
                >
                  {isSending ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      {translations['sending'] || 'Sending...'}
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane"></i>
                      {translations['send'] || 'Send'}
                    </>
                  )}
                </button>
                <button onClick={handleClear} className="clear-btn">
                  <i className="fa-solid fa-trash"></i>
                  {translations['clear'] || 'Clear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatButton;
