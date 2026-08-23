# FINOVA — Challenges Faced & Solutions

## Semester 7 Development Challenges

---

### 1. PDF Text Extraction Without OCR

**Challenge**: Bank statement PDFs vary wildly in format. Some banks use proprietary table layouts, some wrap narrations across two or three lines, and some include headers/footers that interfere with transaction parsing.

**Solution**: Used `pdfjs-dist` for text-layer extraction (not OCR). Built bank-specific regex pipelines for HDFC, ICICI, SBI, Axis, and Kotak. Implemented a multi-line narration reconstructor that joins continuation lines based on indentation and column alignment heuristics. Added a `warnings[]` array in the API response that surfaces extraction issues without crashing.

---

### 2. Categorization Accuracy — Person vs Merchant

**Challenge**: UPI transactions often look like "UPI/Rahul Sharma/9876543210" and simple keyword matching would incorrectly assign these to generic categories.

**Solution**: Built a 150+ Indian first-name detection list and combined it with UPI VPA parsing. If a transaction narration contains a recognizable person's name and no matching merchant KB entry, it is classified as "Person-to-Person Transfer" rather than guessing a business category.

---

### 3. Wallet Import Without Direct API Access

**Challenge**: PhonePe, Paytm, and Google Pay do not provide open APIs for consumer transaction history. The original requirement included wallet support.

**Solution**: Implemented file-based wallet import. Users export their transaction history as CSV or PDF from within their wallet app and upload it to FINOVA. The wallet parser auto-detects the source (PhonePe, Paytm, Google Pay, or generic) from column headers and filename. This is honest and does not claim direct account access. A disclaimer is shown clearly on the Wallet Import page.

---

### 4. Duplicate Transactions Across Imports

**Challenge**: A bank statement and a PhonePe export can both contain the same underlying transaction — for example, a payment made via PhonePe that also appears in the linked bank statement debit.

**Solution**: Implemented fuzzy duplicate detection comparing amount, transaction type, date window (±2 days), and narration overlap. Flagged duplicates are stored with `isDuplicate: true` and excluded from all financial calculations (savings rate, budgets, category totals), but remain visible in the ledger with a "DUPE?" badge so users can manually verify.

---

### 5. TypeScript Strict Mode Across Controllers

**Challenge**: Express's `req.params.id` returns `string | string[]`. Prisma's Prisma Client rejects `string[]` where `string` is expected, causing TS errors across all new controllers.

**Solution**: Added `String(req.params.id)` cast in all controller update/delete handlers to safely narrow the type.

---

### 6. Dashboard API Response Shape Mismatch

**Challenge**: The backend financial intelligence service returned fields named `topCategories` and `incomeCategories`, but the dashboard frontend expected `categoryBreakdown` and `incomeBreakdown`, causing silent null data on the chart panels.

**Solution**: Updated the dashboard controller to explicitly map and provide both field names so both the dashboard and reports pages receive data in their expected format.

---

### 7. Prisma Client Regeneration on Windows (EPERM)

**Challenge**: After `prisma db push`, Prisma attempts to overwrite the native DLL for the query engine. On Windows, if the backend process is running, the file is locked and the rename fails with `EPERM: operation not permitted`.

**Solution**: The schema is still correctly synchronized (the DB push succeeds). The `EPERM` only affects the DLL copy for the Prisma Client library. Restarting the backend process after a schema change ensures it picks up the updated Prisma client.

---

### 8. ts-node-dev Hot Reload Stale Cache

**Challenge**: During development, ts-node-dev cached an older compiled version of route files in the Windows temp directory. When route files were corrected (wrong middleware name `authenticateToken` → `authenticate`), ts-node-dev continued serving the old compiled version.

**Solution**: Killed and fully restarted the backend server process to force a fresh compilation from source, bypassing the stale temp cache.

---

### 9. Authentication Token Persistence on Frontend

**Challenge**: Next.js server-side rendering runs before localStorage is available, causing auth token reads to fail and redirect loops on protected pages.

**Solution**: All token reads are guarded with `typeof window === 'undefined'` checks. The `AuthContext` loads the user from localStorage only after hydration on the client side, and the `middleware.ts` uses cookie-based auth-state hints rather than reading the JWT directly.

---

### 10. Multi-Bank Statement Layout Differences

**Challenge**: HDFC uses a six-column format with separate Debit/Credit/Balance columns. SBI uses a four-column format where credits are prefixed with "+" in the same column.

**Solution**: The PDF parser applies bank-specific regex patterns after detecting the bank name from the PDF header. Each bank has its own row parser that normalizes to a common `{ date, description, debit, credit, balance }` structure before passing to the categorizer.
