import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database categories...");

  const legacyFruitsCategory = await prisma.category.findUnique({
    where: { name: "Food & Dining > Fruits" },
  });
  const fruitsCategory = await prisma.category.findUnique({
    where: { name: "Fruits" },
  });
  if (legacyFruitsCategory && !fruitsCategory) {
    await prisma.category.update({
      where: { id: legacyFruitsCategory.id },
      data: { name: "Fruits", parentId: null },
    });
  }

  const legacyMetroBusCategory = await prisma.category.findUnique({
    where: { name: "Transport > Metro / Bus" },
  });
  const busCategory = await prisma.category.findUnique({
    where: { name: "Transport > Bus" },
  });
  if (legacyMetroBusCategory && !busCategory) {
    await prisma.category.update({
      where: { id: legacyMetroBusCategory.id },
      data: { name: "Transport > Bus", icon: "bus", color: "#0284C7" },
    });
  }

  const systemCategories = [
    {
      name: "Food & Dining",
      icon: "utensils",
      color: "#FF5733",
      isSystem: true,
    },
    { name: "Fruits", icon: "apple", color: "#F97316", isSystem: true },
    { name: "Home", icon: "house", color: "#60A5FA", isSystem: true },
    { name: "Family Support", icon: "heart-handshake", color: "#EC4899", isSystem: true },
    {
      name: "Groceries",
      icon: "shopping-cart",
      color: "#33FF57",
      isSystem: true,
    },
    { name: "Rent & Housing", icon: "home", color: "#3357FF", isSystem: true },
    { name: "Utilities", icon: "bolt", color: "#F3FF33", isSystem: true },
    { name: "Transport", icon: "car", color: "#FF33F5", isSystem: true },
    { name: "Travel", icon: "map", color: "#8B5CF6", isSystem: true },
    { name: "Shopping", icon: "bag", color: "#33FFF5", isSystem: true },
    { name: "Entertainment", icon: "film", color: "#A533FF", isSystem: true },
    {
      name: "Health & Medical",
      icon: "heart",
      color: "#FF3333",
      isSystem: true,
    },
    {
      name: "Education Loan",
      icon: "graduation-cap",
      color: "#8E44AD",
      isSystem: true,
    },
    { name: "Salary", icon: "wallet", color: "#2ECC71", isSystem: true },
    { name: "Pocket Allowance", icon: "gift", color: "#F59E0B", isSystem: true },
    { name: "Self Grooming", icon: "scissors", color: "#EC4899", isSystem: true },
    { name: "Miscellaneous", icon: "tag", color: "#64748B", isSystem: true },
    {
      name: "Salary & Income",
      icon: "wallet",
      color: "#2ECC71",
      isSystem: true,
    },
    {
      name: "Transfer",
      icon: "arrow-right-left",
      color: "#95A5A6",
      isSystem: true,
    },
    { name: "Other", icon: "tag", color: "#7F8C8D", isSystem: true },
  ];

  for (const cat of systemCategories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  const subcategories = [
    { parentName: "Fruits", name: "Fruits > Apple", icon: "apple", color: "#EF4444" },
    { parentName: "Fruits", name: "Fruits > Banana", icon: "banana", color: "#EAB308" },
    { parentName: "Fruits", name: "Fruits > Mango", icon: "citrus", color: "#F59E0B" },
    { parentName: "Fruits", name: "Fruits > Orange", icon: "citrus", color: "#F97316" },
    { parentName: "Fruits", name: "Fruits > Grapes", icon: "grape", color: "#7C3AED" },
    { parentName: "Fruits", name: "Fruits > Watermelon", icon: "slice", color: "#F43F5E" },
    { parentName: "Fruits", name: "Fruits > Papaya", icon: "citrus", color: "#FB923C" },
    { parentName: "Fruits", name: "Fruits > Guava", icon: "apple", color: "#65A30D" },
    { parentName: "Fruits", name: "Fruits > Pomegranate", icon: "cherry", color: "#BE123C" },
    { parentName: "Fruits", name: "Fruits > Pineapple", icon: "citrus", color: "#CA8A04" },
    { parentName: "Fruits", name: "Fruits > Seasonal Fruits", icon: "basket", color: "#16A34A" },
    { parentName: "Fruits", name: "Fruits > Muskmelon", icon: "slice", color: "#FB923C" },
    { parentName: "Fruits", name: "Fruits > Sapota", icon: "apple", color: "#92400E" },
    { parentName: "Fruits", name: "Fruits > Custard Apple", icon: "apple", color: "#84CC16" },
    { parentName: "Fruits", name: "Fruits > Jamun", icon: "grape", color: "#4C1D95" },
    { parentName: "Fruits", name: "Fruits > Litchi", icon: "cherry", color: "#DC2626" },
    { parentName: "Fruits", name: "Fruits > Kiwi", icon: "citrus", color: "#16A34A" },
    { parentName: "Fruits", name: "Fruits > Dragon Fruit", icon: "citrus", color: "#E11D48" },
    { parentName: "Fruits", name: "Fruits > Dates", icon: "cherry", color: "#7C2D12" },
    { parentName: "Fruits", name: "Fruits > Pear", icon: "apple", color: "#65A30D" },
    { parentName: "Fruits", name: "Fruits > Sweet Lime", icon: "citrus", color: "#CA8A04" },
    { parentName: "Food & Dining", name: "Food & Dining > Groceries", icon: "shopping-basket", color: "#84CC16" },
    { parentName: "Food & Dining", name: "Food & Dining > Snacks", icon: "cookie", color: "#F59E0B" },
    { parentName: "Food & Dining", name: "Food & Dining > Biryani", icon: "utensils", color: "#F97316" },
    { parentName: "Food & Dining", name: "Food & Dining > North Indian Thali", icon: "utensils", color: "#B45309" },
    { parentName: "Food & Dining", name: "Food & Dining > South Indian Meals", icon: "utensils", color: "#0F766E" },
    { parentName: "Food & Dining", name: "Food & Dining > Dosa & Idli", icon: "utensils", color: "#0D9488" },
    { parentName: "Food & Dining", name: "Food & Dining > Parotta & Kurma", icon: "utensils", color: "#92400E" },
    { parentName: "Food & Dining", name: "Food & Dining > Dal & Roti", icon: "utensils", color: "#A16207" },
    { parentName: "Food & Dining", name: "Food & Dining > Paneer Specials", icon: "utensils", color: "#D97706" },
    { parentName: "Food & Dining", name: "Food & Dining > Chaat", icon: "utensils", color: "#EA580C" },
    { parentName: "Food & Dining", name: "Food & Dining > Tiffin", icon: "utensils", color: "#0E7490" },
    { parentName: "Food & Dining", name: "Food & Dining > Punjabi Meals", icon: "utensils", color: "#B45309" },
    { parentName: "Food & Dining", name: "Food & Dining > Chole Bhature", icon: "utensils", color: "#C2410C" },
    { parentName: "Food & Dining", name: "Food & Dining > Rajma Chawal", icon: "utensils", color: "#9A3412" },
    { parentName: "Food & Dining", name: "Food & Dining > Paratha Combos", icon: "utensils", color: "#A16207" },
    { parentName: "Food & Dining", name: "Food & Dining > Tandoori Dishes", icon: "utensils", color: "#7C2D12" },
    { parentName: "Food & Dining", name: "Food & Dining > Kebab Platters", icon: "utensils", color: "#991B1B" },
    { parentName: "Food & Dining", name: "Food & Dining > Appam & Stew", icon: "utensils", color: "#0F766E" },
    { parentName: "Food & Dining", name: "Food & Dining > Puttu & Kadala", icon: "utensils", color: "#0D9488" },
    { parentName: "Food & Dining", name: "Food & Dining > Uttapam", icon: "utensils", color: "#0E7490" },
    { parentName: "Food & Dining", name: "Food & Dining > Pongal", icon: "utensils", color: "#0F766E" },
    { parentName: "Food & Dining", name: "Food & Dining > Andhra Meals", icon: "utensils", color: "#0C4A6E" },
    { parentName: "Food & Dining", name: "Food & Dining > Chettinad", icon: "utensils", color: "#155E75" },
    { parentName: "Food & Dining", name: "Food & Dining > Lemon Rice", icon: "utensils", color: "#0D9488" },
    { parentName: "Food & Dining", name: "Food & Dining > Curd Rice", icon: "utensils", color: "#0369A1" },
    { parentName: "Food & Dining", name: "Food & Dining > Vegetarian", icon: "leaf", color: "#22C55E" },
    { parentName: "Food & Dining", name: "Food & Dining > Chicken", icon: "drumstick", color: "#DC2626" },
    { parentName: "Food & Dining", name: "Food & Dining > Rice Meals", icon: "utensils", color: "#D97706" },
    { parentName: "Food & Dining", name: "Food & Dining > Roti & Curry", icon: "utensils", color: "#B45309" },
    { parentName: "Food & Dining", name: "Food & Dining > Breakfast", icon: "coffee", color: "#F59E0B" },
    { parentName: "Food & Dining", name: "Food & Dining > Tea & Coffee", icon: "coffee", color: "#92400E" },
    { parentName: "Food & Dining", name: "Food & Dining > Juice", icon: "glass-water", color: "#F97316" },
    { parentName: "Food & Dining", name: "Food & Dining > Sweets & Desserts", icon: "ice-cream-bowl", color: "#EC4899" },
    { parentName: "Food & Dining", name: "Food & Dining > Bakery", icon: "croissant", color: "#D97706" },
    { parentName: "Food & Dining", name: "Food & Dining > Fast Food", icon: "sandwich", color: "#EA580C" },
    { parentName: "Food & Dining", name: "Food & Dining > Seafood", icon: "fish", color: "#0284C7" },
    { parentName: "Food & Dining", name: "Food & Dining > Mutton", icon: "utensils", color: "#991B1B" },
    { parentName: "Food & Dining", name: "Food & Dining > Eggs", icon: "egg", color: "#EAB308" },
    { parentName: "Food & Dining", name: "Food & Dining > Dining Out", icon: "utensils", color: "#EF4444" },
    { parentName: "Groceries", name: "Groceries > Tomato", icon: "cherry", color: "#EF4444" },
    { parentName: "Groceries", name: "Groceries > Potato", icon: "circle", color: "#A16207" },
    { parentName: "Groceries", name: "Groceries > Onion", icon: "circle", color: "#A855F7" },
    { parentName: "Groceries", name: "Groceries > Leafy Vegetables", icon: "leaf", color: "#16A34A" },
    { parentName: "Groceries", name: "Groceries > Root Vegetables", icon: "carrot", color: "#EA580C" },
    { parentName: "Groceries", name: "Groceries > Beans & Peas", icon: "sprout", color: "#65A30D" },
    { parentName: "Groceries", name: "Groceries > Gourds", icon: "salad", color: "#22C55E" },
    { parentName: "Groceries", name: "Groceries > Cauliflower & Cabbage", icon: "flower-2", color: "#E5E7EB" },
    { parentName: "Groceries", name: "Groceries > Carrot & Beetroot", icon: "carrot", color: "#DC2626" },
    { parentName: "Groceries", name: "Groceries > Herbs & Spices", icon: "sprout", color: "#059669" },
    { parentName: "Groceries", name: "Groceries > Rice", icon: "package", color: "#D97706" },
    { parentName: "Groceries", name: "Groceries > Wheat Flour (Atta)", icon: "package", color: "#B45309" },
    { parentName: "Groceries", name: "Groceries > Pulses & Dal", icon: "beans", color: "#A16207" },
    { parentName: "Groceries", name: "Groceries > Cooking Oil & Ghee", icon: "droplets", color: "#F59E0B" },
    { parentName: "Groceries", name: "Groceries > Salt & Sugar", icon: "package", color: "#94A3B8" },
    { parentName: "Groceries", name: "Groceries > Milk", icon: "milk", color: "#38BDF8" },
    { parentName: "Groceries", name: "Groceries > Curd & Yogurt", icon: "milk", color: "#0EA5E9" },
    { parentName: "Groceries", name: "Groceries > Paneer & Cheese", icon: "circle", color: "#60A5FA" },
    { parentName: "Groceries", name: "Groceries > Eggs", icon: "egg", color: "#EAB308" },
    { parentName: "Groceries", name: "Groceries > Chicken", icon: "drumstick", color: "#DC2626" },
    { parentName: "Groceries", name: "Groceries > Fish & Seafood", icon: "fish", color: "#0284C7" },
    { parentName: "Groceries", name: "Groceries > Frozen Foods", icon: "snowflake", color: "#67E8F9" },
    { parentName: "Groceries", name: "Groceries > Bread & Bakery", icon: "croissant", color: "#F97316" },
    { parentName: "Groceries", name: "Groceries > Breakfast Cereals", icon: "bowl", color: "#FB923C" },
    { parentName: "Groceries", name: "Groceries > Dry Fruits & Nuts", icon: "nut", color: "#92400E" },
    { parentName: "Groceries", name: "Groceries > Snacks & Namkeen", icon: "cookie", color: "#F59E0B" },
    { parentName: "Groceries", name: "Groceries > Biscuits", icon: "cookie", color: "#D97706" },
    { parentName: "Groceries", name: "Groceries > Beverages", icon: "cup-soda", color: "#22D3EE" },
    { parentName: "Groceries", name: "Groceries > Tea & Coffee", icon: "coffee", color: "#92400E" },
    { parentName: "Groceries", name: "Groceries > Cleaning Supplies", icon: "spray-can", color: "#38BDF8" },
    { parentName: "Groceries", name: "Groceries > Laundry & Detergent", icon: "shirt", color: "#0EA5E9" },
    { parentName: "Groceries", name: "Groceries > Personal Care", icon: "sparkles", color: "#EC4899" },
    { parentName: "Groceries", name: "Groceries > Baby Care", icon: "baby", color: "#A78BFA" },
    { parentName: "Groceries", name: "Groceries > Pet Supplies", icon: "paw-print", color: "#14B8A6" },
    { parentName: "Groceries", name: "Groceries > Online Grocery", icon: "shopping-cart", color: "#22C55E" },
    { parentName: "Groceries", name: "Groceries > Supermarket", icon: "store", color: "#10B981" },
    { parentName: "Transport", name: "Transport > Office Commute", icon: "briefcase", color: "#6366F1" },
    { parentName: "Transport", name: "Transport > Fuel", icon: "car", color: "#F97316" },
    { parentName: "Transport", name: "Transport > Metro", icon: "train", color: "#0EA5E9" },
    { parentName: "Transport", name: "Transport > Bus", icon: "bus", color: "#0284C7" },
    { parentName: "Transport", name: "Transport > Train", icon: "train", color: "#2563EB" },
    { parentName: "Transport", name: "Transport > Flight", icon: "plane", color: "#0EA5E9" },
    { parentName: "Transport", name: "Transport > Auto / Taxi", icon: "car", color: "#3B82F6" },
    { parentName: "Transport", name: "Transport > Parking", icon: "circle", color: "#64748B" },
    { parentName: "Transport", name: "Transport > Toll", icon: "circle", color: "#8B5CF6" },
    { parentName: "Transport", name: "Transport > Vehicle Service", icon: "wrench", color: "#334155" },
    { parentName: "Transport", name: "Transport > Ride Share", icon: "car", color: "#0EA5E9" },
    { parentName: "Transport", name: "Transport > Bike Taxi", icon: "bike", color: "#06B6D4" },
    { parentName: "Transport", name: "Transport > Car Rental", icon: "car", color: "#3B82F6" },
    { parentName: "Transport", name: "Transport > Intercity Bus", icon: "bus", color: "#0284C7" },
    { parentName: "Transport", name: "Transport > Local Train", icon: "train", color: "#1D4ED8" },
    { parentName: "Transport", name: "Transport > Airport Transfer", icon: "plane", color: "#38BDF8" },
    { parentName: "Transport", name: "Transport > EV Charging", icon: "zap", color: "#22C55E" },
    { parentName: "Transport", name: "Transport > Car Wash", icon: "droplets", color: "#0EA5E9" },
    { parentName: "Transport", name: "Transport > Vehicle Insurance", icon: "shield", color: "#6366F1" },
    { parentName: "Transport", name: "Transport > Bike Maintenance", icon: "wrench", color: "#14B8A6" },
    { parentName: "Transport", name: "Transport > Traffic Fine", icon: "badge-alert", color: "#EF4444" },
    { parentName: "Transport", name: "Transport > Outstation Travel", icon: "map", color: "#8B5CF6" },
    { parentName: "Transport", name: "Transport > Lodging", icon: "hotel", color: "#7C3AED" },
    { parentName: "Transport", name: "Transport > Trip Meals", icon: "utensils", color: "#F97316" },
    { parentName: "Transport", name: "Transport > Luggage", icon: "briefcase", color: "#475569" },
    { parentName: "Travel", name: "Travel > Office Commute", icon: "briefcase", color: "#6366F1" },
    { parentName: "Travel", name: "Travel > Flight", icon: "plane", color: "#0EA5E9" },
    { parentName: "Travel", name: "Travel > Train", icon: "train", color: "#2563EB" },
    { parentName: "Travel", name: "Travel > Intercity Bus", icon: "bus", color: "#0284C7" },
    { parentName: "Travel", name: "Travel > Taxi / Cab", icon: "car", color: "#3B82F6" },
    { parentName: "Travel", name: "Travel > Metro", icon: "train", color: "#06B6D4" },
    { parentName: "Travel", name: "Travel > Toll", icon: "circle", color: "#8B5CF6" },
    { parentName: "Travel", name: "Travel > Parking", icon: "circle", color: "#64748B" },
    { parentName: "Travel", name: "Travel > Hotel / Stay", icon: "hotel", color: "#7C3AED" },
    { parentName: "Travel", name: "Travel > Trip Meals", icon: "utensils", color: "#F97316" },
    { parentName: "Travel", name: "Travel > Sightseeing", icon: "map", color: "#A855F7" },
    { parentName: "Travel", name: "Travel > Visa / Documents", icon: "file-text", color: "#4F46E5" },
    { parentName: "Travel", name: "Travel > Travel Insurance", icon: "shield", color: "#6366F1" },
    { parentName: "Travel", name: "Travel > Luggage", icon: "briefcase", color: "#475569" },
    { parentName: "Health & Medical", name: "Health & Medical > Doctor Visit", icon: "heart", color: "#EF4444" },
    { parentName: "Health & Medical", name: "Health & Medical > Medicines", icon: "heart", color: "#F43F5E" },
    { parentName: "Health & Medical", name: "Health & Medical > Lab Tests", icon: "heart", color: "#E11D48" },
    { parentName: "Health & Medical", name: "Health & Medical > Health Insurance", icon: "heart", color: "#BE123C" },
    { parentName: "Health & Medical", name: "Health & Medical > Emergency Care", icon: "heart", color: "#991B1B" },
    { parentName: "Shopping", name: "Shopping > Clothing", icon: "bag", color: "#06B6D4" },
    { parentName: "Shopping", name: "Shopping > Footwear", icon: "bag", color: "#0EA5E9" },
    { parentName: "Shopping", name: "Shopping > Accessories", icon: "bag", color: "#0284C7" },
    { parentName: "Shopping", name: "Shopping > Electronics", icon: "bag", color: "#2563EB" },
    { parentName: "Shopping", name: "Shopping > Home Essentials", icon: "bag", color: "#1D4ED8" },
    { parentName: "Entertainment", name: "Entertainment > Movies", icon: "film", color: "#A855F7" },
    { parentName: "Entertainment", name: "Entertainment > Outings", icon: "film", color: "#9333EA" },
    { parentName: "Entertainment", name: "Entertainment > Events", icon: "film", color: "#7E22CE" },
    { parentName: "Entertainment", name: "Entertainment > Games", icon: "film", color: "#6D28D9" },
    { parentName: "Entertainment", name: "Entertainment > Subscriptions", icon: "film", color: "#5B21B6" },
    { parentName: "Utilities", name: "Utilities > Electricity", icon: "bolt", color: "#EAB308" },
    { parentName: "Utilities", name: "Utilities > Water", icon: "bolt", color: "#38BDF8" },
    { parentName: "Utilities", name: "Utilities > Gas", icon: "bolt", color: "#F59E0B" },
    { parentName: "Utilities", name: "Utilities > Internet", icon: "bolt", color: "#2563EB" },
    { parentName: "Utilities", name: "Utilities > Mobile Recharge", icon: "bolt", color: "#0EA5E9" },
    { parentName: "Salary & Income", name: "Salary & Income > Monthly Salary", icon: "wallet", color: "#22C55E" },
    { parentName: "Salary & Income", name: "Salary & Income > Bonus", icon: "wallet", color: "#16A34A" },
    { parentName: "Salary & Income", name: "Salary & Income > Incentive", icon: "wallet", color: "#15803D" },
    { parentName: "Pocket Allowance", name: "Pocket Allowance > Family Allowance", icon: "gift", color: "#F59E0B" },
    { parentName: "Pocket Allowance", name: "Pocket Allowance > Personal Allowance", icon: "gift", color: "#D97706" },
    { parentName: "Education Loan", name: "Education Loan > EMI Payment", icon: "graduation-cap", color: "#8E44AD" },
    { parentName: "Education Loan", name: "Education Loan > Interest Payment", icon: "graduation-cap", color: "#7E22CE" },
    { parentName: "Miscellaneous", name: "Miscellaneous > Others", icon: "tag", color: "#64748B" },
    { parentName: "Home", name: "Home > Rent", icon: "house", color: "#3B82F6" },
    { parentName: "Home", name: "Home > Utilities", icon: "bolt", color: "#EAB308" },
    { parentName: "Home", name: "Home > Maintenance", icon: "wrench", color: "#64748B" },
    { parentName: "Home", name: "Home > Furniture", icon: "armchair", color: "#A16207" },
    { parentName: "Family Support", name: "Family Support > Parents", icon: "heart", color: "#EC4899" },
    { parentName: "Family Support", name: "Family Support > Siblings", icon: "users", color: "#8B5CF6" },
    { parentName: "Family Support", name: "Family Support > Relatives", icon: "hand-heart", color: "#F43F5E" },
    { parentName: "Family Support", name: "Family Support > Household Support", icon: "house-heart", color: "#0EA5E9" },
    { parentName: "Self Grooming", name: "Self Grooming > Shavings", icon: "scissors", color: "#06B6D4" },
    { parentName: "Self Grooming", name: "Self Grooming > Hair Cut", icon: "scissors", color: "#8B5CF6" },
    { parentName: "Self Grooming", name: "Self Grooming > De-tan", icon: "sparkles", color: "#F59E0B" },
    { parentName: "Self Grooming", name: "Self Grooming > Facial & Cleanup", icon: "sparkles", color: "#EC4899" },
    { parentName: "Self Grooming", name: "Self Grooming > Head Massage", icon: "smile", color: "#10B981" },
    { parentName: "Self Grooming", name: "Self Grooming > Beard Grooming", icon: "scissors", color: "#3B82F6" },
    { parentName: "Self Grooming", name: "Self Grooming > Salon & Spa", icon: "sparkles", color: "#A855F7" },
  ];

  for (const subcategory of subcategories) {
    const parent = await prisma.category.findUnique({ where: { name: subcategory.parentName } });
    if (!parent) continue;
    const { parentName, ...categoryData } = subcategory;

    await prisma.category.upsert({
      where: { name: categoryData.name },
      update: { parentId: parent.id },
      create: { ...categoryData, parentId: parent.id, isSystem: true },
    });
  }

  console.log("Seeding default accounts with 0 initial balance...");
  const defaultAccounts = [
    {
      name: "Primary Bank Account (Axis)",
      type: "BANK_ACCOUNT",
      institution: "Axis Bank",
      currentBalance: 0,
    },
    {
      name: "Secondary Bank Account (SBI)",
      type: "BANK_ACCOUNT",
      institution: "SBI",
      currentBalance: 0,
    },
    {
      name: "Axis MY ZONE Credit Card",
      type: "CREDIT_CARD",
      institution: "Axis Bank",
      currentBalance: 0,
      creditLimit: 100000,
      statementAmount: 0,
      minimumPayment: 0,
      paymentDueDay: 9,
    },
    {
      name: "Cash Wallet",
      type: "CASH",
      currentBalance: 0,
    },
    {
      name: "GPay / PhonePe (UPI)",
      type: "UPI",
      institution: "UPI",
      currentBalance: 0,
    },
    {
      name: "Amazon Pay Wallet",
      type: "AMAZON_PAY",
      institution: "Amazon Pay",
      currentBalance: 0,
    },
    {
      name: "Pocket APP ICICI",
      type: "UPI",
      institution: "ICICI Bank",
      currentBalance: 0,
      includeInTotalBalance: false,
    }
  ];

  for (const acc of defaultAccounts) {
    const existing = await prisma.account.findFirst({
      where: { name: acc.name },
    });
    if (!existing) {
      await prisma.account.create({ data: acc });
    } else if (acc.name === "Pocket APP ICICI") {
      await prisma.account.update({
        where: { id: existing.id },
        data: { includeInTotalBalance: false },
      });
    }
  }

  console.log("Seeding default user...");
  const existingUser = await prisma.user.findFirst({
    where: { username: "Hamzah" },
  });
  if (!existingUser) {
    await prisma.user.create({
      data: {
        username: "Hamzah",
        password: "Hamzah987",
        name: "Hamzah",
      },
    });
  } else {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { password: "Hamzah987", name: "Hamzah" },
    });
  }

  console.log("Database seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
