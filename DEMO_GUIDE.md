# FINOVA – Financial Intelligence Infrastructure
## Phase 3 Live Demonstration & Screenshot Guide

This document provides a click-by-click demonstration script and identifies the exact screenshots to capture for your Phase 3 PowerPoint presentation.

---

## 1. Key Screenshots to Capture for Your PPT

Capture these 7 key screens from your browser (`http://localhost:3000`) for your presentation slides:

1. **Screenshot 1: Hero Landing Page** (`http://localhost:3000`)
   - Captures FINOVA brand identity, feature summary cards, and 15-category preview pills.
2. **Screenshot 2: Registration & Password Strength Meter** (`http://localhost:3000/register`)
   - Captures user registration form with real-time password strength meter turning green (`Strong`).
3. **Screenshot 3: Statement Drag & Drop Upload Interface** (`http://localhost:3000/upload`)
   - Captures drag-and-drop file upload zone, PDF validation notice, and supported bank format list.
4. **Screenshot 4: Extraction Success Card** (`http://localhost:3000/upload`)
   - Captures statement processing success card showing bank name detection, period, total credits, and total debits.
5. **Screenshot 5: Financial Intelligence Dashboard** (`http://localhost:3000/dashboard`)
   - Captures 4 summary metric cards (Total Income, Total Expenses, Net Savings, Savings Rate %) and Smart AI Insights card.
6. **Screenshot 6: Recharts Spending Category Chart** (`http://localhost:3000/dashboard`)
   - Captures interactive spending distribution bar chart displaying category totals.
7. **Screenshot 7: Master Transactions Ledger & Filters** (`http://localhost:3000/transactions`)
   - Captures transactions ledger with category badges, search bar, category dropdown filter, and CSV Export button.

---

## 2. Step-by-Step Live Faculty Demonstration Script

### Step 1: Pre-Demo Startup Commands
```bash
# Terminal 1: Backend API
cd backend
npm run dev

# Terminal 2: Frontend Web App
cd frontend
npm run dev
```

### Step 2: Live Click-by-Click Demonstration

1. **Open Browser**: Go to `http://localhost:3000`.
2. **Explain Pivot**: *"Initially FINOVA was a manual personal finance tracker, but manual entry is tedious. We pivoted to automated bank statement PDF intelligence."*
3. **Register User**:
   - Click **"Get Started Free"** -> `/register`.
   - Enter Name `Faculty Evaluator`, Email `faculty_demo@finova.com`, Password `Password123!`.
   - Point out real-time password strength indicator turning green.
   - Click **"Create Account →"**.
4. **Upload PDF Statement**:
   - Navigate to `/upload`.
   - Drag & drop `sample_hdfc_bank_statement.pdf` (or `1786894549937-217559035.pdf`).
   - Click **"Process Statement Now"**.
   - Show statement processing success result showing extracted count, total credits (₹85,000), and total debits (₹59,947).
5. **Explore Dashboard**:
   - Click **"View Dashboard Analytics"** -> `/dashboard`.
   - Show Total Income, Total Expenses, Net Savings (₹29,043.48), and Savings Rate (32.1%).
   - Point out Recharts bar chart and Smart AI Insights.
6. **Master Ledger & CSV Export**:
   - Click **"Transactions"** in navbar -> `/transactions`.
   - Search `Swiggy` or filter by category (`Food & Dining`).
   - Click **"Export Ledger CSV"** to download the CSV export file.
