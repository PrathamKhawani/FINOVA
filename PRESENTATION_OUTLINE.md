# FINOVA — Presentation Outline

## Semester 7 Guide Presentation

**Duration**: 10–15 minutes  
**Format**: Live demo + code walkthrough

---

## Slide / Section 1 — Problem Statement (1 minute)

**The Problem**:
- Most people don't know where their money goes
- Manual tracking in Excel is tedious and error-prone
- Bank statements are in PDF format — unstructured data
- People use multiple payment methods: bank accounts + digital wallets (PhonePe, Paytm, Google Pay)

**The Solution**:
- FINOVA automates this entirely
- Upload your bank statement PDF → FINOVA extracts every transaction
- Import wallet CSV exports → unified view of all spending
- AI-powered categorization tells you exactly what you spent on
- Budget tracker, savings goals, loan EMI tracker — all in one place

---

## Slide / Section 2 — System Architecture (2 minutes)

```
User → Next.js Frontend (Port 3000)
           ↓ REST API calls (JWT Bearer token)
       Express Backend (Port 5000)
           ↓
       PDF Parser → Categorization Engine → Prisma ORM → SQLite DB
```

**Key Design Decisions**:
- SQLite for development (zero-config); easily swap to PostgreSQL for production
- JWT access (15 min) + refresh tokens (7 days) for secure, stateless auth
- pdfjs-dist for pure-JS PDF text extraction (no OCR binary needed)
- 7-layer rule-based categorizer with a 200-merchant knowledge base

---

## Slide / Section 3 — Live Demo (6–8 minutes)

### Step 1: Register & Login
> Show the auth flow — register a new account, login, see JWT token stored.

### Step 2: Upload Bank Statement
> Upload a bank statement PDF.
> Show: "Extracted 42 transactions from HDFC Bank statement"
> Navigate to Transactions → expand any row → show raw narration + WHY explanation + confidence score

### Step 3: Wallet Import
> Go to Wallet Import page → upload PhonePe CSV.
> Show wallet transactions appear in the ledger with 📱 PhonePe badge.
> Point out: "We import files — we do NOT access private accounts without authorization."

### Step 4: Dashboard
> Show: Income, Expenses, Net Savings, Savings Rate
> Show: Bank vs Wallet summary split
> Show: Smart Insights (data-driven, not fabricated)
> Show: Top spending categories chart
> Show: Recurring items forecast

### Step 5: Budget Manager
> Create a Food & Dining budget of ₹5,000.
> Show: actual spending pulled from transaction data, progress bar.

### Step 6: Savings Goals
> Create "Emergency Fund" goal — ₹50,000.
> Show: progress tracking and deadline.

### Step 7: Loans & EMI
> Add a Personal Loan — ₹2,00,000 at 12% interest.
> Show: payoff progress bar + auto-detected EMI transactions from statement.

### Step 8: Reports
> Show: category analysis charts, health ratio indicators.
> Show: Bank vs Wallet comparison.

---

## Slide / Section 4 — Technical Highlights (2 minutes)

### 7-Layer Categorization
1. Income detection (salary, refund, dividend)
2. Merchant Knowledge Base (200+ merchants, instant match)
3. Insurance / EMI / investment product patterns
4. Person-to-Person detection (150+ Indian names + UPI pattern)
5. General keyword rules (fuel, pharmacy, utilities)
6. Wallet-specific rules
7. Fallback → Needs Review

### WHY Explanation
Every transaction stores a `classificationReason` field:
> "Merchant Knowledge Base: 'Swiggy' → Food & Dining / Food Delivery. Confidence: High."

### Duplicate Detection
> "Same amount + same type + date within 2 days + narration overlap = potential duplicate. Flagged, excluded from calculations, shown with DUPE? badge."

---

## Slide / Section 5 — Semester 8 Roadmap (1 minute)

| Feature | Status |
|---|---|
| Direct PhonePe/Paytm API | Semester 8 (requires official authorization) |
| AI/ML semantic categorization | Semester 8 |
| Multi-month trend analysis | Semester 8 |
| Mobile app | Semester 8 |
| Financial Digital Twin | Future scope |

---

## Anticipated Guide Questions & Answers

**Q: Can FINOVA access my PhonePe account directly?**
A: No. We use file-based import — users export their transaction history from within the wallet app and upload the CSV to FINOVA. Direct API access requires official authorization from the payment platforms, which is planned for Semester 8.

**Q: How accurate is the categorization?**
A: Known merchants (Swiggy, Amazon, Netflix, etc.) get high-confidence exact matches via the knowledge base. UPI person transfers are detected separately. Ambiguous transactions are marked "Needs Review" and shown with low confidence — the system does not guess randomly.

**Q: What about data security?**
A: Passwords are bcrypt-hashed. JWTs expire in 15 minutes. SQLite database, uploaded PDFs, and environment files are excluded from Git. No sensitive data is committed to the repository.

**Q: Can this scale beyond SQLite?**
A: Yes. The Prisma schema is database-agnostic. Changing the `DATABASE_URL` to a PostgreSQL connection string and running `prisma migrate` would migrate the entire schema.
