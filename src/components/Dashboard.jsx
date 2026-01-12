import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useLanguage } from "../contexts/LanguageContext";

export default function Dashboard({ currency, onRefresh }) {
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  const getCurrentWeekAndYear = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now - start;
    const oneWeek = 604800000;
    const week = Math.ceil((diff + start.getDay() * 86400000) / oneWeek);
    return { week, year: now.getFullYear() };
  };

  const fetchSummaries = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const { week, year } = getCurrentWeekAndYear();

      const weekly = await invoke("get_weekly_summary", { week, year });
      const monthly = await invoke("get_monthly_summary", {
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      });

      setWeeklySummary(weekly);
      setMonthlySummary(monthly);
    } catch (error) {
      console.error("Failed to fetch summaries:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaries();
  }, [onRefresh]);

  const formatCurrency = (amount) => {
    const symbol = currency === "EUR" ? "€" : "kr";
    return `${amount.toFixed(2)} ${symbol}`;
  };

  if (loading) {
    return <div className="dashboard loading">{t("common.loading")}</div>;
  }

  return (
    <div className="dashboard">
      <div className="summary-cards">
        <div className="summary-card weekly">
          <h3>{t("dashboard.thisWeek")}</h3>
          {weeklySummary && (
            <>
              <div className="summary-row income">
                <span>{t("common.income")}</span>
                <span className="amount positive">
                  +{formatCurrency(weeklySummary.total_income)}
                </span>
              </div>
              <div className="summary-row expense">
                <span>{t("common.expenses")}</span>
                <span className="amount negative">
                  -{formatCurrency(weeklySummary.total_expenses)}
                </span>
              </div>
              <div className="summary-row balance">
                <span>{t("common.balance")}</span>
                <span
                  className={`amount ${
                    weeklySummary.net_balance >= 0 ? "positive" : "negative"
                  }`}
                >
                  {formatCurrency(weeklySummary.net_balance)}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="summary-card monthly">
          <h3>{t("dashboard.thisMonth")}</h3>
          {monthlySummary && (
            <>
              <div className="summary-row income">
                <span>{t("common.income")}</span>
                <span className="amount positive">
                  +{formatCurrency(monthlySummary.total_income)}
                </span>
              </div>
              <div className="summary-row expense">
                <span>{t("common.expenses")}</span>
                <span className="amount negative">
                  -{formatCurrency(monthlySummary.total_expenses)}
                </span>
              </div>
              <div className="summary-row balance">
                <span>{t("common.balance")}</span>
                <span
                  className={`amount ${
                    monthlySummary.net_balance >= 0 ? "positive" : "negative"
                  }`}
                >
                  {formatCurrency(monthlySummary.net_balance)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
