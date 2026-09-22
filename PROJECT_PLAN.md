# FINOVA — Project Plan

> **Semester 7 Final Documentation**
> Original plan vs actual implementation comparison.

---

## Project Overview

FINOVA (Financial Intelligence and Value Optimization Architecture) is a personal finance intelligence platform designed for Indian users. It ingests bank statements and wallet exports, extracts and categorizes every transaction using a custom rule-based AI engine, and surfaces actionable financial insights through a clean web interface.

**Core Design Principles:**
1. No mock or static data — every metric derives from actual database records
2. Privacy-first — uploaded files are never permanently stored
3. User isolation — one user can never access another user's data
4. Honest scope — wallet integration via file upload, not fake API claims

---

## Semester 7 Milestones (Planned vs Actual)

| # | Milestone | Planned | Actual Status |
|---|---|---|---|
| 1 | Project setup (Next.js, Express, Prisma, SQLite) | Week 1 | ✅ Completed |
| 2 | Authentication system (JWT, bcrypt, refresh tokens) | Week 2 | ✅ Completed |
| 3 | PDF parsing engine (multi-bank, multi-line) | Week 3–4 | ✅ Completed |
| 4 | Merchant Knowledge Base (350+ entities) | Week 4–5 | ✅ Completed |
| 5 | 7-layer categorization engine | Week 5 | ✅ Completed |
| 6 | Wallet import (PhonePe/Paytm/GPay CSV & PDF) | Week 5–6 | ✅ Completed |
| 7 | Duplicate detection (cross-source fuzzy match) | Week 6 | ✅ Completed |
| 8 | Dashboard with financial intelligence | Week 6–7 | ✅ Completed |
| 9 | Budget management module | Week 7 | ✅ Completed |
| 10 | Savings goals module | Week 7–8 | ✅ Completed |
| 11 | Loan & EMI tracking module | Week 8 | ✅ Completed |
| 12 | Financial reports with filtering | Week 8–9 | ✅ Completed |
| 13 | Security audit & privacy hardening | Week 9 | ✅ Completed |
| 14 | Integration testing (55 automated tests) | Week 9 | ✅ Completed |
| 15 | Production builds & final documentation | Week 9 | ✅ Completed |

---

## Architecture Decisions

### Why SQLite?
Chosen for zero-infrastructure development — no database server setup, deployable as a single file. Schema is designed for straightforward migration to PostgreSQL for production via a Prisma provider change.

### Why File-Based Wallet Import?
Official wallet APIs (PhonePe, Paytm, GPay) require commercial agreements and official authorization from the payment service providers, which is outside the scope of an academic project. File-based import is the honest, practical alternative that delivers the same analytical value.

### Why Rule-Based Categorization?
LLM/ML categorization would add significant infrastructure cost, latency, and rate-limit dependencies. The rule-based entity resolution engine with a curated Knowledge Base of 350+ Indian merchants provides deterministic, explainable, and auditable results — appropriate for financial data.

### Why JWT with Rotation?
Short-lived access tokens (15m) limit the exposure window if a token is leaked. Refresh token rotation (each use issues a new refresh token and invalidates the old one) detects token theft — if an attacker and the legitimate user both try to refresh, the second use of the stolen token will be rejected.

---

## Semester 8 Scope (Future Work)

The following are explicitly **not implemented** in Semester 7 and are documented here for future development:

- **Account Aggregator Integration**: Direct bank account sync via RBI-regulated Account Aggregator framework
- **Wallet API Integration**: Official PhonePe/Paytm APIs upon obtaining commercial authorization
- **ML Categorization**: Embedding-based semantic categorization for improved accuracy on novel merchants
- **Financial Digital Twin**: Real-time simulation of financial scenarios
- **Multi-Agent Advisory**: Autonomous AI agents for proactive financial recommendations
- **Mobile Application**: React Native or Flutter app
- **Multi-User / Household Accounts**: Shared finance for families
