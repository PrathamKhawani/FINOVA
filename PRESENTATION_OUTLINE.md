# FINOVA — Presentation Outline

> **Semester 7 Final Presentation**
> All claims are backed by live demo data. No slides contain static/fabricated numbers.

---

## Slide 1: Title

**FINOVA** — Financial Intelligence and Value Optimization Architecture
*A Personal Finance Intelligence Platform for Indian Users*

Pratham Khawani | Semester 7 | Computer Engineering

---

## Slide 2: Problem Statement

**Problem**: Most Indians have fragmented financial data across bank accounts and digital wallets. Existing apps either:
- Require direct account access (raises privacy concerns)
- Show generic analytics without context
- Don't support Indian bank statement formats
- Fail to handle wallet transactions alongside bank data

**Result**: Users don't understand where their money actually goes.

---

## Slide 3: FINOVA Solution Overview

FINOVA accepts:
1. **Bank statement PDFs** — uploaded by the user
2. **Wallet exports** (PhonePe/Paytm/GPay CSV/PDF) — exported from wallet app

FINOVA delivers:
- Automatic transaction extraction and categorization
- Unified dashboard across bank + wallet
- Budget tracking against real spending
- Savings goal progress tracking
- Loan and EMI management
- Smart financial insights with explanations

---

## Slide 4: System Architecture

```
Frontend (Next.js 14)
    ↓ JWT Bearer Token
Backend API (Express + TypeScript)
    ↓ Prisma ORM
SQLite Database
    ↑
PDF Parser Service → Entity Resolver → Financial Intelligence Engine
```

**Data flow**: PDF/CSV → Parser → Entity Resolution → Categorization → DB → Intelligence Engine → API → UI

---

## Slide 5: PDF Parsing Engine

**Three-Stage Extraction:**
1. Coordinate-based (pdfjs-dist) — reads text items with X/Y pixel positions
2. Plain-text fallback (pdf-parse) — for simpler PDFs
3. OCR fallback (Tesseract) — for scanned bank statements

**Supports**: HDFC, ICICI, SBI, Axis Bank, Kotak, PNB, Canara, Bank of Baroda, Union Bank, IndusInd, Yes Bank, IDFC

**Demo**: Upload an HDFC Bank statement PDF → show extracted transactions

---

## Slide 6: Entity Resolution & Categorization

**350+ Indian merchant Knowledge Base** covering:
- Food delivery: Swiggy, Zomato, Dunzo
- Quick commerce: Blinkit, Zepto, Instamart, BigBasket
- Streaming: Netflix, Amazon Prime, Hotstar, Sony LIV
- Transport: Uber, Ola, Rapido, Metro
- Investments: Zerodha, Groww, Upstox, Kuvera
- And many more...

**7-layer classification pipeline** with `classificationReason` — every categorization is explainable.

**Person-to-Person Detection**: Distinguishes "Rahul Sharma UPI" (P2P) from "Rahul's Dhaba" (Food).

---

## Slide 7: Wallet Import & Duplicate Detection

**Wallet Import**: User exports CSV/PDF from their wallet app → FINOVA auto-detects PhonePe / Paytm / GPay format

**Duplicate Detection**: When the same payment appears in both bank and wallet statements:
- Compare: amount (±₹0.01), direction, date (±2 days), narration overlap
- Flag with `isDuplicate: true` — shown as "DUPE?" in ledger
- Excluded from all financial calculations — no double-counting

**Demo**: Upload PhonePe CSV → show flagged duplicates alongside bank transactions

---

## Slide 8: Dashboard & Smart Insights

**Real-time metrics from database:**
- Net savings and savings rate
- Discretionary spend ratio
- Debt-to-income ratio
- Bank vs Wallet breakdown

**Smart Insights examples:**
- "Your savings rate is 32% — above the recommended 20% benchmark"
- "Food & Dining is your highest spending category at ₹8,400 (34% of expenses)"
- "₹3 recurring subscriptions detected totaling ₹897/month"

**Demo**: Show dashboard after statement upload

---

## Slide 9: Budget / Savings Goals / Loans

**Budget**: Set monthly limits per category → see actual spending vs limit in real time

**Savings Goals**: Track goals with deadline, emoji, and progress bar. Net savings derived from real transaction analysis.

**Loans**: Manual loan entry with auto-detection of matching EMI transactions from statement data

**Demo**: Create a budget, upload statement, show spending automatically reflected

---

## Slide 10: Security & Privacy

- Passwords hashed with bcryptjs (cost 12)
- JWT access tokens (15m) + rotating refresh tokens (7d)
- Uploaded PDFs deleted immediately after parsing — never stored permanently
- `/uploads` directory is NOT publicly accessible
- Every database query filtered by `userId` — cross-user access architecturally impossible
- **Integration tested**: 55 automated API tests, 100% pass rate

---

## Slide 11: Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React, TypeScript, Recharts |
| Backend | Node.js, Express, TypeScript |
| Database | SQLite + Prisma ORM |
| Auth | JWT + bcryptjs |
| PDF | pdfjs-dist + Tesseract OCR fallback |
| Testing | 55 custom integration tests |

---

## Slide 12: What's Next (Semester 8)

| Feature | Notes |
|---|---|
| Account Aggregator integration | RBI-regulated bank sync |
| Official wallet APIs | Requires provider authorization |
| ML/LLM categorization | Semantic embedding-based |
| Financial Digital Twin | Real-time scenario simulation |
| Multi-agent advisory | Autonomous recommendations |
| Mobile app | React Native |

---

## Slide 13: Live Demo

**Demo flow:**
1. Register new account
2. Upload HDFC Bank PDF → show extraction + categorization
3. Upload PhonePe CSV → show wallet import + duplicate flags
4. View Dashboard — income, expenses, insights, forecast
5. Create Budget → show spending auto-calculated
6. View Reports → filter by month, by source
7. Logout

**All numbers shown are from actual uploaded statements — zero mock data.**
