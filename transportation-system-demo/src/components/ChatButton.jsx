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
  const [connectionStatus, setConnectionStatus] = useState(null);
  const { language, translations } = useContext(LanguageContext);
  const [showOriginalMap, setShowOriginalMap] = useState({});
  const [liveTranslations, setLiveTranslations] = useState({}); // Store live translations as fallbacks

  // fetchMessages, handleSendMessage, etc...

  // Fetch messages whenever language changes
  useEffect(() => {
    fetchMessages();
  }, [language]);

  const fetchMessages = async () => {
    try {
      const res = await translationService.getMessages(language);

      // Handle both array and object responses
      const fetched =
        Array.isArray(res) ? res : res.messages ? res.messages : [];

      // Enhance messages with live translations as fallbacks
      const enhancedMessages = fetched.map(msg => {
        const liveTranslation = liveTranslations[msg.id];
        return {
          ...msg,
          // Use database translation if available and different from original,
          // otherwise use live translation as fallback
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

    // Optimistic UI update with backend-like shape
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
      
      // Store the live translation for this message
      if (response && response.message) {
        const messageId = response.message.id;
        const liveTranslation = response.message.translation;
        
        // Store live translation for fallback use
        setLiveTranslations(prev => ({
          ...prev,
          [messageId]: liveTranslation
        }));
        
        // Update the optimistic message with the immediate translation
        setMessages((prev) => 
          prev.map((msg) => 
            msg.id === optimisticMsg.id 
              ? { ...msg, translation: liveTranslation, pending: false }
              : msg
          )
        );
        
        // Refresh messages to apply live translation fallbacks
        setTimeout(() => {
          fetchMessages();
        }, 100);
      }

      // Allow backend to translate other languages before re-fetching
      setTimeout(() => {
        fetchMessages();
      }, 800);
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
    setLiveTranslations({}); // Clear live translations when clearing messages
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const testConnection = async () => {
    const status = await translationService.testConnection();
    setConnectionStatus(status);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        className={`chat-button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={translations['send_message'] || 'Send Message'}
      >
        <i className={`fa-solid ${isOpen ? 'fa-times' : 'fa-comments'}`}></i>
      </button>

      {/* Chat Modal */}
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
  
  // Determine the best translation to show
  const bestTranslation = msg.translation && msg.translation !== msg.original 
    ? msg.translation 
    : liveTranslation || msg.original;
  
  const displayText = showOriginal ? msg.original : bestTranslation;

  return (
    <div key={msg.id} className={`message-box ${msg.pending ? 'pending' : 'saved'}`}>
      <p>{displayText}</p>
      <small>
        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''} 
        {msg.pending && ' (sending...)'}
        {liveTranslation && !msg.translation && ' (live translation)'}
      </small>
      <button
        onClick={() =>
          setShowOriginalMap(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))
        }
      >
        {showOriginal ? 'Show Translated' : 'Show Original'}
      </button>
    </div>
  );
})}


            </div>

            {connectionStatus && (
              <div className="connection-status">
                <div
                  className={`status-message ${
                    connectionStatus.success ? 'success' : 'error'
                  }`}
                >
                  <i
                    className={`fa-solid ${
                      connectionStatus.success
                        ? 'fa-check-circle'
                        : 'fa-exclamation-circle'
                    }`}
                  ></i>
                  <div>
                    <strong>
                      {connectionStatus.success
                        ? 'Connected'
                        : 'Connection Failed'}
                    </strong>
                    <p>
                      {connectionStatus.success
                        ? connectionStatus.message
                        : connectionStatus.error}
                    </p>
                    {connectionStatus.suggestion && (
                      <p>
                        <em>{connectionStatus.suggestion}</em>
                      </p>
                    )}
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

            {/* Input Section */}
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
                <button
                  onClick={testConnection}
                  className="test-connection-btn"
                >
                  <i className="fa-solid fa-wifi"></i>
                  Test
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
