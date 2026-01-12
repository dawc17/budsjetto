import { createContext, useContext, useState, useEffect } from "react";
import en from "../locales/en.json";
import no from "../locales/no.json";

const translations = {
  en,
  no,
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState("en");

  // Load saved language preference on mount
  useEffect(() => {
    const savedLang = localStorage.getItem("budsjetto-lang");
    if (savedLang && translations[savedLang]) {
      setLanguage(savedLang);
    } else {
      // Simple browser language detection
      const browserLang = navigator.language.split("-")[0];
      if (translations[browserLang]) {
        setLanguage(browserLang);
      }
    }
  }, []);

  const changeLanguage = (lang) => {
    if (translations[lang]) {
      setLanguage(lang);
      localStorage.setItem("budsjetto-lang", lang);
    }
  };

  const t = (key) => {
    const keys = key.split(".");
    let value = translations[language];

    for (const k of keys) {
      if (value && value[k]) {
        value = value[k];
      } else {
        return key; // Fallback to key if not found
      }
    }
    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
