import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useLanguage } from "../contexts/LanguageContext";

export default function TripBudget({ currency, refreshTrigger }) {
  const [trips, setTrips] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedTrip, setExpandedTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  // Form state for new trip
  const [newTrip, setNewTrip] = useState({
    name: "",
    destination: "",
    budget: "",
    startDate: "",
    endDate: "",
  });

  // Form state for adding expense to trip
  const [newExpense, setNewExpense] = useState({
    tripId: "",
    amount: "",
    category: "Transport",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [addingExpense, setAddingExpense] = useState(false);

  const expenseCategories = [
    "Transport",
    "Accommodation",
    "Food",
    "Activities",
    "Shopping",
    "Other",
  ];

  useEffect(() => {
    fetchTrips();
  }, [refreshTrigger]);

  const fetchTrips = async () => {
    try {
      const data = await invoke("get_trips");
      setTrips(data);
    } catch (error) {
      console.error("Failed to fetch trips:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    try {
      await invoke("create_trip", {
        name: newTrip.name,
        destination: newTrip.destination,
        budget: parseFloat(newTrip.budget),
        startDate: newTrip.startDate,
        endDate: newTrip.endDate,
      });
      setNewTrip({
        name: "",
        destination: "",
        budget: "",
        startDate: "",
        endDate: "",
      });
      setShowForm(false);
      fetchTrips();
    } catch (error) {
      console.error("Failed to create trip:", error);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setAddingExpense(true);
    try {
      if (!newExpense.amount || parseFloat(newExpense.amount) <= 0) {
        alert(t("entryForm.error.invalidAmount"));
        setAddingExpense(false);
        return;
      }

      await invoke("add_trip_expense", {
        tripId: newExpense.tripId,
        amount: parseFloat(newExpense.amount),
        category: newExpense.category,
        description: newExpense.description,
        date: newExpense.date,
      });
      setNewExpense({
        tripId: "",
        amount: "",
        category: "Transport",
        description: "",
        date: new Date().toISOString().split("T")[0],
      });
      await fetchTrips();
    } catch (error) {
      console.error("Failed to add expense:", error);
      alert(error);
    } finally {
      setAddingExpense(false);
    }
  };

  const handleDeleteTrip = async (tripId) => {
    if (window.confirm(t("tripBudget.confirmDelete"))) {
      try {
        await invoke("delete_trip", { tripId });
        fetchTrips();
      } catch (error) {
        console.error("Failed to delete trip:", error);
      }
    }
  };

  const handleDeleteExpense = async (tripId, expenseId) => {
    try {
      await invoke("delete_trip_expense", { tripId, expenseId });
      fetchTrips();
    } catch (error) {
      console.error("Failed to delete expense:", error);
    }
  };

  const formatCurrency = (amount) => {
    const symbol = currency === "EUR" ? "€" : "kr";
    return `${amount.toFixed(2)} ${symbol}`;
  };

  const calculateProgress = (spent, budget) => {
    if (budget === 0) return 0;
    return Math.min((spent / budget) * 100, 100);
  };

  const getProgressColor = (spent, budget) => {
    const percentage = (spent / budget) * 100;
    if (percentage >= 100) return "var(--negative)";
    if (percentage >= 80) return "#f59e0b"; // Warning amber
    return "var(--positive)";
  };

  if (loading) {
    return <div className="trip-budget loading">{t("common.loading")}</div>;
  }

  return (
    <div className="trip-budget">
      <div className="trip-budget-header">
        <h3>{t("tripBudget.title")}</h3>
        <button className="add-trip-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? t("tripBudget.cancel") : t("tripBudget.addTrip")}
        </button>
      </div>

      {/* New Trip Form */}
      {showForm && (
        <form className="trip-form" onSubmit={handleCreateTrip}>
          <div className="form-row">
            <label>{t("tripBudget.tripName")}</label>
            <input
              type="text"
              value={newTrip.name}
              onChange={(e) => setNewTrip({ ...newTrip, name: e.target.value })}
              placeholder={t("tripBudget.tripNamePlaceholder")}
              required
            />
          </div>
          <div className="form-row">
            <label>{t("tripBudget.destination")}</label>
            <input
              type="text"
              value={newTrip.destination}
              onChange={(e) =>
                setNewTrip({ ...newTrip, destination: e.target.value })
              }
              placeholder={t("tripBudget.destinationPlaceholder")}
              required
            />
          </div>
          <div className="form-row">
            <label>{t("tripBudget.budget")}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={newTrip.budget}
              onChange={(e) =>
                setNewTrip({ ...newTrip, budget: e.target.value })
              }
              placeholder="1000.00"
              required
            />
          </div>
          <div className="form-row-inline">
            <div className="form-row">
              <label>{t("tripBudget.startDate")}</label>
              <input
                type="date"
                value={newTrip.startDate}
                onChange={(e) =>
                  setNewTrip({ ...newTrip, startDate: e.target.value })
                }
                required
              />
            </div>
            <div className="form-row">
              <label>{t("tripBudget.endDate")}</label>
              <input
                type="date"
                value={newTrip.endDate}
                onChange={(e) =>
                  setNewTrip({ ...newTrip, endDate: e.target.value })
                }
                required
              />
            </div>
          </div>
          <button type="submit" className="submit-btn">
            {t("tripBudget.createTrip")}
          </button>
        </form>
      )}

      {/* Trip List */}
      {trips.length === 0 ? (
        <div className="no-trips">{t("tripBudget.noTrips")}</div>
      ) : (
        <div className="trips-list">
          {trips.map((trip) => {
            const progress = calculateProgress(trip.total_spent, trip.budget);
            const remaining = trip.budget - trip.total_spent;
            const isOverBudget = remaining < 0;
            const isExpanded = expandedTrip === trip.id;

            return (
              <div key={trip.id} className="trip-card">
                <div
                  className="trip-card-header"
                  onClick={() => setExpandedTrip(isExpanded ? null : trip.id)}
                >
                  <div className="trip-info">
                    <h4>{trip.name}</h4>
                    <span className="trip-destination">
                      📍 {trip.destination}
                    </span>
                    <span className="trip-dates">
                      {trip.start_date} → {trip.end_date}
                    </span>
                  </div>
                  <div className="trip-budget-info">
                    <div className="budget-amounts">
                      <span className="spent">
                        {formatCurrency(trip.total_spent)}
                      </span>
                      <span className="separator">/</span>
                      <span className="total">
                        {formatCurrency(trip.budget)}
                      </span>
                    </div>
                    <div className={`remaining ${isOverBudget ? "over" : ""}`}>
                      {isOverBudget
                        ? `${t("tripBudget.overBudget")} ${formatCurrency(
                            Math.abs(remaining)
                          )}`
                        : `${t("tripBudget.remaining")} ${formatCurrency(
                            remaining
                          )}`}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="progress-bar-container">
                  <div
                    className="progress-bar"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: getProgressColor(
                        trip.total_spent,
                        trip.budget
                      ),
                    }}
                  />
                </div>

                {/* Expanded Trip Details */}
                {isExpanded && (
                  <div className="trip-details">
                    {/* Add Expense Form */}
                    <form
                      className="add-expense-form"
                      noValidate
                      onSubmit={(e) => {
                        e.preventDefault();
                        setNewExpense({ ...newExpense, tripId: trip.id });
                        handleAddExpense(e);
                      }}
                    >
                      <h5>{t("tripBudget.addExpense")}</h5>
                      <div className="expense-form-row">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={t("tripBudget.amount")}
                          value={
                            newExpense.tripId === trip.id
                              ? newExpense.amount
                              : ""
                          }
                          onChange={(e) =>
                            setNewExpense({
                              ...newExpense,
                              tripId: trip.id,
                              amount: e.target.value,
                            })
                          }
                          required
                        />
                        <select
                          value={
                            newExpense.tripId === trip.id
                              ? newExpense.category
                              : "Transport"
                          }
                          onChange={(e) =>
                            setNewExpense({
                              ...newExpense,
                              tripId: trip.id,
                              category: e.target.value,
                            })
                          }
                        >
                          {expenseCategories.map((cat) => (
                            <option key={cat} value={cat}>
                              {t(`tripBudget.categories.${cat}`)}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder={t("tripBudget.description")}
                          value={
                            newExpense.tripId === trip.id
                              ? newExpense.description
                              : ""
                          }
                          onChange={(e) =>
                            setNewExpense({
                              ...newExpense,
                              tripId: trip.id,
                              description: e.target.value,
                            })
                          }
                        />
                        <input
                          type="date"
                          value={
                            newExpense.tripId === trip.id
                              ? newExpense.date
                              : new Date().toISOString().split("T")[0]
                          }
                          onChange={(e) =>
                            setNewExpense({
                              ...newExpense,
                              tripId: trip.id,
                              date: e.target.value,
                            })
                          }
                          required
                        />
                        <button 
                          type="submit" 
                          className="add-expense-btn"
                          disabled={addingExpense}
                        >
                          {addingExpense ? "..." : "+"}
                        </button>
                      </div>
                    </form>

                    {/* Expense List */}
                    <div className="expense-list">
                      <h5>{t("tripBudget.expenses")}</h5>
                      {trip.expenses.length === 0 ? (
                        <p className="no-expenses">
                          {t("tripBudget.noExpenses")}
                        </p>
                      ) : (
                        trip.expenses.map((expense) => (
                          <div key={expense.id} className="expense-item">
                            <div className="expense-info">
                              <span className="expense-category">
                                {t(`tripBudget.categories.${expense.category}`)}
                              </span>
                              {expense.description && (
                                <span className="expense-description">
                                  {expense.description}
                                </span>
                              )}
                              <span className="expense-date">
                                {expense.date}
                              </span>
                            </div>
                            <div className="expense-amount">
                              {formatCurrency(expense.amount)}
                              <button
                                className="delete-expense-btn"
                                onClick={() =>
                                  handleDeleteExpense(trip.id, expense.id)
                                }
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Category Breakdown */}
                    {trip.expenses.length > 0 && (
                      <div className="trip-category-breakdown">
                        <h5>{t("tripBudget.breakdown")}</h5>
                        <div className="category-bars">
                          {Object.entries(
                            trip.expenses.reduce((acc, exp) => {
                              acc[exp.category] =
                                (acc[exp.category] || 0) + exp.amount;
                              return acc;
                            }, {})
                          ).map(([category, amount]) => (
                            <div key={category} className="category-bar-item">
                              <span className="category-name">
                                {t(`tripBudget.categories.${category}`)}
                              </span>
                              <div className="category-bar-wrapper">
                                <div
                                  className="category-bar"
                                  style={{
                                    width: `${
                                      (amount / trip.total_spent) * 100
                                    }%`,
                                  }}
                                />
                              </div>
                              <span className="category-amount">
                                {formatCurrency(amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Delete Trip Button */}
                    <button
                      className="delete-trip-btn"
                      onClick={() => handleDeleteTrip(trip.id)}
                    >
                      {t("tripBudget.deleteTrip")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
