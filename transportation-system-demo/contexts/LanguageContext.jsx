import React, { createContext, useState, useEffect } from 'react';

export const LanguageContext = createContext();

const languageFiles = {
  en: () => import('../../../locales/en.json'),
  tl: () => import('../../../locales/tl.json'),
  ceb: () => import('../../../locales/ceb.json'),
  ilo: () => import('../../../locales/ilo.json'),
  pag: () => import('../../../locales/pag.json'),
  zh: () => import('../../../locales/zh.json'),
  ja: () => import('../../../locales/ja.json'),
  ko: () => import('../../../locales/ko.json'),
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');
  const [translations, setTranslations] = useState({});

  useEffect(() => {
    languageFiles[language]()
      .then(module => setTranslations(module.default))
      .catch(() => setTranslations({}));
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translations }}>
      {children}
    </LanguageContext.Provider>
  );
}