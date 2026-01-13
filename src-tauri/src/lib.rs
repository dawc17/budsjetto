use chrono::{Datelike, NaiveDate};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;

// Data Models
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetEntry {
    pub id: String,
    #[serde(rename = "type")]
    pub entry_type: String, // "income" or "expense"
    pub amount: f64,
    pub currency: String, // "NOK" or "EUR"
    pub category: String,
    pub date: String, // ISO 8601 format
    pub description: String,
}

// Trip Budget Models
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TripExpense {
    pub id: String,
    pub amount: f64,
    pub category: String,
    pub description: String,
    pub date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trip {
    pub id: String,
    pub name: String,
    pub destination: String,
    pub budget: f64,
    pub currency: String,
    pub start_date: String,
    pub end_date: String,
    pub expenses: Vec<TripExpense>,
    pub total_spent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppData {
    pub selected_currency: String,
    pub entries: Vec<BudgetEntry>,
    #[serde(default)]
    pub trips: Vec<Trip>,
}

impl Default for AppData {
    fn default() -> Self {
        Self {
            selected_currency: "NOK".to_string(),
            entries: Vec::new(),
            trips: Vec::new(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Summary {
    pub total_income: f64,
    pub total_expenses: f64,
    pub net_balance: f64,
    pub currency: String,
}

// State wrapper
pub struct AppState(pub Mutex<AppData>);

// Helper function to get data file path
fn get_data_file_path() -> PathBuf {
    let mut path = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push(".budsjetto");
    fs::create_dir_all(&path).ok();
    path.push("budget_data.json");
    path
}

fn convert_currency(amount: f64, from: &str, to: &str) -> f64 {
    if from == to {
        return amount;
    }
    match (from, to) {
        ("NOK", "EUR") => amount / 11.7,
        ("EUR", "NOK") => amount * 11.7,
        _ => amount,
    }
}

// Tauri Commands
#[tauri::command]
fn load_data(state: State<AppState>) -> Result<AppData, String> {
    let path = get_data_file_path();

    let data = if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        AppData::default()
    };

    let mut app_data = state.0.lock().map_err(|e| e.to_string())?;
    *app_data = data.clone();

    Ok(data)
}

#[tauri::command]
fn save_data(state: State<AppState>) -> Result<(), String> {
    let path = get_data_file_path();
    let data = state.0.lock().map_err(|e| e.to_string())?;
    let content = serde_json::to_string_pretty(&*data).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn add_entry(
    entry_type: String,
    amount: f64,
    category: String,
    date: String,
    description: String,
    state: State<AppState>,
) -> Result<BudgetEntry, String> {
    if amount <= 0.0 {
        return Err("Amount must be positive".to_string());
    }

    if entry_type != "income" && entry_type != "expense" {
        return Err("Type must be 'income' or 'expense'".to_string());
    }

    let mut data = state.0.lock().map_err(|e| e.to_string())?;

    let entry = BudgetEntry {
        id: Uuid::new_v4().to_string(),
        entry_type,
        amount,
        currency: data.selected_currency.clone(),
        category,
        date,
        description,
    };

    data.entries.push(entry.clone());

    // Save after modification
    let path = get_data_file_path();
    let content = serde_json::to_string_pretty(&*data).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;

    Ok(entry)
}

#[tauri::command]
fn delete_entry(id: String, state: State<AppState>) -> Result<(), String> {
    let mut data = state.0.lock().map_err(|e| e.to_string())?;

    let original_len = data.entries.len();
    data.entries.retain(|e| e.id != id);

    if data.entries.len() == original_len {
        return Err("Entry not found".to_string());
    }

    // Save after modification
    let path = get_data_file_path();
    let content = serde_json::to_string_pretty(&*data).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn get_all_entries(state: State<AppState>) -> Result<Vec<BudgetEntry>, String> {
    let data = state.0.lock().map_err(|e| e.to_string())?;

    let entries: Vec<BudgetEntry> = data
        .entries
        .iter()
        .map(|e| {
            let mut entry = e.clone();
            if entry.currency != data.selected_currency {
                entry.amount =
                    convert_currency(entry.amount, &entry.currency, &data.selected_currency);
                entry.currency = data.selected_currency.clone();
            }
            entry
        })
        .collect();

    Ok(entries)
}

#[tauri::command]
fn get_weekly_summary(week: u32, year: i32, state: State<AppState>) -> Result<Summary, String> {
    let data = state.0.lock().map_err(|e| e.to_string())?;

    let mut total_income = 0.0;
    let mut total_expenses = 0.0;

    for entry in &data.entries {
        if let Ok(date) = NaiveDate::parse_from_str(&entry.date, "%Y-%m-%d") {
            if date.iso_week().week() == week && date.iso_week().year() == year {
                let amount =
                    convert_currency(entry.amount, &entry.currency, &data.selected_currency);
                if entry.entry_type == "income" {
                    total_income += amount;
                } else {
                    total_expenses += amount;
                }
            }
        }
    }

    Ok(Summary {
        total_income,
        total_expenses,
        net_balance: total_income - total_expenses,
        currency: data.selected_currency.clone(),
    })
}

#[tauri::command]
fn get_monthly_summary(month: u32, year: i32, state: State<AppState>) -> Result<Summary, String> {
    let data = state.0.lock().map_err(|e| e.to_string())?;

    let mut total_income = 0.0;
    let mut total_expenses = 0.0;

    for entry in &data.entries {
        if let Ok(date) = NaiveDate::parse_from_str(&entry.date, "%Y-%m-%d") {
            if date.month() == month && date.year() == year {
                let amount =
                    convert_currency(entry.amount, &entry.currency, &data.selected_currency);
                if entry.entry_type == "income" {
                    total_income += amount;
                } else {
                    total_expenses += amount;
                }
            }
        }
    }

    Ok(Summary {
        total_income,
        total_expenses,
        net_balance: total_income - total_expenses,
        currency: data.selected_currency.clone(),
    })
}

#[tauri::command]
fn set_currency(currency: String, state: State<AppState>) -> Result<(), String> {
    if currency != "NOK" && currency != "EUR" {
        return Err("Currency must be 'NOK' or 'EUR'".to_string());
    }

    let mut data = state.0.lock().map_err(|e| e.to_string())?;
    data.selected_currency = currency;

    // Save after modification
    let path = get_data_file_path();
    let content = serde_json::to_string_pretty(&*data).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn get_currency(state: State<AppState>) -> Result<String, String> {
    let data = state.0.lock().map_err(|e| e.to_string())?;
    Ok(data.selected_currency.clone())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CategorySummary {
    pub category: String,
    pub total: f64,
    pub percentage: f64,
    pub count: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CategoryAnalytics {
    pub income_by_category: Vec<CategorySummary>,
    pub expense_by_category: Vec<CategorySummary>,
    pub total_income: f64,
    pub total_expenses: f64,
    pub currency: String,
}

#[tauri::command]
fn get_category_analytics(
    month: Option<u32>,
    year: Option<i32>,
    state: State<AppState>,
) -> Result<CategoryAnalytics, String> {
    let data = state.0.lock().map_err(|e| e.to_string())?;

    let mut income_map: std::collections::HashMap<String, (f64, u32)> =
        std::collections::HashMap::new();
    let mut expense_map: std::collections::HashMap<String, (f64, u32)> =
        std::collections::HashMap::new();

    let mut total_income = 0.0;
    let mut total_expenses = 0.0;

    for entry in &data.entries {
        // Filter by month/year if provided
        if let (Some(m), Some(y)) = (month, year) {
            if let Ok(date) = NaiveDate::parse_from_str(&entry.date, "%Y-%m-%d") {
                if date.month() != m || date.year() != y {
                    continue;
                }
            }
        }

        let amount = convert_currency(entry.amount, &entry.currency, &data.selected_currency);

        if entry.entry_type == "income" {
            total_income += amount;
            let entry_data = income_map.entry(entry.category.clone()).or_insert((0.0, 0));
            entry_data.0 += amount;
            entry_data.1 += 1;
        } else {
            total_expenses += amount;
            let entry_data = expense_map
                .entry(entry.category.clone())
                .or_insert((0.0, 0));
            entry_data.0 += amount;
            entry_data.1 += 1;
        }
    }

    let income_by_category: Vec<CategorySummary> = income_map
        .into_iter()
        .map(|(category, (total, count))| CategorySummary {
            category,
            total,
            percentage: if total_income > 0.0 {
                (total / total_income) * 100.0
            } else {
                0.0
            },
            count,
        })
        .collect();

    let expense_by_category: Vec<CategorySummary> = expense_map
        .into_iter()
        .map(|(category, (total, count))| CategorySummary {
            category,
            total,
            percentage: if total_expenses > 0.0 {
                (total / total_expenses) * 100.0
            } else {
                0.0
            },
            count,
        })
        .collect();

    Ok(CategoryAnalytics {
        income_by_category,
        expense_by_category,
        total_income,
        total_expenses,
        currency: data.selected_currency.clone(),
    })
}

#[tauri::command]
fn export_to_csv(state: State<AppState>) -> Result<String, String> {
    let data = state.0.lock().map_err(|e| e.to_string())?;

    let mut csv_content = String::from("ID,Type,Amount,Currency,Category,Date,Description\n");

    for entry in &data.entries {
        let escaped_description = entry.description.replace('"', "\"\"");
        csv_content.push_str(&format!(
            "{},{},{},{},{},{},\"{}\"\n",
            entry.id,
            entry.entry_type,
            entry.amount,
            entry.currency,
            entry.category,
            entry.date,
            escaped_description
        ));
    }

    // Save to downloads folder or home directory
    let mut path = dirs::download_dir()
        .unwrap_or_else(|| dirs::home_dir().unwrap_or_else(|| PathBuf::from(".")));

    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    path.push(format!("budsjetto_export_{}.csv", timestamp));

    fs::write(&path, &csv_content).map_err(|e| e.to_string())?;

    Ok(path.to_string_lossy().to_string())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MonthlyTrend {
    pub month: u32,
    pub year: i32,
    pub month_name: String,
    pub income: f64,
    pub expenses: f64,
    pub net: f64,
}

#[tauri::command]
fn get_monthly_trends(months: u32, state: State<AppState>) -> Result<Vec<MonthlyTrend>, String> {
    let data = state.0.lock().map_err(|e| e.to_string())?;

    let now = chrono::Local::now().naive_local().date();
    let mut trends: Vec<MonthlyTrend> = Vec::new();

    for i in 0..months {
        let target_date = now - chrono::Duration::days((i * 30) as i64);
        let month = target_date.month();
        let year = target_date.year();

        let mut income = 0.0;
        let mut expenses = 0.0;

        for entry in &data.entries {
            if let Ok(date) = NaiveDate::parse_from_str(&entry.date, "%Y-%m-%d") {
                if date.month() == month && date.year() == year {
                    let amount =
                        convert_currency(entry.amount, &entry.currency, &data.selected_currency);
                    if entry.entry_type == "income" {
                        income += amount;
                    } else {
                        expenses += amount;
                    }
                }
            }
        }

        let month_names = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ];

        trends.push(MonthlyTrend {
            month,
            year,
            month_name: month_names[(month - 1) as usize].to_string(),
            income,
            expenses,
            net: income - expenses,
        });
    }

    trends.reverse(); // Oldest to newest
    Ok(trends)
}

// Trip Budget Commands
#[tauri::command]
fn create_trip(
    name: String,
    destination: String,
    budget: f64,
    start_date: String,
    end_date: String,
    state: State<AppState>,
) -> Result<Trip, String> {
    if budget <= 0.0 {
        return Err("Budget must be positive".to_string());
    }

    let mut data = state.0.lock().map_err(|e| e.to_string())?;

    let trip = Trip {
        id: Uuid::new_v4().to_string(),
        name,
        destination,
        budget,
        currency: data.selected_currency.clone(),
        start_date,
        end_date,
        expenses: Vec::new(),
        total_spent: 0.0,
    };

    data.trips.push(trip.clone());

    // Save after modification
    let path = get_data_file_path();
    let content = serde_json::to_string_pretty(&*data).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;

    Ok(trip)
}

#[tauri::command]
fn get_trips(state: State<AppState>) -> Result<Vec<Trip>, String> {
    let data = state.0.lock().map_err(|e| e.to_string())?;

    // Convert trips to current currency if needed
    let trips: Vec<Trip> = data
        .trips
        .iter()
        .map(|t| {
            let mut trip = t.clone();
            if trip.currency != data.selected_currency {
                trip.budget =
                    convert_currency(trip.budget, &trip.currency, &data.selected_currency);
                trip.total_spent =
                    convert_currency(trip.total_spent, &trip.currency, &data.selected_currency);
                trip.expenses = trip
                    .expenses
                    .iter()
                    .map(|e| {
                        let mut exp = e.clone();
                        exp.amount =
                            convert_currency(exp.amount, &trip.currency, &data.selected_currency);
                        exp
                    })
                    .collect();
                trip.currency = data.selected_currency.clone();
            }
            trip
        })
        .collect();

    Ok(trips)
}

#[tauri::command]
fn add_trip_expense(
    trip_id: String,
    amount: f64,
    category: String,
    description: String,
    date: String,
    state: State<AppState>,
) -> Result<TripExpense, String> {
    if amount <= 0.0 {
        return Err("Amount must be positive".to_string());
    }

    let mut data = state.0.lock().map_err(|e| e.to_string())?;

    let trip = data
        .trips
        .iter_mut()
        .find(|t| t.id == trip_id)
        .ok_or("Trip not found")?;

    let expense = TripExpense {
        id: Uuid::new_v4().to_string(),
        amount,
        category,
        description,
        date,
    };

    trip.expenses.push(expense.clone());
    trip.total_spent += amount;

    // Save after modification
    let path = get_data_file_path();
    let content = serde_json::to_string_pretty(&*data).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;

    Ok(expense)
}

#[tauri::command]
fn delete_trip(trip_id: String, state: State<AppState>) -> Result<(), String> {
    let mut data = state.0.lock().map_err(|e| e.to_string())?;

    let original_len = data.trips.len();
    data.trips.retain(|t| t.id != trip_id);

    if data.trips.len() == original_len {
        return Err("Trip not found".to_string());
    }

    // Save after modification
    let path = get_data_file_path();
    let content = serde_json::to_string_pretty(&*data).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn delete_trip_expense(
    trip_id: String,
    expense_id: String,
    state: State<AppState>,
) -> Result<(), String> {
    let mut data = state.0.lock().map_err(|e| e.to_string())?;

    let trip = data
        .trips
        .iter_mut()
        .find(|t| t.id == trip_id)
        .ok_or("Trip not found")?;

    let expense = trip
        .expenses
        .iter()
        .find(|e| e.id == expense_id)
        .ok_or("Expense not found")?;

    let expense_amount = expense.amount;
    trip.expenses.retain(|e| e.id != expense_id);
    trip.total_spent -= expense_amount;

    // Save after modification
    let path = get_data_file_path();
    let content = serde_json::to_string_pretty(&*data).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState(Mutex::new(AppData::default())))
        .invoke_handler(tauri::generate_handler![
            load_data,
            save_data,
            add_entry,
            delete_entry,
            get_all_entries,
            get_weekly_summary,
            get_monthly_summary,
            set_currency,
            get_currency,
            get_category_analytics,
            export_to_csv,
            get_monthly_trends,
            create_trip,
            get_trips,
            add_trip_expense,
            delete_trip,
            delete_trip_expense,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
