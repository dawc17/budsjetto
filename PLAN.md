# Budget App -- Technical Plan (Tauri + React)

## 1. Purpose

The goal of this application is to provide a simple, offline-first
desktop budget tool where a user can: - Register income and expenses -
View weekly and monthly budgets - Choose between NOK and EUR as the
working currency

The app is built using **Tauri** for the desktop shell, **React** for
the user interface, and **Rust** for backend logic and persistence.

---

## 2. Technology Stack

### Frontend

- React (Vite)
- TypeScript
- HTML/CSS
- Runs inside a system WebView via Tauri

### Backend

- Rust
- Tauri command system for frontend-backend communication
- Serde for JSON serialization
- Local JSON file for persistent storage

### Platform

- Windows (primary)
- Portable to macOS and Linux via Tauri

---

## 3. Application Architecture

The app follows a clear separation of concerns:

Frontend: - Handles UI rendering - Collects user input - Displays
calculated budget summaries

Backend: - Stores and loads budget data - Performs calculations for
weekly and monthly totals - Validates input - Manages currency selection

Communication is done via Tauri commands (IPC).

---

## 4. Data Model

### BudgetEntry

Each transaction is stored as a budget entry.

Fields: - id: UUID - type: "income" or "expense" - amount: number -
currency: "NOK" or "EUR" - category: string - date: ISO 8601 string

### AppState

- selected_currency: "NOK" or "EUR"
- entries: list of BudgetEntry

All data is persisted in a single JSON file on disk.

---

## 5. Currency Handling

- The user selects either NOK or EUR as the base currency.
- All entries are stored in the selected currency.
- No live exchange rates are used.
- If currency conversion is required, a fixed exchange rate will be
  defined and documented.
- The currency symbol is displayed consistently across the UI.

---

## 6. Budget Logic

### Weekly Budget

- Entries are grouped by ISO week number.
- Total income and expenses are calculated per week.
- Net balance = income - expenses.

### Monthly Budget

- Entries are grouped by year and month.
- Total income and expenses are calculated per month.
- Net balance = income - expenses.

All calculations are performed in the Rust backend to keep logic
centralized.

---

## 7. Backend Commands (Rust)

Planned Tauri commands: - add_entry(entry) - get_all_entries() -
get_weekly_summary(week, year) - get_monthly_summary(month, year) -
set_currency(currency) - load_data() - save_data()

Trip Budget Commands:

- create_trip(name, destination, budget, start_date, end_date)
- get_trips()
- add_trip_expense(trip_id, amount, category, description, date)
- delete_trip(trip_id)
- delete_trip_expense(trip_id, expense_id)

Each command returns structured data to the frontend.

---

## 8. User Interface Flow

1.  App starts
2.  Backend loads data from disk
3.  User selects currency (first launch only)
4.  Main dashboard is shown:
    - Weekly summary
    - Monthly summary
5.  User can add income or expense entries
6.  UI updates automatically after each change

---

## 9. Persistence Strategy

- Data is stored locally as JSON
- File location is managed by Tauri (app data directory)
- File is read on startup and written after every change
- No internet connection required

---

## 10. Error Handling

- Input validation in frontend and backend
- Invalid values are rejected with clear error messages
- Backend failures are logged and reported to the UI

---

## 11. Non-Goals

- No cloud sync
- No authentication
- No multi-user support
- No real-time exchange rates

---

## 12. Future Improvements (Optional)

- Export to CSV ✅
- Charts for spending overview ✅
- Category-based analytics ✅
- Dark mode ✅
- Trip budget planning ✅
- Password-protected budget file

---

## 13. Summary

This application focuses on clarity, reliability, and simplicity. Tauri
provides a lightweight native shell, React delivers a responsive UI, and
Rust ensures fast and safe backend logic. The design avoids unnecessary
complexity while still demonstrating solid software architecture.
