# 💸 LendTrack — Business Money Tracker

A full-stack, dark-mode, mobile-friendly web app to track money you lend to people across multiple loan cycles. Built with **React + Vite** on the frontend and a **Go REST API** with **MySQL** on the backend.

---

## ✨ Features

### 👤 Lending
- Add, rename, and delete people you lend money to
- Aggregate summary per person — total lent, total to receive, total received, and profit

### 📈 Crypto Portfolio
- Track your cryptocurrency investments and purchases
- Real-time live prices synced via backend proxy (cached for performance)
- Calculate total invested, current value, total P&L, and average buy price per coin
- Beautiful visual breakdown of live market data using dynamic badges

### 📋 Multiple Loan Cycles per Person
- Each person can have multiple independent loan cycles
- Each loan tracks its own **principal, interest, due date, duration, and payment mode**
- Loans are numbered and displayed newest-first

### 🏷️ Business Purpose per Loan
- Tag each loan with a **Business Purpose** (e.g. "Building PC", "Shop Stock", "Phone Repair")
- Shown as a coloured pill badge on the loan card

### 💵 Installment Tracking (Given) — with full History
- Record money given in **multiple installments** per loan
- Every installment has: **amount, date, payment mode, and an optional note**
- Full transaction timeline shown per loan — oldest to newest
- Notes show in italic below each entry for quick reference

### 💳 Custom Payment Modes
- Built-in modes: `UPI`, `Cash`, `Net Banking`, `Cheque`, `Other`
- Add your **own custom payment modes** via Settings (e.g. *Paytm*, *PhonePe*, *Crypto*)
- Custom modes are saved and available across all loan forms

### 📥 Repayment Tracking (Received)
- Record the amount received back for each loan
- Tracks: amount received, date received, payment mode
- Shows remaining balance and marks loan as **Received** when fully paid

### 📊 Dashboard
- Overview of all active loans across all people
- Key metrics: total invested, overdue loans, upcoming due dates

### ⏰ Due Date & Status
- Each loan shows days left / days overdue
- Status badges: `Pending` → `Overdue` → `Received`

### 📤 Export to CSV
- Export all lending data as a CSV file (Excel/Google Sheets compatible)
- Includes: Master Summary, Transaction Details, and Received Payments sections

---

## 🏗️ Tech Stack

### Frontend

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| State | Context API + useState |
| Styling | Vanilla CSS (dark mode, CSS variables) |
| Auth | JWT stored in `localStorage` |

### Backend

| Layer | Technology |
|---|---|
| Language | Go 1.22 |
| Framework | Chi (HTTP router) |
| Database | MySQL 8 |
| Migrations | golang-migrate |
| Auth | JWT (RS256 — private/public key pair) |
| ORM/Query | sqlx (raw SQL, no ORM) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Go 1.22+
- MySQL 8+

### 1. Clone the repositories

```bash
# Frontend
git clone https://github.com/avinashtandon/business-tracker.git
cd business-tracker

# Backend
git clone https://github.com/avinashtandon/business-tracker-backend.git
```

### 2. Start the Backend

```bash
cd business-tracker-backend

# Copy environment config
cp .env.example .env
# Edit .env to set your MySQL DSN, JWT keys, etc.

# Run the server (migrations run automatically on startup)
go run ./cmd/api
```

Backend runs on **http://localhost:8080**

### 3. Start the Frontend

```bash
cd business-tracker
npm install
npm run dev
```

Frontend runs on **http://localhost:5173** and proxies `/api/*` to the backend.

---

## 🌍 Production Deployment

### Frontend (Vercel)
The React application is structurally optimized for deployment using **Vercel**. By configuring the `vercel.json` rewrites rules, API requests effortlessly map to the production backend's static IP without encountering CORS collisions.

### Backend (AWS Lightsail)
The Go REST API relies on a Dockerized lightweight ecosystem deployed on **AWS Lightsail**. It securely operates attached to a static public IPv4 address and handles TLS automatically via reverse proxies. A robust CI/CD pipeline (`.github/workflows`) manages automated, seamless SSH deliveries on `git push`.

---

## 🔑 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Register new user |
| `POST` | `/api/v1/auth/login` | Login and get JWT tokens |
| `POST` | `/api/v1/auth/refresh` | Refresh access token |
| `POST` | `/api/v1/auth/logout` | Logout |
| `GET` | `/api/v1/loans` | List all loans for logged-in user |
| `POST` | `/api/v1/loans` | Create a new loan |
| `GET` | `/api/v1/loans/:id` | Get a single loan |
| `PUT` | `/api/v1/loans/:id` | Update a loan |
| `DELETE` | `/api/v1/loans/:id` | Delete a loan |
| `POST` | `/api/v1/loans/:id/transactions` | Add an installment/received payment |
| `DELETE` | `/api/v1/loans/:id/transactions/:txn_id` | Delete a transaction |

---

## 🗄️ Data Model

```
Loan
  └── id, user_id, person_name, purpose
      ├── principal_amount, interest_amount
      ├── duration, due_date, payment_mode
      ├── status (pending / received)
      └── Transactions[]
            └── id, loan_id, date, amount, mode, note

User
  └── id, email, password_hash, role
```

All loans are linked to the **authenticated user** via `user_id`. No data is shared between accounts.

---

## 🛡️ Authentication

- JWT-based auth using **RS256** (RSA private/public key pair)
- Access token (short-lived) + Refresh token (long-lived, stored in DB)
- All loan and transaction endpoints require a valid `Authorization: Bearer <token>` header

---

## 📁 Frontend Project Structure

```
src/
├── components/       # Reusable UI components (Modal, Sidebar, StatusBadge)
├── context/          # AppContext — global state + all API call logic
├── pages/            # Page components (Dashboard, Lending, PersonDetail, Settings)
├── utils/            # helpers.js — formatCurrency, calcLoanTotals, exportData, etc.
└── App.jsx           # Root app with routing
```
