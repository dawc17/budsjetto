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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppData {
    pub selected_currency: String,
    pub entries: Vec<BudgetEntry>,
}

impl Default for AppData {
    fn default() -> Self {
        Self {
            selected_currency: "NOK".to_string(),
            entries: Vec::new(),
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
        ("NOK", "EUR") => amount / 10.0,
        ("EUR", "NOK") => amount * 10.0,
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
