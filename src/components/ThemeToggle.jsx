import { useLanguage } from "../contexts/LanguageContext";

export default function ThemeToggle({ darkMode, onToggle }) {
  const { t } = useLanguage();

  return (
    <button 
      className="theme-toggle" 
      onClick={onToggle}
      title={darkMode ? t("theme.lightMode") : t("theme.darkMode")}
    >
      {darkMode ? "☀️" : "🌙"}
    </button>
  );
}
