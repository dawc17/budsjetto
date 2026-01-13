import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useLanguage } from "../contexts/LanguageContext";

export default function Charts({ currency, refreshTrigger }) {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const canvasRef = useRef(null);

  useEffect(() => {
    const fetchTrends = async () => {
      setLoading(true);
      try {
        const data = await invoke("get_monthly_trends", { months: 6 });
        setTrends(data);
      } catch (error) {
        console.error("Failed to fetch trends:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, [refreshTrigger]);

  useEffect(() => {
    if (!canvasRef.current || trends.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Find max value for scaling
    const maxValue = Math.max(
      ...trends.map((t) => Math.max(t.income, t.expenses)),
      1
    );

    const barWidth = chartWidth / trends.length / 3;
    const groupWidth = chartWidth / trends.length;

    // Get CSS colors
    const computedStyle = getComputedStyle(document.documentElement);
    const positiveColor = computedStyle.getPropertyValue("--positive").trim() || "#22c55e";
    const negativeColor = computedStyle.getPropertyValue("--negative").trim() || "#ef4444";
    const textColor = computedStyle.getPropertyValue("--text-secondary").trim() || "#64748b";
    const borderColor = computedStyle.getPropertyValue("--border-color").trim() || "#e2e8f0";

    // Draw grid lines
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Y-axis labels
      ctx.fillStyle = textColor;
      ctx.font = "11px Inter, sans-serif";
      ctx.textAlign = "right";
      const value = maxValue - (maxValue / 4) * i;
      ctx.fillText(formatNumber(value), padding.left - 8, y + 4);
    }

    // Draw bars
    trends.forEach((trend, index) => {
      const x = padding.left + index * groupWidth + groupWidth / 2;

      // Income bar
      const incomeHeight = (trend.income / maxValue) * chartHeight;
      ctx.fillStyle = positiveColor;
      ctx.fillRect(
        x - barWidth - 2,
        padding.top + chartHeight - incomeHeight,
        barWidth,
        incomeHeight
      );

      // Expense bar
      const expenseHeight = (trend.expenses / maxValue) * chartHeight;
      ctx.fillStyle = negativeColor;
      ctx.fillRect(
        x + 2,
        padding.top + chartHeight - expenseHeight,
        barWidth,
        expenseHeight
      );

      // X-axis labels
      ctx.fillStyle = textColor;
      ctx.font = "11px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(trend.month_name, x, height - padding.bottom + 20);
    });

    // Draw legend
    ctx.font = "12px Inter, sans-serif";
    ctx.textAlign = "left";

    // Income legend
    ctx.fillStyle = positiveColor;
    ctx.fillRect(padding.left, height - 15, 12, 12);
    ctx.fillStyle = textColor;
    ctx.fillText(t("common.income"), padding.left + 18, height - 5);

    // Expense legend
    ctx.fillStyle = negativeColor;
    ctx.fillRect(padding.left + 100, height - 15, 12, 12);
    ctx.fillStyle = textColor;
    ctx.fillText(t("common.expenses"), padding.left + 118, height - 5);
  }, [trends, t]);

  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "k";
    }
    return num.toFixed(0);
  };

  const formatCurrency = (amount) => {
    const symbol = currency === "EUR" ? "€" : "kr";
    return `${amount.toFixed(2)} ${symbol}`;
  };

  if (loading) {
    return <div className="charts loading">{t("common.loading")}</div>;
  }

  if (trends.length === 0) {
    return (
      <div className="charts empty">
        <p>{t("charts.noData")}</p>
      </div>
    );
  }

  return (
    <div className="charts">
      <h3>{t("charts.monthlyOverview")}</h3>
      <div className="chart-container">
        <canvas ref={canvasRef} className="chart-canvas"></canvas>
      </div>
      <div className="trend-summary">
        {trends.slice(-3).map((trend) => (
          <div key={`${trend.year}-${trend.month}`} className="trend-item">
            <span className="trend-month">{trend.month_name} {trend.year}</span>
            <span className={`trend-net ${trend.net >= 0 ? "positive" : "negative"}`}>
              {trend.net >= 0 ? "+" : ""}{formatCurrency(trend.net)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
