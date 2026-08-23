# FINOVA — Project Plan

## Semester 7 Project Plan

**Project Title**: FINOVA — Automated Financial Intelligence & Management System  
**Team Size**: Individual Project  
**Submission**: End of Semester 7

---

## Project Goal

Build a web application that automates personal financial management by:
1. Extracting transactions from bank statement PDFs without manual entry
2. Automatically categorizing every transaction with explainable AI rules
3. Supporting wallet transaction import (PhonePe, Paytm, Google Pay via CSV/PDF)
4. Providing actionable financial insights, budget tracking, savings goals, and loan management

---

## Semester 7 Scope

### Phase 1 — Foundation (Weeks 1–3)
- [x] Project structure: Next.js frontend + Express backend + SQLite via Prisma
- [x] User authentication: register, login, JWT access + refresh tokens, logout
- [x] Protected route middleware
- [x] Database schema: User, BankStatement, Transaction, RefreshToken

### Phase 2 — Core Processing (Weeks 4–7)
- [x] PDF parsing engine using pdfjs-dist (no OCR dependency)
- [x] Multi-bank support: HDFC, ICICI, SBI, Axis, Kotak layouts
- [x] Multi-line narration reconstruction
- [x] Transaction extraction: date, narration, debit, credit, balance, referenceId
- [x] Initial keyword-based categorization

### Phase 3 — Intelligence Layer (Weeks 8–11)
- [x] 200+ merchant knowledge base with category mappings
- [x] 7-layer categorization pipeline
- [x] Person-to-Person transfer detection (150+ Indian names)
- [x] WHY explanation stored per transaction (`classificationReason`)
- [x] Wallet statement import (CSV/PDF, file-based, no direct API)
- [x] Duplicate transaction detection (fuzzy matching)
- [x] Schema extensions: source, provider, isDuplicate, needsReview, classificationReason

### Phase 4 — Financial Modules (Weeks 12–14)
- [x] Dashboard: real-time analytics from database
- [x] Budget Management: monthly category limits + actual spend
- [x] Savings Goals: targets, progress, deadlines
- [x] Loan & EMI Tracker: active loans, payoff progress, EMI detection
- [x] Financial Reports: category analysis, health ratios, bank vs wallet
- [x] Smart Insights: data-driven observations (savings, debt, investments)

### Phase 5 — Polish & Submission (Week 15)
- [x] TypeScript build passes (0 errors)
- [x] Frontend production build passes
- [x] Security audit: .env, .db, uploads excluded from Git
- [x] Complete documentation
- [x] GitHub push

---

## Semester 8 Planned Features

| Feature | Rationale |
|---|---|
| PhonePe/Paytm direct API | Requires official API authorization (Account Aggregator framework) |
| AI/ML semantic categorization | LLM or embedding-based for edge cases |
| Multi-month trend analysis | Needs multi-statement historical data accumulation |
| Advanced predictive analytics | Requires enough historical data (3+ months) |
| Mobile app | React Native client for iOS/Android |
| Multi-user household | Shared account view for families |
| Financial Digital Twin | Simulation of financial scenarios |

---

## Technology Choices & Rationale

| Choice | Why |
|---|---|
| **Next.js** | Server-side rendering + client components in one framework |
| **SQLite + Prisma** | Zero-config database suitable for local development and demo |
| **pdfjs-dist** | Pure JS PDF text extraction, no binary dependencies |
| **JWT with refresh tokens** | Stateless auth with secure token rotation |
| **TypeScript everywhere** | Type safety across both frontend and backend |
| **Multer** | Standard Node.js file upload middleware |
| **Recharts** | Responsive charting with minimal setup |
