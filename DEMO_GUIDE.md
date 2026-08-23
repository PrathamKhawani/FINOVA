# FINOVA — Demo Guide

## How to Run and Demo the Application

---

## Prerequisites

- Node.js 18+ installed
- Git

---

## Setup (First Time)

```bash
# 1. Clone the repository
git clone https://github.com/PrathamKhawani/FINOVA.git
cd FINOVA

# 2. Install backend dependencies
cd backend
npm install

# 3. Set up environment variables
# Create backend/.env with:
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-jwt-secret-here"
JWT_REFRESH_SECRET="your-refresh-secret-here"
PORT=5000

# 4. Initialize the database
npx prisma db push

# 5. Install frontend dependencies
cd ../frontend
npm install

# 6. Set up frontend environment
# Create frontend/.env.local with:
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## Running Locally

Open **two terminal windows**:

**Terminal 1 — Backend**:
```bash
cd FINOVA/backend
npm run dev
# → 🚀 FINOVA API running on http://localhost:5000
```

**Terminal 2 — Frontend**:
```bash
cd FINOVA/frontend
npm run dev
# → ▲ Next.js ready on http://localhost:3000
```

Open `http://localhost:3000` in your browser.

---

## Demo Flow (Step by Step)

### 1. Register
- Go to `http://localhost:3000`
- Click **Get Started** or **Register**
- Fill in: Name, Email, Password → Register

### 2. Login
- Email: `your-registered-email`
- Password: `your-password`
- You will land on the **Dashboard**

### 3. Upload a Bank Statement
- Click **Upload Bank Statement** (top right of Dashboard, or Navbar → Upload)
- Drag and drop a bank statement PDF (HDFC, ICICI, SBI, Axis, or Kotak)
- Click **Process Statement**
- Success message: "Extracted N transactions from [Bank Name] statement"

### 4. View Transactions
- Navbar → **Transactions**
- See the full Master Ledger with all extracted transactions
- Use filters: Search, Category, Type, Confidence
- **Click any row** to expand it and see:
  - Original raw narration (exactly as in the PDF)
  - Extracted entity / merchant
  - Payment channel (UPI, NEFT, Card, ATM)
  - Source (🏦 Bank or 📱 Wallet)
  - WHY this category was assigned (classificationReason)
  - DUPE? badge (if potential duplicate)
  - REVIEW badge (if low confidence)

### 5. Import Wallet Transactions
- Navbar → **Wallet Import**
- Read the instructions for exporting from PhonePe / Paytm / Google Pay
- Upload the exported CSV file
- Wallet transactions appear in the ledger with 📱 badge

### 6. Dashboard
- Navbar → **Dashboard**
- View:
  - Total Income, Expenses, Net Savings, Savings Rate
  - Bank Summary vs Wallet Summary cards
  - Smart Insights (savings rate, top category, investments, debt)
  - Category Spending Chart (bar)
  - Recurring Payments detected
  - Forecast

### 7. Budget Manager
- Navbar → **More** → **Budget**
- Click **+ Add Budget**
- Select category (e.g. Food & Dining), enter limit (e.g. ₹5000), month
- See actual spending vs limit with color-coded progress bar

### 8. Savings Goals
- Navbar → **More** → **Savings Goals**
- Click **+ New Goal**
- Enter: Name, Target Amount, Saved Amount, Deadline, Emoji
- See progress percentage and remaining amount

### 9. Loans & EMI
- Navbar → **More** → **Loans & EMI**
- Click **+ Add Loan**
- Enter: Loan name, Principal, Outstanding, EMI, Interest Rate, Type
- See payoff progress bar
- Scroll down → "Detected EMI Transactions" shows EMIs found in your bank statement

### 10. Financial Reports
- Navbar → **More** → **Reports**
- See:
  - Category spending breakdown (horizontal bars)
  - Financial Health Ratios (Savings Rate, Discretionary Spend, Debt-to-Income)
  - Bank vs Wallet comparison
  - Top merchants by spend

---

## Test Data — Sample Wallet CSV

To test wallet import, create a file named `phonepe_transactions.csv` with:

```csv
Date,Description,Type,Amount,Balance
01/08/2026,Swiggy Order,Debit,350.00,12650.00
02/08/2026,Money Received from Rahul,Credit,500.00,13150.00
03/08/2026,Zomato Food Order,Debit,280.00,12870.00
04/08/2026,Recharge - Jio Prepaid,Debit,239.00,12631.00
05/08/2026,Amazon Shopping,Debit,1299.00,11332.00
```

Upload this on the Wallet Import page to see it parsed and categorized.

---

## Important Notes for the Guide Demo

1. **Wallet Import** — We import exported files, not live account data. This is by design.
2. **Categorization** — Known merchants get exact KB matches. Unknown/ambiguous transactions get "Needs Review" — the system never fabricates categories.
3. **Duplicate Detection** — If you upload a bank PDF and then a PhonePe CSV for the same period, overlapping transactions will be flagged as potential duplicates with a "DUPE?" badge.
4. **Privacy** — No uploaded PDFs or SQLite database files are committed to Git.
