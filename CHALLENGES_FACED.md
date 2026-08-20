# FINOVA – Financial Intelligence Infrastructure
## Technical Challenges & Engineering Solutions

During the development and testing of FINOVA's automated PDF bank statement processing engine and full-stack web application, several key technical challenges were solved.

---

## Challenge 1: Multi-Column & Scanned PDF Text Extraction
- **Problem**: Bank statement PDFs vary significantly in layout. Many PDFs output text streams where dates, merchant descriptions, and transaction amounts are separated into multi-line column blocks. Scanned or image-based PDFs return empty text streams.
- **Solution**: Developed a 4-tier processing pipeline in `pdf-parser.service.ts`:
  1. Bank-specific regex matchers.
  2. Single-line row parser.
  3. Multi-line column block parser that collects dates, descriptions, and amounts, and reconstructs transaction entries.
  4. Tesseract.js OCR fallback engine for scanned/image-based PDFs.

---

## Challenge 2: Accurately Categorizing Cryptic Bank Descriptions
- **Problem**: Bank statement narrations are often abbreviated (e.g. `UPI-SWIGGY-12345@ybl`, `NEFT-N3012400123-ZERODHA`, `ACH D- BAJAJ FIN-123`).
- **Solution**: Built a normalized rule-based keyword engine (`categorizer.service.ts`) combined with regex patterns. Text strings are normalized and evaluated against prioritized category rules (checking income credit rules first for credit entries).

---

## Challenge 3: Synchronized Dual-Token JWT Refresh Queue
- **Problem**: When short-lived access tokens (15 mins) expire, concurrent client API calls fail with `401 Unauthorized`. Naive error handling would trigger redundant refresh calls or force user logouts.
- **Solution**: Implemented a synchronized queue in `api.ts`. When a `401` occurs, `isRefreshing` locks duplicate refresh attempts and queues failed requests. Once the token is renewed via `POST /api/auth/refresh`, all queued requests are executed transparently.

---

## Challenge 4: PostgreSQL Database Configuration & Integration
- **Problem**: Connecting Prisma ORM to PostgreSQL required resolving user authentication parameters (`scram-sha-256` vs `trust` local authentication) and initializing schema tables.
- **Solution**: Successfully configured PostgreSQL service on port 5432, created the `finova` database, pushed Prisma schema (`npx prisma db push`), and verified model relations (`User`, `RefreshToken`, `BankStatement`, `Transaction`).

---

## Challenge 5: Presentation-Ready Glassmorphism Dark UI
- **Problem**: Creating a modern financial interface that displays spending analytics, charts, and master ledger without visual clutter.
- **Solution**: Implemented a dark glassmorphism design system using Tailwind CSS, HSL color tokens, custom scrollbars, micro-animations, Recharts visualizations, and Lucide icons.
