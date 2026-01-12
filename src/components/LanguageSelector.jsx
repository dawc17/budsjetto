import { useLanguage } from "../contexts/LanguageContext";

export default function LanguageSelector() {
  const { language, changeLanguage, t } = useLanguage();

  return (
    <div className="language-selector">
      <select
        value={language}
        onChange={(e) => changeLanguage(e.target.value)}
        className="lang-select"
      >
        <option value="en">🇬🇧 {t("languageSelector.en")}</option>
        <option value="no">🇳🇴 {t("languageSelector.no")}</option>
      </select>
    </div>
  );
}
