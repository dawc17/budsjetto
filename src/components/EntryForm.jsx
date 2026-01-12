import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useLanguage } from "../contexts/LanguageContext";

const CATEGORIES = {
  income: ["Salary", "Freelance", "Investment", "Gift", "Other"],
  expense: [
    "Food",
    "Transport",
    "Housing",
    "Utilities",
    "Entertainment",
    "Shopping",
    "Health",
    "Education",
    "Other",
  ],
};

export default function EntryForm({ currency, onEntryAdded }) {
  const [entryType, setEntryType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES.expense[0]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  const handleTypeChange = (type) => {
    setEntryType(type);
    setCategory(CATEGORIES[type][0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error(t("entryForm.error.invalidAmount"));
      }

      await invoke("add_entry", {
        entryType,
        amount: parsedAmount,
        category,
        date,
        description: description.trim() || category,
      });

      // Reset form
      setAmount("");
      setDescription("");
      setDate(new Date().toISOString().split("T")[0]);

      if (onEntryAdded) {
        onEntryAdded();
      }
    } catch (err) {
      setError(err.message || err.toString());
    } finally {
      setLoading(false);
    }
  };

  const currencySymbol = currency === "EUR" ? "€" : "kr";

  return (
    <div className="entry-form-container">
      <h3>{t("entryForm.addEntry")}</h3>
      <form className="entry-form" onSubmit={handleSubmit}>
        <div className="type-selector">
          <button
            type="button"
            className={`type-btn ${
              entryType === "income" ? "active income" : ""
            }`}
            onClick={() => handleTypeChange("income")}
          >
            💰 {t("entryForm.income")}
          </button>
          <button
            type="button"
            className={`type-btn ${
              entryType === "expense" ? "active expense" : ""
            }`}
            onClick={() => handleTypeChange("expense")}
          >
            💸 {t("entryForm.expense")}
          </button>
        </div>

        <div className="form-row">
          <label htmlFor="amount">
            {t("entryForm.amount")} ({currencySymbol})
          </label>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>

        <div className="form-row">
          <label htmlFor="category">{t("entryForm.category")}</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES[entryType].map((cat) => (
              <option key={cat} value={cat}>
                {t(`entryForm.categories.${cat}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label htmlFor="date">{t("entryForm.date")}</label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="form-row">
          <label htmlFor="description">
            {t("entryForm.descriptionOptional")}
          </label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("entryForm.descriptionPlaceholder")}
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? t("entryForm.adding") : t("entryForm.submit")}
        </button>
      </form>
    </div>
  );
}
