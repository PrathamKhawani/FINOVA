/**
 * FINOVA Entity Knowledge Base v1.0
 *
 * Structured database of 350+ merchants, brands, institutions, platforms and services.
 * Architecture:
 *  - Each entry has canonicalName, legalName, parentCompany, aliases, upiIds, entityType,
 *    businessType, category, subcategory, confidence.
 *  - Organized in named groups; all groups merged into ENTITY_KB array.
 *  - New entities can be added to any group without touching the resolver.
 *
 * Entity Types:
 *  'Known Merchant'              — commercial B2C entity with identifiable business
 *  'Known Financial Institution' — banks, NBFCs, payment processors
 *  'Known Platform'              — wallet/UPI apps, payment gateways
 *  'Known Utility'               — electricity, gas, water, telecom, DTH
 *  'Known Government Entity'     — GSTN, IT dept, NSDL, FASTag, BBPS
 *  'Known Investment Platform'   — brokers, MF platforms
 *  'Unknown Entity'              — matched nothing; no reliable inference
 *  'Needs Review'                — ambiguous; user should verify
 */

export type EntityType =
  | 'Known Merchant'
  | 'Known Financial Institution'
  | 'Known Platform'
  | 'Known Utility'
  | 'Known Government Entity'
  | 'Known Investment Platform'
  | 'Unknown Entity'
  | 'Needs Review';

export interface EntityEntry {
  canonicalName: string;          // Consumer-facing brand name
  legalName?: string;             // Registered legal / company name
  parentCompany?: string;         // Holding company if different
  aliases: string[];              // Lowercase fragments to match via includes()
  upiIds?: string[];              // Lowercase VPA fragments (e.g. 'blinkit@ybl')
  narrationPatterns?: RegExp[];   // Supplemental regex patterns
  entityType: EntityType;
  businessType: string;           // e.g. 'Quick Commerce', 'Food Delivery'
  category: string;
  subcategory: string;
  confidence: 'high' | 'medium' | 'low';
  isDebitOnly?: boolean;
  isCreditOnly?: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// FOOD & DINING — Food Delivery
// ────────────────────────────────────────────────────────────────────────────
const FOOD_DELIVERY: EntityEntry[] = [
  {
    canonicalName: 'Swiggy',
    legalName: 'Bundl Technologies Pvt Ltd',
    aliases: ['swiggy', 'bundl technologies', 'bundltech'],
    upiIds: ['swiggy@icici', 'swiggy@hdfcbank'],
    entityType: 'Known Merchant',
    businessType: 'Food Delivery',
    category: 'Food & Dining',
    subcategory: 'Food Delivery',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Zomato',
    legalName: 'Eternal Ltd',
    aliases: ['zomato', 'eternal ltd', 'zomato internet'],
    upiIds: ['zomato@icici', 'zomato@kotak'],
    entityType: 'Known Merchant',
    businessType: 'Food Delivery',
    category: 'Food & Dining',
    subcategory: 'Food Delivery',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: "Domino's Pizza",
    legalName: 'Jubilant FoodWorks Ltd',
    aliases: ["domino's", 'dominos', 'domino pizza', 'jubilant foodworks', 'jubilant food'],
    entityType: 'Known Merchant',
    businessType: 'Pizza Chain',
    category: 'Food & Dining',
    subcategory: 'Food Delivery',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Pizza Hut',
    legalName: 'Sapphire Foods India',
    aliases: ['pizza hut', 'pizzahut'],
    entityType: 'Known Merchant',
    businessType: 'Pizza Chain',
    category: 'Food & Dining',
    subcategory: 'Food Delivery',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Faasos / Rebel Foods',
    legalName: 'Rebel Foods Pvt Ltd',
    aliases: ['faasos', 'rebel foods', 'oven story', 'behrouz biryani', 'firangi bake'],
    entityType: 'Known Merchant',
    businessType: 'Cloud Kitchen',
    category: 'Food & Dining',
    subcategory: 'Food Delivery',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'EatFit',
    legalName: 'Cure.Fit Health Tech Pvt Ltd',
    parentCompany: 'Cult.Fit',
    aliases: ['eatfit', 'eat fit', 'cult.fit food'],
    entityType: 'Known Merchant',
    businessType: 'Healthy Food Delivery',
    category: 'Food & Dining',
    subcategory: 'Food Delivery',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Dunzo',
    legalName: 'Dunzo Digital Pvt Ltd',
    aliases: ['dunzo', 'dunzo daily'],
    entityType: 'Known Merchant',
    businessType: 'Quick Commerce',
    category: 'Food & Dining',
    subcategory: 'Food Delivery',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ────────────────────────────────────────────────────────────────────────────
// FOOD & DINING — Restaurants & Chains
// ────────────────────────────────────────────────────────────────────────────
const RESTAURANTS: EntityEntry[] = [
  {
    canonicalName: "McDonald's",
    legalName: 'Hardcastle Restaurants Pvt Ltd',
    aliases: ["mcdonald's", 'mcdonalds', 'mcdonald', 'mcds', 'hardcastle restaurants'],
    entityType: 'Known Merchant',
    businessType: 'QSR Chain',
    category: 'Food & Dining',
    subcategory: 'Restaurants',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Burger King',
    legalName: 'Burger King India Ltd',
    aliases: ['burger king', 'burgerking'],
    entityType: 'Known Merchant',
    businessType: 'QSR Chain',
    category: 'Food & Dining',
    subcategory: 'Restaurants',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'KFC',
    legalName: 'Devyani International Ltd',
    aliases: ['kfc', 'kentucky fried chicken'],
    entityType: 'Known Merchant',
    businessType: 'QSR Chain',
    category: 'Food & Dining',
    subcategory: 'Restaurants',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Starbucks',
    legalName: 'Tata Starbucks Pvt Ltd',
    aliases: ['starbucks', 'tata starbucks'],
    entityType: 'Known Merchant',
    businessType: 'Coffee Chain',
    category: 'Food & Dining',
    subcategory: 'Restaurants',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Café Coffee Day',
    legalName: 'Coffee Day Enterprises Ltd',
    aliases: ['cafe coffee day', 'ccd', 'coffee day'],
    entityType: 'Known Merchant',
    businessType: 'Coffee Chain',
    category: 'Food & Dining',
    subcategory: 'Restaurants',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Haldirams',
    legalName: 'Haldiram Foods International Pvt Ltd',
    aliases: ['haldiram', 'haldirams'],
    entityType: 'Known Merchant',
    businessType: 'Restaurant Chain',
    category: 'Food & Dining',
    subcategory: 'Restaurants',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Subway',
    aliases: ['subway'],
    entityType: 'Known Merchant',
    businessType: 'Sandwich Chain',
    category: 'Food & Dining',
    subcategory: 'Restaurants',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Barbeque Nation',
    aliases: ['barbeque nation', 'bbq nation', 'barbeque-nation'],
    entityType: 'Known Merchant',
    businessType: 'Restaurant Chain',
    category: 'Food & Dining',
    subcategory: 'Restaurants',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Chaayos',
    legalName: 'Sunshine Teahouse Pvt Ltd',
    aliases: ['chaayos'],
    entityType: 'Known Merchant',
    businessType: 'Tea Café Chain',
    category: 'Food & Dining',
    subcategory: 'Restaurants',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Theobroma',
    legalName: 'Theobroma Food Pvt Ltd',
    aliases: ['theobroma'],
    entityType: 'Known Merchant',
    businessType: 'Bakery & Café',
    category: 'Food & Dining',
    subcategory: 'Restaurants',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Wow Momo',
    aliases: ['wow momo', 'wowmomo'],
    entityType: 'Known Merchant',
    businessType: 'QSR Chain',
    category: 'Food & Dining',
    subcategory: 'Restaurants',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ────────────────────────────────────────────────────────────────────────────
// GROCERIES — Quick Commerce
// ────────────────────────────────────────────────────────────────────────────
const QUICK_COMMERCE: EntityEntry[] = [
  {
    canonicalName: 'Blinkit',
    legalName: 'Grofers India Pvt Ltd',
    parentCompany: 'Zomato Ltd',
    aliases: ['blinkit', 'grofers', 'grofers india'],
    upiIds: ['blinkit@ybl', 'grofers@ybl'],
    entityType: 'Known Merchant',
    businessType: 'Quick Commerce',
    category: 'Groceries',
    subcategory: 'Quick Commerce',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Zepto',
    legalName: 'Kiranakart Technologies Pvt Ltd',
    aliases: ['zepto', 'kiranakart'],
    upiIds: ['zepto@icici'],
    entityType: 'Known Merchant',
    businessType: 'Quick Commerce',
    category: 'Groceries',
    subcategory: 'Quick Commerce',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Swiggy Instamart',
    legalName: 'Bundl Technologies Pvt Ltd',
    parentCompany: 'Swiggy',
    aliases: ['swiggy instamart', 'instamart'],
    entityType: 'Known Merchant',
    businessType: 'Quick Commerce',
    category: 'Groceries',
    subcategory: 'Quick Commerce',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'BigBasket BB Now',
    parentCompany: 'Tata Digital',
    aliases: ['bb now', 'bbdaily', 'bb daily'],
    entityType: 'Known Merchant',
    businessType: 'Quick Commerce',
    category: 'Groceries',
    subcategory: 'Quick Commerce',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ────────────────────────────────────────────────────────────────────────────
// GROCERIES — Supermarkets
// ────────────────────────────────────────────────────────────────────────────
const SUPERMARKETS: EntityEntry[] = [
  {
    canonicalName: 'BigBasket',
    legalName: 'Supermarket Grocery Supplies Pvt Ltd',
    parentCompany: 'Tata Digital',
    aliases: ['bigbasket', 'big basket'],
    upiIds: ['bigbasket@upi'],
    entityType: 'Known Merchant',
    businessType: 'Online Grocery',
    category: 'Groceries',
    subcategory: 'Supermarket',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'D-Mart',
    legalName: 'Avenue Supermarts Ltd',
    aliases: ['dmart', 'd-mart', 'd mart', 'avenue supermarts', 'avenue super'],
    entityType: 'Known Merchant',
    businessType: 'Hypermarket',
    category: 'Groceries',
    subcategory: 'Supermarket',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Reliance Fresh / Smart',
    legalName: 'Reliance Retail Ltd',
    parentCompany: 'Reliance Industries Ltd',
    aliases: ['reliance fresh', 'reliance smart', 'reliance super', 'reliance retail', 'jiomart'],
    entityType: 'Known Merchant',
    businessType: 'Supermarket',
    category: 'Groceries',
    subcategory: 'Supermarket',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'More Supermarket',
    legalName: 'More Retail Pvt Ltd',
    aliases: ['more supermarket', 'more retail'],
    entityType: 'Known Merchant',
    businessType: 'Supermarket',
    category: 'Groceries',
    subcategory: 'Supermarket',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: "Spencer's",
    legalName: "Spencer's Retail Ltd",
    aliases: ["spencer's", 'spencers retail', 'spencers'],
    entityType: 'Known Merchant',
    businessType: 'Supermarket',
    category: 'Groceries',
    subcategory: 'Supermarket',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: "Nature's Basket",
    parentCompany: 'Godrej Industries',
    aliases: ["nature's basket", 'natures basket'],
    entityType: 'Known Merchant',
    businessType: 'Premium Grocery',
    category: 'Groceries',
    subcategory: 'Supermarket',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ────────────────────────────────────────────────────────────────────────────
// SHOPPING — Online E-commerce
// ────────────────────────────────────────────────────────────────────────────
const ONLINE_SHOPPING: EntityEntry[] = [
  {
    canonicalName: 'Amazon',
    legalName: 'Amazon Seller Services Pvt Ltd',
    aliases: ['amazon', 'amzn', 'amazon.in', 'amazon seller', 'amazon pay later'],
    upiIds: ['amazon@apl'],
    entityType: 'Known Merchant',
    businessType: 'E-Commerce Marketplace',
    category: 'Shopping',
    subcategory: 'Online Shopping',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Flipkart',
    legalName: 'Flipkart Internet Pvt Ltd',
    parentCompany: 'Walmart Inc',
    aliases: ['flipkart', 'ekart', 'fk', 'flipkart.com'],
    upiIds: ['flipkart@axl'],
    entityType: 'Known Merchant',
    businessType: 'E-Commerce Marketplace',
    category: 'Shopping',
    subcategory: 'Online Shopping',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Myntra',
    parentCompany: 'Flipkart Group',
    aliases: ['myntra'],
    entityType: 'Known Merchant',
    businessType: 'Fashion E-Commerce',
    category: 'Shopping',
    subcategory: 'Online Shopping',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Meesho',
    legalName: 'Fashnear Technologies Pvt Ltd',
    aliases: ['meesho', 'fashnear'],
    entityType: 'Known Merchant',
    businessType: 'Social Commerce',
    category: 'Shopping',
    subcategory: 'Online Shopping',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Nykaa',
    legalName: 'FSN E-Commerce Ventures Ltd',
    aliases: ['nykaa', 'nykaa.com', 'fsn ecommerce', 'fsn e-commerce'],
    entityType: 'Known Merchant',
    businessType: 'Beauty & Personal Care E-Commerce',
    category: 'Shopping',
    subcategory: 'Online Shopping',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Snapdeal',
    aliases: ['snapdeal'],
    entityType: 'Known Merchant',
    businessType: 'E-Commerce Marketplace',
    category: 'Shopping',
    subcategory: 'Online Shopping',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Tata CLiQ',
    parentCompany: 'Tata Digital',
    aliases: ['tata cliq', 'tatacliq'],
    entityType: 'Known Merchant',
    businessType: 'E-Commerce Marketplace',
    category: 'Shopping',
    subcategory: 'Online Shopping',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'AJIO',
    parentCompany: 'Reliance Retail',
    aliases: ['ajio'],
    entityType: 'Known Merchant',
    businessType: 'Fashion E-Commerce',
    category: 'Shopping',
    subcategory: 'Online Shopping',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'IndiaMART',
    aliases: ['indiamart', 'india mart'],
    entityType: 'Known Merchant',
    businessType: 'B2B Marketplace',
    category: 'Shopping',
    subcategory: 'Business Marketplace',
    confidence: 'medium',
    isDebitOnly: true,
  },
];

// ────────────────────────────────────────────────────────────────────────────
// SHOPPING — Clothing & Fashion
// ────────────────────────────────────────────────────────────────────────────
const CLOTHING_FASHION: EntityEntry[] = [
  {
    canonicalName: 'Zudio',
    legalName: 'Trent Ltd',
    parentCompany: 'Tata Group',
    aliases: ['zudio', 'trent ltd', 'trent limited'],
    entityType: 'Known Merchant',
    businessType: 'Value Fashion Retail',
    category: 'Shopping',
    subcategory: 'Clothing & Fashion',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Westside',
    legalName: 'Trent Ltd',
    parentCompany: 'Tata Group',
    aliases: ['westside'],
    entityType: 'Known Merchant',
    businessType: 'Fashion Retail',
    category: 'Shopping',
    subcategory: 'Clothing & Fashion',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'H&M',
    legalName: 'H & M Hennes & Mauritz India Pvt Ltd',
    aliases: ['h&m', 'h & m', 'hm fashion', 'hennes mauritz'],
    entityType: 'Known Merchant',
    businessType: 'Fashion Retail',
    category: 'Shopping',
    subcategory: 'Clothing & Fashion',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Zara',
    legalName: 'Industria de Diseño Textil',
    aliases: ['zara'],
    entityType: 'Known Merchant',
    businessType: 'Fashion Retail',
    category: 'Shopping',
    subcategory: 'Clothing & Fashion',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Pantaloons',
    legalName: 'Aditya Birla Fashion and Retail Ltd',
    parentCompany: 'Aditya Birla Group',
    aliases: ['pantaloons', 'aditya birla fashion', 'abfrl'],
    entityType: 'Known Merchant',
    businessType: 'Fashion Retail',
    category: 'Shopping',
    subcategory: 'Clothing & Fashion',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Max Fashion',
    legalName: 'Landmark Group',
    aliases: ['max fashion', 'max retail'],
    entityType: 'Known Merchant',
    businessType: 'Value Fashion Retail',
    category: 'Shopping',
    subcategory: 'Clothing & Fashion',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Lifestyle',
    legalName: 'Landmark Group',
    aliases: ['lifestyle', 'lifestyle stores'],
    entityType: 'Known Merchant',
    businessType: 'Fashion Retail',
    category: 'Shopping',
    subcategory: 'Clothing & Fashion',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'FabIndia',
    legalName: 'Fabindia Ltd',
    aliases: ['fabindia', 'fab india'],
    entityType: 'Known Merchant',
    businessType: 'Ethnic Fashion Retail',
    category: 'Shopping',
    subcategory: 'Clothing & Fashion',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Peter England',
    parentCompany: 'Aditya Birla Group',
    aliases: ['peter england'],
    entityType: 'Known Merchant',
    businessType: 'Formal Fashion',
    category: 'Shopping',
    subcategory: 'Clothing & Fashion',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Van Heusen',
    parentCompany: 'Aditya Birla Group',
    aliases: ['van heusen', 'vanheusen'],
    entityType: 'Known Merchant',
    businessType: 'Formal Fashion',
    category: 'Shopping',
    subcategory: 'Clothing & Fashion',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Nike',
    aliases: ['nike'],
    entityType: 'Known Merchant',
    businessType: 'Sports & Apparel',
    category: 'Shopping',
    subcategory: 'Clothing & Fashion',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: "Levi's",
    legalName: 'Levi Strauss India Pvt Ltd',
    aliases: ["levi's", 'levis'],
    entityType: 'Known Merchant',
    businessType: 'Denim Fashion',
    category: 'Shopping',
    subcategory: 'Clothing & Fashion',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Puma',
    legalName: 'Puma Sports India Pvt Ltd',
    aliases: ['puma'],
    entityType: 'Known Merchant',
    businessType: 'Sports & Apparel',
    category: 'Shopping',
    subcategory: 'Clothing & Fashion',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Adidas',
    aliases: ['adidas'],
    entityType: 'Known Merchant',
    businessType: 'Sports & Apparel',
    category: 'Shopping',
    subcategory: 'Clothing & Fashion',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ────────────────────────────────────────────────────────────────────────────
// SHOPPING — Electronics & Consumer Durables
// ────────────────────────────────────────────────────────────────────────────
const ELECTRONICS: EntityEntry[] = [
  {
    canonicalName: 'Croma',
    legalName: 'Infiniti Retail Ltd',
    parentCompany: 'Tata Group',
    aliases: ['croma', 'infiniti retail'],
    entityType: 'Known Merchant',
    businessType: 'Consumer Electronics Retail',
    category: 'Shopping',
    subcategory: 'Electronics',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Reliance Digital',
    legalName: 'Reliance Retail Ltd',
    aliases: ['reliance digital', 'ril digital'],
    entityType: 'Known Merchant',
    businessType: 'Consumer Electronics Retail',
    category: 'Shopping',
    subcategory: 'Electronics',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Vijay Sales',
    legalName: 'Vijay Sales Pvt Ltd',
    aliases: ['vijay sales', 'vijaysales'],
    entityType: 'Known Merchant',
    businessType: 'Consumer Electronics Retail',
    category: 'Shopping',
    subcategory: 'Electronics',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Decathlon',
    legalName: 'Decathlon Sports India Pvt Ltd',
    aliases: ['decathlon'],
    entityType: 'Known Merchant',
    businessType: 'Sports & Outdoor',
    category: 'Shopping',
    subcategory: 'Sports & Outdoors',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ────────────────────────────────────────────────────────────────────────────
// ENTERTAINMENT — Cinema
// ────────────────────────────────────────────────────────────────────────────
const CINEMA: EntityEntry[] = [
  {
    canonicalName: 'PVR Inox',
    legalName: 'PVR INOX Ltd',
    aliases: ['pvr', 'pvr cinemas', 'pvr cinema', 'pvr inox', 'inox', 'inox leisure'],
    entityType: 'Known Merchant',
    businessType: 'Multiplex Cinema',
    category: 'Entertainment',
    subcategory: 'Cinema',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Cinépolis',
    legalName: 'Cinepolis India Pvt Ltd',
    aliases: ['cinepolis', 'cinépolis'],
    entityType: 'Known Merchant',
    businessType: 'Multiplex Cinema',
    category: 'Entertainment',
    subcategory: 'Cinema',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'BookMyShow',
    legalName: 'Bigtree Entertainment Pvt Ltd',
    aliases: ['bookmyshow', 'bms', 'bigtree entertainment'],
    upiIds: ['bookmyshow@hdfcbank'],
    entityType: 'Known Merchant',
    businessType: 'Events & Ticketing',
    category: 'Entertainment',
    subcategory: 'Events & Ticketing',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ────────────────────────────────────────────────────────────────────────────
// ENTERTAINMENT — Streaming & OTT
// ────────────────────────────────────────────────────────────────────────────
const STREAMING: EntityEntry[] = [
  {
    canonicalName: 'Netflix',
    legalName: 'Netflix Entertainment Services India LLP',
    aliases: ['netflix'],
    upiIds: ['netflix@apl'],
    entityType: 'Known Merchant',
    businessType: 'Video Streaming (OTT)',
    category: 'Entertainment',
    subcategory: 'Streaming',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Amazon Prime',
    legalName: 'Amazon Seller Services Pvt Ltd',
    parentCompany: 'Amazon Inc',
    aliases: ['amazon prime', 'prime video', 'primevideo', 'amazon prime video'],
    entityType: 'Known Merchant',
    businessType: 'Video Streaming (OTT)',
    category: 'Entertainment',
    subcategory: 'Streaming',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Disney+ Hotstar',
    legalName: 'Star India Pvt Ltd',
    parentCompany: 'The Walt Disney Company',
    aliases: ['hotstar', 'disney+ hotstar', 'disney hotstar', 'star india'],
    entityType: 'Known Merchant',
    businessType: 'Video Streaming (OTT)',
    category: 'Entertainment',
    subcategory: 'Streaming',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Spotify',
    aliases: ['spotify'],
    entityType: 'Known Merchant',
    businessType: 'Music Streaming',
    category: 'Entertainment',
    subcategory: 'Music Streaming',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'YouTube Premium',
    parentCompany: 'Google / Alphabet',
    aliases: ['youtube premium'],
    entityType: 'Known Merchant',
    businessType: 'Video Streaming (OTT)',
    category: 'Entertainment',
    subcategory: 'Streaming',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'ZEE5',
    legalName: 'Zee Entertainment Enterprises Ltd',
    aliases: ['zee5', 'zee 5', 'zee entertainment'],
    entityType: 'Known Merchant',
    businessType: 'Video Streaming (OTT)',
    category: 'Entertainment',
    subcategory: 'Streaming',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'SonyLIV',
    legalName: 'Sony Pictures Networks India Pvt Ltd',
    aliases: ['sonyliv', 'sony liv', 'sony entertainment'],
    entityType: 'Known Merchant',
    businessType: 'Video Streaming (OTT)',
    category: 'Entertainment',
    subcategory: 'Streaming',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Apple Services',
    aliases: ['apple.com', 'apple tv', 'apple music', 'itunes', 'apple one'],
    entityType: 'Known Merchant',
    businessType: 'Digital Services',
    category: 'Entertainment',
    subcategory: 'Streaming',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'JioCinema',
    legalName: 'Reliance Jio Infocomm Ltd',
    aliases: ['jiocinema', 'jio cinema'],
    entityType: 'Known Merchant',
    businessType: 'Video Streaming (OTT)',
    category: 'Entertainment',
    subcategory: 'Streaming',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'MX Player',
    aliases: ['mx player', 'mxplayer'],
    entityType: 'Known Merchant',
    businessType: 'Video Streaming (OTT)',
    category: 'Entertainment',
    subcategory: 'Streaming',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Steam / Valve',
    aliases: ['steam', 'valve', 'steampowered'],
    entityType: 'Known Merchant',
    businessType: 'Gaming Platform',
    category: 'Entertainment',
    subcategory: 'Gaming',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Google Play',
    parentCompany: 'Google / Alphabet',
    aliases: ['google play', 'google store', 'play store'],
    entityType: 'Known Merchant',
    businessType: 'App Store / Gaming',
    category: 'Entertainment',
    subcategory: 'Gaming',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ────────────────────────────────────────────────────────────────────────────
// TRANSPORT — Cabs & Ride-Hailing
// ────────────────────────────────────────────────────────────────────────────
const CABS: EntityEntry[] = [
  {
    canonicalName: 'Uber',
    legalName: 'Uber India Systems Pvt Ltd',
    aliases: ['uber'],
    upiIds: ['uber@ybl', 'uber@icici'],
    entityType: 'Known Merchant',
    businessType: 'Cab Aggregator',
    category: 'Transport',
    subcategory: 'Cab & Ride',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Ola',
    legalName: 'ANI Technologies Pvt Ltd',
    aliases: ['ola cabs', 'ola_', 'ola-', 'ani technologies', 'olacabs'],
    upiIds: ['ola@upi', 'ola@icici'],
    entityType: 'Known Merchant',
    businessType: 'Cab Aggregator',
    category: 'Transport',
    subcategory: 'Cab & Ride',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Rapido',
    legalName: 'Roppen Transportation Services Pvt Ltd',
    aliases: ['rapido', 'roppen transportation'],
    entityType: 'Known Merchant',
    businessType: 'Bike & Cab Aggregator',
    category: 'Transport',
    subcategory: 'Cab & Ride',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'BluSmart',
    legalName: 'BluSmart Mobility Pvt Ltd',
    aliases: ['blusmart', 'blu smart'],
    entityType: 'Known Merchant',
    businessType: 'EV Cab Service',
    category: 'Transport',
    subcategory: 'Cab & Ride',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Meru Cabs',
    aliases: ['meru', 'meru cabs'],
    entityType: 'Known Merchant',
    businessType: 'Cab Service',
    category: 'Transport',
    subcategory: 'Cab & Ride',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Yulu',
    aliases: ['yulu', 'bounce'],
    entityType: 'Known Merchant',
    businessType: 'Micro-Mobility',
    category: 'Transport',
    subcategory: 'Micro-Mobility',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ────────────────────────────────────────────────────────────────────────────
// TRANSPORT — Rail, Metro & Bus
// ────────────────────────────────────────────────────────────────────────────
const PUBLIC_TRANSPORT: EntityEntry[] = [
  {
    canonicalName: 'IRCTC',
    legalName: 'Indian Railway Catering and Tourism Corporation Ltd',
    aliases: ['irctc', 'indian railway', 'indian railways', 'railway catering'],
    upiIds: ['irctc@upi', 'irctcmob@upi'],
    entityType: 'Known Government Entity',
    businessType: 'Rail Ticketing',
    category: 'Transport',
    subcategory: 'Railways',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Delhi Metro (DMRC)',
    legalName: 'Delhi Metro Rail Corporation Ltd',
    aliases: ['dmrc', 'delhi metro'],
    entityType: 'Known Government Entity',
    businessType: 'Urban Rail Transit',
    category: 'Transport',
    subcategory: 'Metro & Local Train',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Namma Metro (BMRC)',
    legalName: 'Bangalore Metro Rail Corporation Ltd',
    aliases: ['namma metro', 'bmrc', 'bangalore metro'],
    entityType: 'Known Government Entity',
    businessType: 'Urban Rail Transit',
    category: 'Transport',
    subcategory: 'Metro & Local Train',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Mumbai Metro',
    aliases: ['mumbai metro', 'mmrda metro'],
    entityType: 'Known Government Entity',
    businessType: 'Urban Rail Transit',
    category: 'Transport',
    subcategory: 'Metro & Local Train',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ────────────────────────────────────────────────────────────────────────────
// TRANSPORT — Airlines
// ────────────────────────────────────────────────────────────────────────────
const AIRLINES: EntityEntry[] = [
  {
    canonicalName: 'IndiGo',
    legalName: 'InterGlobe Aviation Ltd',
    aliases: ['indigo', 'go indigo', 'interglobe', 'interglobe aviation'],
    entityType: 'Known Merchant',
    businessType: 'Airline',
    category: 'Transport',
    subcategory: 'Airlines',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Air India',
    legalName: 'Air India Ltd',
    parentCompany: 'Tata Group',
    aliases: ['air india', 'airindia'],
    entityType: 'Known Merchant',
    businessType: 'Airline',
    category: 'Transport',
    subcategory: 'Airlines',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'SpiceJet',
    legalName: 'SpiceJet Ltd',
    aliases: ['spicejet', 'spice jet'],
    entityType: 'Known Merchant',
    businessType: 'Airline',
    category: 'Transport',
    subcategory: 'Airlines',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Akasa Air',
    legalName: 'SNV Aviation Pvt Ltd',
    aliases: ['akasa', 'akasa air'],
    entityType: 'Known Merchant',
    businessType: 'Airline',
    category: 'Transport',
    subcategory: 'Airlines',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ────────────────────────────────────────────────────────────────────────────
// TRANSPORT — Travel Booking
// ────────────────────────────────────────────────────────────────────────────
const TRAVEL_BOOKING: EntityEntry[] = [
  {
    canonicalName: 'MakeMyTrip',
    legalName: 'MakeMyTrip (India) Pvt Ltd',
    aliases: ['makemytrip', 'mmt', 'make my trip'],
    upiIds: ['mmt@hdfcbank'],
    entityType: 'Known Merchant',
    businessType: 'Travel Booking Platform',
    category: 'Transport',
    subcategory: 'Travel Booking',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Goibibo',
    parentCompany: 'MakeMyTrip Group',
    aliases: ['goibibo'],
    entityType: 'Known Merchant',
    businessType: 'Travel Booking Platform',
    category: 'Transport',
    subcategory: 'Travel Booking',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Yatra',
    legalName: 'Yatra Online Pvt Ltd',
    aliases: ['yatra'],
    entityType: 'Known Merchant',
    businessType: 'Travel Booking Platform',
    category: 'Transport',
    subcategory: 'Travel Booking',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'ClearTrip',
    legalName: 'Cleartrip Pvt Ltd',
    aliases: ['cleartrip', 'clear trip'],
    entityType: 'Known Merchant',
    businessType: 'Travel Booking Platform',
    category: 'Transport',
    subcategory: 'Travel Booking',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'redBus',
    legalName: 'Prakto Technologies Pvt Ltd',
    aliases: ['redbus', 'red bus'],
    entityType: 'Known Merchant',
    businessType: 'Bus Booking',
    category: 'Transport',
    subcategory: 'Bus Booking',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'OYO',
    legalName: 'Oravel Stays Pvt Ltd',
    aliases: ['oyo', 'oyo rooms', 'oravel stays'],
    entityType: 'Known Merchant',
    businessType: 'Budget Hotels',
    category: 'Transport',
    subcategory: 'Hotels & Stay',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Airbnb',
    aliases: ['airbnb'],
    entityType: 'Known Merchant',
    businessType: 'Home Rental',
    category: 'Transport',
    subcategory: 'Hotels & Stay',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Treebo',
    legalName: 'Treebo Hotels Pvt Ltd',
    aliases: ['treebo'],
    entityType: 'Known Merchant',
    businessType: 'Budget Hotels',
    category: 'Transport',
    subcategory: 'Hotels & Stay',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ────────────────────────────────────────────────────────────────────────────
// FUEL
// ────────────────────────────────────────────────────────────────────────────
const FUEL: EntityEntry[] = [
  {
    canonicalName: 'HPCL',
    legalName: 'Hindustan Petroleum Corporation Ltd',
    aliases: ['hpcl', 'hp petrol', 'hindustan petroleum', 'hp fuel', 'hpcl petrol'],
    entityType: 'Known Merchant',
    businessType: 'Petroleum / Fuel Retail',
    category: 'Fuel',
    subcategory: 'Petrol & Diesel',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'BPCL',
    legalName: 'Bharat Petroleum Corporation Ltd',
    aliases: ['bpcl', 'bharat petroleum', 'bharat petrol'],
    entityType: 'Known Merchant',
    businessType: 'Petroleum / Fuel Retail',
    category: 'Fuel',
    subcategory: 'Petrol & Diesel',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Indian Oil',
    legalName: 'Indian Oil Corporation Ltd',
    aliases: ['iocl', 'indian oil', 'indianoil', 'ioc', 'indian oil corp'],
    entityType: 'Known Merchant',
    businessType: 'Petroleum / Fuel Retail',
    category: 'Fuel',
    subcategory: 'Petrol & Diesel',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Nayara Energy',
    legalName: 'Nayara Energy Ltd',
    aliases: ['nayara', 'essar oil', 'nayara energy'],
    entityType: 'Known Merchant',
    businessType: 'Petroleum / Fuel Retail',
    category: 'Fuel',
    subcategory: 'Petrol & Diesel',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Shell',
    legalName: 'Shell India Markets Pvt Ltd',
    aliases: ['shell'],
    entityType: 'Known Merchant',
    businessType: 'Petroleum / Fuel Retail',
    category: 'Fuel',
    subcategory: 'Petrol & Diesel',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ────────────────────────────────────────────────────────────────────────────
// HEALTHCARE
// ────────────────────────────────────────────────────────────────────────────
const HEALTHCARE: EntityEntry[] = [
  {
    canonicalName: 'Apollo Pharmacy / Hospitals',
    legalName: 'Apollo Hospitals Enterprise Ltd',
    aliases: ['apollo pharmacy', 'apollo health', 'apollo hospitals', 'apollo clinics'],
    entityType: 'Known Merchant',
    businessType: 'Pharmacy & Hospitals',
    category: 'Healthcare',
    subcategory: 'Pharmacy',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'MedPlus',
    legalName: 'MedPlus Health Services Ltd',
    aliases: ['medplus', 'med plus'],
    entityType: 'Known Merchant',
    businessType: 'Pharmacy Chain',
    category: 'Healthcare',
    subcategory: 'Pharmacy',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Netmeds',
    legalName: 'Dadha Pharma Distribution Pvt Ltd',
    parentCompany: 'Reliance Retail',
    aliases: ['netmeds', 'net meds'],
    entityType: 'Known Merchant',
    businessType: 'Online Pharmacy',
    category: 'Healthcare',
    subcategory: 'Online Pharmacy',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: '1mg / Tata 1mg',
    legalName: 'Tata 1mg Technologies Pvt Ltd',
    parentCompany: 'Tata Digital',
    aliases: ['1mg', 'tata 1mg', 'tata1mg'],
    entityType: 'Known Merchant',
    businessType: 'Online Pharmacy & Health',
    category: 'Healthcare',
    subcategory: 'Online Pharmacy',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'PharmEasy',
    legalName: 'API Holdings Pvt Ltd',
    aliases: ['pharmeasy'],
    entityType: 'Known Merchant',
    businessType: 'Online Pharmacy',
    category: 'Healthcare',
    subcategory: 'Online Pharmacy',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Practo',
    legalName: 'Practo Technologies Pvt Ltd',
    aliases: ['practo'],
    entityType: 'Known Merchant',
    businessType: 'Doctor Consultation Platform',
    category: 'Healthcare',
    subcategory: 'Doctor Consultation',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Cult.fit',
    legalName: 'Cure.Fit Health Tech Pvt Ltd',
    aliases: ['cult.fit', 'cult fit', 'curefit', 'cure.fit'],
    entityType: 'Known Merchant',
    businessType: 'Fitness & Wellness',
    category: 'Healthcare',
    subcategory: 'Fitness & Wellness',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'HealthifyMe',
    aliases: ['healthifyme'],
    entityType: 'Known Merchant',
    businessType: 'Digital Health & Fitness',
    category: 'Healthcare',
    subcategory: 'Fitness & Wellness',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ────────────────────────────────────────────────────────────────────────────
// EDUCATION
// ────────────────────────────────────────────────────────────────────────────
const EDUCATION: EntityEntry[] = [
  {
    canonicalName: "Byju's",
    legalName: 'Think and Learn Pvt Ltd',
    aliases: ["byju's", 'byjus', 'think and learn', 'think & learn'],
    entityType: 'Known Merchant',
    businessType: 'Ed-Tech Platform',
    category: 'Education',
    subcategory: 'Ed-Tech Platform',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Unacademy',
    legalName: 'Sorting Hat Technologies Pvt Ltd',
    aliases: ['unacademy', 'sorting hat technologies'],
    entityType: 'Known Merchant',
    businessType: 'Ed-Tech Platform',
    category: 'Education',
    subcategory: 'Ed-Tech Platform',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Udemy',
    aliases: ['udemy'],
    entityType: 'Known Merchant',
    businessType: 'Online Courses',
    category: 'Education',
    subcategory: 'Online Courses',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Coursera',
    aliases: ['coursera'],
    entityType: 'Known Merchant',
    businessType: 'Online Courses',
    category: 'Education',
    subcategory: 'Online Courses',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Vedantu',
    aliases: ['vedantu'],
    entityType: 'Known Merchant',
    businessType: 'Ed-Tech Platform',
    category: 'Education',
    subcategory: 'Ed-Tech Platform',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'upGrad',
    legalName: 'UpGrad Education Pvt Ltd',
    aliases: ['upgrad'],
    entityType: 'Known Merchant',
    businessType: 'Higher Ed-Tech',
    category: 'Education',
    subcategory: 'Higher Education',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Toppr',
    legalName: 'Toppr Technologies Pvt Ltd',
    aliases: ['toppr'],
    entityType: 'Known Merchant',
    businessType: 'Ed-Tech Platform',
    category: 'Education',
    subcategory: 'Ed-Tech Platform',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'WhiteHat Jr',
    parentCompany: "Byju's",
    aliases: ['whitehat jr', 'whitehatjr'],
    entityType: 'Known Merchant',
    businessType: 'Ed-Tech Platform',
    category: 'Education',
    subcategory: 'Ed-Tech Platform',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ────────────────────────────────────────────────────────────────────────────
// UTILITIES — Telecom
// ────────────────────────────────────────────────────────────────────────────
const TELECOM: EntityEntry[] = [
  {
    canonicalName: 'Jio',
    legalName: 'Reliance Jio Infocomm Ltd',
    parentCompany: 'Reliance Industries Ltd',
    aliases: ['reliance jio', 'jio postpaid', 'jio prepaid', 'jio fiber', 'jiorecharge'],
    upiIds: ['jio@icicipay', 'rjio@jio'],
    entityType: 'Known Utility',
    businessType: 'Telecom Operator',
    category: 'Utilities & Bills',
    subcategory: 'Mobile & Internet',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Airtel',
    legalName: 'Bharti Airtel Ltd',
    aliases: ['airtel', 'bharti airtel', 'airtel broadband', 'airtel fiber', 'airtel postpaid'],
    upiIds: ['airtel@airtel'],
    entityType: 'Known Utility',
    businessType: 'Telecom Operator',
    category: 'Utilities & Bills',
    subcategory: 'Mobile & Internet',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Vi (Vodafone Idea)',
    legalName: 'Vodafone Idea Ltd',
    aliases: ['vodafone idea', 'vi postpaid', 'vodafone', 'idea cellular', 'vi mobile'],
    entityType: 'Known Utility',
    businessType: 'Telecom Operator',
    category: 'Utilities & Bills',
    subcategory: 'Mobile & Internet',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'BSNL',
    legalName: 'Bharat Sanchar Nigam Ltd',
    aliases: ['bsnl'],
    entityType: 'Known Utility',
    businessType: 'State Telecom Operator',
    category: 'Utilities & Bills',
    subcategory: 'Mobile & Internet',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'ACT Fibernet',
    legalName: 'Atria Convergence Technologies Pvt Ltd',
    aliases: ['act fibernet', 'act broadband', 'atria convergence'],
    entityType: 'Known Utility',
    businessType: 'Internet Service Provider',
    category: 'Utilities & Bills',
    subcategory: 'Mobile & Internet',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ── The special Jio alias needs to be in the entry but 'jio' alone could conflict with JioMart.
// We add 'jio' as standalone alias in Jio entry but SUPERMARKETS has 'jiomart'. 
// Resolver handles priority by checking VPAs and more specific aliases first.

// ────────────────────────────────────────────────────────────────────────────
// UTILITIES — Electricity
// ────────────────────────────────────────────────────────────────────────────
const ELECTRICITY: EntityEntry[] = [
  {
    canonicalName: 'BESCOM',
    legalName: 'Bangalore Electricity Supply Company Ltd',
    aliases: ['bescom'],
    entityType: 'Known Utility',
    businessType: 'Electricity Distribution',
    category: 'Utilities & Bills',
    subcategory: 'Electricity',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'MSEDCL',
    legalName: 'Maharashtra State Electricity Distribution Company Ltd',
    aliases: ['msedcl', 'maharashtra electricity', 'mahadiscom', 'mseb'],
    entityType: 'Known Utility',
    businessType: 'Electricity Distribution',
    category: 'Utilities & Bills',
    subcategory: 'Electricity',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Tata Power',
    legalName: 'Tata Power Company Ltd',
    aliases: ['tata power', 'tatapower'],
    entityType: 'Known Utility',
    businessType: 'Power Generation & Distribution',
    category: 'Utilities & Bills',
    subcategory: 'Electricity',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Adani Electricity',
    legalName: 'Adani Electricity Mumbai Ltd',
    aliases: ['adani electricity', 'adani gas', 'aeml'],
    entityType: 'Known Utility',
    businessType: 'Electricity Distribution',
    category: 'Utilities & Bills',
    subcategory: 'Electricity',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'BSES',
    legalName: 'BSES Rajdhani / Yamuna Power Ltd',
    aliases: ['bses'],
    entityType: 'Known Utility',
    businessType: 'Electricity Distribution',
    category: 'Utilities & Bills',
    subcategory: 'Electricity',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Torrent Power',
    legalName: 'Torrent Power Ltd',
    aliases: ['torrent power'],
    entityType: 'Known Utility',
    businessType: 'Electricity Distribution',
    category: 'Utilities & Bills',
    subcategory: 'Electricity',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'CESC',
    legalName: 'CESC Ltd',
    aliases: ['cesc'],
    entityType: 'Known Utility',
    businessType: 'Electricity Distribution',
    category: 'Utilities & Bills',
    subcategory: 'Electricity',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ────────────────────────────────────────────────────────────────────────────
// UTILITIES — Gas & Water
// ────────────────────────────────────────────────────────────────────────────
const GAS_WATER: EntityEntry[] = [
  {
    canonicalName: 'Mahanagar Gas',
    legalName: 'Mahanagar Gas Ltd',
    aliases: ['mahanagar gas', 'mgl'],
    entityType: 'Known Utility',
    businessType: 'Gas Distribution',
    category: 'Utilities & Bills',
    subcategory: 'Gas & Water',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Indraprastha Gas (IGL)',
    legalName: 'Indraprastha Gas Ltd',
    aliases: ['igl', 'indraprastha gas'],
    entityType: 'Known Utility',
    businessType: 'Gas Distribution',
    category: 'Utilities & Bills',
    subcategory: 'Gas & Water',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Gujarat Gas',
    aliases: ['gujarat gas'],
    entityType: 'Known Utility',
    businessType: 'Gas Distribution',
    category: 'Utilities & Bills',
    subcategory: 'Gas & Water',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ────────────────────────────────────────────────────────────────────────────
// UTILITIES — DTH & Cable
// ────────────────────────────────────────────────────────────────────────────
const DTH: EntityEntry[] = [
  {
    canonicalName: 'Tata Sky / Tata Play',
    legalName: 'Tata Play Ltd',
    aliases: ['tata sky', 'tata play', 'tatasky'],
    entityType: 'Known Utility',
    businessType: 'DTH Service Provider',
    category: 'Utilities & Bills',
    subcategory: 'DTH & Cable',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Dish TV',
    legalName: 'Dish TV India Ltd',
    aliases: ['dish tv', 'dishtv'],
    entityType: 'Known Utility',
    businessType: 'DTH Service Provider',
    category: 'Utilities & Bills',
    subcategory: 'DTH & Cable',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Airtel DTH',
    parentCompany: 'Bharti Airtel',
    aliases: ['airtel dth', 'airtel digital tv'],
    entityType: 'Known Utility',
    businessType: 'DTH Service Provider',
    category: 'Utilities & Bills',
    subcategory: 'DTH & Cable',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ────────────────────────────────────────────────────────────────────────────
// INSURANCE
// ────────────────────────────────────────────────────────────────────────────
const INSURANCE: EntityEntry[] = [
  {
    canonicalName: 'LIC',
    legalName: 'Life Insurance Corporation of India',
    aliases: ['lic', 'life insurance corporation', 'life insurance corp', 'lic premium', 'lic of india'],
    entityType: 'Known Merchant',
    businessType: 'Life Insurance',
    category: 'Insurance & Premiums',
    subcategory: 'Life Insurance',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'HDFC Ergo / HDFC Life',
    legalName: 'HDFC Ergo General Insurance Company Ltd',
    aliases: ['hdfc ergo', 'hdfc life', 'hdfc insurance'],
    entityType: 'Known Merchant',
    businessType: 'Life & General Insurance',
    category: 'Insurance & Premiums',
    subcategory: 'Life / Health Insurance',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'ICICI Lombard',
    legalName: 'ICICI Lombard General Insurance Company Ltd',
    aliases: ['icici lombard', 'icici prudential', 'icici pru'],
    entityType: 'Known Merchant',
    businessType: 'General Insurance',
    category: 'Insurance & Premiums',
    subcategory: 'General Insurance',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Star Health',
    legalName: 'Star Health and Allied Insurance Co Ltd',
    aliases: ['star health', 'star allied'],
    entityType: 'Known Merchant',
    businessType: 'Health Insurance',
    category: 'Insurance & Premiums',
    subcategory: 'Health Insurance',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Bajaj Allianz',
    legalName: 'Bajaj Allianz General Insurance Company Ltd',
    aliases: ['bajaj allianz', 'bajaj finserv insurance'],
    entityType: 'Known Merchant',
    businessType: 'General Insurance',
    category: 'Insurance & Premiums',
    subcategory: 'General Insurance',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'SBI Life',
    legalName: 'SBI Life Insurance Company Ltd',
    aliases: ['sbi life', 'sbilife'],
    entityType: 'Known Merchant',
    businessType: 'Life Insurance',
    category: 'Insurance & Premiums',
    subcategory: 'Life Insurance',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Tata AIG',
    legalName: 'Tata AIG General Insurance Company Ltd',
    aliases: ['tata aig'],
    entityType: 'Known Merchant',
    businessType: 'General Insurance',
    category: 'Insurance & Premiums',
    subcategory: 'General Insurance',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Max Life',
    legalName: 'Max Life Insurance Company Ltd',
    aliases: ['max life', 'max bupa'],
    entityType: 'Known Merchant',
    businessType: 'Life Insurance',
    category: 'Insurance & Premiums',
    subcategory: 'Life Insurance',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'New India Assurance',
    aliases: ['new india assurance', 'new india insurance'],
    entityType: 'Known Merchant',
    businessType: 'General Insurance',
    category: 'Insurance & Premiums',
    subcategory: 'General Insurance',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'PolicyBazaar',
    legalName: 'PB Fintech Ltd',
    aliases: ['policybazaar', 'policy bazaar'],
    entityType: 'Known Merchant',
    businessType: 'Insurance Marketplace',
    category: 'Insurance & Premiums',
    subcategory: 'General Insurance',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ────────────────────────────────────────────────────────────────────────────
// INVESTMENTS
// ────────────────────────────────────────────────────────────────────────────
const INVESTMENTS: EntityEntry[] = [
  {
    canonicalName: 'Zerodha',
    legalName: 'Zerodha Broking Ltd',
    aliases: ['zerodha', 'zerodha coin', 'zerodha kite'],
    upiIds: ['zerodha@upi'],
    entityType: 'Known Investment Platform',
    businessType: 'Stock Broker',
    category: 'Investments',
    subcategory: 'Stock Broking',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Groww',
    legalName: 'Nextbillion Technology Pvt Ltd',
    aliases: ['groww'],
    upiIds: ['groww@axis'],
    entityType: 'Known Investment Platform',
    businessType: 'Mutual Fund / Stock Broker',
    category: 'Investments',
    subcategory: 'Mutual Fund / Stocks',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Upstox',
    legalName: 'RKSV Securities India Pvt Ltd',
    aliases: ['upstox', 'rksv'],
    entityType: 'Known Investment Platform',
    businessType: 'Stock Broker',
    category: 'Investments',
    subcategory: 'Stock Broking',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Angel One',
    legalName: 'Angel One Ltd',
    aliases: ['angel one', 'angelone', 'angel broking'],
    entityType: 'Known Investment Platform',
    businessType: 'Stock Broker',
    category: 'Investments',
    subcategory: 'Stock Broking',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Paytm Money',
    legalName: 'Paytm Money Ltd',
    aliases: ['paytm money'],
    entityType: 'Known Investment Platform',
    businessType: 'Mutual Fund / Stocks',
    category: 'Investments',
    subcategory: 'Mutual Fund / Stocks',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'ICICI Direct',
    legalName: 'ICICI Securities Ltd',
    aliases: ['icici direct', 'icici securities', 'icicidirect'],
    entityType: 'Known Investment Platform',
    businessType: 'Stock Broker',
    category: 'Investments',
    subcategory: 'Stock Broking',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'HDFC Securities',
    aliases: ['hdfc securities', 'hdfcsec'],
    entityType: 'Known Investment Platform',
    businessType: 'Stock Broker',
    category: 'Investments',
    subcategory: 'Stock Broking',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Kuvera',
    legalName: 'Arevuk Advisory Services Pvt Ltd',
    aliases: ['kuvera'],
    entityType: 'Known Investment Platform',
    businessType: 'Mutual Fund Platform',
    category: 'Investments',
    subcategory: 'Mutual Fund / Stocks',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'ET Money',
    legalName: 'Finvest Advisory Pvt Ltd',
    aliases: ['et money', 'etmoney'],
    entityType: 'Known Investment Platform',
    businessType: 'Mutual Fund Platform',
    category: 'Investments',
    subcategory: 'Mutual Fund / Stocks',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Smallcase',
    legalName: 'Windmill Capital Pvt Ltd',
    aliases: ['smallcase', 'windmill capital'],
    entityType: 'Known Investment Platform',
    businessType: 'Thematic Investing',
    category: 'Investments',
    subcategory: 'Mutual Fund / Stocks',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ────────────────────────────────────────────────────────────────────────────
// PAYMENT PLATFORMS & WALLETS
// ────────────────────────────────────────────────────────────────────────────
const PAYMENT_PLATFORMS: EntityEntry[] = [
  {
    canonicalName: 'Paytm',
    legalName: 'One97 Communications Ltd',
    aliases: ['paytm', 'one97 communications', 'one 97'],
    upiIds: ['paytm@paytm', 'paytm@upi'],
    entityType: 'Known Platform',
    businessType: 'Digital Payment Wallet',
    category: 'Utilities & Bills',
    subcategory: 'Wallet & UPI Payments',
    confidence: 'high',
  },
  {
    canonicalName: 'PhonePe',
    legalName: 'PhonePe Pvt Ltd',
    aliases: ['phonepe', 'phone pe'],
    upiIds: ['phonepe@ybl'],
    entityType: 'Known Platform',
    businessType: 'Digital Payment Wallet',
    category: 'Utilities & Bills',
    subcategory: 'Wallet & UPI Payments',
    confidence: 'high',
  },
  {
    canonicalName: 'Google Pay',
    legalName: 'Google India Digital Services Pvt Ltd',
    aliases: ['google pay', 'gpay', 'googlepay'],
    upiIds: ['gpay@okicici', 'gmail@ok'],
    entityType: 'Known Platform',
    businessType: 'Digital Payment UPI',
    category: 'Utilities & Bills',
    subcategory: 'Wallet & UPI Payments',
    confidence: 'high',
  },
  {
    canonicalName: 'Razorpay',
    legalName: 'Razorpay Software Pvt Ltd',
    aliases: ['razorpay', 'razorpayments'],
    entityType: 'Known Platform',
    businessType: 'Payment Gateway',
    category: 'Utilities & Bills',
    subcategory: 'Wallet & UPI Payments',
    confidence: 'medium',
  },
];

// ────────────────────────────────────────────────────────────────────────────
// BANKS & FINANCIAL INSTITUTIONS
// ────────────────────────────────────────────────────────────────────────────
const BANKS: EntityEntry[] = [
  {
    canonicalName: 'HDFC Bank',
    legalName: 'HDFC Bank Ltd',
    aliases: ['hdfc bank', 'hdfcbank'],
    entityType: 'Known Financial Institution',
    businessType: 'Private Sector Bank',
    category: 'Bank Charges',
    subcategory: 'Service Fees',
    confidence: 'high',
  },
  {
    canonicalName: 'ICICI Bank',
    legalName: 'ICICI Bank Ltd',
    aliases: ['icici bank', 'icicibankltd'],
    entityType: 'Known Financial Institution',
    businessType: 'Private Sector Bank',
    category: 'Bank Charges',
    subcategory: 'Service Fees',
    confidence: 'high',
  },
  {
    canonicalName: 'State Bank of India (SBI)',
    legalName: 'State Bank of India',
    aliases: ['state bank of india', 'sbi bank', 'sbiinb'],
    entityType: 'Known Financial Institution',
    businessType: 'Public Sector Bank',
    category: 'Bank Charges',
    subcategory: 'Service Fees',
    confidence: 'high',
  },
  {
    canonicalName: 'Axis Bank',
    legalName: 'Axis Bank Ltd',
    aliases: ['axis bank', 'axisbank'],
    entityType: 'Known Financial Institution',
    businessType: 'Private Sector Bank',
    category: 'Bank Charges',
    subcategory: 'Service Fees',
    confidence: 'high',
  },
  {
    canonicalName: 'Kotak Mahindra Bank',
    legalName: 'Kotak Mahindra Bank Ltd',
    aliases: ['kotak mahindra', 'kotak bank', 'kotakbank'],
    entityType: 'Known Financial Institution',
    businessType: 'Private Sector Bank',
    category: 'Bank Charges',
    subcategory: 'Service Fees',
    confidence: 'high',
  },
  {
    canonicalName: 'Bajaj Finance',
    legalName: 'Bajaj Finance Ltd',
    aliases: ['bajaj finance', 'bajaj finserv', 'bajajfin'],
    entityType: 'Known Financial Institution',
    businessType: 'NBFC / Consumer Finance',
    category: 'EMI & Loans',
    subcategory: 'Personal & Consumer Loan',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'Yes Bank',
    legalName: 'Yes Bank Ltd',
    aliases: ['yes bank', 'yesbank'],
    entityType: 'Known Financial Institution',
    businessType: 'Private Sector Bank',
    category: 'Bank Charges',
    subcategory: 'Service Fees',
    confidence: 'high',
  },
];

// ────────────────────────────────────────────────────────────────────────────
// GOVERNMENT & REGULATORY
// ────────────────────────────────────────────────────────────────────────────
const GOVERNMENT: EntityEntry[] = [
  {
    canonicalName: 'NSDL',
    legalName: 'National Securities Depository Ltd',
    aliases: ['nsdl', 'national securities depository'],
    entityType: 'Known Government Entity',
    businessType: 'Securities Depository',
    category: 'Taxes',
    subcategory: 'Government Fee',
    confidence: 'high',
  },
  {
    canonicalName: 'Income Tax Department',
    aliases: ['income tax', 'advance tax', 'self assessment tax', 'tds payment', 'incometax'],
    entityType: 'Known Government Entity',
    businessType: 'Tax Collection',
    category: 'Taxes',
    subcategory: 'Direct Tax',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'FASTag (NETC)',
    legalName: 'NPCI - National Electronic Toll Collection',
    aliases: ['fastag', 'netc', 'netc fastag', 'toll'],
    entityType: 'Known Government Entity',
    businessType: 'Electronic Toll',
    category: 'Transport',
    subcategory: 'Toll & FASTag',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    canonicalName: 'BBPS (Bharat Bill Pay)',
    legalName: 'Bharat Bill Payment System',
    aliases: ['bbps', 'bharat bill payment'],
    entityType: 'Known Government Entity',
    businessType: 'Bill Payment System',
    category: 'Utilities & Bills',
    subcategory: 'Bill Payment',
    confidence: 'medium',
  },
  {
    canonicalName: 'GST / GSTN',
    legalName: 'Goods and Services Tax Network',
    aliases: ['gst', 'gstn', 'goods and services tax'],
    entityType: 'Known Government Entity',
    businessType: 'Tax Collection',
    category: 'Taxes',
    subcategory: 'Indirect Tax (GST)',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ────────────────────────────────────────────────────────────────────────────
// COMBINED & EXPORTED ENTITY KNOWLEDGE BASE
// (Priority order: higher-specificity groups first)
// ────────────────────────────────────────────────────────────────────────────
export const ENTITY_KB: EntityEntry[] = [
  // Government (very specific identifiers)
  ...GOVERNMENT,
  // Insurance before generic bank/finance (prevent misclassification)
  ...INSURANCE,
  // Banks & Financial Institutions
  ...BANKS,
  // Food & Dining
  ...FOOD_DELIVERY,
  ...RESTAURANTS,
  // Groceries
  ...QUICK_COMMERCE,
  ...SUPERMARKETS,
  // Shopping
  ...ONLINE_SHOPPING,
  ...CLOTHING_FASHION,
  ...ELECTRONICS,
  // Entertainment
  ...CINEMA,
  ...STREAMING,
  // Transport
  ...CABS,
  ...PUBLIC_TRANSPORT,
  ...AIRLINES,
  ...TRAVEL_BOOKING,
  // Fuel
  ...FUEL,
  // Healthcare
  ...HEALTHCARE,
  // Education
  ...EDUCATION,
  // Utilities
  ...TELECOM,
  ...ELECTRICITY,
  ...GAS_WATER,
  ...DTH,
  // Investments
  ...INVESTMENTS,
  // Payment Platforms
  ...PAYMENT_PLATFORMS,
];

/**
 * Resolve a narration/VPA against the entity knowledge base.
 * Returns the matching EntityEntry or null.
 *
 * Resolution priority:
 *  1. UPI/VPA exact fragment match (most specific)
 *  2. Alias substring match (case-insensitive)
 *  3. narrationPatterns regex match
 */
export function resolveEntityKB(
  narration: string,
  vpaFragment?: string,
  options?: { onlyVPA?: boolean }
): EntityEntry | null {
  const lower = narration.toLowerCase();
  const vpaLower = (vpaFragment || '').toLowerCase();

  // Pass 1: VPA match — very high precision
  if (vpaLower) {
    for (const entry of ENTITY_KB) {
      if (entry.upiIds?.some(u => vpaLower.includes(u) || u === vpaLower.split('@')[0])) {
        return entry;
      }
    }
  }

  if (options?.onlyVPA) {
    return null;
  }

  // Pass 2: Alias substring match
  for (const entry of ENTITY_KB) {
    if (entry.aliases.some(alias => lower.includes(alias))) {
      return entry;
    }
  }

  // Pass 3: Regex pattern match
  for (const entry of ENTITY_KB) {
    if (entry.narrationPatterns?.some(p => p.test(narration))) {
      return entry;
    }
  }

  return null;
}
