# FINOVA — Challenges Faced & Solutions

> **Semester 7 Final Documentation**
> This document records real engineering challenges encountered during FINOVA development and their actual solutions.

---

### 1. PDF Text Extraction Without OCR

**Challenge**: Bank statement PDFs vary wildly in format. Some banks (ICICI, Axis) use proprietary table layouts with overlapping text columns. Some narrations span 2–3 lines. Headers, footers, and account summary rows interfere with transaction detection.

**Solution**: Built a three-stage extraction pipeline:
1. **Coordinate-based** (pdfjs-dist): extracts every text item with X/Y pixel coordinates, groups into rows by Y-proximity (6px tolerance), detects column headers dynamically, assigns debit/credit by X-position proximity to column centers.
2. **Plain text fallback** (pdf-parse): for PDFs where coordinate extraction fails.
3. **OCR fallback** (Tesseract.js): for scanned/image-based PDFs.
Added balance reconciliation validation that detects swapped debit/credit columns and auto-corrects them.

---

### 2. Categorization Accuracy — Person vs Merchant

**Challenge**: UPI transactions look like "UPI/Rahul Sharma/9876543210" — simple keyword matching would incorrectly categorize these as businesses.

**Solution**: Built a 150+ Indian first-name detection list combined with UPI VPA parsing. If a narration contains a person's name pattern (not in the Merchant KB) the transaction is classified as "Person-to-Person Transfer" with high confidence. This prevents false positives where personal money transfers inflate merchant categories.

---

### 3. Wallet Import Without Direct API Access

**Challenge**: PhonePe, Paytm, and Google Pay do not provide public consumer APIs.

**Solution**: File-based wallet import. Users export their transaction history from within their wallet app as CSV/PDF and upload to FINOVA. The wallet parser auto-detects the source (PhonePe, Paytm, Google Pay, or generic) from column headers and filename patterns. A clear disclaimer is shown on the Wallet Import page. This approach is honest and does not claim direct account access.

---

### 4. Duplicate Transactions Across Bank + Wallet Imports

**Challenge**: A bank statement and a PhonePe export often contain the same transaction — e.g., a PhonePe payment appears in both the PhonePe CSV and the linked HDFC Bank statement as a debit.

**Solution**: Fuzzy duplicate detection at upload time comparing: exact amount (±₹0.01), same direction, date within ±2 days, and narration prefix overlap (first 15 chars). Duplicates are stored with `isDuplicate: true` and visible in the ledger with a "DUPE?" badge, but are excluded from all financial calculations.

---

### 5. TypeScript Strict Mode Across Controllers

**Challenge**: Express `req.params.id` returns `string | string[]`. Prisma rejects `string[]` where `string` is expected, causing TypeScript errors across all update/delete handlers.

**Solution**: Applied `String(req.params.id)` cast in every controller that uses `:id` params to safely narrow the type. This was the correct fix — no `any` casts needed.

---

### 6. Dashboard API Response Shape Mismatch

**Challenge**: The financial intelligence service returned `topCategories` and `incomeCategories` fields, but the dashboard frontend expected `categoryBreakdown` and `incomeBreakdown`, causing silent null data in charts.

**Solution**: Updated the dashboard controller to map both field names in the response object so both the dashboard page and the reports page receive data in their expected shape without requiring frontend changes.

---

### 7. Prisma Client Regeneration on Windows (EPERM)

**Challenge**: After `prisma db push`, Prisma tries to overwrite the native query engine DLL. On Windows, if the backend is running and has the file locked, the rename fails with `EPERM: operation not permitted`.

**Solution**: The database schema sync still completes correctly. The `EPERM` only affects the Prisma Client library DLL copy. Restarting the backend process after schema changes ensures it loads the updated client binary.

---

### 8. ts-node-dev Hot Reload Stale Cache

**Challenge**: During development, ts-node-dev cached an older compiled version of route files. When route files were corrected (wrong middleware name `authenticateToken` → `authenticate`), ts-node-dev continued serving the stale compiled version.

**Solution**: Killed and fully restarted the backend process to force fresh compilation, bypassing the Windows temp cache.

---

### 9. Authentication Token Persistence on Frontend (SSR)

**Challenge**: Next.js server-side rendering runs before `localStorage` is available, causing auth token reads to fail during SSR and creating redirect loops on protected pages.

**Solution**: All token reads are guarded with `typeof window === 'undefined'` checks in `api.ts`. The `AuthContext` loads the user from localStorage only after client-side hydration. The `middleware.ts` uses cookie-based auth state hints rather than reading the JWT directly.

---

### 10. Multi-Bank Statement Layout Differences

**Challenge**: HDFC uses a six-column format with separate Debit/Credit/Balance columns. SBI uses a four-column format where credits are prefixed with "+" in the same column. Kotak wraps narrations across 3 rows.

**Solution**: Dynamic column header detection reads the PDF's header row to learn column X-positions for each statement, rather than using hardcoded offsets. Balance reconciliation validates the parsed direction assignments and auto-corrects swapped columns.

---

### 11. Missing /categories Route Registration (Discovered in Audit)

**Challenge**: The `getCategories()` controller function was implemented in `transactions.controller.ts` but was never registered as a route in `transactions.routes.ts`. Calls to `GET /api/transactions/categories` returned 404.

**Solution**: Added `router.get('/categories', getCategories)` to `transactions.routes.ts`. This was discovered by the integration test suite (55 automated API tests) and fixed before final submission.

---

### 12. Private File Exposure via express.static (Security Audit)

**Challenge**: The backend was serving the `uploads/` directory publicly via `express.static()`, meaning anyone with the URL path could download other users' bank statement PDFs.

**Solution**:
1. Removed the `express.static('/uploads')` middleware from `index.ts`.
2. Added `fs.unlinkSync()` in a `finally` block to both upload handlers, ensuring raw files are deleted from disk immediately after parsing — regardless of success or failure.
3. Disabled Prisma's `query` log level to prevent raw financial narrations from leaking into terminal logs.
