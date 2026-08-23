# FINOVA — Modules Explanation

## How Each Module Works

---

### 1. User Authentication

**Files**: `backend/src/controllers/auth.controller.ts`, `backend/src/middleware/auth.middleware.ts`

Users register with name, email, and password. Passwords are hashed using **bcryptjs** (salt rounds: 12). On login, the server issues two tokens:
- **Access Token** (JWT, 15 minutes): used for every authenticated API call in the `Authorization: Bearer` header
- **Refresh Token** (JWT, 7 days): stored in the database `RefreshToken` table; used to silently obtain new access tokens

If the access token expires, the frontend automatically calls `/api/auth/refresh` and retries the original request. Logout deletes the refresh token from the database. All authenticated routes use the `authenticate` middleware that verifies the JWT signature and expiry.

---

### 2. Bank Statement Upload & PDF Parsing

**Files**: `backend/src/services/pdf-parser.service.ts`, `backend/src/controllers/statements.controller.ts`

Bank statements are uploaded as PDF files. The system uses **pdfjs-dist** to extract raw text from the PDF. The parser:
1. Detects the bank (HDFC, ICICI, SBI, Axis, Kotak) from header text
2. Applies bank-specific regex patterns to identify table rows
3. Reconstructs multi-line narrations (bank PDFs often wrap long descriptions)
4. Extracts: date, description/narration, debit amount, credit amount, and running balance

The extracted text is passed to the categorization engine before being saved to the database.

---

### 3. Wallet Transaction Import

**Files**: `backend/src/services/wallet-parser.service.ts`, `backend/src/routes/wallet.routes.ts`

Since FINOVA cannot directly access private wallet accounts without official API authorization, users export their transaction history from PhonePe/Paytm/Google Pay as a CSV or PDF file and upload it to FINOVA.

The wallet parser:
- **CSV**: Detects which wallet the file is from based on column headers and filename. Supports: PhonePe CSV, Paytm CSV, Google Pay CSV, and generic CSV with Date/Description/Amount columns.
- **PDF**: Extracts text and applies wallet-specific patterns.

All wallet transactions are tagged with `source: 'WALLET'` and `provider: 'PhonePe'` (or appropriate provider) in the database, keeping them separate from bank transactions while allowing unified analysis.

---

### 4. 7-Layer Categorization Engine

**Files**: `backend/src/services/categorizer.service.ts`, `backend/src/services/merchant-kb.service.ts`

Every transaction narration passes through 7 priority layers:

| Layer | Rule | Example |
|---|---|---|
| 1 | Income: credit + salary/refund/dividend keywords | "SALARY CREDIT JUL" → Income |
| 2 | Merchant KB exact/alias match | "SWIGGY ORDER" → Food & Dining |
| 3 | Insurance/EMI/investment/rent patterns | "LIC PREMIUM" → Insurance & Premium |
| 4 | Personal name detection (UPI P2P) | "UPI/Rahul Sharma" → Person-to-Person |
| 5 | General keyword rules (fuel, pharmacy, etc.) | "PETROL PUMP" → Fuel |
| 6 | Wallet/channel-specific rules | Wallet top-up → Wallet Transfer |
| 7 | Fallback | Unknown → Other / Needs Review |

Each result includes:
- `category`, `subcategory`: what the transaction is
- `confidence`: high / medium / low
- `classificationReason`: plain-English explanation of WHY
- `needsReview`: true when confidence is low

**Known merchants always take priority** over generic keyword rules.

---

### 5. Merchant Knowledge Base

**File**: `backend/src/services/merchant-kb.service.ts`

A structured database of **200+ Indian merchants** organized by category and subcategory. Each entry has a primary name and optional aliases for handling abbreviations and alternate spellings.

| Category | Example Merchants |
|---|---|
| Food & Dining / Delivery | Swiggy, Zomato, Dunzo |
| Groceries / Quick Commerce | Blinkit, Zepto, Instamart |
| Shopping / Online | Amazon, Flipkart, Myntra, Meesho |
| Entertainment / Streaming | Netflix, Prime Video, Hotstar |
| Transport / Cabs | Uber, Ola, Rapido |
| Healthcare | Apollo Pharmacy, 1mg, Practo |
| Investments | Zerodha, Groww, Upstox |

Adding a new merchant requires only one line in the KB — no other code changes needed.

---

### 6. Dashboard & Financial Intelligence

**Files**: `backend/src/controllers/dashboard.controller.ts`, `backend/src/services/financial-intelligence.service.ts`

The dashboard fetches all non-duplicate transactions for the user and runs the financial intelligence engine:
- **Savings Rate**: `(income - expenses) / income × 100`
- **Discretionary Spend Ratio**: food + shopping + entertainment as % of total expenses
- **Debt-to-Income Ratio**: EMI payments as % of income
- **Top Categories**: ranked by total spend
- **Top Merchants**: ranked by total amount
- **Smart Insights**: 4 data-backed observations (savings, high-spend category, investments, debt burden)
- **Forecast**: recurring items (rent, EMIs, subscriptions) projected forward
- **Bank vs Wallet Summary**: separate totals for bank account and wallet transactions

All values come from real database records — no static or mock data.

---

### 7. Budget Management

**File**: `backend/src/controllers/budget.controller.ts`

Users set a monthly spending limit per category (e.g. Food & Dining: ₹5,000 for August 2026). When fetching budgets, the backend queries actual transaction debits for that category within the month's date range and computes:
- `spent`: actual amount debited in that category this month
- `remaining`: `limitAmount - spent`
- `usagePercent`: `(spent / limitAmount) × 100`

---

### 8. Savings Goals

**File**: `backend/src/controllers/savings.controller.ts`

Users create financial goals with a target amount, saved amount, optional deadline, and emoji. Progress is calculated client-side as `(savedAmount / targetAmount) × 100`. Users manually update `savedAmount` as they save money. Goals can be marked completed.

---

### 9. Loan & EMI Tracker

**File**: `backend/src/controllers/loans.controller.ts`

Users manually add active loans with principal, outstanding amount, EMI, interest rate, tenure, and next due date. The tracker:
- Shows payoff progress: `(principal - outstanding) / principal × 100`
- Auto-detects EMI-category transactions from the user's bank statements (shown as "Detected EMIs" for reference)
- Supports loan types: Home, Car, Personal, Education, Business, Gold

---

### 10. Financial Reports

**File**: `frontend/src/app/reports/page.tsx`

Pulls data from the dashboard API and presents:
- Bank vs Wallet transaction breakdown side-by-side
- Financial health ratios with benchmarks (Savings Rate ≥20%, Discretionary ≤30%, Debt-to-Income ≤35%)
- Top expense categories with horizontal bar visualization
- Top merchants by spending amount
- Browser print/export functionality

---

### 11. Duplicate Detection

**File**: `backend/src/controllers/statements.controller.ts` (`detectDuplicates`)

When uploading a new statement (bank or wallet), each new transaction is compared against the user's existing transactions from the last 90 days. A transaction is flagged as a potential duplicate if:
1. The amounts match exactly (within ₹0.01)
2. The transaction type matches (both credit or both debit)
3. The dates are within ±2 days of each other
4. Either: the reference IDs match exactly, OR the narration first 30 characters significantly overlap

Duplicates are stored with `isDuplicate: true` and excluded from financial calculations.
