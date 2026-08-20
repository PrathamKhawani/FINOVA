/**
 * FINOVA Layered Categorization & Entity Extraction Engine v4
 *
 * Implements a multi-layer classification strategy:
 *  Layer 1: Direction Evidence (Debit vs Credit)
 *  Layer 2: Channel Identification (UPI, NEFT, IMPS, POS, ACH, EFT, RTGS, ATM, Card, Cheque, Direct Debit)
 *  Layer 3: Counterparty / Entity / Person Extraction
 *  Layer 4: Insurance / Premium & Specific Financial Pattern Rules
 *  Layer 5: Person-to-Person (P2P) Transfer Detection (prevents misclassifying individuals as Food/Shopping/Salary)
 *  Layer 6: Merchant & Entity Mappings
 *  Layer 7: Fallback & Confidence Scoring ("Needs Review" only when evidence is insufficient)
 */

export interface CategorizationResult {
  category: string;
  subcategory: string;
  merchantName: string;
  counterparty: string;
  channel: string;
  confidence: 'high' | 'medium' | 'low';
  referenceId: string | null;
  needsReview: boolean;
}

// ── 1. Reference ID Extraction ───────────────────────────────────────────────
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

// ── 2. Payment Channel Detection ─────────────────────────────────────────────
export function detectPaymentChannel(description: string): string {
  const upper = description.toUpperCase();
  if (upper.includes('UPI/')) return 'UPI';
  if (upper.includes('NEFT')) return 'NEFT';
  if (upper.includes('IMPS')) return 'IMPS';
  if (upper.includes('POS') || upper.includes('CARD PAYMENT')) return 'Card / POS';
  if (upper.includes('ATM') || upper.includes('CASH WDR') || upper.includes('WITHDRAWAL')) return 'ATM / Cash';
  if (upper.includes('ACH/') || upper.includes('DIRECT DEBIT') || upper.includes('STANDING ORDER')) return 'Direct Debit / ACH';
  if (upper.includes('APB-') || upper.includes('EFT') || upper.includes('RTGS')) return 'Bank Transfer / RTGS';
  if (upper.includes('CHK') || upper.includes('CHEQUE')) return 'Cheque';
  return 'Bank Transfer';
}

// ── 3. Counterparty & Entity Extraction ──────────────────────────────────────
export function extractCounterparty(description: string): { counterparty: string; merchantName: string } {
  let text = description.trim();

  // Pattern: UPI/ref/CR/Name or UPI/ref/DR/Name
  const upiMatch = text.match(/UPI\/[A-Za-z0-9]+\/(?:CR|DR)\/([^/]+)/i);
  if (upiMatch && upiMatch[1]) {
    const rawName = upiMatch[1].replace(/[-_*,.:;]/g, ' ').replace(/\s+/g, ' ').trim();
    const cleanName = formatTitleCase(rawName);
    return { counterparty: cleanName, merchantName: cleanName };
  }

  // Pattern: APB-CR-KNOWLEDGECONSORGUJHD or similar APB/EFT formats
  const apbMatch = text.match(/APB-(?:CR|DR)-([A-Za-z0-9]+)/i);
  if (apbMatch && apbMatch[1]) {
    const raw = apbMatch[1]
      .replace(/KNOWLEDGECONSORGUJHD/i, 'Knowledge Consortium Gujarat')
      .replace(/([a-z])([A-Z])/g, '$1 $2');
    const clean = formatTitleCase(raw);
    return { counterparty: clean, merchantName: clean };
  }

  // Pattern: PREMIUM DUE COLL: 12/2025 or INSURANCE PREMIUM
  if (/PREMIUM\s*DUE|POLICY\s*PREMIUM|LIC\s*PREMIUM/i.test(text)) {
    return { counterparty: 'Insurance Premium Collection', merchantName: 'Insurance Premium Collection' };
  }

  // Strip ref numbers, channels, dates
  let cleaned = text
    .replace(/\b(?:NEFT|IMPS|UPI|REF|UTR|TXN|CHK|POS)[-/\s:]*[A-Za-z0-9]{6,22}\b/gi, '')
    .replace(/\b\d{10,16}\b/g, '')
    .replace(/\b(?:UPI|NEFT|IMPS|POS|ACH|EFT|RTGS|BIL|CR|DR|PG|CARD PAYMENT|DIRECT DEBIT)[-/\s:]+/gi, '')
    .replace(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*,?\s*\d{0,4}\b/gi, '')
    .replace(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/g, '')
    .replace(/\b(?:payment|online|retail|store|pvt|ltd|inc|llp|india|corp|bank|timed|\d{1,2}:\d{2})\b/gi, '')
    .replace(/[-_*,.:;/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || cleaned.length < 2) {
    cleaned = text.split(' ').slice(0, 3).join(' ').trim();
  }

  const formatted = formatTitleCase(cleaned);
  return { counterparty: formatted, merchantName: formatted };
}

function formatTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(w => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
    .join(' ')
    .trim();
}

// ── 4. Person Name Heuristic (Individual Transfer Detection) ───────────────────
function isLikelyIndividualPersonName(name: string): boolean {
  const lower = name.toLowerCase();
  
  // Non-person keywords
  const businessKeywords = [
    'pvt', 'ltd', 'corp', 'store', 'shop', 'deli', 'textile', 'mart', 'market',
    'bank', 'petrol', 'fuel', 'food', 'restaurant', 'cafe', 'pharmacy', 'medical',
    'hospital', 'telecom', 'jio', 'airtel', 'amazon', 'uber', 'swiggy', 'zomato',
    'netflix', 'insurance', 'premium', 'loans', 'emi', 'sip', 'zerodha', 'groww',
    'electronics', 'digital', 'solutions', 'technologies', 'infotech', 'agency',
    'services', 'consortium', 'society', 'club', 'trust'
  ];

  if (businessKeywords.some(k => lower.includes(k))) return false;

  // Single word or 2-3 word human names like "NILESH K", "SANTOSH", "RAMESH SHARMA", "PRIYA M"
  const words = name.trim().split(/\s+/);
  if (words.length >= 1 && words.length <= 3) {
    // If words are short or standard name structures
    if (words.every(w => /^[A-Za-z.]{1,20}$/.test(w))) {
      return true;
    }
  }
  return false;
}

// ── 5. Layered Rules Schema ───────────────────────────────────────────────────
interface CategorizationRule {
  category: string;
  subcategory: string;
  confidence: 'high' | 'medium' | 'low';
  keywords: string[];
  patterns?: RegExp[];
  isCreditOnly?: boolean;
  isDebitOnly?: boolean;
}

const CATEGORIZATION_RULES: CategorizationRule[] = [
  // ── INSURANCE & PREMIUM (Checked first to avoid misclassifications) ──
  {
    category: 'Insurance & Premium',
    subcategory: 'Policy Premium',
    confidence: 'high',
    keywords: ['premium due', 'premium coll', 'policy premium', 'lic', 'star health', 'bajaj allianz', 'hdfc ergo', 'icici lombard', 'tata aig', 'insurance premium', 'max life', 'sbi life'],
    patterns: [/premium\s*(due|coll|pmt|payment)?/i, /insurance/i, /\blic\b/i],
  },

  // ── INCOME & SALARY ──
  {
    category: 'Income',
    subcategory: 'Salary',
    confidence: 'high',
    keywords: ['salary', 'sal credit', 'payroll', 'stipend', 'wages', 'sal_credit'],
    patterns: [/sal(ary)?[\s_-]/i, /salary\s*credit/i, /yourjob.*biweekly/i, /biweekly.*pay/i],
    isCreditOnly: true,
  },
  {
    category: 'Income',
    subcategory: 'Business Income',
    confidence: 'high',
    keywords: ['freelance', 'consulting', 'consultancy', 'invoice paid', 'client payment', 'direct deposit', 'vendor credit'],
    patterns: [/direct\s*deposit/i, /freelance/i, /consulting/i],
    isCreditOnly: true,
  },
  {
    category: 'Income',
    subcategory: 'Interest Income',
    confidence: 'high',
    keywords: ['interest credit', 'fd interest', 'savings interest', 'dividend', 'int credit'],
    patterns: [/interest\s*credit/i, /dividend/i],
    isCreditOnly: true,
  },
  {
    category: 'Income',
    subcategory: 'Refund & Cashback',
    confidence: 'high',
    keywords: ['refund', 'reversal', 'cashback', 'reward credit', 'reimbursement'],
    patterns: [/refund/i, /cashback/i, /reversal/i],
    isCreditOnly: true,
  },

  // ── FOOD & DINING ──
  {
    category: 'Food & Dining',
    subcategory: 'Food Delivery',
    confidence: 'high',
    keywords: ['swiggy', 'zomato', 'blinkit food', 'faasos', 'freshmenu', 'dominos', 'pizza hut'],
    patterns: [/swiggy/i, /zomato/i, /domino/i],
    isDebitOnly: true,
  },
  {
    category: 'Food & Dining',
    subcategory: 'Restaurants & Dining',
    confidence: 'high',
    keywords: ['mcdonald', 'mcdonalds', 'burger king', 'kfc', 'starbucks', 'cafe', 'restaurant', 'deli', 'barbeque', 'haldiram', 'haldirams'],
    patterns: [/restaurant/i, /deli/i, /cafe/i, /starbucks/i, /mcdonald/i],
    isDebitOnly: true,
  },

  // ── GROCERIES ──
  {
    category: 'Groceries',
    subcategory: 'Supermarket & Kirana',
    confidence: 'high',
    keywords: ['bigbasket', 'big basket', 'grofers', 'blinkit', 'jiomart', 'dmart', 'd-mart', 'more supermarket', 'reliance fresh', 'nature basket', 'kirana', 'vegetables', 'supermarket'],
    patterns: [/bigbasket/i, /dmart/i, /grocery/i, /supermarket/i],
    isDebitOnly: true,
  },

  // ── SHOPPING ──
  {
    category: 'Shopping',
    subcategory: 'Online Shopping',
    confidence: 'high',
    keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'snapdeal', 'tata cliq'],
    patterns: [/amazon/i, /flipkart/i, /myntra/i],
    isDebitOnly: true,
  },
  {
    category: 'Shopping',
    subcategory: 'Apparel & Fashion',
    confidence: 'high',
    keywords: ['vjay text', 'vijay text', 'textile', 'clothing', 'h&m', 'zara', 'westside', 'pantaloons', 'max fashion', 'trends'],
    patterns: [/textile/i, /garment/i, /fashion/i, /vjay\s*text/i],
    isDebitOnly: true,
  },
  {
    category: 'Shopping',
    subcategory: 'Retail & Electronics',
    confidence: 'high',
    keywords: ['reliance digital', 'croma', 'vijay sales', 'decathlon', 'jewelers', 'jewellers', 'jewelry', 'comco citi'],
    patterns: [/croma/i, /jewel/i, /decathlon/i, /comco/i],
    isDebitOnly: true,
  },

  // ── TRAVEL & TRANSPORT ──
  {
    category: 'Travel & Transport',
    subcategory: 'Cabs & Rides',
    confidence: 'high',
    keywords: ['uber', 'ola', 'rapido', 'taxi', 'cab', 'rickshaw'],
    patterns: [/uber/i, /ola[\s_-]/i, /rapido/i],
    isDebitOnly: true,
  },
  {
    category: 'Travel & Transport',
    subcategory: 'Railways',
    confidence: 'high',
    keywords: ['irctc', 'indian rail', 'railway', 'metro', 'bmtc', 'namma metro'],
    patterns: [/irctc/i, /rail/i, /metro/i],
    isDebitOnly: true,
  },
  {
    category: 'Travel & Transport',
    subcategory: 'Airlines & Hotels',
    confidence: 'high',
    keywords: ['indigo', 'air india', 'spicejet', 'makemytrip', 'yatra', 'cleartrip', 'redbus', 'flight', 'hotel booking'],
    patterns: [/indigo/i, /makemytrip/i],
    isDebitOnly: true,
  },

  // ── FUEL ──
  {
    category: 'Fuel',
    subcategory: 'Petrol & Gas Stations',
    confidence: 'high',
    keywords: ['petrol', 'diesel', 'fuel', 'bharat petroleum', 'hp petro', 'iocl', 'indian oil', 'shell', 'cng', 'nayara', 'bpcl', 'hpcl', 'petrol station'],
    patterns: [/petrol/i, /bpcl/i, /hpcl/i, /iocl/i, /fuel/i],
    isDebitOnly: true,
  },

  // ── RENT ──
  {
    category: 'Rent',
    subcategory: 'House & Apartment Rent',
    confidence: 'high',
    keywords: ['apartment rent', 'house rent', 'pg rent', 'monthly rent', 'flat rent', 'rent payment'],
    patterns: [/rent/i, /lease/i],
    isDebitOnly: true,
  },

  // ── UTILITIES & BILLS ──
  {
    category: 'Utilities & Bills',
    subcategory: 'Electricity & Gas',
    confidence: 'high',
    keywords: ['electricity', 'water bill', 'gas bill', 'bescom', 'msedcl', 'bses', 'tata power'],
    patterns: [/electricity/i, /gas\s*bill/i],
    isDebitOnly: true,
  },
  {
    category: 'Utilities & Bills',
    subcategory: 'Mobile & Internet',
    confidence: 'high',
    keywords: ['jio', 'airtel', 'bsnl', 'vodafone', 'vi postpaid', 'broadband', 'wifi', 'tata sky', 'dish tv', 'mobile bill', 'recharge', 'green mobile'],
    patterns: [/jio/i, /airtel/i, /broadband/i, /mobile/i],
    isDebitOnly: true,
  },

  // ── HEALTHCARE ──
  {
    category: 'Healthcare',
    subcategory: 'Pharmacy & Medical',
    confidence: 'high',
    keywords: ['apollo', 'medplus', 'netmeds', 'pharmeasy', '1mg', 'pharmacy', 'medical', 'hospital', 'clinic', 'doctor', 'diagnostic', 'chemist'],
    patterns: [/apollo/i, /pharmacy/i, /medical/i, /hospital/i],
    isDebitOnly: true,
  },

  // ── EDUCATION ──
  {
    category: 'Education',
    subcategory: 'Tuition & Courses',
    confidence: 'high',
    keywords: ['udemy', 'coursera', 'byju', 'unacademy', 'school fee', 'college fee', 'tuition', 'coaching', 'university'],
    patterns: [/udemy/i, /coursera/i, /tuition/i, /fee/i],
    isDebitOnly: true,
  },

  // ── ENTERTAINMENT & SUBSCRIPTIONS ──
  {
    category: 'Subscriptions',
    subcategory: 'Streaming Services',
    confidence: 'high',
    keywords: ['netflix', 'hotstar', 'spotify', 'amazon prime', 'prime video', 'youtube premium', 'zee5', 'sonyliv', 'apple tv'],
    patterns: [/netflix/i, /spotify/i, /hotstar/i, /prime/i],
    isDebitOnly: true,
  },

  // ── EMI & LOANS ──
  {
    category: 'EMI & Loans',
    subcategory: 'Home & Auto EMI',
    confidence: 'high',
    keywords: ['home loan', 'housing loan', 'car loan', 'auto loan', 'hdfc home loan'],
    patterns: [/home\s*loan/i, /car\s*loan/i],
    isDebitOnly: true,
  },
  {
    category: 'EMI & Loans',
    subcategory: 'Personal Loan Payment',
    confidence: 'high',
    keywords: ['emi', 'bajaj finance', 'personal loan', 'instalment', 'installment', 'emi payment'],
    patterns: [/emi/i, /loan/i],
    isDebitOnly: true,
  },

  // ── INVESTMENTS ──
  {
    category: 'Investments',
    subcategory: 'Mutual Fund SIP',
    confidence: 'high',
    keywords: ['mutual fund sip', 'sip payment', 'zerodha coin', 'mf sip', 'groww sip'],
    patterns: [/sip/i, /mutual\s*fund/i],
    isDebitOnly: true,
  },
  {
    category: 'Investments',
    subcategory: 'Stocks & Wealth',
    confidence: 'high',
    keywords: ['zerodha', 'groww', 'upstox', 'angel one', 'nps', 'ppf', 'fixed deposit', 'fd creation', 'demat', 'stock purchase'],
    patterns: [/zerodha/i, /groww/i, /upstox/i, /demat/i],
    isDebitOnly: true,
  },

  // ── ATM & CASH ──
  {
    category: 'ATM & Cash',
    subcategory: 'ATM Cash Withdrawal',
    confidence: 'high',
    keywords: ['atm', 'cash withdrawal', 'atm wd', 'cash deposit', 'withdrawn'],
    patterns: [/atm/i, /cash\s*withdrawal/i],
  },

  // ── BANK CHARGES ──
  {
    category: 'Bank Charges',
    subcategory: 'Service Fees',
    confidence: 'high',
    keywords: ['bank charge', 'service charge', 'penalty', 'processing fee', 'sms charge', 'folio charge'],
    patterns: [/bank\s*charge/i, /service\s*charge/i, /penalty/i],
    isDebitOnly: true,
  },

  // ── TAXES ──
  {
    category: 'Taxes',
    subcategory: 'Income & Direct Tax',
    confidence: 'high',
    keywords: ['tds', 'gst', 'income tax', 'advance tax', 'self assessment tax'],
    patterns: [/income\s*tax/i, /tds/i, /gst/i],
    isDebitOnly: true,
  },
];

// ── 6. Main Layered Categorization Function ──────────────────────────────────
export function categorizeTransaction(
  rawNarration: string,
  isCredit: boolean
): CategorizationResult {
  const refId = extractReferenceId(rawNarration);
  const channel = detectPaymentChannel(rawNarration);
  const { counterparty, merchantName } = extractCounterparty(rawNarration);
  const lower = rawNarration.toLowerCase();

  // Step A: Check Curated Categorization Rules
  for (const rule of CATEGORIZATION_RULES) {
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
      };
    }
  }

  // Step B: Person-to-Person (P2P) Transfer Heuristic
  // If transaction is via UPI / IMPS / NEFT and counterparty looks like an individual person
  if ((channel === 'UPI' || channel === 'IMPS' || channel === 'NEFT') && isLikelyIndividualPersonName(counterparty)) {
    if (isCredit) {
      return {
        category: 'Person-to-Person Transfer',
        subcategory: 'P2P Transfer (Inbound)',
        merchantName: counterparty,
        counterparty,
        channel,
        confidence: 'medium',
        referenceId: refId,
        needsReview: false,
      };
    } else {
      return {
        category: 'Person-to-Person Transfer',
        subcategory: 'P2P Transfer (Outbound)',
        merchantName: counterparty,
        counterparty,
        channel,
        confidence: 'medium',
        referenceId: refId,
        needsReview: false,
      };
    }
  }

  // Step C: Fallback by Direction when evidence is ambiguous
  if (isCredit) {
    // If description contains grant/consortium/government keywords
    if (/consortium|gujarat|govt|trust|agency|dept/i.test(rawNarration)) {
      return {
        category: 'Income',
        subcategory: 'Grant & Official Disbursement',
        merchantName: counterparty,
        counterparty,
        channel,
        confidence: 'medium',
        referenceId: refId,
        needsReview: false,
      };
    }

    return {
      category: 'Income',
      subcategory: 'Other Inflow',
      merchantName: counterparty,
      counterparty,
      channel,
      confidence: 'medium',
      referenceId: refId,
      needsReview: true,
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
    };
  }
}

// Legacy helper for backward compatibility
export function categorize(description: string, isCredit: boolean): string {
  const res = categorizeTransaction(description, isCredit);
  return `${res.category} – ${res.subcategory}`;
}

export function isIncomeCategory(categoryStr: string): boolean {
  return (
    categoryStr.startsWith('Income') ||
    categoryStr.includes('Loan Disbursement') ||
    categoryStr.includes('Salary')
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
