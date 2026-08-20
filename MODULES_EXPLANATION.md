# FINOVA – Financial Intelligence Infrastructure
## Completed Modules Architecture & Technical Explanation

This document details the software architecture, algorithms, and technical design of the two functional modules implemented in FINOVA for Phase 3 evaluation.

---

## Module 1: User Authentication & Security System

### 1. Architecture & Token Flow
The authentication module utilizes a dual-token JWT (JSON Web Token) security pattern combined with bcrypt password salting.

```
[User Browser] ──(1) Login Credentials──> [Express Auth Controller]
[User Browser] <──(2) Access Token (15m) + Refresh Token (7d)── [Auth API]
[User Browser] ──(3) Bearer Access Token──> [Protected API Routes]
```

### 2. Implementation Specifications
- **Bcrypt Hashing**: Passwords are salted (10 rounds) before persistence in PostgreSQL.
- **Token Rotation**:
  - **Access Token**: Expires in 15 minutes, signed with `JWT_ACCESS_SECRET`.
  - **Refresh Token**: Expires in 7 days, signed with `JWT_REFRESH_SECRET`, stored in `RefreshToken` database table.
- **Client Request Interceptor (`api.ts`)**:
  - Automatically intercepts HTTP `401 Unauthorized` responses.
  - Places concurrent requests into a queue (`failedQueue`) while requesting a new access token via `/api/auth/refresh`.
  - Upon successful token issuance, re-executes pending requests without forcing user logout.
- **Route Guard Middleware (`middleware.ts`)**:
  - Server-side Next.js middleware inspects the `finova_auth` session cookie.
  - Automatically redirects unauthenticated requests targeting `/dashboard`, `/upload`, `/statements`, or `/transactions` to `/login`.

---

## Module 2: Bank Statement Processing & Financial Intelligence

### 1. Processing Pipeline Workflow

```
[PDF Upload] ──> [Text Extraction / Tesseract OCR Fallback] ──> [Multi-Pass Parsing Engine] ──> [15-Category Classifier] ──> [PostgreSQL Storage & Recharts Dashboard]
```

### 2. Stage 1: File Upload & Validation
- Processed via `multer` in Express.
- Enforces strict PDF MIME-type checking (`application/pdf`) and a 10MB file size limit.

### 3. Stage 2: 4-Tier PDF Parsing & OCR Engine (`pdf-parser.service.ts`)
- **Text Extraction**: Uses `pdf-parse` to extract text streams.
- **Bank Auto-Detection**: Identifies bank headers (*HDFC Bank, SBI, ICICI Bank, Axis Bank, Kotak, YourBank International, etc.*).
- **Pass 1: Bank-Specific Regex Matcher**: Targeted regex parsers for structured Indian bank formats.
- **Pass 2: Single-Line Row Matcher**: Matches rows containing Date + Description + Amount(s) + Balance.
- **Pass 3: Multi-Line Column Block Matcher**: Analyzes PDFs with multi-column text wrapping (extracts dates, merchant descriptions, monetary values, and reconstructs transactions).
- **Pass 4: Tesseract.js OCR Fallback**: If extracted text is < 30 characters or scanned/image-based, triggers Tesseract OCR to extract readable text.

### 4. Stage 3: 15-Category Classification Engine (`categorizer.service.ts`)
Classifies transactions using normalized keyword rule matching and credit/debit heuristics:
1. **Income & Salary**: Matches `salary`, `payroll`, `neft cr`, `imps cr`, `freelance`, `bonus`.
2. **Food & Dining**: Matches `swiggy`, `zomato`, `mcdonalds`, `dominos`, `starbucks`, `restaurant`.
3. **EMI & Loans**: Matches `emi`, `loan`, `bajaj finance`, `home loan`, `car loan`, `instalment`.
4. **Travel & Transport**: Matches `uber`, `ola`, `rapido`, `irctc`, `indigo`, `metro`.
5. **Shopping**: Matches `amazon`, `flipkart`, `myntra`, `ajio`, `nykaa`, `croma`.
6. **Bills & Utilities**: Matches `jio`, `airtel`, `electricity`, `broadband`, `bescom`, `nach`.
7. **Investments**: Matches `zerodha`, `groww`, `mutual fund`, `sip`, `ppf`, `nps`, `fd`.
8. **Groceries**: Matches `blinkit`, `bigbasket`, `dmart`, `jiomart`, `kirana`.
9. **Fuel**: Matches `petrol`, `diesel`, `iocl`, `bpcl`, `hpcl`, `shell`.
10. **Healthcare**: Matches `apollo`, `pharmeasy`, `medplus`, `hospital`, `1mg`.
11. **Entertainment**: Matches `netflix`, `spotify`, `hotstar`, `pvr`, `bookmyshow`.
12. **Education**: Matches `udemy`, `coursera`, `tuition`, `school fee`.
13. **Insurance**: Matches `lic`, `star health`, `hdfc ergo`, `premium`.
14. **ATM & Cash**: Matches `atm withdrawal`, `cash deposit`.
15. **Other**: Fallback classification.

### 5. Stage 4: Database Storage & Recharts Dashboard
- Persists data in PostgreSQL via Prisma ORM using transactional nested writes.
- Aggregates Income, Expenses, Net Cash Flow, and Savings Rate %.
- Renders spending distribution using Recharts bar charts and provides automated financial health recommendations.
