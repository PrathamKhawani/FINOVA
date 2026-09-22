# FINOVA — Demo Guide

> **Semester 7 Final Submission**
> Step-by-step guide for demonstrating every module. All financial figures shown will come from actual uploaded data.

---

## Prerequisites

Ensure both servers are running:
```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Open: **http://localhost:3000**

---

## Demo Workflow

### Step 1: Register

1. Navigate to **http://localhost:3000/register**
2. Enter:
   - Name: `Demo User`
   - Email: `demo@finova.test`
   - Password: `Demo@12345`
3. Click **Create Account**
4. Verify: Redirected to dashboard showing zero values (confirming no mock data)

---

### Step 2: Upload Bank Statement (PDF)

1. Click **Upload Statement** in the navbar or sidebar
2. Navigate to **http://localhost:3000/upload**
3. Select **Bank Statement (PDF)**
4. Upload any HDFC/ICICI/SBI/Axis/Kotak Bank statement PDF
5. Click **Upload & Process**
6. Verify response shows:
   - Bank name detected (e.g., "HDFC Bank")
   - Statement period detected
   - Number of transactions extracted
   - Any duplicate warnings (if re-uploading)

---

### Step 3: View Extracted Transactions

1. Navigate to **Transactions** (sidebar)
2. Verify:
   - All transactions are listed with date, description, amount, category
   - Categories are auto-assigned (Food & Dining, Income, Shopping, etc.)
   - Each row shows source badge (BANK) and provider (HDFC Bank)
   - Any `DUPE?` badges visible if applicable
3. Use the search bar to search "UPI" or "NEFT"
4. Use category filter dropdown to filter by "Food & Dining"

---

### Step 4: Upload Wallet Statement (Optional — requires PhonePe/Paytm export)

1. Navigate to **http://localhost:3000/wallet**
2. Select **Wallet type** (PhonePe / Paytm / Google Pay / Generic)
3. Upload exported CSV file
4. Verify: Transactions appear tagged as WALLET source
5. Navigate to Transactions — verify duplicates are flagged if overlapping with bank data

---

### Step 5: Dashboard

1. Navigate to **Dashboard**
2. Verify all widgets show real data (not zeroes):
   - Total Income / Total Expenses / Net Savings
   - Savings Rate (percentage)
   - Top Spending Categories chart
   - Recent Transactions list
   - Smart Insights cards (should show 3–8 insights)
   - Financial Forecast (upcoming recurring payments)
3. Verify Bank vs Wallet split shows correct totals

---

### Step 6: Budget Management

1. Navigate to **Budget**
2. Click **+ Add Budget**
3. Create:
   - Category: `Food & Dining`
   - Monthly Limit: `₹5,000`
4. Click **Save**
5. Verify the budget card immediately shows:
   - Actual `spent` amount from uploaded transactions
   - `remaining` amount
   - Progress bar reflecting real spending
6. Create another budget (e.g., `Shopping: ₹3,000`)
7. Delete one budget — verify it disappears

---

### Step 7: Savings Goals

1. Navigate to **Savings Goals**
2. Click **+ New Goal**
3. Create:
   - Name: `Emergency Fund`
   - Target: `₹100,000`
   - Currently Saved: `₹25,000`
   - Target Date: 6 months from today
   - Emoji: 🏦
4. Verify:
   - Progress bar shows 25%
   - Deadline status shown
   - "Actual Net Savings" displayed (from real transactions, not static)
5. Edit the goal — update saved amount to `₹30,000` → verify progress updates to 30%

---

### Step 8: Loan & EMI Tracking

1. Navigate to **Loans**
2. Click **+ Add Loan**
3. Enter:
   - Name: `Home Loan`
   - Lender: `HDFC Bank`
   - Principal: `₹50,00,000`
   - Outstanding: `₹45,00,000`
   - Monthly EMI: `₹45,000`
   - Interest Rate: `8.5%`
   - Loan Type: `Home`
4. Verify:
   - Payoff progress shows 10%
   - If EMI transactions exist in uploaded statements, they appear under "Matched EMIs"
   - Unmatched EMI-category transactions appear under "Detected EMIs" for reference

---

### Step 9: Financial Reports

1. Navigate to **Reports**
2. With no filters (All time, All sources):
   - Verify Income vs Expenses summary
   - View Category Breakdown chart
   - View Monthly Trend chart
   - View Recurring Payments list (if ≥2 months of data)
3. Apply month filter: Select a specific month
   - Verify all numbers update to reflect only that month's transactions
4. Apply source filter: Select "BANK only"
   - Verify wallet transactions are excluded from totals

---

### Step 10: Smart Insights

1. Return to **Dashboard**
2. Scroll to the **Smart Insights** section
3. Each insight card shows:
   - Type indicator (success/warning/info/alert)
   - Title and message
   - "Why this insight" — the actual numbers that triggered it
4. Verify insights reference real figures from uploaded transactions

---

### Step 11: Logout

1. Click user avatar or "Logout" in the sidebar
2. Verify: Redirected to login page
3. Try accessing http://localhost:3000/dashboard directly
4. Verify: Redirected to login (protected route working)
5. Log back in — verify session is restored correctly

---

## What the Examiner Will See

All financial figures shown during the demo derive from actual uploaded bank/wallet statements stored in the SQLite database. There are no hardcoded numbers, no `Math.random()` values, and no static demo data anywhere in the production code.

---

## Key Technical Points to Highlight

| Feature | Technical Detail |
|---|---|
| PDF parsing | Coordinate-based column detection, not regex-only |
| Categorization | 7-layer pipeline, 350+ merchant KB, explainable |
| Duplicate detection | Cross-source fuzzy match, preserved not deleted |
| Security | JWT rotation, bcrypt cost 12, PDFs auto-deleted |
| User isolation | DB queries always filter by `userId` |
| Integration tests | 55 automated API tests, 100% pass rate |
