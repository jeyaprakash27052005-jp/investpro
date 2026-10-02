import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import type {
  StockTrade,
  IncomeEntry,
  ExpenseEntry,
  AccountItem,
  JournalRecord,
  FinancialYear,
  PortfolioHolding,
  SyncedDevice,
  UserProfile,
} from '../types';

interface AppContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isAuthLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (updates: {
    displayName?: string;
    photoURL?: string;
    companyName?: string;
    companyAddress?: string;
  }) => Promise<boolean>;

  // Financial Years
  financialYears: FinancialYear[];
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  addFinancialYear: (year: string) => Promise<void>;

  // Trades & Holdings
  trades: StockTrade[];
  addTrade: (trade: Omit<StockTrade, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateTrade: (tradeId: string, trade: Omit<StockTrade, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  deleteTrade: (tradeId: string) => Promise<void>;
  importTrades: (trades: Omit<StockTrade, 'id' | 'userId' | 'createdAt'>[]) => Promise<{ imported: number; skipped: number }>;
  portfolioHoldings: PortfolioHolding[];

  // Incomes & Expenses
  incomes: IncomeEntry[];
  addIncome: (income: Omit<IncomeEntry, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateIncome: (incomeId: string, income: Omit<IncomeEntry, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  deleteIncome: (incomeId: string) => Promise<void>;
  importIncomes: (incomesData: Omit<IncomeEntry, 'id' | 'userId' | 'createdAt'>[]) => Promise<{ imported: number; skipped: number }>;

  expenses: ExpenseEntry[];
  addExpense: (expense: Omit<ExpenseEntry, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateExpense: (expenseId: string, expense: Omit<ExpenseEntry, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  importExpenses: (expensesData: Omit<ExpenseEntry, 'id' | 'userId' | 'createdAt'>[]) => Promise<{ imported: number; skipped: number }>;

  // Accounts & Journal
  accounts: AccountItem[];
  addAccount: (account: Omit<AccountItem, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateAccount: (accountId: string, account: Omit<AccountItem, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  deleteAccount: (accountId: string) => Promise<void>;
  importAccounts: (accountsData: Omit<AccountItem, 'id' | 'userId' | 'createdAt'>[]) => Promise<{ imported: number; skipped: number }>;

  journals: JournalRecord[];
  addJournal: (journal: Omit<JournalRecord, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateJournal: (journalId: string, journal: Omit<JournalRecord, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  deleteJournal: (journalId: string) => Promise<void>;
  importJournals: (journalsData: Omit<JournalRecord, 'id' | 'userId' | 'createdAt'>[]) => Promise<{ imported: number; skipped: number }>;

  // Sync & Presence
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncedAt: Date | null;
  syncedDevices: SyncedDevice[];
  currentDeviceId: string;

  // Backup & Restore
  exportBackup: () => string;
  restoreBackup: (jsonData: string) => Promise<boolean>;

  // Summary Metrics
  summary: {
    totalInvestment: number;
    currentHoldingsCost: number;
    realizedPL: number;
    otherIncome: number;
    totalExpenses: number;
    netProfit: number;
  };
}

const AppContext = createContext<AppContextType | null>(null);

const DEFAULT_YEAR = '2025-2026';
const DEVICE_STORAGE_KEY = 'investpro_device_id';

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_STORAGE_KEY);
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem(DEVICE_STORAGE_KEY, id);
  }
  return id;
}

function detectPlatformName(): { name: string; platform: 'Android' | 'iOS' | 'Web' } {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return { name: 'Android Device (Flutter/Web)', platform: 'Android' };
  if (/iPhone|iPad|iPod/i.test(ua)) return { name: 'Apple iOS (iPhone/iPad)', platform: 'iOS' };
  if (/Mac/i.test(ua)) return { name: 'macOS Workstation', platform: 'Web' };
  if (/Windows/i.test(ua)) return { name: 'Windows Terminal', platform: 'Web' };
  return { name: 'Web Browser Client', platform: 'Web' };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [selectedYear, setSelectedYearState] = useState<string>(DEFAULT_YEAR);

  const [trades, setTrades] = useState<StockTrade[]>([]);
  const [incomes, setIncomes] = useState<IncomeEntry[]>([]);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [journals, setJournals] = useState<JournalRecord[]>([]);
  const [syncedDevices, setSyncedDevices] = useState<SyncedDevice[]>([]);

  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(new Date());
  const currentDeviceId = useMemo(() => getOrCreateDeviceId(), []);

  // Listen to Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setSyncStatus('syncing');
      await signInWithPopup(auth, googleProvider);
      setSyncStatus('synced');
    } catch (error) {
      console.error('Google Sign-in failed:', error);
      setSyncStatus('error');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
      setUser(null);
      setTrades([]);
      setIncomes([]);
      setExpenses([]);
      setAccounts([]);
      setJournals([]);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Real-time Firestore Listeners when authenticated
  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    setSyncStatus('syncing');

    // 1. User profile and initial seed
    const userDocRef = doc(db, 'users', uid);
    const unsubUser = onSnapshot(
      userDocRef,
      async (docSnap) => {
        if (!docSnap.exists()) {
          // Initialize user profile
          const initialProfile: UserProfile = {
            uid,
            email: user.email || 'user@investpro.app',
            displayName: user.displayName || 'Portfolio Manager',
            selectedFinancialYear: DEFAULT_YEAR,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          try {
            await setDoc(userDocRef, initialProfile);
            setUserProfile(initialProfile);
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, `users/${uid}`);
          }
        } else {
          const data = docSnap.data() as UserProfile;
          setUserProfile(data);
          if (data.selectedFinancialYear) {
            setSelectedYearState(data.selectedFinancialYear);
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${uid}`);
      }
    );

    // 2. Financial Years
    const yearsPath = `users/${uid}/financialYears`;
    const unsubYears = onSnapshot(
      collection(db, 'users', uid, 'financialYears'),
      async (snap) => {
        if (snap.empty) {
          // Seed default financial years
          const y1Ref = doc(db, 'users', uid, 'financialYears', '2025-2026');
          const y2Ref = doc(db, 'users', uid, 'financialYears', '2024-2025');
          try {
            await setDoc(y1Ref, {
              userId: uid,
              year: '2025-2026',
              isDefault: true,
              createdAt: new Date().toISOString(),
            });
            await setDoc(y2Ref, {
              userId: uid,
              year: '2024-2025',
              isDefault: false,
              createdAt: new Date().toISOString(),
            });
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, yearsPath);
          }
        } else {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FinancialYear));
          setFinancialYears(list);
        }
        setLastSyncedAt(new Date());
        setSyncStatus('synced');
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, yearsPath);
      }
    );

    // 3. Stock Trades
    const tradesPath = `users/${uid}/trades`;
    const unsubTrades = onSnapshot(
      collection(db, 'users', uid, 'trades'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as StockTrade));
        list.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
        setTrades(list);
        setLastSyncedAt(new Date());
        setSyncStatus('synced');
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, tradesPath);
      }
    );

    // 4. Incomes
    const incomesPath = `users/${uid}/incomes`;
    const unsubIncomes = onSnapshot(
      collection(db, 'users', uid, 'incomes'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as IncomeEntry));
        setIncomes(list);
        setLastSyncedAt(new Date());
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, incomesPath);
      }
    );

    // 5. Expenses
    const expensesPath = `users/${uid}/expenses`;
    const unsubExpenses = onSnapshot(
      collection(db, 'users', uid, 'expenses'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ExpenseEntry));
        setExpenses(list);
        setLastSyncedAt(new Date());
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, expensesPath);
      }
    );

    // 6. Chart of Accounts
    const accountsPath = `users/${uid}/accounts`;
    const unsubAccounts = onSnapshot(
      collection(db, 'users', uid, 'accounts'),
      async (snap) => {
        if (snap.empty) {
          // Seed standard chart-of-accounts structure only - no preset amounts.
          // Every balance, including the Capital Account, starts at zero and is
          // added by the owner/account holder themselves (opening balance edit,
          // a journal voucher, or the Excel/spreadsheet import).
          const defaults: Omit<AccountItem, 'id' | 'userId' | 'createdAt'>[] = [
            { name: 'Trading Bank Account', type: 'Asset', openingBalance: 0 },
            { name: 'Demat Stock Investment', type: 'Asset', openingBalance: 0 },
            { name: 'Capital Account', type: 'Capital', openingBalance: 0 },
            { name: 'Brokerage & Exchange Charges', type: 'Expense', openingBalance: 0 },
            { name: 'Dividend & Short-Term Gains', type: 'Income', openingBalance: 0 },
          ];
          for (const acc of defaults) {
            const accRef = doc(collection(db, 'users', uid, 'accounts'));
            await setDoc(accRef, {
              ...acc,
              userId: uid,
              createdAt: new Date().toISOString(),
            });
          }
        } else {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AccountItem));
          setAccounts(list);
        }
        setLastSyncedAt(new Date());
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, accountsPath);
      }
    );

    // 7. Journals
    const journalsPath = `users/${uid}/journalEntries`;
    const unsubJournals = onSnapshot(
      collection(db, 'users', uid, 'journalEntries'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as JournalRecord));
        setJournals(list);
        setLastSyncedAt(new Date());
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, journalsPath);
      }
    );

    // 8. Synced Devices presence
    const devicesPath = `users/${uid}/syncedDevices`;
    const unsubDevices = onSnapshot(
      collection(db, 'users', uid, 'syncedDevices'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SyncedDevice));
        setSyncedDevices(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, devicesPath);
      }
    );

    // Register this device ping
    const platformInfo = detectPlatformName();
    const myDeviceRef = doc(db, 'users', uid, 'syncedDevices', currentDeviceId);
    const pingDevice = async () => {
      try {
        await setDoc(myDeviceRef, {
          userId: uid,
          deviceId: currentDeviceId,
          deviceName: platformInfo.name,
          platform: platformInfo.platform,
          lastActive: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Device presence ping error:', e);
      }
    };
    pingDevice();
    const interval = setInterval(pingDevice, 30000);

    return () => {
      unsubUser();
      unsubYears();
      unsubTrades();
      unsubIncomes();
      unsubExpenses();
      unsubAccounts();
      unsubJournals();
      unsubDevices();
      clearInterval(interval);
    };
  }, [user, currentDeviceId]);

  // Profile
  const updateUserProfile = async (updates: {
    displayName?: string;
    photoURL?: string;
    companyName?: string;
    companyAddress?: string;
  }): Promise<boolean> => {
    if (!user) return false;
    try {
      setSyncStatus('syncing');
      await setDoc(
        doc(db, 'users', user.uid),
        { ...updates, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      setSyncStatus('synced');
      return true;
    } catch (error) {
      setSyncStatus('error');
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      return false;
    }
  };

  // Financial Year Selection
  const setSelectedYear = async (year: string) => {
    setSelectedYearState(year);
    if (user) {
      try {
        await setDoc(
          doc(db, 'users', user.uid),
          { selectedFinancialYear: year, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  const addFinancialYear = async (yearStr: string) => {
    const cleanYear = yearStr.trim();
    if (!cleanYear || !user) return;
    const yearDocRef = doc(db, 'users', user.uid, 'financialYears', cleanYear);
    try {
      await setDoc(yearDocRef, {
        userId: user.uid,
        year: cleanYear,
        isDefault: false,
        createdAt: new Date().toISOString(),
      });
      setSelectedYear(cleanYear);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/financialYears/${cleanYear}`);
    }
  };

  // Trade Operations
  const addTrade = async (tradeData: Omit<StockTrade, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    const createdAt = new Date().toISOString();
    const path = `users/${user.uid}/trades`;
    try {
      setSyncStatus('syncing');
      const ref = doc(collection(db, 'users', user.uid, 'trades'));
      await setDoc(ref, {
        ...tradeData,
        userId: user.uid,
        createdAt,
      });
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const updateTrade = async (tradeId: string, tradeData: Omit<StockTrade, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    const path = `users/${user.uid}/trades/${tradeId}`;
    try {
      setSyncStatus('syncing');
      await setDoc(doc(db, 'users', user.uid, 'trades', tradeId), { ...tradeData, userId: user.uid }, { merge: true });
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteTrade = async (tradeId: string) => {
    if (!user) return;
    const path = `users/${user.uid}/trades/${tradeId}`;
    try {
      setSyncStatus('syncing');
      await deleteDoc(doc(db, 'users', user.uid, 'trades', tradeId));
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  // Import trades from Excel spreadsheet with duplicate protection
  const importTrades = async (
    newTrades: Omit<StockTrade, 'id' | 'userId' | 'createdAt'>[]
  ): Promise<{ imported: number; skipped: number }> => {
    let imported = 0;
    let skipped = 0;

    // Build existing set of hslRefNo
    const existingRefNos = new Set(
      trades
        .filter((t) => t.financialYear === selectedYear && t.hslRefNo)
        .map((t) => t.hslRefNo)
    );

    const tradesToInsert: Omit<StockTrade, 'id' | 'userId' | 'createdAt'>[] = [];
    for (const t of newTrades) {
      if (t.hslRefNo && existingRefNos.has(t.hslRefNo)) {
        skipped++;
      } else {
        if (t.hslRefNo) existingRefNos.add(t.hslRefNo);
        tradesToInsert.push(t);
        imported++;
      }
    }

    if (tradesToInsert.length === 0) {
      return { imported: 0, skipped };
    }

    if (!user) return { imported: 0, skipped };

    setSyncStatus('syncing');
    try {
      const batch = writeBatch(db);
      const colRef = collection(db, 'users', user.uid, 'trades');
      for (const item of tradesToInsert) {
        const docRef = doc(colRef);
        batch.set(docRef, {
          ...item,
          userId: user.uid,
          createdAt: new Date().toISOString(),
        });
      }
      await batch.commit();
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/trades`);
    }

    return { imported, skipped };
  };

  // Incomes Operations
  const addIncome = async (incData: Omit<IncomeEntry, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    const createdAt = new Date().toISOString();
    const path = `users/${user.uid}/incomes`;
    try {
      setSyncStatus('syncing');
      const ref = doc(collection(db, 'users', user.uid, 'incomes'));
      await setDoc(ref, { ...incData, userId: user.uid, createdAt });
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const updateIncome = async (incomeId: string, incData: Omit<IncomeEntry, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    const path = `users/${user.uid}/incomes/${incomeId}`;
    try {
      setSyncStatus('syncing');
      await setDoc(doc(db, 'users', user.uid, 'incomes', incomeId), { ...incData, userId: user.uid }, { merge: true });
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteIncome = async (incomeId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'incomes', incomeId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/incomes/${incomeId}`);
    }
  };

  // Bulk import incomes from a spreadsheet - each row is placed automatically
  const importIncomes = async (
    newIncomes: Omit<IncomeEntry, 'id' | 'userId' | 'createdAt'>[]
  ): Promise<{ imported: number; skipped: number }> => {
    if (newIncomes.length === 0) return { imported: 0, skipped: 0 };
    if (!user) return { imported: 0, skipped: 0 };

    setSyncStatus('syncing');
    try {
      const batch = writeBatch(db);
      const colRef = collection(db, 'users', user.uid, 'incomes');
      for (const item of newIncomes) {
        const docRef = doc(colRef);
        batch.set(docRef, { ...item, userId: user.uid, createdAt: new Date().toISOString() });
      }
      await batch.commit();
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/incomes`);
    }
    return { imported: newIncomes.length, skipped: 0 };
  };

  // Expense Operations
  const addExpense = async (expData: Omit<ExpenseEntry, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    const createdAt = new Date().toISOString();
    const path = `users/${user.uid}/expenses`;
    try {
      setSyncStatus('syncing');
      const ref = doc(collection(db, 'users', user.uid, 'expenses'));
      await setDoc(ref, { ...expData, userId: user.uid, createdAt });
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const updateExpense = async (expenseId: string, expData: Omit<ExpenseEntry, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    const path = `users/${user.uid}/expenses/${expenseId}`;
    try {
      setSyncStatus('syncing');
      await setDoc(doc(db, 'users', user.uid, 'expenses', expenseId), { ...expData, userId: user.uid }, { merge: true });
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteExpense = async (expenseId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'expenses', expenseId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/expenses/${expenseId}`);
    }
  };

  // Bulk import expenses from a spreadsheet - each row is placed automatically
  const importExpenses = async (
    newExpenses: Omit<ExpenseEntry, 'id' | 'userId' | 'createdAt'>[]
  ): Promise<{ imported: number; skipped: number }> => {
    if (newExpenses.length === 0) return { imported: 0, skipped: 0 };
    if (!user) return { imported: 0, skipped: 0 };

    setSyncStatus('syncing');
    try {
      const batch = writeBatch(db);
      const colRef = collection(db, 'users', user.uid, 'expenses');
      for (const item of newExpenses) {
        const docRef = doc(colRef);
        batch.set(docRef, { ...item, userId: user.uid, createdAt: new Date().toISOString() });
      }
      await batch.commit();
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/expenses`);
    }
    return { imported: newExpenses.length, skipped: 0 };
  };

  // Chart of Accounts Operations
  const addAccount = async (accData: Omit<AccountItem, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    const createdAt = new Date().toISOString();
    const path = `users/${user.uid}/accounts`;
    try {
      setSyncStatus('syncing');
      const ref = doc(collection(db, 'users', user.uid, 'accounts'));
      await setDoc(ref, { ...accData, userId: user.uid, createdAt });
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const updateAccount = async (accountId: string, accData: Omit<AccountItem, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    const path = `users/${user.uid}/accounts/${accountId}`;
    try {
      setSyncStatus('syncing');
      await setDoc(doc(db, 'users', user.uid, 'accounts', accountId), { ...accData, userId: user.uid }, { merge: true });
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteAccount = async (accountId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'accounts', accountId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/accounts/${accountId}`);
    }
  };

  // Bulk import/update ledger accounts from a spreadsheet. An existing account
  // with a matching name is updated in place (so an owner can re-import to
  // refresh balances); a new name is created automatically.
  const importAccounts = async (
    newAccounts: Omit<AccountItem, 'id' | 'userId' | 'createdAt'>[]
  ): Promise<{ imported: number; skipped: number }> => {
    if (!user) return { imported: 0, skipped: 0 };

    let imported = 0;
    let skipped = 0;
    const toCreate: Omit<AccountItem, 'id' | 'userId' | 'createdAt'>[] = [];
    const toUpdate: { id: string; data: Omit<AccountItem, 'id' | 'userId' | 'createdAt'> }[] = [];

    for (const acc of newAccounts) {
      if (!acc.name || !acc.name.trim()) {
        skipped++;
        continue;
      }
      const existing = accounts.find((a) => a.name.trim().toLowerCase() === acc.name.trim().toLowerCase());
      if (existing) {
        toUpdate.push({ id: existing.id, data: acc });
      } else {
        toCreate.push(acc);
      }
      imported++;
    }

    if (toCreate.length > 0 || toUpdate.length > 0) {
      setSyncStatus('syncing');
      try {
        const batch = writeBatch(db);
        const colRef = collection(db, 'users', user.uid, 'accounts');
        for (const item of toCreate) {
          const docRef = doc(colRef);
          batch.set(docRef, { ...item, userId: user.uid, createdAt: new Date().toISOString() });
        }
        for (const item of toUpdate) {
          const docRef = doc(db, 'users', user.uid, 'accounts', item.id);
          batch.set(docRef, { ...item.data, userId: user.uid }, { merge: true });
        }
        await batch.commit();
        setSyncStatus('synced');
      } catch (error) {
        setSyncStatus('error');
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/accounts`);
      }
    }

    return { imported, skipped };
  };

  // Journal Operations
  const addJournal = async (journalData: Omit<JournalRecord, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    const createdAt = new Date().toISOString();
    const path = `users/${user.uid}/journalEntries`;
    try {
      setSyncStatus('syncing');
      const ref = doc(collection(db, 'users', user.uid, 'journalEntries'));
      await setDoc(ref, { ...journalData, userId: user.uid, createdAt });
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const updateJournal = async (journalId: string, journalData: Omit<JournalRecord, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    const path = `users/${user.uid}/journalEntries/${journalId}`;
    try {
      setSyncStatus('syncing');
      await setDoc(doc(db, 'users', user.uid, 'journalEntries', journalId), { ...journalData, userId: user.uid }, { merge: true });
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteJournal = async (journalId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'journalEntries', journalId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/journalEntries/${journalId}`);
    }
  };

  // Bulk import journal vouchers from a spreadsheet - each row is placed
  // automatically once its debit/credit account names are matched.
  const importJournals = async (
    newJournals: Omit<JournalRecord, 'id' | 'userId' | 'createdAt'>[]
  ): Promise<{ imported: number; skipped: number }> => {
    if (newJournals.length === 0) return { imported: 0, skipped: 0 };
    if (!user) return { imported: 0, skipped: 0 };

    setSyncStatus('syncing');
    try {
      const batch = writeBatch(db);
      const colRef = collection(db, 'users', user.uid, 'journalEntries');
      for (const item of newJournals) {
        const docRef = doc(colRef);
        batch.set(docRef, { ...item, userId: user.uid, createdAt: new Date().toISOString() });
      }
      await batch.commit();
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/journalEntries`);
    }
    return { imported: newJournals.length, skipped: 0 };
  };

  // Portfolio Holdings Calculation
  // We process BUY trades and deduct SELL trades to determine currently open positions
  const portfolioHoldings = useMemo(() => {
    const stockMap = new Map<
      string,
      {
        stockName: string;
        exchange: string;
        buyQty: number;
        buyTotalCost: number;
        sellQty: number;
        lastPrice: number;
      }
    >();

    // Sort chronologically ascending to compute inventory accurately
    const sortedTrades = [...trades]
      .filter((t) => t.financialYear === selectedYear)
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

    for (const trade of sortedTrades) {
      const key = `${trade.stockName.toUpperCase().trim()}_${trade.exchange.toUpperCase().trim()}`;
      if (!stockMap.has(key)) {
        stockMap.set(key, {
          stockName: trade.stockName,
          exchange: trade.exchange || 'NSE',
          buyQty: 0,
          buyTotalCost: 0,
          sellQty: 0,
          lastPrice: trade.orderPrice,
        });
      }
      const item = stockMap.get(key)!;
      item.lastPrice = trade.orderPrice || item.lastPrice;

      if (trade.tradeType === 'BUY') {
        const qty = Number(trade.execQty) || 0;
        const price = Number(trade.orderPrice) || 0;
        const brokerage = Number(trade.brokerage) || 0;
        item.buyQty += qty;
        item.buyTotalCost += qty * price + brokerage;
      } else if (trade.tradeType === 'SELL') {
        const qty = Number(trade.execQty) || 0;
        item.sellQty += qty;
      }
    }

    const holdings: PortfolioHolding[] = [];
    stockMap.forEach((val) => {
      const remainingQty = val.buyQty - val.sellQty;
      if (remainingQty > 0) {
        const avgBuyCost = val.buyQty > 0 ? val.buyTotalCost / val.buyQty : 0;
        const totalInvestment = remainingQty * avgBuyCost;
        const currentValue = remainingQty * val.lastPrice;
        const unrealizedPL = currentValue - totalInvestment;

        holdings.push({
          stockName: val.stockName,
          exchange: val.exchange,
          quantity: remainingQty,
          avgBuyCost: Number(avgBuyCost.toFixed(2)),
          totalInvestment: Number(totalInvestment.toFixed(2)),
          lastTradedPrice: val.lastPrice,
          currentValue: Number(currentValue.toFixed(2)),
          unrealizedPL: Number(unrealizedPL.toFixed(2)),
        });
      }
    });

    return holdings.sort((a, b) => b.totalInvestment - a.totalInvestment);
  }, [trades, selectedYear]);

  // Summary Metrics
  const summary = useMemo(() => {
    // Trades in selected year
    const yearTrades = trades.filter((t) => t.financialYear === selectedYear);

    // Total buy executions cost
    const totalBuyInvestment = yearTrades
      .filter((t) => t.tradeType === 'BUY')
      .reduce((sum, t) => sum + (Number(t.execQty) * Number(t.orderPrice) + (Number(t.brokerage) || 0)), 0);

    // Current holdings cost
    const currentHoldingsCost = portfolioHoldings.reduce((sum, h) => sum + h.totalInvestment, 0);

    // Realized P/L from SELL trades
    const realizedPL = yearTrades
      .filter((t) => t.tradeType === 'SELL')
      .reduce((sum, t) => sum + (Number(t.realizedPL) || 0), 0);

    // Other income
    const otherIncome = incomes
      .filter((i) => i.financialYear === selectedYear)
      .reduce((sum, i) => sum + Number(i.amount || 0), 0);

    // Total expenses
    const totalExpenses = expenses
      .filter((e) => e.financialYear === selectedYear)
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const netProfit = realizedPL + otherIncome - totalExpenses;

    return {
      totalInvestment: Number(totalBuyInvestment.toFixed(2)),
      currentHoldingsCost: Number(currentHoldingsCost.toFixed(2)),
      realizedPL: Number(realizedPL.toFixed(2)),
      otherIncome: Number(otherIncome.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
    };
  }, [trades, portfolioHoldings, incomes, expenses, selectedYear]);

  // Export all data to JSON
  const exportBackup = (): string => {
    const backupData = {
      exportTimestamp: new Date().toISOString(),
      financialYears,
      trades,
      incomes,
      expenses,
      accounts,
      journals,
      selectedYear,
    };
    return JSON.stringify(backupData, null, 2);
  };

  // Restore data from JSON
  const restoreBackup = async (jsonData: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const data = JSON.parse(jsonData);
      if (!data || typeof data !== 'object') throw new Error('Invalid JSON format');

      setSyncStatus('syncing');
      const batch = writeBatch(db);

      if (Array.isArray(data.trades)) {
        for (const t of data.trades) {
          const { id, ...rest } = t;
          const ref = doc(collection(db, 'users', user.uid, 'trades'));
          batch.set(ref, { ...rest, userId: user.uid, createdAt: new Date().toISOString() });
        }
      }
      if (Array.isArray(data.incomes)) {
        for (const i of data.incomes) {
          const { id, ...rest } = i;
          const ref = doc(collection(db, 'users', user.uid, 'incomes'));
          batch.set(ref, { ...rest, userId: user.uid, createdAt: new Date().toISOString() });
        }
      }
      if (Array.isArray(data.expenses)) {
        for (const e of data.expenses) {
          const { id, ...rest } = e;
          const ref = doc(collection(db, 'users', user.uid, 'expenses'));
          batch.set(ref, { ...rest, userId: user.uid, createdAt: new Date().toISOString() });
        }
      }
      if (Array.isArray(data.accounts)) {
        for (const a of data.accounts) {
          const { id, ...rest } = a;
          const ref = doc(collection(db, 'users', user.uid, 'accounts'));
          batch.set(ref, { ...rest, userId: user.uid, createdAt: new Date().toISOString() });
        }
      }
      if (Array.isArray(data.journals)) {
        for (const j of data.journals) {
          const { id, ...rest } = j;
          const ref = doc(collection(db, 'users', user.uid, 'journalEntries'));
          batch.set(ref, { ...rest, userId: user.uid, createdAt: new Date().toISOString() });
        }
      }
      await batch.commit();
      setSyncStatus('synced');
      return true;
    } catch (e) {
      setSyncStatus('error');
      console.error('Failed to restore backup:', e);
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        userProfile,
        isAuthLoading,
        signInWithGoogle,
        signOut,
        updateUserProfile,
        financialYears,
        selectedYear,
        setSelectedYear,
        addFinancialYear,
        trades,
        addTrade,
        updateTrade,
        deleteTrade,
        importTrades,
        portfolioHoldings,
        incomes,
        addIncome,
        updateIncome,
        deleteIncome,
        importIncomes,
        expenses,
        addExpense,
        updateExpense,
        deleteExpense,
        importExpenses,
        accounts,
        addAccount,
        updateAccount,
        deleteAccount,
        importAccounts,
        journals,
        addJournal,
        updateJournal,
        deleteJournal,
        importJournals,
        syncStatus,
        lastSyncedAt,
        syncedDevices,
        currentDeviceId,
        exportBackup,
        restoreBackup,
        summary,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
