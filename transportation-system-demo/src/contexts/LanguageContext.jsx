import React, { createContext, useState, useEffect } from 'react';

export const LanguageContext = createContext();

const languageFiles = {
  en: () => import('../../locales/en.json'),
  tl: () => import('../../locales/tl.json'),
  ceb: () => import('../../locales/ceb.json'),
  ilo: () => import('../../locales/ilo.json'),
  pag: () => import('../../locales/pag.json'),
  zh: () => import('../../locales/zh.json'),
  ja: () => import('../../locales/ja.json'),
  ko: () => import('../../locales/ko.json'),
};

export function LanguageProvider({ children }) {
  // Initialize language from localStorage or default to 'en'
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('selectedLanguage') || 'en';
  });
  const [translations, setTranslations] = useState({});

  useEffect(() => {
    languageFiles[language]()
      .then(module => setTranslations(module.default))
      .catch(() => setTranslations({}));
  }, [language]);

  // Function to update language and persist to localStorage
  const updateLanguage = (newLanguage) => {
    setLanguage(newLanguage);
    localStorage.setItem('selectedLanguage', newLanguage);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: updateLanguage, translations }}>
      {children}
    </LanguageContext.Provider>
  );
}