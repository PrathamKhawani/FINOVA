/**
 * FINOVA Merchant & Category Knowledge Base
 *
 * Structured database of 200+ merchants, brands, platforms and service providers
 * mapped to categories and subcategories.
 *
 * Architecture:
 *  - Each entry has canonical name, aliases (spelling variations), category, subcategory, confidence
 *  - New merchants can be added without touching the core categorizer
 *  - Organized in priority groups: high-confidence exact matches first
 */

export interface MerchantEntry {
  name: string;                          // Canonical display name
  aliases: string[];                     // Narration patterns to match (lowercase)
  category: string;
  subcategory: string;
  confidence: 'high' | 'medium' | 'low';
  isDebitOnly?: boolean;
  isCreditOnly?: boolean;
}

// ── FOOD & DINING — Food Delivery ─────────────────────────────────────────────
const FOOD_DELIVERY: MerchantEntry[] = [
  {
    name: 'Swiggy',
    aliases: ['swiggy'],
    category: 'Food & Dining',
    subcategory: 'Food Delivery',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Zomato',
    aliases: ['zomato'],
    category: 'Food & Dining',
    subcategory: 'Food Delivery',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: "Domino's Pizza",
    aliases: ["domino's", 'dominos', 'domino pizza'],
    category: 'Food & Dining',
    subcategory: 'Food Delivery',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Pizza Hut',
    aliases: ['pizza hut', 'pizzahut'],
    category: 'Food & Dining',
    subcategory: 'Food Delivery',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Faasos / Rebel Foods',
    aliases: ['faasos', 'rebel foods', 'oven story', 'behrouz biryani'],
    category: 'Food & Dining',
    subcategory: 'Food Delivery',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'EatFit',
    aliases: ['eatfit', 'eat fit', 'cult.fit food'],
    category: 'Food & Dining',
    subcategory: 'Food Delivery',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ── FOOD & DINING — Restaurants ───────────────────────────────────────────────
const RESTAURANTS: MerchantEntry[] = [
  {
    name: "McDonald's",
    aliases: ["mcdonald's", 'mcdonalds', 'mcdonald', 'mcds'],
    category: 'Food & Dining',
    subcategory: 'Restaurants',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Burger King',
    aliases: ['burger king', 'burgerking'],
    category: 'Food & Dining',
    subcategory: 'Restaurants',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'KFC',
    aliases: ['kfc'],
    category: 'Food & Dining',
    subcategory: 'Restaurants',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Starbucks',
    aliases: ['starbucks', 'starbuck'],
    category: 'Food & Dining',
    subcategory: 'Restaurants',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: "Café Coffee Day",
    aliases: ['cafe coffee day', 'ccd', 'coffee day'],
    category: 'Food & Dining',
    subcategory: 'Restaurants',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Haldirams',
    aliases: ['haldiram', 'haldirams'],
    category: 'Food & Dining',
    subcategory: 'Restaurants',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Subway',
    aliases: ['subway'],
    category: 'Food & Dining',
    subcategory: 'Restaurants',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Barbeque Nation',
    aliases: ['barbeque nation', 'bbq nation'],
    category: 'Food & Dining',
    subcategory: 'Restaurants',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ── GROCERIES — Quick Commerce ────────────────────────────────────────────────
const QUICK_COMMERCE: MerchantEntry[] = [
  {
    name: 'Blinkit',
    aliases: ['blinkit', 'grofers'],
    category: 'Groceries',
    subcategory: 'Quick Commerce',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Zepto',
    aliases: ['zepto'],
    category: 'Groceries',
    subcategory: 'Quick Commerce',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Swiggy Instamart',
    aliases: ['swiggy instamart', 'instamart'],
    category: 'Groceries',
    subcategory: 'Quick Commerce',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'BigBasket BB Now',
    aliases: ['bb now', 'bbdaily'],
    category: 'Groceries',
    subcategory: 'Quick Commerce',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ── GROCERIES — Supermarkets ──────────────────────────────────────────────────
const SUPERMARKETS: MerchantEntry[] = [
  {
    name: 'BigBasket',
    aliases: ['bigbasket', 'big basket'],
    category: 'Groceries',
    subcategory: 'Supermarket',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'D-Mart',
    aliases: ['dmart', 'd-mart', 'd mart', 'avenue supermarts'],
    category: 'Groceries',
    subcategory: 'Supermarket',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Reliance Fresh / Smart',
    aliases: ['reliance fresh', 'reliance smart', 'reliance super'],
    category: 'Groceries',
    subcategory: 'Supermarket',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'More Supermarket',
    aliases: ['more supermarket', 'more retail'],
    category: 'Groceries',
    subcategory: 'Supermarket',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Spencer\'s',
    aliases: ["spencer's", 'spencers retail'],
    category: 'Groceries',
    subcategory: 'Supermarket',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Nature\'s Basket',
    aliases: ["nature's basket", 'natures basket'],
    category: 'Groceries',
    subcategory: 'Supermarket',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'JioMart',
    aliases: ['jiomart'],
    category: 'Groceries',
    subcategory: 'Supermarket',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ── SHOPPING — Online ─────────────────────────────────────────────────────────
const ONLINE_SHOPPING: MerchantEntry[] = [
  {
    name: 'Amazon',
    aliases: ['amazon', 'amzn', 'amazon.in'],
    category: 'Shopping',
    subcategory: 'Online Shopping',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Flipkart',
    aliases: ['flipkart', 'fk', 'ekart'],
    category: 'Shopping',
    subcategory: 'Online Shopping',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Myntra',
    aliases: ['myntra'],
    category: 'Shopping',
    subcategory: 'Online Shopping',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Meesho',
    aliases: ['meesho'],
    category: 'Shopping',
    subcategory: 'Online Shopping',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Nykaa',
    aliases: ['nykaa', 'nykaa.com'],
    category: 'Shopping',
    subcategory: 'Online Shopping',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Snapdeal',
    aliases: ['snapdeal'],
    category: 'Shopping',
    subcategory: 'Online Shopping',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Tata CLiQ',
    aliases: ['tata cliq', 'tatacliq'],
    category: 'Shopping',
    subcategory: 'Online Shopping',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'AJIO',
    aliases: ['ajio'],
    category: 'Shopping',
    subcategory: 'Online Shopping',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'IndiaMART',
    aliases: ['indiamart', 'india mart'],
    category: 'Shopping',
    subcategory: 'Business Marketplace',
    confidence: 'medium',
    isDebitOnly: true,
  },
];

// ── SHOPPING — Clothing & Fashion ──────────────────────────────────────────────
const CLOTHING_FASHION: MerchantEntry[] = [
  {
    name: 'Zudio',
    aliases: ['zudio'],
    category: 'Shopping',
    subcategory: 'Clothing & Fashion',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'H&M',
    aliases: ['h&m', 'h & m', 'hm fashion'],
    category: 'Shopping',
    subcategory: 'Clothing & Fashion',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Zara',
    aliases: ['zara'],
    category: 'Shopping',
    subcategory: 'Clothing & Fashion',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Westside / Trent',
    aliases: ['westside', 'trent'],
    category: 'Shopping',
    subcategory: 'Clothing & Fashion',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Pantaloons',
    aliases: ['pantaloons'],
    category: 'Shopping',
    subcategory: 'Clothing & Fashion',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Max Fashion',
    aliases: ['max fashion', 'max retail'],
    category: 'Shopping',
    subcategory: 'Clothing & Fashion',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Lifestyle',
    aliases: ['lifestyle', 'lifestyle stores'],
    category: 'Shopping',
    subcategory: 'Clothing & Fashion',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'FabIndia',
    aliases: ['fabindia'],
    category: 'Shopping',
    subcategory: 'Clothing & Fashion',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Peter England',
    aliases: ['peter england'],
    category: 'Shopping',
    subcategory: 'Clothing & Fashion',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Van Heusen',
    aliases: ['van heusen', 'vanheusen'],
    category: 'Shopping',
    subcategory: 'Clothing & Fashion',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ── SHOPPING — Electronics & Retail ───────────────────────────────────────────
const ELECTRONICS_RETAIL: MerchantEntry[] = [
  {
    name: 'Croma',
    aliases: ['croma', 'infiniti retail'],
    category: 'Shopping',
    subcategory: 'Electronics',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Reliance Digital',
    aliases: ['reliance digital', 'ril digital'],
    category: 'Shopping',
    subcategory: 'Electronics',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Vijay Sales',
    aliases: ['vijay sales', 'vijaysales'],
    category: 'Shopping',
    subcategory: 'Electronics',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Decathlon',
    aliases: ['decathlon'],
    category: 'Shopping',
    subcategory: 'Sports & Outdoors',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ── ENTERTAINMENT — Cinema ────────────────────────────────────────────────────
const CINEMA: MerchantEntry[] = [
  {
    name: 'PVR Cinemas',
    aliases: ['pvr', 'pvr cinemas', 'pvr cinema'],
    category: 'Entertainment',
    subcategory: 'Cinema',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Cinépolis',
    aliases: ['cinepolis', 'cinépolis'],
    category: 'Entertainment',
    subcategory: 'Cinema',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'INOX',
    aliases: ['inox', 'inox leisure'],
    category: 'Entertainment',
    subcategory: 'Cinema',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'BookMyShow',
    aliases: ['bookmyshow', 'bms'],
    category: 'Entertainment',
    subcategory: 'Events & Ticketing',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ── ENTERTAINMENT — Streaming ──────────────────────────────────────────────────
const STREAMING: MerchantEntry[] = [
  {
    name: 'Netflix',
    aliases: ['netflix'],
    category: 'Entertainment',
    subcategory: 'Streaming',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Amazon Prime',
    aliases: ['amazon prime', 'prime video', 'primevideo'],
    category: 'Entertainment',
    subcategory: 'Streaming',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Disney+ Hotstar',
    aliases: ['hotstar', 'disney+ hotstar', 'disney hotstar'],
    category: 'Entertainment',
    subcategory: 'Streaming',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Spotify',
    aliases: ['spotify'],
    category: 'Entertainment',
    subcategory: 'Music Streaming',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'YouTube Premium',
    aliases: ['youtube premium', 'youtube.com premium'],
    category: 'Entertainment',
    subcategory: 'Streaming',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'ZEE5',
    aliases: ['zee5', 'zee 5'],
    category: 'Entertainment',
    subcategory: 'Streaming',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'SonyLIV',
    aliases: ['sonyliv', 'sony liv', 'sony entertainment'],
    category: 'Entertainment',
    subcategory: 'Streaming',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Apple TV+ / Apple',
    aliases: ['apple.com', 'apple tv', 'apple music', 'itunes'],
    category: 'Entertainment',
    subcategory: 'Streaming',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ── TRANSPORT — Cabs ──────────────────────────────────────────────────────────
const CABS: MerchantEntry[] = [
  {
    name: 'Uber',
    aliases: ['uber'],
    category: 'Transport',
    subcategory: 'Cab & Ride',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Ola',
    aliases: ['ola cabs', 'ola_', 'ola-', 'ani technologies'],
    category: 'Transport',
    subcategory: 'Cab & Ride',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Rapido',
    aliases: ['rapido'],
    category: 'Transport',
    subcategory: 'Cab & Ride',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'BluSmart',
    aliases: ['blusmart', 'blu smart'],
    category: 'Transport',
    subcategory: 'Cab & Ride',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ── TRANSPORT — Rail & Metro ───────────────────────────────────────────────────
const PUBLIC_TRANSPORT: MerchantEntry[] = [
  {
    name: 'IRCTC',
    aliases: ['irctc', 'indian railway', 'indian railways'],
    category: 'Transport',
    subcategory: 'Railways',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Metro',
    aliases: ['namma metro', 'delhi metro', 'dmrc', 'bmrc', 'mumbai metro'],
    category: 'Transport',
    subcategory: 'Metro & Local Train',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Yulu / Bounce',
    aliases: ['yulu', 'bounce'],
    category: 'Transport',
    subcategory: 'Micro-Mobility',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ── TRANSPORT — Airlines & Hotels ──────────────────────────────────────────────
const AIRLINES_HOTELS: MerchantEntry[] = [
  {
    name: 'IndiGo',
    aliases: ['indigo', 'go indigo', 'interglobe'],
    category: 'Transport',
    subcategory: 'Airlines',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Air India',
    aliases: ['air india', 'airindia'],
    category: 'Transport',
    subcategory: 'Airlines',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'SpiceJet',
    aliases: ['spicejet', 'spice jet'],
    category: 'Transport',
    subcategory: 'Airlines',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'MakeMyTrip',
    aliases: ['makemytrip', 'mmt'],
    category: 'Transport',
    subcategory: 'Travel Booking',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Yatra',
    aliases: ['yatra'],
    category: 'Transport',
    subcategory: 'Travel Booking',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'ClearTrip',
    aliases: ['cleartrip'],
    category: 'Transport',
    subcategory: 'Travel Booking',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'redBus',
    aliases: ['redbus', 'red bus'],
    category: 'Transport',
    subcategory: 'Bus Booking',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'OYO',
    aliases: ['oyo', 'oyo rooms'],
    category: 'Transport',
    subcategory: 'Hotels & Stay',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Treebo',
    aliases: ['treebo'],
    category: 'Transport',
    subcategory: 'Hotels & Stay',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Airbnb',
    aliases: ['airbnb'],
    category: 'Transport',
    subcategory: 'Hotels & Stay',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ── FUEL ──────────────────────────────────────────────────────────────────────
const FUEL: MerchantEntry[] = [
  {
    name: 'HPCL',
    aliases: ['hpcl', 'hp petrol', 'hindustan petroleum'],
    category: 'Fuel',
    subcategory: 'Petrol & Diesel',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'BPCL',
    aliases: ['bpcl', 'bharat petroleum'],
    category: 'Fuel',
    subcategory: 'Petrol & Diesel',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Indian Oil',
    aliases: ['iocl', 'indian oil', 'indianoil', 'ioc'],
    category: 'Fuel',
    subcategory: 'Petrol & Diesel',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Nayara Energy',
    aliases: ['nayara', 'essar oil'],
    category: 'Fuel',
    subcategory: 'Petrol & Diesel',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Shell',
    aliases: ['shell'],
    category: 'Fuel',
    subcategory: 'Petrol & Diesel',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ── HEALTHCARE ────────────────────────────────────────────────────────────────
const HEALTHCARE: MerchantEntry[] = [
  {
    name: 'Apollo Pharmacy',
    aliases: ['apollo pharmacy', 'apollo health', 'apollo hospitals'],
    category: 'Healthcare',
    subcategory: 'Pharmacy',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'MedPlus',
    aliases: ['medplus', 'med plus'],
    category: 'Healthcare',
    subcategory: 'Pharmacy',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Netmeds',
    aliases: ['netmeds', 'net meds'],
    category: 'Healthcare',
    subcategory: 'Online Pharmacy',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: '1mg / Tata 1mg',
    aliases: ['1mg', 'tata 1mg'],
    category: 'Healthcare',
    subcategory: 'Online Pharmacy',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'PharmEasy',
    aliases: ['pharmeasy'],
    category: 'Healthcare',
    subcategory: 'Online Pharmacy',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Practo',
    aliases: ['practo'],
    category: 'Healthcare',
    subcategory: 'Doctor Consultation',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Cult.fit',
    aliases: ['cult.fit', 'cult fit', 'curefit'],
    category: 'Healthcare',
    subcategory: 'Fitness & Wellness',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ── EDUCATION ─────────────────────────────────────────────────────────────────
const EDUCATION: MerchantEntry[] = [
  {
    name: 'Byju\'s',
    aliases: ["byju's", 'byjus', 'think and learn'],
    category: 'Education',
    subcategory: 'Ed-Tech Platform',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Unacademy',
    aliases: ['unacademy'],
    category: 'Education',
    subcategory: 'Ed-Tech Platform',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Udemy',
    aliases: ['udemy'],
    category: 'Education',
    subcategory: 'Online Courses',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Coursera',
    aliases: ['coursera'],
    category: 'Education',
    subcategory: 'Online Courses',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Vedantu',
    aliases: ['vedantu'],
    category: 'Education',
    subcategory: 'Ed-Tech Platform',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Toppr',
    aliases: ['toppr'],
    category: 'Education',
    subcategory: 'Ed-Tech Platform',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'upGrad',
    aliases: ['upgrad'],
    category: 'Education',
    subcategory: 'Higher Education',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ── UTILITIES & BILLS ─────────────────────────────────────────────────────────
const UTILITIES: MerchantEntry[] = [
  {
    name: 'Jio',
    aliases: ['jio', 'reliance jio', 'jio postpaid'],
    category: 'Utilities & Bills',
    subcategory: 'Mobile & Internet',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Airtel',
    aliases: ['airtel', 'bharti airtel'],
    category: 'Utilities & Bills',
    subcategory: 'Mobile & Internet',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Vi (Vodafone Idea)',
    aliases: ['vodafone idea', 'vi postpaid', 'vodafone', 'idea cellular'],
    category: 'Utilities & Bills',
    subcategory: 'Mobile & Internet',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'BSNL',
    aliases: ['bsnl'],
    category: 'Utilities & Bills',
    subcategory: 'Mobile & Internet',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'BESCOM',
    aliases: ['bescom'],
    category: 'Utilities & Bills',
    subcategory: 'Electricity',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'MSEDCL',
    aliases: ['msedcl', 'maharashtra electricity', 'mahadiscom'],
    category: 'Utilities & Bills',
    subcategory: 'Electricity',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Tata Power',
    aliases: ['tata power', 'tatapower'],
    category: 'Utilities & Bills',
    subcategory: 'Electricity',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Adani Electricity',
    aliases: ['adani electricity', 'adani gas'],
    category: 'Utilities & Bills',
    subcategory: 'Electricity',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Tata Sky / Tata Play',
    aliases: ['tata sky', 'tata play', 'tatasky'],
    category: 'Utilities & Bills',
    subcategory: 'DTH & Cable',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Dish TV',
    aliases: ['dish tv', 'dishtv'],
    category: 'Utilities & Bills',
    subcategory: 'DTH & Cable',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ── INSURANCE ────────────────────────────────────────────────────────────────
const INSURANCE: MerchantEntry[] = [
  {
    name: 'LIC',
    aliases: ['lic', 'life insurance corporation'],
    category: 'Insurance & Premiums',
    subcategory: 'Life Insurance',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'HDFC Ergo',
    aliases: ['hdfc ergo', 'hdfc life'],
    category: 'Insurance & Premiums',
    subcategory: 'Life / Health Insurance',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'ICICI Lombard',
    aliases: ['icici lombard', 'icici prudential'],
    category: 'Insurance & Premiums',
    subcategory: 'General Insurance',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Star Health',
    aliases: ['star health', 'star allied'],
    category: 'Insurance & Premiums',
    subcategory: 'Health Insurance',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Bajaj Allianz',
    aliases: ['bajaj allianz', 'bajaj finserv insurance'],
    category: 'Insurance & Premiums',
    subcategory: 'General Insurance',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Tata AIG',
    aliases: ['tata aig'],
    category: 'Insurance & Premiums',
    subcategory: 'General Insurance',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Max Life',
    aliases: ['max life', 'max bupa'],
    category: 'Insurance & Premiums',
    subcategory: 'Life Insurance',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ── INVESTMENTS ───────────────────────────────────────────────────────────────
const INVESTMENTS: MerchantEntry[] = [
  {
    name: 'Zerodha',
    aliases: ['zerodha', 'zerodha coin', 'zerodha kite'],
    category: 'Investments',
    subcategory: 'Stock Broking',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Groww',
    aliases: ['groww'],
    category: 'Investments',
    subcategory: 'Mutual Fund / Stocks',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Upstox',
    aliases: ['upstox'],
    category: 'Investments',
    subcategory: 'Stock Broking',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Angel One',
    aliases: ['angel one', 'angelone', 'angel broking'],
    category: 'Investments',
    subcategory: 'Stock Broking',
    confidence: 'high',
    isDebitOnly: true,
  },
  {
    name: 'Paytm Money',
    aliases: ['paytm money'],
    category: 'Investments',
    subcategory: 'Mutual Fund / Stocks',
    confidence: 'high',
    isDebitOnly: true,
  },
];

// ── ALL MERCHANTS — Combined & Ordered by Priority ───────────────────────────
export const MERCHANT_KNOWLEDGE_BASE: MerchantEntry[] = [
  // Insurance first (prevents misclassification)
  ...INSURANCE,
  // Food
  ...FOOD_DELIVERY,
  ...RESTAURANTS,
  // Groceries
  ...QUICK_COMMERCE,
  ...SUPERMARKETS,
  // Shopping
  ...ONLINE_SHOPPING,
  ...CLOTHING_FASHION,
  ...ELECTRONICS_RETAIL,
  // Entertainment
  ...CINEMA,
  ...STREAMING,
  // Transport
  ...CABS,
  ...PUBLIC_TRANSPORT,
  ...AIRLINES_HOTELS,
  // Fuel
  ...FUEL,
  // Healthcare
  ...HEALTHCARE,
  // Education
  ...EDUCATION,
  // Utilities
  ...UTILITIES,
  // Investments
  ...INVESTMENTS,
];

/**
 * Look up a transaction narration against the merchant knowledge base.
 * Returns the matching entry or null.
 */
export function lookupMerchant(narration: string): MerchantEntry | null {
  const lower = narration.toLowerCase();
  for (const entry of MERCHANT_KNOWLEDGE_BASE) {
    if (entry.aliases.some(alias => lower.includes(alias))) {
      return entry;
    }
  }
  return null;
}
