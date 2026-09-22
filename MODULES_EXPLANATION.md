# FINOVA — Modules Explanation

> **Semester 7 Final Documentation**
> Reflects actual codebase as of final submission. All modules have been integration-tested.

---

### 1. User Authentication

**Files**: `backend/src/controllers/auth.controller.ts`, `backend/src/middleware/auth.middleware.ts`

Users register with name, email, and password. Passwords are hashed using **bcryptjs** (cost factor: 12). On login, the server issues two tokens:
- **Access Token** (JWT, 15 minutes): sent in the `Authorization: Bearer` header for every authenticated API call
- **Refresh Token** (JWT, 7 days): stored in the database `RefreshToken` table; rotated on each use (old token deleted, new one issued)

If the access token expires, `api.ts` automatically calls `/api/auth/refresh` and retries the original request seamlessly. Logout deletes the refresh token from the database, preventing reuse.

Security properties verified:
- Duplicate email registration returns 409
- Passwords shorter than 8 characters are rejected with 400
- Wrong password returns 401 with a generic "Invalid credentials" message (no user enumeration)
- All protected routes return 401 for unauthenticated or token-expired requests
- Revoked refresh tokens are rejected after logout

---

### 2. Bank Statement Upload & PDF Parsing

**Files**: `backend/src/services/pdf-parser.service.ts`, `backend/src/controllers/statements.controller.ts`

Bank statements are uploaded as PDF files. The parser operates in three stages:

**Stage 1 — Coordinate-Based Extraction (pdfjs-dist)**
Extracts every text item with its X/Y coordinates. Groups items by Y position (6px tolerance) to reconstruct visual rows. This is the most accurate extraction method.

**Stage 2 — Plain Text Fallback (pdf-parse)**
If Stage 1 returns fewer than 5 lines, falls back to a simpler line-by-line text extraction.

**Stage 3 — OCR Fallback (Tesseract.js)**
For scanned/image-based PDFs, runs Tesseract OCR. A `warnings[]` field in the API response notifies the user when OCR was used.

**Column Detection**: Dynamically maps Debit, Credit, and Balance column X-positions from the header row, then assigns amounts column-aware to correct direction. Supports 9+ Indian bank formats.

**Privacy**: Uploaded files are deleted from disk immediately in a `finally` block after extraction completes (or fails). Raw files are never permanently stored.

---

### 3. Wallet Statement Import

**Files**: `backend/src/services/wallet-parser.service.ts`, `backend/src/routes/wallet.routes.ts`

PhonePe, Paytm, and Google Pay do not offer public consumer APIs. Users export their transaction history as CSV or PDF from the wallet app and upload to FINOVA.

- **CSV**: Auto-detects provider from column headers and filename. Parses PhonePe, Paytm, Google Pay, and generic CSV formats.
- **PDF**: Extracts text and applies wallet-specific patterns.

Wallet transactions are tagged `source: 'WALLET'` and `provider: 'PhonePe'` (or detected provider) in the database. All financial modules handle bank and wallet transactions from the same `Transaction` table while preserving their source labels.

---

### 4. Transaction Extraction & Raw Data Preservation

**File**: `backend/src/controllers/statements.controller.ts`

Each extracted row is stored with:
- `rawNarration`: the original narration text as-is from the PDF/CSV
- `description`: cleaned narration (dates and amounts stripped)
- `amount`: normalized positive number
- `type`: `'credit'` or `'debit'`
- `date`: parsed to ISO DateTime
- `balance`: running account balance (null if not in statement)
- `referenceId`: UPI reference, cheque number, or transaction ID
- `source`: `'BANK'` or `'WALLET'`
- `provider`: bank name or wallet name
- `isDuplicate`: flagged at import time if a likely duplicate exists

---

### 5. Entity / Merchant Identification

**Files**: `backend/src/services/entity-resolver.service.ts`, `backend/src/services/merchant-kb.service.ts`

The Entity Resolution pipeline processes raw narrations to identify who the money went to/came from:

1. **Normalize**: lowercase, strip control characters, collapse whitespace
2. **UPI VPA Extraction**: parse `UPI/recipient@bank` → extract recipient identifier
3. **Knowledge Base Lookup**: 350+ Indian entities with aliases and VPA patterns
4. **Direction Intelligence**: salary/refund/dividend → income; EMI/subscription → recurring expense
5. **Person Detection**: 150+ Indian first names + surname patterns → Person-to-Person Transfer
6. **Keyword Rules**: petrol pump, pharmacy, electricity, etc.
7. **Fallback**: `needsReview: true`, category `Other / Needs Review`

Results stored: `merchantName`, `counterparty`, `channel`, `entityType`, `businessType`, `legalName`, `parentCompany`, `extractedVPA`, `matchedAlias`, `classificationReason`.

---

### 6. 7-Layer Categorization Engine

**Files**: `backend/src/services/categorizer.service.ts`, `backend/src/services/entity-resolver.service.ts`

Every transaction is assigned a `category`, `subcategory`, `confidence`, and `classificationReason`. The 7 layers (in priority order):

| Layer | Rule | Example |
|---|---|---|
| 1 | Income keywords (credit) | "SALARY CREDIT JUL" → Income |
| 2 | Merchant KB exact/alias match | "SWIGGY ORDER" → Food & Dining |
| 3 | Insurance/EMI/investment/rent patterns | "LIC PREMIUM" → Insurance & Premium |
| 4 | Person name heuristic (UPI P2P) | "UPI/Rahul Sharma" → Person-to-Person |
| 5 | General keyword rules | "PETROL PUMP" → Fuel |
| 6 | Wallet/channel-specific rules | Wallet top-up → Internal Transfer |
| 7 | Fallback | Unknown → Other / Needs Review |

Known merchant KB entries always override generic keyword rules.

---

### 7. Duplicate Detection

**File**: `backend/src/controllers/statements.controller.ts` — `detectDuplicates()`

At upload time, each new transaction is compared against existing transactions for the same user from the past 90 days. A transaction is flagged `isDuplicate: true` if:
1. Amounts match within ₹0.01
2. Transaction direction (`type`) matches
3. Dates are within ±2 days
4. Either: reference IDs match exactly, OR first 15 characters of raw narration significantly overlap

Duplicate records are **preserved in the database** with `isDuplicate: true`. They appear in the Master Ledger with a "DUPE?" badge. All financial calculations (savings rate, budgets, category totals, reports) explicitly filter `isDuplicate: false`.

---

### 8. Dashboard & Smart Insights

**Files**: `backend/src/controllers/dashboard.controller.ts`, `backend/src/services/financial-intelligence.service.ts`

The dashboard runs `analyzeFinancials()` on the user's complete non-duplicate transaction set:

**Summary Metrics:**
- `totalIncome`: sum of all Income-type credits
- `totalExpenses`: sum of all Expense/EMI/Investment debits (transfers excluded)
- `netSavings`: `income - expenses`
- `savingsRate`: `(netSavings / income) × 100`
- `discretionarySpendRatio`: food + shopping + entertainment as % of expenses
- `debtToIncomeRatio`: EMI payments as % of income

**Insights Engine**: Generates 4–8 data-backed observations. Each insight includes `title`, `message`, and `explanation` (the specific numbers that triggered it).

**Forecast**: Detects recurring items (same merchant, ≥2 months) and projects upcoming fixed commitments.

All values come from real database rows — no static or mock data exists anywhere.

---

### 9. Budget Management

**File**: `backend/src/controllers/budget.controller.ts`

Monthly category budgets. When fetching budgets for a month, the backend:
1. Queries all non-duplicate, non-transfer debit transactions for that month and user
2. Sums by category into `spendMap`
3. Attaches `spent`, `remaining`, and `usagePercent` to each budget row

Users can set limits per category per month. Deleting a budget does not delete any transactions.

---

### 10. Savings Goals

**File**: `backend/src/controllers/savings.controller.ts`

Users create financial goals with:
- `name`, `targetAmount`, `savedAmount`, `targetDate` (optional), `emoji`
- `isCompleted` flag (can be toggled)

Progress is `(savedAmount / targetAmount) × 100`. The API also returns `derivedData.actualNetSavings` — the user's net savings computed from real transactions — as context for goal planning. This prevents double-counting because savings are derived from the financial intelligence engine which excludes internal transfers.

---

### 11. Loan & EMI Tracking

**File**: `backend/src/controllers/loans.controller.ts`

Users manually add active loans:
- Fields: `name`, `lenderName`, `principalAmount`, `outstandingAmount`, `emiAmount`, `interestRate`, `tenureMonths`, `startDate`, `nextDueDate`, `loanType`, `isActive`
- Computed: `payoffPercent = (principal - outstanding) / principal × 100`
- Supported loan types: Home, Car, Personal, Education, Business, Gold

**EMI Auto-Detection**: The GET /loans endpoint scans the user's non-duplicate debit transactions categorized as `EMI/Loan` and attempts to match them to the user's loans by:
1. Exact EMI amount match
2. Lender name substring match in narration/counterparty

Unmatched EMI transactions appear as "Detected EMIs" for informational reference. EMI transactions are not automatically assigned to loans without sufficient evidence.

---

### 12. Financial Reports

**Files**: `backend/src/controllers/reports.controller.ts`, `frontend/src/app/reports/page.tsx`

Dedicated `/api/reports/summary` endpoint with three filter parameters:
- `month`: `YYYY-MM` — restrict to a specific calendar month
- `startDate` / `endDate`: `YYYY-MM-DD` — custom date range
- `source`: `BANK` | `WALLET` | `ALL`

**Report Sections:**
- Summary: income, expenses, net, savings rate, discretionary ratio, debt ratio
- Bank vs Wallet split: independent totals for each source
- Category breakdown: chart-ready sorted array with amounts and percentages
- Monthly trend: month-by-month income vs expenses
- Recurring payment detection: merchants appearing in ≥2 distinct months
- Top merchants by total spending
- Available months selector for the filter UI

All data derived exclusively from database transactions.

---

### 13. Security & Privacy

**Files**: `backend/src/middleware/auth.middleware.ts`, `backend/src/index.ts`

- All protected endpoints require `Authorization: Bearer <token>` — missing or invalid tokens return 401
- Every database query filters by `userId: req.user!.userId` — cross-user data access is architecturally impossible
- Uploaded bank/wallet files are deleted immediately after parsing (in a `finally` block)
- The `/uploads` directory is NOT publicly served (static file serving removed)
- Prisma logs only `error` and `warn` levels — raw transaction queries are never printed to logs
- `.gitignore` excludes `.env`, `*.db`, `uploads/`, logs, and all temporary files
- Integration test confirmed: User A cannot read User B's budgets, statements, or transactions
