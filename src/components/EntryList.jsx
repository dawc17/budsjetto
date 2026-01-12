import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useLanguage } from "../contexts/LanguageContext";

export default function EntryList({ currency, refreshTrigger }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const data = await invoke("get_all_entries");
      // Sort by date descending (most recent first)
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setEntries(data);
    } catch (error) {
      console.error("Failed to fetch entries:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [refreshTrigger]);

  const handleDelete = async (id) => {
    if (!confirm(t("entryList.confirmDelete"))) {
      return;
    }

    try {
      await invoke("delete_entry", { id });
      fetchEntries();
    } catch (error) {
      console.error("Failed to delete entry:", error);
    }
  };

  const formatCurrency = (amount) => {
    const symbol = currency === "EUR" ? "€" : "kr";
    return `${amount.toFixed(2)} ${symbol}`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return <div className="entry-list loading">{t("entryList.loading")}</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="entry-list empty">
        <p>{t("entryList.empty")}</p>
      </div>
    );
  }

  return (
    <div className="entry-list">
      <h3>{t("entryList.recentEntries")}</h3>
      <div className="entries">
        {entries.slice(0, 20).map((entry) => (
          <div key={entry.id} className={`entry-item ${entry.type}`}>
            <div className="entry-info">
              <div className="entry-header">
                <span className="entry-category">
                  {entry.type === "income" ? "💰" : "💸"}{" "}
                  {t(`entryForm.categories.${entry.category}`)}
                </span>
                <span className="entry-date">{formatDate(entry.date)}</span>
              </div>
              {entry.description && entry.description !== entry.category && (
                <div className="entry-description">{entry.description}</div>
              )}
            </div>
            <div className="entry-actions">
              <span
                className={`entry-amount ${
                  entry.type === "income" ? "positive" : "negative"
                }`}
              >
                {entry.type === "income" ? "+" : "-"}
                {formatCurrency(entry.amount)}
              </span>
              <button
                className="delete-btn"
                onClick={() => handleDelete(entry.id)}
                title="Delete entry"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
