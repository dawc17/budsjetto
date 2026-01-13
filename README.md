# Budsjetto

Budsjetto is a simple, offline-first desktop budget application built with Tauri, React, and Rust. It is designed to help users track personal finances, manage travel budgets, and visualize spending habits without relying on cloud services.

## Features

- **Dashboard Overview**: Get immediate insights into your weekly and monthly financial health.
- **Transaction Tracking**: Log income and expenses with detailed categorizations.
- **Trip Planning**: Create dedicated budgets for trips, track spending against a limit, and view remaining balances.
- **Analytics & Charts**: Visualize spending patterns through bar charts and category breakdowns.
- **Multi-Currency**: Seamlessly switch between NOK and EUR currencies.
- **Privacy First**: All data is stored locally on your machine in a JSON format.
- **Data Export**: Export your complete transaction history to CSV for external analysis.
- **Customization**: Dark mode support and bilingual interface (English/Norwegian).

## Technology Stack

- **Frontend**: React (Vite)
- **Backend**: Rust
- **Framework**: Tauri v2
- **Storage**: Local filesystem (JSON)

## Prerequisites

Before running the project, ensure you have the following installed:

- **Node.js** (v16+)
- **Rust** (Latest stable release)
- **System Dependencies**:
  - Windows: Visual Studio C++ Build Tools

## Development Setup

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development environment:
    ```bash
    npm run tauri dev
    ```
    This command will launch the React dev server and the Tauri application window.

## Building for Production

To compile the application into a standalone executable or installer:

```bash
npm run tauri build
```

Artifacts will be generated in `src-tauri/target/release/bundle/`.

## Project Structure

- `src/`: React frontend source code
  - `components/`: UI components including Dashboard, EntryForm, and TripBudget
  - `contexts/`: React Context providers (e.g., LanguageContext)
  - `locales/`: Localization files (en.json, no.json)
- `src-tauri/`: Rust backend source code
  - `src/lib.rs`: Main application logic, data models, and command handlers
  - `tauri.conf.json`: Application configuration
