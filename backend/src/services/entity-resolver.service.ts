/**
 * FINOVA Entity Resolution Service
 *
 * Full pipeline:
 *  1. normalizeNarration     — strip noise, normalize whitespace
 *  2. extractUPIComponents   — VPA, payer/payee name, UTR reference
 *  3. extractCounterpartyName — clean name from various narration formats
 *  4. resolveEntityKB        — match against structured entity knowledge base
 *  5. determineEntityType    — if no KB match: person heuristic / business keyword / unknown
 *  6. applyDirectionIntelligence — salary/refund/EMI/P2P/expense per credit+debit signal
 *  7. buildExplanation       — human-readable sentence explaining every decision
 *  8. scoreConfidence        — high/medium/low based on match quality
 *
 * No external APIs. Fully local and explainable.
 */

import { resolveEntityKB, EntityType, EntityEntry } from './entity-kb.service';

// ── Result Interface ──────────────────────────────────────────────────────────

export interface EntityResolutionResult {
  // Entity identification
  canonicalName: string;
  legalName?: string;
  parentCompany?: string;
  entityType: EntityType | 'Known Person' | 'P2P Transfer';
  businessType: string;

  // Counterparty
  counterparty: string;
  merchantName: string;
  extractedVPA?: string;
  matchedAlias?: string;

  // Classification
  category: string;
  subcategory: string;
  transactionType: 'Income' | 'Expense' | 'Transfer' | 'Refund' | 'P2P' | 'EMI/Loan' | 'Investment' | 'ATM/Cash';
  channel: string;
  confidence: 'high' | 'medium' | 'low';

  // Explainability
  classificationReason: string;
  matchedBy: 'VPA' | 'alias' | 'pattern' | 'keyword' | 'person_heuristic' | 'direction' | 'fallback';

  // Flags
  needsReview: boolean;
  referenceId: string | null;
}

// ── Common Indian First Names ─────────────────────────────────────────────────
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
  // Common South Indian first names
  'arjun', 'arun', 'babu', 'balaji', 'bharath', 'chetan', 'ganesh', 'harsha',
  'jagadish', 'kalyan', 'karthik', 'madhu', 'murali', 'naveen', 'niranjan',
  'prashanth', 'pradeep', 'rajan', 'rajiv', 'ramaswamy', 'ramesh', 'ranjith',
  'santhosh', 'selvam', 'senthil', 'sridhar', 'sriram', 'subramaniam', 'sudhakaran',
  'sukumar', 'sundar', 'suresh', 'surya', 'thiru', 'uday', 'venu', 'venkat',
  // Common female names
  'aishwarya', 'bhavna', 'chitra', 'deepika', 'disha', 'harini', 'kalpana',
  'kavya', 'khushi', 'lakshmi', 'lavanya', 'madhuri', 'meghna', 'mridula',
  'nandita', 'natasha', 'nisha', 'nishtha', 'pallavi', 'payal', 'puja',
  'radha', 'ramya', 'rani', 'rekha', 'revathi', 'riya', 'rupa', 'saraswathi',
  'savita', 'sheetal', 'shweta', 'sita', 'sonali', 'sonia', 'sreelakshmi',
  'sridevi', 'supriya', 'tanvi', 'tara', 'usha', 'vandana', 'varsha', 'vidya',
  'vimala', 'yamini',
]);

const BUSINESS_KEYWORDS = [
  'pvt', 'ltd', 'corp', 'store', 'shop', 'deli', 'textile', 'mart', 'market',
  'centre', 'bank', 'petrol', 'fuel', 'food', 'restaurant', 'cafe', 'pharmacy',
  'medical', 'clinic', 'hospital', 'telecom', 'insurance', 'premium', 'loans',
  'emi', 'sip', 'zerodha', 'groww', 'electronics', 'digital', 'solutions',
  'technologies', 'infotech', 'agency', 'services', 'consortium', 'society',
  'club', 'trust', 'foundation', 'institute', 'college', 'school', 'university',
  'finance', 'capital', 'securities', 'ventures', 'enterprises', 'industries',
  'trading', 'travels', 'logistics', 'consultants', 'associates', 'payments',
  'retail', 'infra', 'infosys', 'wipro', 'tata', 'reliance', 'hdfc', 'icici',
];

// ── Step 1: Normalize narration ───────────────────────────────────────────────
export function normalizeNarration(raw: string): string {
  return raw
    .replace(/\r?\n/g, ' ')          // flatten multiline
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, ' ')  // strip control chars
    .replace(/\s{2,}/g, ' ')          // collapse whitespace
    .trim();
}

// ── Step 2: Extract UPI / VPA components ─────────────────────────────────────
interface UPIComponents {
  vpa?: string;          // full VPA e.g. "blinkit@ybl"
  payerName?: string;    // name before @
  utrRef?: string;       // UTR / transaction reference
}

export function extractUPIComponents(narration: string): UPIComponents {
  const result: UPIComponents = {};

  // Pattern: anything@bankname — capture VPA
  const vpaMatch = narration.match(/([A-Za-z0-9._+-]+@[A-Za-z][A-Za-z0-9]+)/);
  if (vpaMatch) {
    result.vpa = vpaMatch[1].toLowerCase();
    result.payerName = vpaMatch[1].split('@')[0].replace(/[._-]/g, ' ').trim();
  }

  // UTR / Reference ID extraction
  const utrPatterns = [
    /\b(?:UTR|REF|TXN|NEFT|IMPS|UPI|CHK)[-/\s:]*([A-Za-z0-9]{8,22})\b/i,
    /\b(\d{10,16})\b/,
  ];
  for (const p of utrPatterns) {
    const m = narration.match(p);
    if (m?.[1]) { result.utrRef = m[1]; break; }
  }

  return result;
}

// ── Step 3: Extract counterparty name from narration ─────────────────────────
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(w => w.length > 0 ? w[0].toUpperCase() + w.slice(1) : '')
    .join(' ')
    .trim();
}

export function extractCounterpartyName(narration: string, vpaPayerName?: string): string {
  let text = narration.trim();

  // UPI narration formats:
  // Format A: UPI/ref/Name/vpa
  const upiFormatA = text.match(/UPI\/[^/]+\/(?:CR|DR|PAY TO\s*)?([^/\n@]+)/i);
  if (upiFormatA?.[1]) {
    const candidate = upiFormatA[1].replace(/[@._-]/g, ' ').replace(/\s+/g, ' ').trim();
    if (candidate.length > 2) return toTitleCase(candidate);
  }

  // Format B: UPI-Name@vpa
  const upiFormatB = text.match(/UPI[-\s]+([A-Za-z][A-Za-z0-9\s._-]+?)[@\s]/i);
  if (upiFormatB?.[1]) {
    return toTitleCase(upiFormatB[1].trim());
  }

  // If VPA payer name is available and looks human-readable, use it as fallback
  if (vpaPayerName && vpaPayerName.length > 2) {
    const cleaned = vpaPayerName.replace(/[._-]/g, ' ').replace(/\s+/g, ' ').trim();
    return toTitleCase(cleaned);
  }

  // Format C: APB-CR-MERCHANTNAME
  const apbMatch = text.match(/APB-(?:CR|DR)-([A-Za-z0-9]+)/i);
  if (apbMatch?.[1]) {
    return toTitleCase(apbMatch[1].replace(/([a-z])([A-Z])/g, '$1 $2'));
  }

  // Format D: NEFT/IMPS/RTGS — strip prefix, take remainder
  const transferMatch = text.match(/(?:NEFT|IMPS|RTGS|ACH|NACH)[\s/-]+(?:CR|DR)?[\s/-]?([A-Za-z][A-Za-z\s]+)/i);
  if (transferMatch?.[1]) {
    const candidate = transferMatch[1].replace(/\b(?:NEFT|IMPS|REF|UTR|TXN)\b/gi, '').trim();
    if (candidate.length > 1) return toTitleCase(candidate);
  }

  // Generic: strip technical tokens, take first meaningful segment
  const cleaned = text
    .replace(/\b(?:NEFT|IMPS|UPI|REF|UTR|TXN|CHK|POS|ACH|EFT|RTGS|NACH|APB)[-/\s:]*[A-Za-z0-9]{0,22}\b/gi, ' ')
    .replace(/\b\d{6,16}\b/g, ' ')
    .replace(/\b(?:CR|DR|CREDIT|DEBIT)\b/gi, ' ')
    .replace(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*,?\s*\d{0,4}\b/gi, ' ')
    .replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, ' ')
    .replace(/[-_*,.:;/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned && cleaned.length >= 2) return toTitleCase(cleaned.substring(0, 50));
  return toTitleCase(text.split(' ').slice(0, 3).join(' '));
}

// ── Step 4: Payment channel detection ────────────────────────────────────────
export function detectChannel(narration: string): string {
  const u = narration.toUpperCase();
  if (u.includes('UPI/') || u.includes('UPI-') || u.match(/[A-Z0-9._%+-]+@[A-Z]+/)) return 'UPI';
  if (u.includes('NEFT')) return 'NEFT';
  if (u.includes('IMPS')) return 'IMPS';
  if (u.includes('RTGS')) return 'RTGS';
  if (u.includes('POS') || u.includes('CARD PAYMENT') || u.includes('CARD PMT')) return 'Card / POS';
  if (u.includes('ATM') || u.includes('CASH WDR') || u.includes('WITHDRAWAL')) return 'ATM / Cash';
  if (u.includes('ACH/') || u.includes('NACH') || u.includes('DIRECT DEBIT') || u.includes('STANDING ORDER')) return 'Direct Debit / ACH';
  if (u.includes('EFT') || u.includes('APB-')) return 'Electronic Fund Transfer';
  if (u.includes('CHQ') || u.includes('CHK') || u.includes('CHEQUE') || u.includes('CHECK')) return 'Cheque';
  if (u.includes('PHONEPE') || u.includes('PHONE PE')) return 'PhonePe';
  if (u.includes('PAYTM')) return 'Paytm';
  if (u.includes('GPAY') || u.includes('GOOGLE PAY')) return 'Google Pay';
  return 'Bank Transfer';
}

// ── Step 5: Person name heuristic ─────────────────────────────────────────────
export function isLikelyPersonName(name: string): boolean {
  const lower = name.toLowerCase().trim();
  const words = lower.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0 || words.length > 3) return false;
  if (BUSINESS_KEYWORDS.some(k => lower.includes(k))) return false;
  if (!words.every(w => /^[a-z.]{1,20}$/.test(w))) return false;
  if (INDIAN_FIRST_NAMES.has(words[0])) return true;
  if (words.length === 2 && words[0].length === 1 && /^[a-z]$/.test(words[0])) return true;
  if (words.length === 2 && words[1].length === 1 && INDIAN_FIRST_NAMES.has(words[0])) return true;
  if (words.length === 2 && words.every(w => w.length >= 3 && w.length <= 15)) {
    if (INDIAN_FIRST_NAMES.has(words[0]) || INDIAN_FIRST_NAMES.has(words[1])) return true;
  }
  return false;
}

// ── Step 6: Direction / purpose intelligence rules ────────────────────────────
interface DirectionRule {
  keywords: string[];
  patterns?: RegExp[];
  isCreditOnly?: boolean;
  isDebitOnly?: boolean;
  category: string;
  subcategory: string;
  transactionType: EntityResolutionResult['transactionType'];
  confidence: 'high' | 'medium' | 'low';
}

const INCOME_DIRECTION_RULES: DirectionRule[] = [
  {
    keywords: ['salary', 'sal credit', 'payroll', 'stipend', 'wages', 'sal_credit', 'monthly pay', 'biweekly pay'],
    patterns: [/sal(ary)?[\s_-]/i, /salary\s*credit/i, /payroll/i],
    isCreditOnly: true,
    category: 'Income',
    subcategory: 'Salary',
    transactionType: 'Income',
    confidence: 'high',
  },
  {
    keywords: ['refund', 'reversal', 'cashback', 'reward credit', 'reimbursement', 'cashbk', 'cash back'],
    patterns: [/refund/i, /cashback/i, /cash\s*bk/i, /reversal/i],
    isCreditOnly: true,
    category: 'Income',
    subcategory: 'Refund & Cashback',
    transactionType: 'Refund',
    confidence: 'high',
  },
  {
    keywords: ['interest credit', 'fd interest', 'savings interest', 'dividend', 'int credit', 'int cr'],
    patterns: [/interest\s*credit/i, /dividend/i, /\bint\s*cr\b/i],
    isCreditOnly: true,
    category: 'Income',
    subcategory: 'Interest & Dividend',
    transactionType: 'Income',
    confidence: 'high',
  },
  {
    keywords: ['freelance', 'consulting fee', 'invoice paid', 'client payment', 'vendor credit'],
    patterns: [/freelance/i, /consulting\s*fee/i],
    isCreditOnly: true,
    category: 'Income',
    subcategory: 'Business Income',
    transactionType: 'Income',
    confidence: 'high',
  },
  {
    keywords: ['consortium', 'government', 'govt', 'grant', 'scholarship', 'agency disbursement'],
    patterns: [/consortium/i, /govt/i, /scholarship/i],
    isCreditOnly: true,
    category: 'Income',
    subcategory: 'Grant & Disbursement',
    transactionType: 'Income',
    confidence: 'medium',
  },
];

const EXPENSE_DIRECTION_RULES: DirectionRule[] = [
  {
    keywords: ['premium due', 'premium coll', 'policy premium', 'insurance premium', 'premium pmt'],
    patterns: [/premium\s*(due|coll|pmt|payment)?/i, /policy\s*premium/i],
    isDebitOnly: true,
    category: 'Insurance & Premiums',
    subcategory: 'Policy Premium',
    transactionType: 'Expense',
    confidence: 'high',
  },
  {
    keywords: ['house rent', 'apartment rent', 'flat rent', 'pg rent', 'monthly rent', 'rent payment'],
    patterns: [/\brent\b/i, /\blease\b/i],
    isDebitOnly: true,
    category: 'Rent',
    subcategory: 'House & Apartment Rent',
    transactionType: 'Expense',
    confidence: 'high',
  },
  {
    keywords: ['home loan', 'housing loan', 'car loan', 'auto loan', 'hdfc home loan', 'sbi home loan'],
    patterns: [/home\s*loan/i, /car\s*loan/i, /housing\s*loan/i],
    isDebitOnly: true,
    category: 'EMI & Loans',
    subcategory: 'Home & Auto Loan',
    transactionType: 'EMI/Loan',
    confidence: 'high',
  },
  {
    keywords: ['emi', 'personal loan', 'instalment', 'installment', 'emi payment', 'loan emi', 'nach emi'],
    patterns: [/\bemi\b/i, /loan\s*repay/i, /nach.*emi/i, /\bnach\b/i],
    isDebitOnly: true,
    category: 'EMI & Loans',
    subcategory: 'Personal & Consumer Loan',
    transactionType: 'EMI/Loan',
    confidence: 'high',
  },
  {
    keywords: ['sip payment', 'mutual fund sip', 'mf sip', 'sip debit', 'sip-', 'systematic investment'],
    patterns: [/\bsip\b/i, /mutual\s*fund/i, /systematic\s*investment/i],
    isDebitOnly: true,
    category: 'Investments',
    subcategory: 'Mutual Fund SIP',
    transactionType: 'Investment',
    confidence: 'high',
  },
  {
    keywords: ['atm', 'cash withdrawal', 'cash wd', 'atm wd', 'withdrawn', 'cash dispensed'],
    patterns: [/\batm\b/i, /cash\s*withdrawal/i, /cash\s*wd/i],
    category: 'ATM & Cash',
    subcategory: 'Cash Withdrawal',
    transactionType: 'ATM/Cash',
    confidence: 'high',
  },
  {
    keywords: ['bank charge', 'service charge', 'penalty charge', 'processing fee', 'sms charge', 'annual fee', 'maintenance charge'],
    patterns: [/bank\s*charge/i, /service\s*charge/i, /\bpenalty\b/i, /annual\s*fee/i],
    isDebitOnly: true,
    category: 'Bank Charges',
    subcategory: 'Service Fees',
    transactionType: 'Expense',
    confidence: 'high',
  },
  {
    keywords: ['electricity', 'electric bill', 'power bill', 'bescom', 'msedcl', 'bses'],
    patterns: [/electricity/i, /electric\s*bill/i, /power\s*bill/i],
    isDebitOnly: true,
    category: 'Utilities & Bills',
    subcategory: 'Electricity',
    transactionType: 'Expense',
    confidence: 'high',
  },
  {
    keywords: ['water bill', 'gas bill', 'piped gas', 'mahanagar gas', 'indraprastha gas'],
    patterns: [/gas\s*bill/i, /water\s*bill/i],
    isDebitOnly: true,
    category: 'Utilities & Bills',
    subcategory: 'Gas & Water',
    transactionType: 'Expense',
    confidence: 'high',
  },
  {
    keywords: ['mobile recharge', 'broadband', 'wifi bill', 'postpaid bill', 'prepaid recharge', 'internet bill'],
    patterns: [/broadband/i, /mobile\s*recharge/i, /postpaid/i, /internet\s*bill/i],
    isDebitOnly: true,
    category: 'Utilities & Bills',
    subcategory: 'Mobile & Internet',
    transactionType: 'Expense',
    confidence: 'high',
  },
  {
    keywords: ['pharmacy', 'medical store', 'hospital', 'clinic', 'doctor', 'diagnostic', 'chemist', 'health center'],
    patterns: [/pharmacy/i, /medical\s*store/i, /hospital/i, /diagnostic/i],
    isDebitOnly: true,
    category: 'Healthcare',
    subcategory: 'Pharmacy & Medical',
    transactionType: 'Expense',
    confidence: 'medium',
  },
  {
    keywords: ['school fee', 'college fee', 'tuition fee', 'university fee', 'coaching fee', 'course fee'],
    patterns: [/school\s*fee/i, /college\s*fee/i, /tuition/i, /coaching/i],
    isDebitOnly: true,
    category: 'Education',
    subcategory: 'School & College Fees',
    transactionType: 'Expense',
    confidence: 'high',
  },
  {
    keywords: ['petrol', 'diesel', 'fuel station', 'cng station', 'petrol station', 'fuel pump'],
    patterns: [/petrol\s*station/i, /fuel\s*station/i, /fuel\s*pump/i, /\bcng\b/i],
    isDebitOnly: true,
    category: 'Fuel',
    subcategory: 'Petrol & CNG',
    transactionType: 'Expense',
    confidence: 'high',
  },
  {
    keywords: ['income tax', 'advance tax', 'self assessment tax', 'tds payment', 'gst payment'],
    patterns: [/income\s*tax/i, /advance\s*tax/i, /\btds\b/i, /\bgst\b/i],
    isDebitOnly: true,
    category: 'Taxes',
    subcategory: 'Direct Tax',
    transactionType: 'Expense',
    confidence: 'high',
  },
  {
    keywords: ['own account', 'self transfer', 'transfer to self', 'inter bank transfer', 'own ac', 'same bank'],
    patterns: [/own\s*account/i, /self\s*transfer/i],
    category: 'Internal Transfer',
    subcategory: 'Own Account Transfer',
    transactionType: 'Transfer',
    confidence: 'medium',
  },
];

// ── Main Resolver ─────────────────────────────────────────────────────────────
export function resolveEntity(
  rawNarration: string,
  isCredit: boolean,
  source: 'BANK' | 'WALLET' = 'BANK'
): EntityResolutionResult {
  const narration = normalizeNarration(rawNarration);
  const lower = narration.toLowerCase();
  const upi = extractUPIComponents(narration);
  const channel = detectChannel(narration);
  const counterpartyRaw = extractCounterpartyName(narration, upi.payerName);
  const refId = upi.utrRef || null;

  // ── Step 1: Identify Entity (KB & Person) ──────────────────────────────────
  let kbEntry = upi.vpa ? resolveEntityKB(narration, upi.vpa, { onlyVPA: true }) : null;
  let matchedBy: 'VPA' | 'alias' | 'pattern' | 'keyword' | 'person_heuristic' | 'direction' | 'fallback' = upi.vpa ? 'VPA' : 'alias';

  const isPersonalChannel = ['UPI', 'IMPS', 'NEFT', 'PhonePe', 'Paytm', 'Google Pay'].includes(channel);
  const isPerson = isPersonalChannel && isLikelyPersonName(counterpartyRaw);

  let entityType: EntityType | 'Known Person' | 'P2P Transfer' = 'Unknown Entity';
  let businessType = 'Financial Transaction';
  let matchedAlias: string | undefined = undefined;
  let canonicalName = counterpartyRaw;
  let legalName: string | undefined = undefined;
  let parentCompany: string | undefined = undefined;
  let kbConfidence: 'high' | 'medium' | 'low' = 'low';

  // If VPA match exists, it's strong. If not, and it's a person, it's a person.
  if (kbEntry) {
    entityType = kbEntry.entityType;
    businessType = kbEntry.businessType;
    canonicalName = kbEntry.canonicalName;
    legalName = kbEntry.legalName;
    parentCompany = kbEntry.parentCompany;
    kbConfidence = kbEntry.confidence;
  } else if (isPerson) {
    entityType = 'Known Person';
    businessType = 'Individual / Private Person';
    matchedBy = 'person_heuristic';
    kbConfidence = 'medium';
  } else {
    // Full KB lookup (alias & pattern)
    kbEntry = resolveEntityKB(narration, upi.vpa);
    if (kbEntry) {
      matchedBy = 'alias';
      entityType = kbEntry.entityType;
      businessType = kbEntry.businessType;
      canonicalName = kbEntry.canonicalName;
      legalName = kbEntry.legalName;
      parentCompany = kbEntry.parentCompany;
      kbConfidence = kbEntry.confidence;
      matchedAlias = findMatchedAlias(lower, kbEntry);
    } else {
      matchedBy = 'fallback';
    }
  }

  // ── Step 2: Evaluate Directional Rules (Overrides Category) ────────────────
  const activeRules = isCredit ? INCOME_DIRECTION_RULES : EXPENSE_DIRECTION_RULES;
  let matchedRule: DirectionRule | undefined = undefined;

  for (const rule of activeRules) {
    if (rule.isCreditOnly && !isCredit) continue;
    if (rule.isDebitOnly && isCredit) continue;
    
    if (rule.keywords.some(k => lower.includes(k.toLowerCase())) ||
        rule.patterns?.some(p => p.test(narration))) {
      matchedRule = rule;
      break;
    }
  }

  // ── Step 3: Combine Results ───────────────────────────────────────────────

  // Case A: Rule Matched (Overrides KB category)
  if (matchedRule) {
    return buildResult({
      counterparty: canonicalName,
      merchantName: canonicalName,
      entityType: kbEntry ? kbEntry.entityType : entityType,
      businessType: kbEntry ? kbEntry.businessType : businessType,
      legalName,
      parentCompany,
      extractedVPA: upi.vpa,
      matchedAlias,
      category: matchedRule.category,
      subcategory: matchedRule.subcategory,
      transactionType: matchedRule.transactionType,
      channel,
      confidence: kbEntry ? 'high' : matchedRule.confidence,
      matchedBy: kbEntry ? matchedBy : 'keyword',
      needsReview: false,
      refId,
      reason: kbEntry 
        ? buildKBReason(kbEntry, isCredit ? 'credit' : 'debit', matchedBy, upi.vpa, matchedAlias) + ` However, a directional rule matched "${matchedRule.subcategory}", overriding category to ${matchedRule.category}.`
        : `Directional keyword/pattern matched: "${matchedRule.subcategory}". Transaction is a ${isCredit ? 'credit' : 'debit'} classified as ${matchedRule.transactionType}.`,
    });
  }

  // Case B: Person P2P Transfer (No rule matched)
  if (!kbEntry && isPerson) {
    const direction = isCredit ? 'Inbound' : 'Outbound';
    return buildResult({
      counterparty: canonicalName,
      merchantName: canonicalName,
      entityType: 'Known Person',
      businessType: 'Individual / Private Person',
      legalName: undefined,
      parentCompany: undefined,
      extractedVPA: upi.vpa,
      matchedAlias: undefined,
      category: 'Person-to-Person Transfer',
      subcategory: `P2P Transfer (${direction})`,
      transactionType: 'P2P',
      channel,
      confidence: 'medium',
      matchedBy: 'person_heuristic',
      needsReview: false,
      refId,
      reason: `Counterparty "${counterpartyRaw}" matches an Indian person name pattern via heuristic analysis. No commercial merchant signals found. Classified as Person-to-Person transfer (${direction.toLowerCase()}).`,
    });
  }

  // Case C: Entity KB Matched (No overriding rule)
  if (kbEntry) {
    if (kbEntry.isDebitOnly && isCredit) {
      return buildResult({
        counterparty: canonicalName,
        merchantName: canonicalName,
        entityType: kbEntry.entityType,
        businessType: kbEntry.businessType,
        legalName,
        parentCompany,
        extractedVPA: upi.vpa,
        matchedAlias,
        category: 'Income',
        subcategory: 'Refund & Cashback',
        transactionType: 'Refund',
        channel,
        confidence: 'high',
        matchedBy,
        needsReview: false,
        refId,
        reason: buildKBReason(kbEntry, 'credit', matchedBy, upi.vpa, matchedAlias) +
          ` Transaction is a credit from a typically-debit merchant — classified as Refund.`,
      });
    }

    const txType = deriveTransactionType(kbEntry.category, isCredit);
    return buildResult({
      counterparty: canonicalName,
      merchantName: canonicalName,
      entityType: kbEntry.entityType,
      businessType: kbEntry.businessType,
      legalName,
      parentCompany,
      extractedVPA: upi.vpa,
      matchedAlias,
      category: kbEntry.category,
      subcategory: kbEntry.subcategory,
      transactionType: txType,
      channel,
      confidence: kbEntry.confidence,
      matchedBy,
      needsReview: false,
      refId,
      reason: buildKBReason(kbEntry, isCredit ? 'credit' : 'debit', matchedBy, upi.vpa, matchedAlias),
    });
  }

  // Case D: Wallet Source Fallback
  if (source === 'WALLET') {
    if (isCredit) {
      return buildResult({
        counterparty: canonicalName,
        merchantName: canonicalName,
        entityType: 'Unknown Entity',
        businessType: 'Wallet Transaction',
        legalName: undefined,
        parentCompany: undefined,
        extractedVPA: upi.vpa,
        matchedAlias: undefined,
        category: 'Income',
        subcategory: 'Wallet Top-Up / Credit',
        transactionType: 'Income',
        channel,
        confidence: 'medium',
        matchedBy: 'direction',
        needsReview: false,
        refId,
        reason: 'Wallet credit detected — likely wallet top-up, cashback or refund from merchant.',
      });
    }
  }

  // Case E: Absolute Fallback
  if (isCredit) {
    return buildResult({
      counterparty: canonicalName,
      merchantName: canonicalName,
      entityType: 'Needs Review',
      businessType: 'Unknown',
      legalName: undefined,
      parentCompany: undefined,
      extractedVPA: upi.vpa,
      matchedAlias: undefined,
      category: 'Income',
      subcategory: 'Other Inflow',
      transactionType: 'Income',
      channel,
      confidence: 'low',
      matchedBy: 'fallback',
      needsReview: true,
      refId,
      reason: `Credit transaction detected but counterparty "${counterpartyRaw}" could not be identified against the entity knowledge base. No income pattern matched. Marked Needs Review — do not assume category.`,
    });
  } else {
    return buildResult({
      counterparty: canonicalName,
      merchantName: canonicalName,
      entityType: 'Needs Review',
      businessType: 'Unknown',
      legalName: undefined,
      parentCompany: undefined,
      extractedVPA: upi.vpa,
      matchedAlias: undefined,
      category: 'Other / Needs Review',
      subcategory: 'Unclassified Outflow',
      transactionType: 'Expense',
      channel,
      confidence: 'low',
      matchedBy: 'fallback',
      needsReview: true,
      refId,
      reason: `Counterparty "${counterpartyRaw}" not found in merchant/entity knowledge base. No keyword or pattern rules matched. Marked Needs Review instead of guessing a category.`,
    });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function findMatchedAlias(lower: string, entry: EntityEntry): string | undefined {
  return entry.aliases.find(a => lower.includes(a));
}

function deriveTransactionType(category: string, isCredit: boolean): EntityResolutionResult['transactionType'] {
  if (category.includes('Income')) return 'Income';
  if (category.includes('EMI') || category.includes('Loan')) return 'EMI/Loan';
  if (category.includes('Investment')) return 'Investment';
  if (category.includes('Transfer')) return 'Transfer';
  if (category.includes('ATM') || category.includes('Cash')) return 'ATM/Cash';
  if (isCredit) return 'Income';
  return 'Expense';
}

function buildKBReason(
  entry: EntityEntry,
  direction: 'credit' | 'debit',
  matchedBy: string,
  vpa?: string,
  alias?: string
): string {
  const matchMethod = matchedBy === 'VPA' ? `VPA fragment "${vpa}"` : alias ? `alias match "${alias}"` : 'pattern match';
  const companyInfo = entry.legalName ? ` (legal name: ${entry.legalName}${entry.parentCompany ? `, parent: ${entry.parentCompany}` : ''})` : '';
  return `Identified as ${entry.canonicalName}${companyInfo} via ${matchMethod}. ${entry.canonicalName} is classified as a ${entry.businessType}. Transaction is a ${direction}, therefore categorized as ${direction === 'debit' ? 'Expense' : 'Income'} → ${entry.category} → ${entry.subcategory}.`;
}

interface BuildResultParams {
  counterparty: string;
  merchantName: string;
  entityType: EntityResolutionResult['entityType'];
  businessType: string;
  legalName?: string;
  parentCompany?: string;
  extractedVPA?: string;
  matchedAlias?: string;
  category: string;
  subcategory: string;
  transactionType: EntityResolutionResult['transactionType'];
  channel: string;
  confidence: 'high' | 'medium' | 'low';
  matchedBy: EntityResolutionResult['matchedBy'];
  needsReview: boolean;
  refId: string | null;
  reason: string;
}

function buildResult(p: BuildResultParams): EntityResolutionResult {
  return {
    canonicalName: p.counterparty,
    legalName: p.legalName,
    parentCompany: p.parentCompany,
    entityType: p.entityType,
    businessType: p.businessType,
    counterparty: p.counterparty,
    merchantName: p.merchantName,
    extractedVPA: p.extractedVPA,
    matchedAlias: p.matchedAlias,
    category: p.category,
    subcategory: p.subcategory,
    transactionType: p.transactionType,
    channel: p.channel,
    confidence: p.confidence,
    classificationReason: p.reason,
    matchedBy: p.matchedBy,
    needsReview: p.needsReview,
    referenceId: p.refId,
  };
}
