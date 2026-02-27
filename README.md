# 💸 LendTrack — Business Money Tracker

A dark-mode, mobile-friendly web app to track money you lend to people across multiple loan cycles. Built with React + Vite, all data stored locally in the browser.

## Features

### 👤 People
- Add, rename, and delete people you lend money to
- See an aggregate summary per person — total lent, total to receive, total received, and profit

### 📋 Multiple Loan Cycles per Person
- Each person can have multiple independent loan cycles
- Each loan tracks its own principal, interest, due date, duration, and repayment
- Loans are numbered and displayed newest-first

### 🏷️ Business Purpose per Loan
- Tag each loan with a **Business Purpose** (e.g. "Building PC", "Shop Stock", "Phone Repair")
- Shown as a yellow pill badge on the loan card so you instantly know what each loan was for

### 💵 Installment Tracking (Given)
- Record money given in multiple installments per loan
- Each installment has: amount, date, payment mode (UPI / Cash / Bank Transfer / Cheque)
- **Reason / Note per installment** — e.g. "For GPU", "For case", "First payment"
- Notes display in italic purple below each installment for quick reference

### 📥 Repayment Tracking (Received)
- Record the amount received back for each loan
- Tracks: amount received, date received, payment mode
- Shows remaining balance and marks loan as **Received** when fully paid

### 📊 Dashboard
- Overview of all active loans across all people
- Key metrics: total invested, overdue loans, upcoming due dates

### ⏰ Due Date & Status
- Each loan shows days left / days overdue
- Status badges: `Pending` → `Active` → `Overdue` → `Received`

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| State | useReducer + Context API |
| Storage | localStorage (no backend needed) |
| Styling | Vanilla CSS with CSS variables (dark mode) |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Data Model

```
people[]
  └── id, name, createdAt
      └── loans[]
            └── id, purpose, interest, dueDate, duration, createdAt
                └── transactions[]  ← money given
                      └── id, date, amount, mode, note
                amountReceived, dateReceived, receivedPaymentMode
```

All data is persisted to `localStorage` under the key `business-tracker-data-v2`.
