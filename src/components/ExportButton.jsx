import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useLanguage } from "../contexts/LanguageContext";

export default function ExportButton() {
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState(null);
  const { t } = useLanguage();

  const handleExport = async () => {
    setExporting(true);
    setMessage(null);

    try {
      const filePath = await invoke("export_to_csv");
      setMessage({
        type: "success",
        text: t("export.success").replace("{path}", filePath),
      });

      // Clear message after 5 seconds
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error("Export failed:", error);
      setMessage({ type: "error", text: t("export.error") });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="export-section">
      <button
        className="export-btn"
        onClick={handleExport}
        disabled={exporting}
      >
        📥 {exporting ? t("export.exporting") : t("export.exportCSV")}
      </button>
      {message && (
        <div className={`export-message ${message.type}`}>{message.text}</div>
      )}
    </div>
  );
}
