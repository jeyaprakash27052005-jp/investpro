export type TradeType = 'BUY' | 'SELL';
export type OrderType = 'MKT' | 'LMT' | 'SL' | 'SL-M';
export type ProductType = 'Cash' | 'Intraday' | 'Delivery' | 'Margin';
export type AccountType = 'Asset' | 'Liability' | 'Capital' | 'Income' | 'Expense';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  selectedFinancialYear: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialYear {
  id: string;
  userId: string;
  year: string; // e.g. "2025-2026"
  startDate?: string;
  endDate?: string;
  isDefault?: boolean;
  createdAt: string;
}

export interface StockTrade {
  id: string;
  userId: string;
  financialYear: string;
  tradeType: TradeType;
  dateTime: string;
  stockName: string;
  exchange: string; // 'NSE' | 'BSE'
  orderQty: number;
  execQty: number;
  disclQty: number;
  orderPrice: number;
  triggerPrice: number;
  orderType: OrderType;
  product: ProductType;
  brokerage: number;
  status: string;
  reason: string;
  hslRefNo?: string;
  sellCost?: number; // for SELL
  realizedPL?: number; // for SELL
  createdAt: string;
}

export interface PortfolioHolding {
  stockName: string;
  exchange: string;
  quantity: number;
  avgBuyCost: number;
  totalInvestment: number;
  lastTradedPrice?: number;
  currentValue?: number;
  unrealizedPL?: number;
}

export interface IncomeEntry {
  id: string;
  userId: string;
  financialYear: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  createdAt: string;
}

export interface ExpenseEntry {
  id: string;
  userId: string;
  financialYear: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  createdAt: string;
}

export interface AccountItem {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  createdAt: string;
}

export interface JournalRecord {
  id: string;
  userId: string;
  financialYear: string;
  date: string;
  debitAccountId: string;
  debitAccountName: string;
  creditAccountId: string;
  creditAccountName: string;
  amount: number;
  narration: string;
  createdAt: string;
}

export interface SyncedDevice {
  id: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  platform: 'Android' | 'iOS' | 'Web' | 'Flutter App';
  lastActive: string;
}

export type ActivePage =
  | 'dashboard'
  | 'buy'
  | 'sell'
  | 'import'
  | 'portfolio'
  | 'income'
  | 'expense'
  | 'accounts'
  | 'journal'
  | 'reports'
  | 'backup'
  | 'profile';
