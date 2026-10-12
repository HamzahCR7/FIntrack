export interface CategoryKnowledgeRule {
  category: string;
  subcategory?: string;
  keywords: string[];
}

// Public merchant descriptions and common Indian bank/UPI narration terms.
// Keep these broad: a user's confirmed transaction history always outranks them.
export const expenseCategoryKnowledge: CategoryKnowledgeRule[] = [
  { category: 'Food & Dining', subcategory: 'Dining Out', keywords: ['restaurant', 'cafe', 'coffee', 'zomato', 'swiggy', 'eatclub', 'dominos', 'pizza hut', 'mcdonalds', 'kfc', 'starbucks', 'barbeque nation', 'zaitoon'] },
  { category: 'Food & Dining', subcategory: 'Tea & Coffee', keywords: ['chai', 'tea shop', 'coffee day', 'chaayos'] },
  { category: 'Food & Dining', subcategory: 'Sweets & Desserts', keywords: ['bakery', 'cake', 'dessert', 'ice cream', 'sweet shop'] },
  { category: 'Groceries', subcategory: 'Online Grocery', keywords: ['blinkit', 'zepto', 'bigbasket', 'instamart', 'jiomart', 'amazon fresh', 'online grocery'] },
  { category: 'Groceries', subcategory: 'Supermarket', keywords: ['grocery', 'groceries', 'supermarket', 'dmart', 'reliance fresh', 'more retail', 'nature basket', 'kirana'] },
  { category: 'Transport', subcategory: 'Ride Share', keywords: ['uber', 'ola cab', 'rapido cab', 'ride share'] },
  { category: 'Transport', subcategory: 'Bike Taxi', keywords: ['rapido bike', 'bike taxi'] },
  { category: 'Transport', subcategory: 'Fuel', keywords: ['petrol', 'diesel', 'fuel', 'indian oil', 'iocl', 'bharat petroleum', 'bpcl', 'hindustan petroleum', 'hpcl'] },
  { category: 'Transport', subcategory: 'Metro', keywords: ['metro rail', 'dmrc', 'cmrl', 'bmrc', 'namma metro'] },
  { category: 'Travel', subcategory: 'Train', keywords: ['irctc', 'railway ticket', 'train ticket'] },
  { category: 'Travel', subcategory: 'Flight', keywords: ['indigo', 'air india', 'akasa', 'spicejet', 'vistara', 'flight ticket', 'airline'] },
  { category: 'Travel', subcategory: 'Hotel / Stay', keywords: ['hotel', 'oyo', 'airbnb', 'booking.com', 'makemytrip', 'goibibo', 'cleartrip'] },
  { category: 'Health & Medical', subcategory: 'Medicines', keywords: ['pharmacy', 'medical store', 'apollo pharmacy', 'netmeds', 'pharmeasy', '1mg', 'medicine'] },
  { category: 'Health & Medical', subcategory: 'Doctor Visit', keywords: ['doctor', 'clinic', 'hospital', 'practo', 'consultation'] },
  { category: 'Health & Medical', subcategory: 'Lab Tests', keywords: ['diagnostic', 'lab test', 'pathology', 'thyrocare', 'lal pathlabs'] },
  { category: 'Shopping', subcategory: 'Clothing', keywords: ['myntra', 'ajio', 'zara', 'h&m', 'max fashion', 'pantaloons', 'clothing', 'apparel'] },
  { category: 'Shopping', subcategory: 'Electronics', keywords: ['croma', 'reliance digital', 'vijay sales', 'electronics', 'mobile phone', 'laptop'] },
  { category: 'Shopping', keywords: ['amazon', 'flipkart', 'meesho', 'shopping'] },
  { category: 'Entertainment', subcategory: 'Movies', keywords: ['bookmyshow', 'pvr', 'inox', 'cinema', 'movie ticket'] },
  { category: 'Entertainment', subcategory: 'Subscriptions', keywords: ['netflix', 'spotify', 'hotstar', 'prime video', 'youtube premium', 'subscription'] },
  { category: 'Utilities', subcategory: 'Electricity', keywords: ['electricity', 'electric bill', 'tneb', 'bescom', 'adani electricity', 'torrent power'] },
  { category: 'Utilities', subcategory: 'Mobile Recharge', keywords: ['mobile recharge', 'airtel recharge', 'jio recharge', 'vi recharge', 'bsnl recharge'] },
  { category: 'Utilities', subcategory: 'Internet', keywords: ['broadband', 'wifi', 'fiber', 'airtel xstream', 'jiofiber', 'act fibernet'] },
  { category: 'Home', subcategory: 'Rent', keywords: ['house rent', 'monthly rent', 'landlord'] },
  { category: 'Self Grooming', subcategory: 'Hair Cut', keywords: ['haircut', 'hair cut', 'barber'] },
  { category: 'Self Grooming', subcategory: 'Salon & Spa', keywords: ['salon', 'spa', 'urban company', 'naturals salon', 'lakme salon'] },
  { category: 'Education Loan', subcategory: 'EMI Payment', keywords: ['education loan emi', 'student loan emi'] },
];

export const incomeCategoryKnowledge: CategoryKnowledgeRule[] = [
  { category: 'Salary', keywords: ['salary', 'payroll', 'monthly pay'] },
  { category: 'Freelance Income', keywords: ['freelance', 'consulting fee', 'professional fee'] },
  { category: 'Interest Income', keywords: ['interest credited', 'deposit interest', 'savings interest'] },
  { category: 'Investment Returns', keywords: ['dividend', 'investment return', 'mutual fund redemption'] },
  { category: 'Rental Income', keywords: ['rent received', 'rental income', 'tenant'] },
  { category: 'Refund', keywords: ['refund', 'reversal', 'cashback'] },
  { category: 'Money Returned', keywords: ['money returned', 'repayment received', 'paid back'] },
  { category: 'Gift Received', keywords: ['gift received', 'gift money'] },
  { category: 'Pocket Allowance', keywords: ['allowance', 'pocket money'] },
];

// Used when a category has no user history yet. These are suggestions only;
// confirmed merchants from the user's transactions are always ranked first.
export const merchantSuggestionKnowledge: Record<string, string[]> = {
  'food & dining > biryani': [
    'Behrouz Biryani', 'Biryani By Kilo', 'Paradise Biryani', 'Meghana Foods',
    'Dindigul Thalappakatti', 'SS Hyderabad Biryani', 'Ambur Star Biryani',
    'Mani’s Dum Biryani', 'The Biryani Life', 'Potful', 'Bikkgane Biryani',
    'Sharief Bhai', 'Copper Kitchen', 'Anjappar', 'Local Biryani Restaurant',
  ],
  'food & dining': [
    'Zomato', 'Swiggy', 'EatClub', "Domino's", 'Pizza Hut', "McDonald's", 'KFC',
    'Burger King', 'Subway', 'Starbucks', 'Cafe Coffee Day', 'Chaayos', 'Barbeque Nation',
    'Haldiram’s', 'Baskin Robbins', 'Naturals Ice Cream', 'Local Restaurant', 'Local Cafe',
  ],
  groceries: [
    'Blinkit', 'Zepto', 'BigBasket', 'Swiggy Instamart', 'Amazon Fresh', 'JioMart', 'DMart',
    'DMart Ready', 'Reliance Smart', 'More Supermarket', 'Spencer’s', 'Nature’s Basket',
    'Star Bazaar', 'Nilgiris', 'Lulu Hypermarket', 'Local Supermarket', 'Local Kirana Store',
  ],
  fruits: ['Local Fruit Shop', 'Fruit Market', 'BigBasket', 'Blinkit', 'Zepto', 'JioMart', 'DMart'],
  transport: [
    'Uber', 'Ola', 'Rapido', 'Namma Yatri', 'BluSmart', 'Indian Oil', 'Bharat Petroleum',
    'Hindustan Petroleum', 'Shell', 'Reliance Petroleum', 'Delhi Metro', 'Chennai Metro',
    'Bengaluru Metro', 'Indian Railways', 'RedBus', 'AbhiBus', 'FASTag', 'Local Auto',
  ],
  travel: [
    'IRCTC', 'IndiGo', 'Air India', 'Akasa Air', 'SpiceJet', 'MakeMyTrip', 'Goibibo',
    'Cleartrip', 'EaseMyTrip', 'Booking.com', 'OYO', 'Airbnb', 'Agoda', 'RedBus',
    'AbhiBus', 'Uber', 'Ola', 'Treebo', 'FabHotels', 'Thomas Cook',
  ],
  'health & medical': [
    'Apollo Pharmacy', 'Tata 1mg', 'PharmEasy', 'Netmeds', 'MedPlus', 'Practo',
    'Apollo Hospitals', 'Fortis Healthcare', 'Max Healthcare', 'Manipal Hospitals',
    'Narayana Health', 'Dr Lal PathLabs', 'Thyrocare', 'Metropolis Healthcare',
    'Local Pharmacy', 'Local Clinic', 'Local Hospital',
  ],
  shopping: [
    'Amazon', 'Flipkart', 'Myntra', 'AJIO', 'Meesho', 'Tata CLiQ', 'Nykaa', 'Croma',
    'Reliance Digital', 'Vijay Sales', 'Zara', 'H&M', 'Max Fashion', 'Pantaloons',
    'Westside', 'Lifestyle', 'Shoppers Stop', 'Decathlon', 'IKEA', 'Local Store',
  ],
  entertainment: [
    'BookMyShow', 'PVR INOX', 'Cinepolis', 'Netflix', 'Amazon Prime Video', 'Disney+ Hotstar',
    'SonyLIV', 'ZEE5', 'JioCinema', 'Spotify', 'YouTube Premium', 'Apple Music',
    'Google Play', 'PlayStation', 'Steam', 'Xbox', 'District by Zomato',
  ],
  utilities: [
    'Airtel', 'Jio', 'Vi', 'BSNL', 'ACT Fibernet', 'Hathway', 'Tata Play Fiber',
    'Electricity Board', 'Adani Electricity', 'Tata Power', 'Torrent Power', 'Water Board',
    'Mahanagar Gas', 'Indraprastha Gas', 'Indian Oil Gas', 'Bharat Gas', 'HP Gas',
  ],
  home: [
    'Landlord', 'Urban Company', 'NoBroker', 'Housing.com', 'IKEA', 'Pepperfry', 'Home Centre',
    'Asian Paints', 'Livspace', 'Local Plumber', 'Local Electrician', 'Apartment Association',
  ],
  'rent & housing': ['Landlord', 'NoBroker', 'Housing.com', 'Apartment Association', 'Property Manager'],
  'self grooming': [
    'Urban Company', 'Naturals Salon', 'Lakme Salon', 'Green Trends', 'Jawed Habib',
    'Looks Salon', 'Enrich Salon', 'Truefitt & Hill', 'YesMadam', 'Local Salon', 'Local Barber',
  ],
  'education loan': ['SBI', 'Axis Bank', 'HDFC Bank', 'ICICI Bank', 'Bank of Baroda', 'Canara Bank', 'Avanse', 'HDFC Credila'],
  salary: ['Employer', 'Company Payroll'],
  'freelance income': ['Client', 'Upwork', 'Fiverr', 'Freelancer'],
  'interest income': ['Bank Interest', 'Post Office', 'Fixed Deposit'],
  'investment returns': ['Zerodha', 'Groww', 'Upstox', 'Angel One', 'Mutual Fund'],
  'rental income': ['Tenant', 'Property Manager'],
  refund: ['Amazon', 'Flipkart', 'Merchant Refund', 'Bank Reversal'],
  'family support': ['Parents', 'Sibling', 'Relative'],
  miscellaneous: ['Local Vendor', 'Individual Payee', 'Other Merchant'],
  other: ['Local Vendor', 'Individual Payee', 'Other Merchant'],
};

const subcategoryMerchantRules: Array<{ match: RegExp; merchants: string[] }> = [
  { match: /(?:biryani)/, merchants: merchantSuggestionKnowledge['food & dining > biryani'] },
  { match: /(?:tea|coffee|breakfast|tiffin|dosa|idli|uttapam|pongal)/, merchants: ['Cafe Coffee Day', 'Starbucks', 'Chaayos', 'Chai Point', 'A2B', 'Saravana Bhavan', 'Sangeetha'] },
  { match: /(?:sweets|desserts|bakery|juice|ice cream)/, merchants: ['Haldiram’s', 'Bikanervala', 'Mio Amore', 'Theobroma', 'Baskin Robbins', 'Naturals Ice Cream', 'Juice Junction'] },
  { match: /(?:fast food|chicken|eggs|kebab|tandoori)/, merchants: ['KFC', "McDonald's", 'Burger King', 'Subway', "Domino's", 'Pizza Hut', 'Barbeque Nation'] },
  { match: /(?:thali|punjabi|chole|rajma|paratha|dal|roti|paneer|north indian)/, merchants: ['Haldiram’s', 'Bikanervala', 'A2B', 'Barbeque Nation', 'Punjab Grill', 'Moti Mahal'] },
  { match: /(?:south indian|appam|puttu|andhra|chettinad|lemon rice|curd rice|parotta)/, merchants: ['A2B', 'Saravana Bhavan', 'Sangeetha', 'Anjappar', 'Namma Veedu Vasanta Bhavan', 'Meghana Foods'] },
  { match: /(?:seafood|mutton)/, merchants: ['Anjappar', 'Barbeque Nation', 'Absolute Barbecues', 'Fisherman’s Wharf', 'Local Meat Shop'] },
  { match: /(?:milk|curd|yogurt|paneer|cheese)/, merchants: ['Amul', 'Mother Dairy', 'Nandini', 'Aavin', 'Milky Mist', 'Country Delight'] },
  { match: /(?:chicken|fish|seafood|eggs|mutton)/, merchants: ['Licious', 'FreshToHome', 'TenderCuts', 'Meatigo', 'Local Meat Shop'] },
  { match: /(?:cleaning|laundry|detergent|personal care|baby care|pet supplies)/, merchants: ['Amazon', 'Blinkit', 'BigBasket', 'DMart', 'JioMart', 'FirstCry', 'Heads Up For Tails'] },
  { match: /(?:fuel)/, merchants: ['Indian Oil', 'Bharat Petroleum', 'Hindustan Petroleum', 'Shell', 'Reliance Petroleum', 'Nayara Energy'] },
  { match: /(?:metro|local train)/, merchants: ['Delhi Metro', 'Chennai Metro', 'Bengaluru Metro', 'Mumbai Metro', 'Kochi Metro', 'Hyderabad Metro'] },
  { match: /(?:train)/, merchants: ['IRCTC', 'Indian Railways', 'ConfirmTkt', 'Trainman', 'RailYatri'] },
  { match: /(?:flight)/, merchants: ['IndiGo', 'Air India', 'Akasa Air', 'SpiceJet', 'MakeMyTrip', 'Cleartrip', 'EaseMyTrip'] },
  { match: /(?:bus)/, merchants: ['RedBus', 'AbhiBus', 'IntrCity SmartBus', 'KSRTC', 'MSRTC', 'TNSTC'] },
  { match: /(?:taxi|cab|ride share|bike taxi|airport transfer|office commute)/, merchants: ['Uber', 'Ola', 'Rapido', 'Namma Yatri', 'BluSmart', 'Savaari'] },
  { match: /(?:parking|toll)/, merchants: ['FASTag', 'Park+', 'National Highways Authority of India', 'Local Parking'] },
  { match: /(?:vehicle service|bike maintenance|car wash|ev charging)/, merchants: ['GoMechanic', 'Bosch Car Service', '3M Car Care', 'Ather Grid', 'Tata Power EZ Charge', 'Local Garage'] },
  { match: /(?:hotel|stay|lodging)/, merchants: ['OYO', 'Booking.com', 'MakeMyTrip', 'Goibibo', 'Airbnb', 'Agoda', 'Treebo', 'FabHotels'] },
  { match: /(?:doctor|emergency care)/, merchants: ['Practo', 'Apollo Hospitals', 'Fortis Healthcare', 'Max Healthcare', 'Manipal Hospitals', 'Narayana Health'] },
  { match: /(?:medicines)/, merchants: ['Apollo Pharmacy', 'Tata 1mg', 'PharmEasy', 'Netmeds', 'MedPlus', 'Wellness Forever'] },
  { match: /(?:lab tests)/, merchants: ['Dr Lal PathLabs', 'Thyrocare', 'Metropolis Healthcare', 'Apollo Diagnostics', 'Redcliffe Labs'] },
  { match: /(?:clothing|footwear|accessories)/, merchants: ['Myntra', 'AJIO', 'Zara', 'H&M', 'Max Fashion', 'Pantaloons', 'Westside', 'Decathlon'] },
  { match: /(?:electronics)/, merchants: ['Croma', 'Reliance Digital', 'Vijay Sales', 'Amazon', 'Flipkart', 'Samsung', 'Apple Store'] },
  { match: /(?:home essentials|furniture)/, merchants: ['IKEA', 'Pepperfry', 'Home Centre', 'Urban Ladder', 'Amazon', 'Flipkart'] },
  { match: /(?:movies)/, merchants: ['BookMyShow', 'PVR INOX', 'Cinepolis', 'District by Zomato'] },
  { match: /(?:games)/, merchants: ['Steam', 'PlayStation', 'Xbox', 'Google Play', 'Apple App Store', 'Epic Games'] },
  { match: /(?:subscriptions)/, merchants: ['Netflix', 'Amazon Prime Video', 'Disney+ Hotstar', 'SonyLIV', 'ZEE5', 'Spotify', 'YouTube Premium'] },
  { match: /(?:electricity)/, merchants: ['Electricity Board', 'Tata Power', 'Adani Electricity', 'Torrent Power', 'BSES'] },
  { match: /(?:internet)/, merchants: ['Airtel Xstream', 'JioFiber', 'ACT Fibernet', 'Hathway', 'Tata Play Fiber', 'BSNL Broadband'] },
  { match: /(?:mobile recharge)/, merchants: ['Airtel', 'Jio', 'Vi', 'BSNL', 'Google Pay', 'PhonePe', 'Paytm'] },
  { match: /(?:gas)/, merchants: ['Indane', 'Bharat Gas', 'HP Gas', 'Mahanagar Gas', 'Indraprastha Gas'] },
  { match: /(?:hair cut|beard|shavings|salon|spa|facial|de-tan|massage)/, merchants: ['Urban Company', 'Naturals Salon', 'Lakme Salon', 'Green Trends', 'Jawed Habib', 'Looks Salon', 'Local Salon'] },
];

export const getSubcategoryMerchantSuggestions = (fullName: string): string[] => {
  const normalized = fullName.toLocaleLowerCase();
  const [category = '', leaf = ''] = normalized.split('>').map((part) => part.trim());
  const label = fullName.split('>').pop()?.trim() || 'Merchant';
  const suggestions = subcategoryMerchantRules
    .filter((rule) => rule.match.test(normalized))
    .flatMap((rule) => rule.merchants);

  if (category === 'food & dining') suggestions.push(...(suggestions.length ? [] : ['Zomato', 'Swiggy']), `Local ${label} Restaurant`);
  else if (category === 'groceries' || category === 'fruits') suggestions.push(...(suggestions.length ? [] : ['Blinkit', 'Zepto', 'BigBasket']), `Local ${label} Store`);
  else if (category === 'transport' || category === 'travel') suggestions.push(...(suggestions.length ? [] : ['MakeMyTrip']), `Local ${label} Provider`);
  else suggestions.push(`Local ${leaf || label} Provider`);

  return [...new Map(suggestions.map((value) => [value.toLocaleLowerCase(), value])).values()];
};
