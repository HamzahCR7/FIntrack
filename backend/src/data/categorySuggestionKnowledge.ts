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
