import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useLanguage } from "../contexts/LanguageContext";

export default function CategoryAnalytics({ currency, refreshTrigger }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState("expense"); // "income" or "expense"
  const { t } = useLanguage();

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const data = await invoke("get_category_analytics", {
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        });
        setAnalytics(data);
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [refreshTrigger]);

  const formatCurrency = (amount) => {
    const symbol = currency === "EUR" ? "€" : "kr";
    return `${amount.toFixed(2)} ${symbol}`;
  };

  const getCategoryEmoji = (category) => {
    const emojis = {
      Salary: "💼",
      Freelance: "💻",
      Investment: "📈",
      Gift: "🎁",
      Other: "📦",
      Food: "🍔",
      Transport: "🚗",
      Housing: "🏠",
      Utilities: "⚡",
      Entertainment: "🎬",
      Shopping: "🛒",
      Health: "💊",
      Education: "📚",
    };
    return emojis[category] || "📌";
  };

  const getBarColor = (index, isIncome) => {
    const incomeColors = [
      "#22c55e",
      "#16a34a",
      "#15803d",
      "#166534",
      "#14532d",
    ];
    const expenseColors = [
      "#ef4444",
      "#dc2626",
      "#b91c1c",
      "#991b1b",
      "#7f1d1d",
    ];
    const colors = isIncome ? incomeColors : expenseColors;
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="category-analytics loading">{t("common.loading")}</div>
    );
  }

  if (!analytics) {
    return null;
  }

  const categories =
    viewType === "income"
      ? analytics.income_by_category
      : analytics.expense_by_category;

  const sortedCategories = [...categories].sort((a, b) => b.total - a.total);
  const total =
    viewType === "income" ? analytics.total_income : analytics.total_expenses;

  return (
    <div className="category-analytics">
      <div className="analytics-header">
        <h3>{t("analytics.categoryBreakdown")}</h3>
        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewType === "expense" ? "active" : ""}`}
            onClick={() => setViewType("expense")}
          >
            {t("common.expenses")}
          </button>
          <button
            className={`toggle-btn ${viewType === "income" ? "active" : ""}`}
            onClick={() => setViewType("income")}
          >
            {t("common.income")}
          </button>
        </div>
      </div>

      {sortedCategories.length === 0 ? (
        <div className="no-data">
          <p>{t("analytics.noData")}</p>
        </div>
      ) : (
        <div className="category-list">
          {sortedCategories.map((cat, index) => (
            <div key={cat.category} className="category-item">
              <div className="category-info">
                <span className="category-emoji">
                  {getCategoryEmoji(cat.category)}
                </span>
                <span className="category-name">
                  {t(`entryForm.categories.${cat.category}`)}
                </span>
                <span className="category-count">
                  ({cat.count}{" "}
                  {cat.count === 1
                    ? t("analytics.entry")
                    : t("analytics.entries")}
                  )
                </span>
              </div>
              <div className="category-stats">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: getBarColor(
                        index,
                        viewType === "income"
                      ),
                    }}
                  ></div>
                </div>
                <div className="category-values">
                  <span className="category-amount">
                    {formatCurrency(cat.total)}
                  </span>
                  <span className="category-percentage">
                    {cat.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="analytics-total">
        <span>{t("analytics.total")}</span>
        <span className={viewType === "income" ? "positive" : "negative"}>
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
}
