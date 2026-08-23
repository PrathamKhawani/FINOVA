/**
 * FINOVA Layered Categorization & Entity Extraction Engine v5
 *
 * Priority Pipeline (executed in order):
 *  1. Direction evidence (credit vs debit)
 *  2. Channel identification (UPI/NEFT/IMPS/Card/ATM/ACH)
 *  3. Merchant Knowledge Base lookup (200+ merchants — highest accuracy)
 *  4. Insurance / financial product patterns
 *  5. Income patterns (salary, refund, interest)
 *  6. Person-to-Person detection (improved Indian name heuristic)
 *  7. General keyword rules
 *  8. Fallback with Needs Review flag
 *
 * A known merchant from the KB always takes priority over generic keywords.
 * Person names in UPI narrations are NOT misclassified as business categories.
 */

import { lookupMerchant } from './merchant-kb.service';

export interface CategorizationResult {
  category: string;
  subcategory: string;
  merchantName: string;
  counterparty: string;
  channel: string;
  confidence: 'high' | 'medium' | 'low';
  referenceId: string | null;
  needsReview: boolean;
  classificationReason: string;  // WHY this category was assigned
}

// ── Reference ID Extraction ───────────────────────────────────────────────────
export function extractReferenceId(description: string): string | null {
  const refPatterns = [
    /\b(?:NEFT|IMPS|UPI|REF|UTR|TXN|CHK|POS)[-/\s:]*([A-Za-z0-9]{8,22})\b/i,
    /\b(\d{10,16})\b/,
  ];
  for (const pat of refPatterns) {
    const m = description.match(pat);
    if (m && m[1]) return m[1];
  }
  return null;
}

// ── Channel Detection ─────────────────────────────────────────────────────────
export function detectPaymentChannel(description: string): string {
  const upper = description.toUpperCase();
  if (upper.includes('UPI/') || upper.includes('UPI-') || upper.includes('@')) return 'UPI';
  if (upper.includes('NEFT')) return 'NEFT';
  if (upper.includes('IMPS')) return 'IMPS';
  if (upper.includes('RTGS')) return 'RTGS';
  if (upper.includes('POS') || upper.includes('CARD PAYMENT') || upper.includes('CARD PMT')) return 'Card / POS';
  if (upper.includes('ATM') || upper.includes('CASH WDR') || upper.includes('WITHDRAWAL')) return 'ATM / Cash';
  if (upper.includes('ACH/') || upper.includes('DIRECT DEBIT') || upper.includes('STANDING ORDER') || upper.includes('NACH')) return 'Direct Debit / ACH';
  if (upper.includes('EFT') || upper.includes('APB-')) return 'Electronic Fund Transfer';
  if (upper.includes('CHQ') || upper.includes('CHK') || upper.includes('CHEQUE') || upper.includes('CHECK')) return 'Cheque';
  // Wallet channels
  if (upper.includes('PHONEPE') || upper.includes('PHONE PE')) return 'PhonePe';
  if (upper.includes('PAYTM')) return 'Paytm';
  if (upper.includes('GPAY') || upper.includes('GOOGLE PAY')) return 'Google Pay';
  return 'Bank Transfer';
}

// ── Counterparty & Entity Extraction ─────────────────────────────────────────
export function extractCounterparty(description: string): { counterparty: string; merchantName: string } {
  let text = description.trim();

  // UPI narration: UPI/ref/CR/Name or UPI/DR/Name@vpa
  const upiMatch = text.match(/UPI\/[A-Za-z0-9.]+\/(?:CR|DR)\/([^/\n]+)/i);
  if (upiMatch && upiMatch[1]) {
    const rawName = upiMatch[1].split('@')[0].replace(/[-_*,.:;]/g, ' ').replace(/\s+/g, ' ').trim();
    return { counterparty: formatTitleCase(rawName), merchantName: formatTitleCase(rawName) };
  }

  // UPI VPA pattern: Name@bankname
  const vpaMatch = text.match(/([A-Za-z][A-Za-z0-9._-]+)@[a-zA-Z]+/);
  if (vpaMatch && vpaMatch[1]) {
    const name = vpaMatch[1].replace(/[._-]/g, ' ');
    return { counterparty: formatTitleCase(name), merchantName: formatTitleCase(name) };
  }

  // APB/EFT format: APB-CR-MERCHANTNAME
  const apbMatch = text.match(/APB-(?:CR|DR)-([A-Za-z0-9]+)/i);
  if (apbMatch && apbMatch[1]) {
    const clean = formatTitleCase(apbMatch[1].replace(/([a-z])([A-Z])/g, '$1 $2'));
    return { counterparty: clean, merchantName: clean };
  }

  // Strip technical noise
  let cleaned = text
    .replace(/\b(?:NEFT|IMPS|UPI|REF|UTR|TXN|CHK|POS)[-/\s:]*[A-Za-z0-9]{6,22}\b/gi, '')
    .replace(/\b\d{10,16}\b/g, '')
    .replace(/\b(?:UPI|NEFT|IMPS|POS|ACH|EFT|RTGS|CR|DR|NACH|CARD)[-/\s:]+/gi, '')
    .replace(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*,?\s*\d{0,4}\b/gi, '')
    .replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, '')
    .replace(/[-_*,.:;/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || cleaned.length < 2) {
    cleaned = text.split(' ').slice(0, 3).join(' ').trim();
  }

  return { counterparty: formatTitleCase(cleaned), merchantName: formatTitleCase(cleaned) };
}

function formatTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(w => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
    .join(' ')
    .trim();
}

// ── Improved Person Name Detection ────────────────────────────────────────────
// Common Indian first names list (150+ names) for accurate P2P detection
const INDIAN_FIRST_NAMES = new Set([
  'aarav', 'aditya', 'ajay', 'akash', 'amit', 'amol', 'amrita', 'ananya', 'anil', 'anjali',
  'ankit', 'ankita', 'anuj', 'anup', 'arjun', 'aryan', 'asha', 'ashish', 'ashok', 'avinash',
  'deepa', 'deepak', 'devesh', 'dhruv', 'divya', 'gaurav', 'geeta', 'gopal', 'hemant',
  'ishaan', 'isha', 'jayesh', 'jyoti', 'karan', 'kartik', 'kavita', 'kishan', 'komal',
  'krishna', 'kunal', 'lata', 'lalit', 'lokesh', 'mahesh', 'manish', 'manoj', 'meena',
  'mihir', 'mohan', 'mohit', 'mukesh', 'namita', 'neeraj', 'neha', 'nilesh', 'niraj',
  'nirmal', 'pankaj', 'pooja', 'pratham', 'priya', 'priyanka', 'rahul', 'raj', 'rajesh',
  'rakesh', 'ramesh', 'rashmi', 'ravi', 'reema', 'ritu', 'rohit', 'rupal', 'sachin',
  'sagar', 'sandesh', 'sangita', 'santosh', 'sapna', 'saurabh', 'seema', 'shilpa',
  'shivam', 'shivani', 'shruti', 'smita', 'sneha', 'sonu', 'sonam', 'sudhir', 'suresh',
  'sushil', 'swati', 'tarun', 'umesh', 'vaibhav', 'vijay', 'vikas', 'vinay', 'vineet',
  'vishal', 'vivek', 'yogesh', 'yash', 'yashwant', 'zara', 'zoya',
  // Common names across all regions
  'abhi', 'akshi', 'alok', 'amey', 'anand', 'anisha', 'arpit', 'arvind',
  'bhavesh', 'chirag', 'darshan', 'dinesh', 'girish', 'hardik', 'harish',
  'harsh', 'jatin', 'kamlesh', 'kapil', 'keyur', 'khushal', 'mayur', 'mitesh',
  'mukund', 'naresh', 'nidhi', 'nimesh', 'paresh', 'parth', 'piyush',
  'praful', 'pramod', 'prasad', 'prashant', 'pratik', 'puneet', 'purvi',
  'ramana', 'rishi', 'rohan', 'rupesh', 'rushabh', 'sahil', 'sailesh',
  'saket', 'salman', 'sameer', 'sanjay', 'satish', 'shailesh', 'shekhar',
  'shubham', 'siddhant', 'siddharth', 'sohan', 'subodh', 'sunil', 'surendra',
  'tejal', 'tejas', 'tushar', 'uday', 'umang', 'vedant', 'vimal', 'vinod',
  'vipin', 'vipul', 'viral', 'vishnu', 'vraj', 'yagnesh',
]);

const BUSINESS_KEYWORDS = [
  'pvt', 'ltd', 'corp', 'store', 'shop', 'deli', 'textile', 'mart', 'market', 'centre',
  'bank', 'petrol', 'fuel', 'food', 'restaurant', 'cafe', 'pharmacy', 'medical', 'clinic',
  'hospital', 'telecom', 'telecomp', 'jio', 'airtel', 'amazon', 'uber', 'swiggy', 'zomato',
  'flipkart', 'netflix', 'hotstar', 'insurance', 'premium', 'loans', 'emi', 'sip', 'zerodha',
  'groww', 'electronics', 'digital', 'solutions', 'technologies', 'infotech', 'agency',
  'services', 'consortium', 'society', 'club', 'trust', 'foundation', 'institute', 'college',
  'school', 'university', 'finance', 'capital', 'securities', 'ventures', 'enterprises',
  'industries', 'trading', 'travels', 'logistics', 'consultants', 'associates',
];

export function isLikelyPersonName(name: string): boolean {
  const lower = name.toLowerCase().trim();
  const words = lower.split(/\s+/).filter(w => w.length > 0);

  // Must be 1–3 words
  if (words.length === 0 || words.length > 3) return false;

  // If any business keyword present → not a person
  if (BUSINESS_KEYWORDS.some(k => lower.includes(k))) return false;

  // If all words are alphabetic (names don't have numbers)
  if (!words.every(w => /^[a-z.]{1,20}$/.test(w))) return false;

  // First word matches known Indian first name → strong signal
  if (INDIAN_FIRST_NAMES.has(words[0])) return true;

  // Single initial + full name pattern (e.g., "S SHARMA", "K PATEL")
  if (words.length === 2 && words[0].length === 1 && /^[a-z]$/.test(words[0])) return true;

  // Name + single initial at end (e.g., "RAHUL K")
  if (words.length === 2 && words[1].length === 1 && INDIAN_FIRST_NAMES.has(words[0])) return true;

  // Fallback: 2 words, both look like names (no digits, length 3-15)
  if (words.length === 2 && words.every(w => w.length >= 3 && w.length <= 15)) {
    // Conservative: only if first word is a known name or second word looks like a surname
    if (INDIAN_FIRST_NAMES.has(words[0]) || INDIAN_FIRST_NAMES.has(words[1])) return true;
  }

  return false;
}

// ── Income Pattern Rules ──────────────────────────────────────────────────────
interface CategoryRule {
  category: string;
  subcategory: string;
  confidence: 'high' | 'medium' | 'low';
  keywords: string[];
  patterns?: RegExp[];
  isCreditOnly?: boolean;
  isDebitOnly?: boolean;
}

const INCOME_RULES: CategoryRule[] = [
  {
    category: 'Income',
    subcategory: 'Salary',
    confidence: 'high',
    keywords: ['salary', 'sal credit', 'payroll', 'stipend', 'wages', 'sal_credit', 'biweekly pay', 'monthly pay'],
    patterns: [/sal(ary)?[\s_-]/i, /salary\s*credit/i, /biweekly.*pay/i, /pay.*biweekly/i, /payroll/i],
    isCreditOnly: true,
  },
  {
    category: 'Income',
    subcategory: 'Business Income',
    confidence: 'high',
    keywords: ['freelance', 'consulting', 'invoice paid', 'client payment', 'vendor credit'],
    patterns: [/freelance/i, /consulting/i],
    isCreditOnly: true,
  },
  {
    category: 'Income',
    subcategory: 'Interest & Dividend',
    confidence: 'high',
    keywords: ['interest credit', 'fd interest', 'savings interest', 'dividend', 'int credit', 'int cr'],
    patterns: [/interest\s*credit/i, /dividend/i, /\bint\s*cr\b/i],
    isCreditOnly: true,
  },
  {
    category: 'Income',
    subcategory: 'Refund & Cashback',
    confidence: 'high',
    keywords: ['refund', 'reversal', 'cashback', 'reward credit', 'reimbursement', 'cashbk'],
    patterns: [/refund/i, /cashback/i, /cash\s*bk/i, /reversal/i],
    isCreditOnly: true,
  },
  {
    category: 'Income',
    subcategory: 'Grant & Official Disbursement',
    confidence: 'medium',
    keywords: ['consortium', 'gujarat', 'government', 'govt', 'trust', 'agency disbursement'],
    patterns: [/consortium/i, /govt/i, /government/i],
    isCreditOnly: true,
  },
];

const EXPENSE_RULES: CategoryRule[] = [
  // Insurance first (prevents misclassification)
  {
    category: 'Insurance & Premiums',
    subcategory: 'Policy Premium',
    confidence: 'high',
    keywords: ['premium due', 'premium coll', 'policy premium', 'insurance premium', 'premium pmt'],
    patterns: [/premium\s*(due|coll|pmt|payment)?/i, /policy\s*premium/i],
    isDebitOnly: true,
  },
  // Rent
  {
    category: 'Rent',
    subcategory: 'House & Apartment Rent',
    confidence: 'high',
    keywords: ['house rent', 'apartment rent', 'flat rent', 'pg rent', 'monthly rent', 'rent payment'],
    patterns: [/rent/i, /lease/i],
    isDebitOnly: true,
  },
  // EMI & Loans
  {
    category: 'EMI & Loans',
    subcategory: 'Home & Auto Loan',
    confidence: 'high',
    keywords: ['home loan', 'housing loan', 'car loan', 'auto loan', 'hdfc home loan', 'sbi home loan'],
    patterns: [/home\s*loan/i, /car\s*loan/i, /housing\s*loan/i],
    isDebitOnly: true,
  },
  {
    category: 'EMI & Loans',
    subcategory: 'Personal & Consumer Loan',
    confidence: 'high',
    keywords: ['emi', 'bajaj finance', 'personal loan', 'instalment', 'installment', 'emi payment', 'loan emi', 'nach emi'],
    patterns: [/\bemi\b/i, /loan\s*repay/i, /nach.*emi/i],
    isDebitOnly: true,
  },
  // Investments
  {
    category: 'Investments',
    subcategory: 'Mutual Fund SIP',
    confidence: 'high',
    keywords: ['sip payment', 'mutual fund sip', 'mf sip', 'sip debit'],
    patterns: [/\bsip\b/i, /mutual\s*fund/i],
    isDebitOnly: true,
  },
  // ATM & Cash
  {
    category: 'ATM & Cash',
    subcategory: 'Cash Withdrawal',
    confidence: 'high',
    keywords: ['atm', 'cash withdrawal', 'cash wd', 'atm wd', 'withdrawn'],
    patterns: [/\batm\b/i, /cash\s*withdrawal/i, /cash\s*wd/i],
  },
  // Bank Charges
  {
    category: 'Bank Charges',
    subcategory: 'Service Fees',
    confidence: 'high',
    keywords: ['bank charge', 'service charge', 'penalty charge', 'processing fee', 'sms charge', 'folio charge', 'annual fee'],
    patterns: [/bank\s*charge/i, /service\s*charge/i, /\bpenalty\b/i, /annual\s*fee/i],
    isDebitOnly: true,
  },
  // Utilities - electricity
  {
    category: 'Utilities & Bills',
    subcategory: 'Electricity',
    confidence: 'high',
    keywords: ['electricity', 'electric bill', 'power bill', 'bescom', 'msedcl', 'bses', 'tata power', 'adani electricity'],
    patterns: [/electricity/i, /electric\s*bill/i],
    isDebitOnly: true,
  },
  {
    category: 'Utilities & Bills',
    subcategory: 'Gas & Water',
    confidence: 'high',
    keywords: ['water bill', 'gas bill', 'piped gas', 'mahanagar gas', 'indraprastha gas'],
    patterns: [/gas\s*bill/i, /water\s*bill/i],
    isDebitOnly: true,
  },
  // Mobile/Internet recharge
  {
    category: 'Utilities & Bills',
    subcategory: 'Mobile & Internet',
    confidence: 'high',
    keywords: ['mobile recharge', 'broadband', 'wifi bill', 'postpaid bill', 'prepaid recharge'],
    patterns: [/broadband/i, /mobile\s*recharge/i, /postpaid/i],
    isDebitOnly: true,
  },
  // Healthcare
  {
    category: 'Healthcare',
    subcategory: 'Pharmacy & Medical',
    confidence: 'high',
    keywords: ['pharmacy', 'medical store', 'hospital', 'clinic', 'doctor', 'diagnostic', 'chemist', 'health center'],
    patterns: [/pharmacy/i, /medical\s*store/i, /hospital/i, /diagnostic/i],
    isDebitOnly: true,
  },
  // Education
  {
    category: 'Education',
    subcategory: 'School & College Fees',
    confidence: 'high',
    keywords: ['school fee', 'college fee', 'tuition fee', 'university fee', 'coaching', 'course fee'],
    patterns: [/school\s*fee/i, /college\s*fee/i, /tuition/i, /coaching/i],
    isDebitOnly: true,
  },
  // Fuel
  {
    category: 'Fuel',
    subcategory: 'Petrol & CNG',
    confidence: 'high',
    keywords: ['petrol', 'diesel', 'fuel station', 'cng station', 'petrol station', 'fuel pump'],
    patterns: [/petrol\s*station/i, /fuel\s*station/i, /fuel\s*pump/i, /\bcng\b/i],
    isDebitOnly: true,
  },
  // Taxes
  {
    category: 'Taxes',
    subcategory: 'Direct Tax',
    confidence: 'high',
    keywords: ['income tax', 'advance tax', 'self assessment tax', 'tds payment'],
    patterns: [/income\s*tax/i, /advance\s*tax/i, /\btds\b/i],
    isDebitOnly: true,
  },
];

// ── Main Categorization Function ──────────────────────────────────────────────
export function categorizeTransaction(
  rawNarration: string,
  isCredit: boolean,
  source: 'BANK' | 'WALLET' = 'BANK'
): CategorizationResult {
  const refId = extractReferenceId(rawNarration);
  const channel = detectPaymentChannel(rawNarration);
  const { counterparty, merchantName } = extractCounterparty(rawNarration);
  const lower = rawNarration.toLowerCase();

  // ── Layer 1: Income Rules (credit-only, high confidence) ──────────────────
  if (isCredit) {
    for (const rule of INCOME_RULES) {
      const matchKeyword = rule.keywords.some(k => lower.includes(k.toLowerCase()));
      const matchPattern = rule.patterns?.some(p => p.test(rawNarration));
      if (matchKeyword || matchPattern) {
        return {
          category: rule.category,
          subcategory: rule.subcategory,
          merchantName,
          counterparty,
          channel,
          confidence: rule.confidence,
          referenceId: refId,
          needsReview: false,
          classificationReason: `Matched income rule: "${rule.subcategory}" via keyword/pattern in narration`,
        };
      }
    }
  }

  // ── Layer 2: Merchant Knowledge Base (highest accuracy for debit) ──────────
  const kbMatch = lookupMerchant(rawNarration);
  if (kbMatch) {
    // Respect credit-only / debit-only constraints
    if (kbMatch.isDebitOnly && isCredit) {
      // Could be a refund from this merchant
    } else if (kbMatch.isCreditOnly && !isCredit) {
      // Skip
    } else {
      return {
        category: kbMatch.category,
        subcategory: kbMatch.subcategory,
        merchantName: kbMatch.name,
        counterparty: kbMatch.name,
        channel,
        confidence: kbMatch.confidence,
        referenceId: refId,
        needsReview: false,
        classificationReason: `Merchant Knowledge Base: "${kbMatch.name}" → ${kbMatch.category} / ${kbMatch.subcategory}`,
      };
    }

    // If merchant is debit-only but transaction is credit → likely refund
    if (kbMatch.isDebitOnly && isCredit) {
      return {
        category: 'Income',
        subcategory: 'Refund & Cashback',
        merchantName: kbMatch.name,
        counterparty: kbMatch.name,
        channel,
        confidence: 'high',
        referenceId: refId,
        needsReview: false,
        classificationReason: `Refund detected from known merchant: "${kbMatch.name}"`,
      };
    }
  }

  // ── Layer 3: Expense Rule Matching ────────────────────────────────────────
  for (const rule of EXPENSE_RULES) {
    if (rule.isCreditOnly && !isCredit) continue;
    if (rule.isDebitOnly && isCredit) continue;

    const matchKeyword = rule.keywords.some(k => lower.includes(k.toLowerCase()));
    const matchPattern = rule.patterns?.some(p => p.test(rawNarration));

    if (matchKeyword || matchPattern) {
      return {
        category: rule.category,
        subcategory: rule.subcategory,
        merchantName,
        counterparty,
        channel,
        confidence: rule.confidence,
        referenceId: refId,
        needsReview: false,
        classificationReason: `Matched expense rule: "${rule.subcategory}" via keyword/pattern in narration`,
      };
    }
  }

  // ── Layer 4: Person-to-Person Transfer Detection ──────────────────────────
  const isPersonChannel = channel === 'UPI' || channel === 'IMPS' || channel === 'NEFT'
    || channel === 'PhonePe' || channel === 'Paytm' || channel === 'Google Pay';

  if (isPersonChannel && isLikelyPersonName(counterparty)) {
    const direction = isCredit ? 'Inbound' : 'Outbound';
    return {
      category: 'Person-to-Person Transfer',
      subcategory: `P2P Transfer (${direction})`,
      merchantName: counterparty,
      counterparty,
      channel,
      confidence: 'medium',
      referenceId: refId,
      needsReview: false,
      classificationReason: `Counterparty "${counterparty}" matches Indian person name pattern. Classified as P2P rather than a business category.`,
    };
  }

  // ── Layer 5: Wallet-specific patterns ────────────────────────────────────
  if (source === 'WALLET') {
    if (isCredit) {
      return {
        category: 'Income',
        subcategory: 'Wallet Top-Up / Credit',
        merchantName: counterparty,
        counterparty,
        channel,
        confidence: 'medium',
        referenceId: refId,
        needsReview: false,
        classificationReason: 'Wallet credit — likely wallet top-up or refund',
      };
    }
  }

  // ── Layer 6: Direction-based fallback ────────────────────────────────────
  if (isCredit) {
    return {
      category: 'Income',
      subcategory: 'Other Inflow',
      merchantName: counterparty,
      counterparty,
      channel,
      confidence: 'low',
      referenceId: refId,
      needsReview: true,
      classificationReason: 'Credit transaction — no matching rule found. Classified as Other Inflow for review.',
    };
  } else {
    return {
      category: 'Other / Needs Review',
      subcategory: 'Unclassified Outflow',
      merchantName: counterparty,
      counterparty,
      channel,
      confidence: 'low',
      referenceId: refId,
      needsReview: true,
      classificationReason: 'Debit transaction — no merchant or rule match found. Please review manually.',
    };
  }
}

// Legacy helpers for backward compatibility
export function categorize(description: string, isCredit: boolean): string {
  const res = categorizeTransaction(description, isCredit);
  return `${res.category} – ${res.subcategory}`;
}

export function isIncomeCategory(categoryStr: string): boolean {
  return (
    categoryStr.startsWith('Income') ||
    categoryStr.includes('Loan Disbursement') ||
    categoryStr.includes('Salary') ||
    categoryStr.includes('Wallet Top-Up')
  );
}

export function isExpenseCategory(categoryStr: string): boolean {
  return (
    !isIncomeCategory(categoryStr) &&
    !categoryStr.includes('P2P Transfer') &&
    !categoryStr.includes('Person-to-Person') &&
    !categoryStr.includes('Own Account Transfer')
  );
}
