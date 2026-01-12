import { invoke } from "@tauri-apps/api/core";

export default function CurrencySelector({ currency, onCurrencyChange }) {
  const handleChange = async (newCurrency) => {
    try {
      await invoke("set_currency", { currency: newCurrency });
      onCurrencyChange(newCurrency);
    } catch (error) {
      console.error("Failed to set currency:", error);
    }
  };

  return (
    <div className="currency-selector">
      <button
        className={`currency-btn ${currency === "NOK" ? "active" : ""}`}
        onClick={() => handleChange("NOK")}
      >
        🇳🇴 NOK
      </button>
      <button
        className={`currency-btn ${currency === "EUR" ? "active" : ""}`}
        onClick={() => handleChange("EUR")}
      >
        🇪🇺 EUR
      </button>
    </div>
  );
}
