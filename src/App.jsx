import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { LanguageProvider, useLanguage } from "./contexts/LanguageContext";
import Dashboard from "./components/Dashboard";
import EntryForm from "./components/EntryForm";
import EntryList from "./components/EntryList";
import CurrencySelector from "./components/CurrencySelector";
import LanguageSelector from "./components/LanguageSelector";
import "./App.css";

function AppContent() {
  const [currency, setCurrency] = useState("NOK");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const initApp = async () => {
      try {
        // Load data from disk
        await invoke("load_data");
        // Get current currency setting
        const savedCurrency = await invoke("get_currency");
        setCurrency(savedCurrency);
      } catch (error) {
        console.error("Failed to initialize app:", error);
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  const handleEntryAdded = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleCurrencyChange = (newCurrency) => {
    setCurrency(newCurrency);
    // Trigger refresh to re-fetch data with converted values
    setRefreshTrigger((prev) => prev + 1);
  };

  if (loading) {
    return (
      <main className="container">
        <div className="loading-screen">
          <h1>{t("app.title")}</h1>
          <p>{t("common.loading")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <header className="app-header">
        <h1>{t("app.title")}</h1>
        <div className="header-controls">
          <LanguageSelector />
          <CurrencySelector
            currency={currency}
            onCurrencyChange={handleCurrencyChange}
          />
        </div>
      </header>

      <Dashboard currency={currency} onRefresh={refreshTrigger} />

      <div className="main-content">
        <EntryForm currency={currency} onEntryAdded={handleEntryAdded} />
        <EntryList currency={currency} refreshTrigger={refreshTrigger} />
      </div>
    </main>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;
