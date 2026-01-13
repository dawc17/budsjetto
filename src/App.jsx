import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { LanguageProvider, useLanguage } from "./contexts/LanguageContext";
import Dashboard from "./components/Dashboard";
import EntryForm from "./components/EntryForm";
import EntryList from "./components/EntryList";
import CurrencySelector from "./components/CurrencySelector";
import LanguageSelector from "./components/LanguageSelector";
import Charts from "./components/Charts";
import CategoryAnalytics from "./components/CategoryAnalytics";
import ExportButton from "./components/ExportButton";
import ThemeToggle from "./components/ThemeToggle";
import TripBudget from "./components/TripBudget";
import "./App.css";

function AppContent() {
  const [currency, setCurrency] = useState("NOK");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const { t } = useLanguage();

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("budsjetto-theme");
    if (savedTheme === "dark") {
      setDarkMode(true);
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const handleThemeToggle = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("budsjetto-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("budsjetto-theme", "light");
    }
  };

  useEffect(() => {
    const onContextMenu = (e) => {
      e.preventDefault();
    };

    const onSelectStart = (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;

      // Allow selecting/editing inside form fields and explicitly allowed regions.
      if (
        target.closest(
          "input, textarea, [contenteditable='true'], .allow-select"
        )
      ) {
        return;
      }

      e.preventDefault();
    };

    const onKeyDownCapture = (e) => {
      // Block common devtools / inspector shortcuts.
      if (e.key === "F12") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const key = (e.key || "").toLowerCase();
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      // Ctrl+Shift+I / Ctrl+Shift+C: devtools / inspector
      if (isCtrlOrMeta && isShift && (key === "i" || key === "c")) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Ctrl+U: view source (mostly relevant in browser-like contexts)
      if (isCtrlOrMeta && key === "u") {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("selectstart", onSelectStart);
    window.addEventListener("keydown", onKeyDownCapture, true);

    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("selectstart", onSelectStart);
      window.removeEventListener("keydown", onKeyDownCapture, true);
    };
  }, []);

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
          <ThemeToggle darkMode={darkMode} onToggle={handleThemeToggle} />
        </div>
      </header>

      <Dashboard currency={currency} onRefresh={refreshTrigger} />

      <TripBudget currency={currency} refreshTrigger={refreshTrigger} />

      <Charts currency={currency} refreshTrigger={refreshTrigger} />

      <div className="analytics-section">
        <CategoryAnalytics
          currency={currency}
          refreshTrigger={refreshTrigger}
        />
        <div className="entry-form-wrapper">
          <EntryForm currency={currency} onEntryAdded={handleEntryAdded} />
          <div className="export-wrapper">
            <ExportButton />
          </div>
        </div>
      </div>

      <EntryList currency={currency} refreshTrigger={refreshTrigger} />
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
