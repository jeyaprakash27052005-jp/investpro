import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';
import { formatCurrency, getTodayLocalISO, getNowLocalISODateTime } from '../utils/formatters';
import type { StockTrade, TradeType, OrderType, ProductType, AccountType } from '../types';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle,
  AlertTriangle,
  FileCheck,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Info,
  TrendingUp,
  PiggyBank,
  Receipt,
  ArrowRightLeft,
  BookOpen,
} from 'lucide-react';

type ImportType = 'trades' | 'income' | 'expense' | 'journal' | 'accounts';

interface TradeRowPreview {
  stockName: string;
  dateTime: string;
  tradeType: TradeType;
  exchange: string;
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
  hslRefNo: string;
  isDuplicate: boolean;
}

interface IncomeExpenseRowPreview {
  date: string;
  category: string;
  description: string;
  amount: number;
  isDuplicate: boolean;
}

interface JournalRowPreview {
  date: string;
  dueDate?: string;
  exchange?: string;
  segment?: string;
  voucherType?: string;
  voucherNo?: string;
  billNo?: string;
  debitAccountName: string;
  creditAccountName: string;
  debitAccountId: string;
  creditAccountId: string;
  amount: number;
  narration: string;
  isDuplicate: boolean; // used to mean "invalid / unmatched account" here
  errorText?: string;
}

interface AccountRowPreview {
  name: string;
  type: AccountType;
  openingBalance: number;
  isDuplicate: boolean; // means "will update the existing account of this name"
}

const IMPORT_TABS: { id: ImportType; label: string; icon: React.ReactNode; accept: string }[] = [
  { id: 'trades', label: 'Trades', icon: <TrendingUp size={14} />, accept: '.xlsx,.xls,.xlsb,.csv,.ods' },
  { id: 'income', label: 'Income', icon: <PiggyBank size={14} />, accept: '.xlsx,.xls,.xlsb,.csv,.ods' },
  { id: 'expense', label: 'Expenses', icon: <Receipt size={14} />, accept: '.xlsx,.xls,.xlsb,.csv,.ods' },
  { id: 'journal', label: 'Journal Vouchers', icon: <ArrowRightLeft size={14} />, accept: '.xlsx,.xls,.xlsb,.csv,.ods' },
  { id: 'accounts', label: 'Ledger Accounts', icon: <BookOpen size={14} />, accept: '.xlsx,.xls,.xlsb,.csv,.ods' },
];

export const ExcelImportView: React.FC = () => {
  const {
    importTrades,
    importIncomes,
    importExpenses,
    importJournals,
    importAccounts,
    selectedYear,
    trades,
    accounts,
  } = useApp();

  const [importType, setImportType] = useState<ImportType>('trades');
  const [file, setFile] = useState<File | null>(null);
  const [importAction, setImportAction] = useState<'AUTO' | 'BUY' | 'SELL'>('AUTO');
  // Used only for journal files shaped like a single-account ledger export
  // (Dr Amount / Cr Amount columns, no Debit/Credit Account name columns) —
  // tells the importer which Chart of Accounts entry the statement belongs
  // to, and which account to post the other side of each voucher to.
  const [journalLedgerAccountId, setJournalLedgerAccountId] = useState('');
  const [journalContraAccountId, setJournalContraAccountId] = useState('');

  const [tradeRows, setTradeRows] = useState<TradeRowPreview[]>([]);
  const [incExpRows, setIncExpRows] = useState<IncomeExpenseRowPreview[]>([]);
  const [journalRows, setJournalRows] = useState<JournalRowPreview[]>([]);
  const [accountRows, setAccountRows] = useState<AccountRowPreview[]>([]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set of existing HSL Ref Nos in selected year (trade duplicate protection)
  const existingRefs = new Set(
    trades.filter((t) => t.financialYear === selectedYear && t.hslRefNo).map((t) => t.hslRefNo)
  );

  const getCol = (row: Record<string, any>, ...names: string[]) => {
    for (const name of names) {
      for (const key of Object.keys(row)) {
        if (key.trim().toLowerCase() === name.toLowerCase()) {
          return row[key];
        }
      }
    }
    return '';
  };

  const resetPreviews = () => {
    setTradeRows([]);
    setIncExpRows([]);
    setJournalRows([]);
    setAccountRows([]);
    setImportResult(null);
    setErrorMsg(null);
  };

  const handleTypeChange = (type: ImportType) => {
    setImportType(type);
    resetPreviews();
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    processSpreadsheet(selected, importAction);
  };

  // --- Robust date-cell parsing ---
  // Plain `new Date(rawDate)` on a spreadsheet cell is unreliable in three
  // common cases that were corrupting imported entry dates:
  //  1. The cell isn't recognised as an Excel "date" type (common in CSV
  //     exports or text-formatted columns), so the library hands back the
  //     raw Excel serial NUMBER (e.g. 46660) instead of a Date object.
  //     `new Date(46660)` reads that as milliseconds since 1970 and lands
  //     on 1 Jan 1970 — nowhere near the real date.
  //  2. The cell is a plain string in "DD-MM-YYYY" / "DD/MM/YYYY" form
  //     (how Indian broker ledgers normally print dates). JS's native
  //     Date parser treats ambiguous slash/dash dates as US "MM/DD/YYYY",
  //     silently swapping day and month for anything where both are <=12.
  //  3. Even when the library *does* return a proper Date object (or a
  //     clean "YYYY-MM-DD" string), re-deriving the calendar date with
  //     local-timezone getters elsewhere in the app can shift it by a day
  //     for users east of UTC (e.g. IST, UTC+5:30). Everything below stays
  //     in UTC-based arithmetic end to end so the calendar date entered in
  //     the file is exactly the calendar date stored, in every timezone.
  const EXCEL_SERIAL_EPOCH_MS = Date.UTC(1899, 11, 30);
  const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  const excelSerialToDate = (serial: number): Date => new Date(EXCEL_SERIAL_EPOCH_MS + serial * 86400000);

  const parseDateString = (raw: string): Date | null => {
    const s = raw.trim();
    if (!s) return null;

    // ISO: YYYY-MM-DD (optionally with a time suffix)
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
      const dt = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
      if (!isNaN(dt.getTime())) return dt;
    }

    // DD-MM-YYYY, DD/MM/YYYY or DD.MM.YYYY (2 or 4 digit year)
    m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
    if (m) {
      let day = +m[1];
      let month = +m[2];
      let year = +m[3];
      if (year < 100) year += year < 50 ? 2000 : 1900;
      if (month > 12 && day <= 12) [day, month] = [month, day]; // defensive swap
      const dt = new Date(Date.UTC(year, month - 1, day));
      if (!isNaN(dt.getTime())) return dt;
    }

    // DD-MMM-YYYY / DD MMM YYYY (e.g. "03-Oct-2026")
    m = s.match(/^(\d{1,2})[/\-\s]([A-Za-z]{3,})[/\-\s](\d{2,4})$/);
    if (m) {
      const idx = MONTH_NAMES.findIndex((mn) => m![2].toLowerCase().startsWith(mn));
      if (idx >= 0) {
        let year = +m[3];
        if (year < 100) year += year < 50 ? 2000 : 1900;
        const dt = new Date(Date.UTC(year, idx, +m[1]));
        if (!isNaN(dt.getTime())) return dt;
      }
    }

    // Last resort: native parsing (handles "October 3, 2026", full ISO timestamps, etc.)
    const native = new Date(s);
    return isNaN(native.getTime()) ? null : native;
  };

  const parseAnyDateCell = (raw: any): Date | null => {
    if (raw === null || raw === undefined || raw === '') return null;
    if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
    if (typeof raw === 'number') return isNaN(raw) ? null : excelSerialToDate(raw);
    if (typeof raw === 'string') return parseDateString(raw);
    return null;
  };

  const parseDateCell = (rawDate: any): string => {
    const dt = parseAnyDateCell(rawDate);
    return dt ? dt.toISOString().slice(0, 10) : getTodayLocalISO();
  };

  // Like parseDateCell, but returns undefined instead of defaulting to today
  // — for optional fields (e.g. Due Date) where a blank cell should stay blank.
  const parseOptionalDateCell = (rawDate: any): string | undefined => {
    const dt = parseAnyDateCell(rawDate);
    return dt ? dt.toISOString().slice(0, 10) : undefined;
  };

  const processSpreadsheet = async (
    fileToRead: File,
    actionPreference: 'AUTO' | 'BUY' | 'SELL',
    ledgerAccountOverride?: string,
    contraAccountOverride?: string
  ) => {
    setIsProcessing(true);
    setErrorMsg(null);
    setImportResult(null);

    try {
      const buffer = await fileToRead.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

      if (rawData.length === 0) {
        setErrorMsg('The selected spreadsheet does not contain any data rows.');
        setIsProcessing(false);
        return;
      }

      const sourceColumns = Object.keys(rawData[0] || {}).filter((k) => k.trim() !== '');

      if (importType === 'trades') {
        const rows = parseTradeRows(rawData, actionPreference);
        setTradeRows(rows);
        if (rows.length === 0) {
          setErrorMsg(
            `Found ${rawData.length} row(s) but none had a recognizable Stock Name column. ` +
            `Expected a column named "Stock Name", "Name", "Security", "Symbol", "Scrip" or "Company". ` +
            `Your file's columns: ${sourceColumns.join(', ') || '(none detected)'}`
          );
        }
      } else if (importType === 'income' || importType === 'expense') {
        const rows = parseIncomeExpenseRows(rawData);
        setIncExpRows(rows);
        if (rows.length === 0) {
          setErrorMsg(
            `Found ${rawData.length} row(s) but none had a valid, non-zero Amount. ` +
            `Expected a column named "Amount", "Value" or "Amt" with numbers greater than 0. ` +
            `Your file's columns: ${sourceColumns.join(', ') || '(none detected)'}`
          );
        }
      } else if (importType === 'journal') {
        const ledgerId = ledgerAccountOverride !== undefined ? ledgerAccountOverride : journalLedgerAccountId;
        const contraId = contraAccountOverride !== undefined ? contraAccountOverride : journalContraAccountId;
        const rows = parseJournalRows(rawData, ledgerId, contraId);
        setJournalRows(rows);
        if (rows.length === 0) {
          setErrorMsg(
            `Found ${rawData.length} row(s) but none had a Debit Account/Credit Account pair, a Dr Amount/Cr Amount, or an Amount column. ` +
            `Expected either "Debit Account" + "Credit Account" + "Amount", or "Dr Amount" + "Cr Amount" (a single-account ledger export — pick the Ledger Account and Contra Account above). ` +
            `Your file's columns: ${sourceColumns.join(', ') || '(none detected)'}`
          );
        }
      } else if (importType === 'accounts') {
        const rows = parseAccountRows(rawData);
        setAccountRows(rows);
        if (rows.length === 0) {
          setErrorMsg(
            `Found ${rawData.length} row(s) but none had a recognizable account Name column. ` +
            `Expected a column named "Name", "Account Name" or "Ledger Name". ` +
            `Your file's columns: ${sourceColumns.join(', ') || '(none detected)'}`
          );
        }
      }
    } catch (err) {
      console.error('Spreadsheet parse error:', err);
      setErrorMsg('Failed to parse spreadsheet file. Please check file format and encoding.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ---- Trades ----
  const parseTradeRows = (rawData: Record<string, any>[], actionPreference: 'AUTO' | 'BUY' | 'SELL'): TradeRowPreview[] => {
    const seenInThisFile = new Set<string>();
    const rows: TradeRowPreview[] = [];

    for (const row of rawData) {
      const stockName = String(getCol(row, 'name', 'stock name', 'security', 'symbol', 'scrip', 'company') || '').trim();
      if (!stockName) continue;

      let actionStr = String(getCol(row, 'action', 'type', 'buy/sell', 'side', 'transaction') || '').toUpperCase();
      let determinedAction: TradeType = 'BUY';

      if (actionPreference === 'BUY') {
        determinedAction = 'BUY';
      } else if (actionPreference === 'SELL') {
        determinedAction = 'SELL';
      } else if (actionStr.includes('SELL') || actionStr.includes('SL') || actionStr === 'S') {
        determinedAction = 'SELL';
      } else {
        determinedAction = 'BUY';
      }

      const rawDate = getCol(row, 'date & time', 'date', 'trade date', 'time', 'execution date');
      let dateTimeIso = getNowLocalISODateTime();
      const parsedDate = parseAnyDateCell(rawDate);
      if (parsedDate) {
        dateTimeIso = parsedDate.toISOString().slice(0, 16);
      }

      const exchange = String(getCol(row, 'exchange', 'exch', 'market') || 'NSE').toUpperCase();
      const execQty = Math.abs(Number(getCol(row, 'execution qty', 'exec qty', 'qty', 'quantity', 'traded qty')) || 0);
      const orderQty = Math.abs(Number(getCol(row, 'order qty', 'placed qty')) || execQty);
      const disclQty = Math.abs(Number(getCol(row, 'discl. qty', 'discl qty', 'disclosed qty')) || 0);
      const orderPrice = Math.abs(Number(getCol(row, 'order price', 'price', 'rate', 'traded price', 'avg price')) || 0);
      const triggerPrice = Math.abs(Number(getCol(row, 'trigger price', 'trigger')) || 0);

      let orderTypeRaw = String(getCol(row, 'order type', 'order_type') || 'LMT').toUpperCase();
      let orderType: OrderType = 'LMT';
      if (orderTypeRaw.includes('MKT') || orderTypeRaw.includes('MARKET')) orderType = 'MKT';
      else if (orderTypeRaw.includes('SL-M')) orderType = 'SL-M';
      else if (orderTypeRaw.includes('SL')) orderType = 'SL';

      let productRaw = String(getCol(row, 'product', 'product type') || 'Delivery');
      let product: ProductType = 'Delivery';
      if (/intraday|mis/i.test(productRaw)) product = 'Intraday';
      else if (/cash/i.test(productRaw)) product = 'Cash';
      else if (/margin|mtf/i.test(productRaw)) product = 'Margin';

      const brokerage = Math.abs(Number(getCol(row, 'brokerage', 'charges', 'taxes', 'fees')) || 0);
      const status = String(getCol(row, 'status', 'trade status') || 'Confirmed Trade');
      const reason = String(getCol(row, 'reason', 'remarks', 'narration') || '---');
      const hslRefNo = String(getCol(row, 'hsl ref.no', 'hsl ref', 'ref no', 'ref_no', 'order id', 'trade id') || '').trim();

      const isDuplicate = Boolean(hslRefNo && (existingRefs.has(hslRefNo) || seenInThisFile.has(hslRefNo)));
      if (hslRefNo) seenInThisFile.add(hslRefNo);

      rows.push({
        stockName,
        dateTime: dateTimeIso,
        tradeType: determinedAction,
        exchange,
        orderQty: orderQty || execQty,
        execQty: execQty || 1,
        disclQty,
        orderPrice: orderPrice || 1,
        triggerPrice,
        orderType,
        product,
        brokerage,
        status,
        reason,
        hslRefNo,
        isDuplicate,
      });
    }

    return rows;
  };

  // ---- Income / Expense ----
  const parseIncomeExpenseRows = (rawData: Record<string, any>[]): IncomeExpenseRowPreview[] => {
    const rows: IncomeExpenseRowPreview[] = [];
    for (const row of rawData) {
      const amount = Math.abs(Number(getCol(row, 'amount', 'value', 'amt')) || 0);
      if (amount <= 0) continue;

      const date = parseDateCell(getCol(row, 'date', 'entry date', 'transaction date'));
      const category = String(
        getCol(row, 'category', 'head', 'type', 'particulars') || (importType === 'income' ? 'Other Income' : 'Other Expense')
      ).trim();
      const description = String(getCol(row, 'description', 'narration', 'remarks', 'notes') || '---').trim();

      rows.push({ date, category, description, amount, isDuplicate: false });
    }
    return rows;
  };

  // ---- Journal Vouchers ----
  // Supports two shapes of source file:
  //  1. A proper double-entry export with "Debit Account" / "Credit Account"
  //     name columns and a single "Amount".
  //  2. A broker-style single-account "Financial Ledger" export — Sr No, Trd
  //     Date, Due Date, Exchange, Seg, Narration, Voucher Type, Voucher No,
  //     Bill No, Dr Amount, Cr Amount, Running Balance — which names no
  //     second account at all. For that shape, every row posts against the
  //     chosen Ledger Account, balanced against the chosen Contra Account.
  const parseJournalRows = (
    rawData: Record<string, any>[],
    ledgerAccountId: string,
    contraAccountId: string
  ): JournalRowPreview[] => {
    const ledgerAcc = accounts.find((a) => a.id === ledgerAccountId);
    const contraAcc = accounts.find((a) => a.id === contraAccountId);
    const rows: JournalRowPreview[] = [];

    for (const row of rawData) {
      const debitNameRaw = String(getCol(row, 'debit account', 'debit', 'dr account') || '').trim();
      const creditNameRaw = String(getCol(row, 'credit account', 'credit', 'cr account') || '').trim();
      const genericAmount = Math.abs(Number(getCol(row, 'amount', 'value')) || 0);
      const drAmount = Math.abs(Number(getCol(row, 'dr amount', 'debit amount', 'dr amt')) || 0);
      const crAmount = Math.abs(Number(getCol(row, 'cr amount', 'credit amount', 'cr amt')) || 0);

      if (!debitNameRaw && !creditNameRaw && genericAmount <= 0 && drAmount <= 0 && crAmount <= 0) continue;

      const date = parseDateCell(getCol(row, 'trd date', 'trade date', 'date', 'voucher date'));
      const dueDate = parseOptionalDateCell(getCol(row, 'due date'));
      const exchange = String(getCol(row, 'exchange', 'exch') || '').trim() || undefined;
      const segment = String(getCol(row, 'seg', 'segment') || '').trim() || undefined;
      const voucherType = String(getCol(row, 'voucher type') || '').trim() || undefined;
      const voucherNo = String(getCol(row, 'voucher no', 'voucher number', 'voucher no.') || '').trim() || undefined;
      const billNo = String(getCol(row, 'bill no', 'bill number', 'bill no.') || '').trim() || undefined;
      const narration = String(getCol(row, 'narration', 'description', 'remarks', 'particulars') || 'Imported journal entry').trim();

      let debitName = debitNameRaw;
      let creditName = creditNameRaw;
      let amount = genericAmount;
      let errorText: string | undefined;

      if (debitNameRaw || creditNameRaw) {
        // Shape 1: explicit account name columns.
        if (!debitNameRaw || !creditNameRaw) errorText = 'Missing debit/credit account name';
      } else if (drAmount > 0 && crAmount > 0) {
        errorText = 'Row has both Dr Amount and Cr Amount filled';
        amount = drAmount;
      } else if (drAmount > 0 || crAmount > 0) {
        // Shape 2: single-account ledger export.
        if (!ledgerAcc || !contraAcc) {
          errorText = 'Select a Ledger Account and a Contra Account above to import Dr Amount / Cr Amount columns';
          amount = drAmount || crAmount;
        } else if (drAmount > 0) {
          debitName = ledgerAcc.name;
          creditName = contraAcc.name;
          amount = drAmount;
        } else {
          debitName = contraAcc.name;
          creditName = ledgerAcc.name;
          amount = crAmount;
        }
      } else {
        errorText = 'No Debit/Credit Account or Dr/Cr Amount found on this row';
      }

      const debitAcc = accounts.find((a) => a.name.trim().toLowerCase() === debitName.toLowerCase());
      const creditAcc = accounts.find((a) => a.name.trim().toLowerCase() === creditName.toLowerCase());

      if (!errorText) {
        if (!debitAcc) errorText = `Debit account "${debitName}" not found`;
        else if (!creditAcc) errorText = `Credit account "${creditName}" not found`;
        else if (amount <= 0) errorText = 'Amount must be greater than zero';
        else if (debitAcc.id === creditAcc.id) errorText = 'Debit and Credit account cannot be the same';
      }

      rows.push({
        date,
        dueDate,
        exchange,
        segment,
        voucherType,
        voucherNo,
        billNo,
        debitAccountName: debitAcc ? debitAcc.name : debitName || '(missing)',
        creditAccountName: creditAcc ? creditAcc.name : creditName || '(missing)',
        debitAccountId: debitAcc ? debitAcc.id : '',
        creditAccountId: creditAcc ? creditAcc.id : '',
        amount,
        narration,
        isDuplicate: Boolean(errorText),
        errorText,
      });
    }
    return rows;
  };

  // ---- Ledger Accounts ----
  const parseAccountRows = (rawData: Record<string, any>[]): AccountRowPreview[] => {
    const rows: AccountRowPreview[] = [];
    for (const row of rawData) {
      const name = String(getCol(row, 'name', 'account name', 'ledger name') || '').trim();
      if (!name) continue;

      const typeRaw = String(getCol(row, 'type', 'classification', 'group') || 'Asset').toLowerCase();
      let type: AccountType = 'Asset';
      if (typeRaw.includes('liab')) type = 'Liability';
      else if (typeRaw.includes('cap') || typeRaw.includes('equity')) type = 'Capital';
      else if (typeRaw.includes('income') || typeRaw.includes('revenue')) type = 'Income';
      else if (typeRaw.includes('exp')) type = 'Expense';
      else if (typeRaw.includes('asset')) type = 'Asset';

      const openingBalance = Number(getCol(row, 'opening balance', 'balance', 'amount') || 0);
      const willUpdate = accounts.some((a) => a.name.trim().toLowerCase() === name.toLowerCase());

      rows.push({ name, type, openingBalance, isDuplicate: willUpdate });
    }
    return rows;
  };

  const handleActionPrefChange = (pref: 'AUTO' | 'BUY' | 'SELL') => {
    setImportAction(pref);
    if (file) {
      processSpreadsheet(file, pref);
    }
  };

  const handleJournalLedgerAccountChange = (id: string) => {
    setJournalLedgerAccountId(id);
    if (file) processSpreadsheet(file, importAction, id, journalContraAccountId);
  };

  const handleJournalContraAccountChange = (id: string) => {
    setJournalContraAccountId(id);
    if (file) processSpreadsheet(file, importAction, journalLedgerAccountId, id);
  };

  const handleConfirmImport = async () => {
    setIsImporting(true);
    setErrorMsg(null);

    try {
      if (importType === 'trades') {
        const itemsToImport = tradeRows
          .filter((r) => !r.isDuplicate)
          .map((r) => ({
            financialYear: selectedYear,
            tradeType: r.tradeType,
            dateTime: r.dateTime,
            stockName: r.stockName,
            exchange: r.exchange,
            orderQty: r.orderQty,
            execQty: r.execQty,
            disclQty: r.disclQty,
            orderPrice: r.orderPrice,
            triggerPrice: r.triggerPrice,
            orderType: r.orderType,
            product: r.product,
            brokerage: r.brokerage,
            status: r.status,
            reason: r.reason,
            hslRefNo: r.hslRefNo || undefined,
            sellCost: r.tradeType === 'SELL' ? Number((r.execQty * r.orderPrice).toFixed(2)) : undefined,
            realizedPL: 0,
          }));
        const res = await importTrades(itemsToImport);
        const totalSkipped = tradeRows.filter((r) => r.isDuplicate).length + res.skipped;
        setImportResult({ imported: res.imported, skipped: totalSkipped });
        setTradeRows([]);
      } else if (importType === 'income' || importType === 'expense') {
        const items = incExpRows.map((r) => ({
          financialYear: selectedYear,
          date: r.date,
          category: r.category,
          description: r.description,
          amount: r.amount,
        }));
        const res = importType === 'income' ? await importIncomes(items) : await importExpenses(items);
        setImportResult(res);
        setIncExpRows([]);
      } else if (importType === 'journal') {
        const validRows = journalRows.filter((r) => !r.isDuplicate);
        const items = validRows.map((r) => ({
          financialYear: selectedYear,
          date: r.date,
          dueDate: r.dueDate,
          exchange: r.exchange,
          segment: r.segment,
          debitAccountId: r.debitAccountId,
          debitAccountName: r.debitAccountName,
          creditAccountId: r.creditAccountId,
          creditAccountName: r.creditAccountName,
          amount: r.amount,
          narration: r.narration,
          voucherType: r.voucherType,
          voucherNo: r.voucherNo,
          billNo: r.billNo,
        }));
        const res = await importJournals(items);
        const totalSkipped = journalRows.length - validRows.length + res.skipped;
        setImportResult({ imported: res.imported, skipped: totalSkipped });
        setJournalRows([]);
      } else if (importType === 'accounts') {
        const items = accountRows.map((r) => ({ name: r.name, type: r.type, openingBalance: r.openingBalance }));
        const res = await importAccounts(items);
        setImportResult(res);
        setAccountRows([]);
      }

      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setErrorMsg('Import failed. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const currentTab = IMPORT_TABS.find((t) => t.id === importType)!;

  const tradeDuplicates = tradeRows.filter((r) => r.isDuplicate).length;
  const tradeValid = tradeRows.length - tradeDuplicates;
  const journalInvalid = journalRows.filter((r) => r.isDuplicate).length;
  const journalValid = journalRows.length - journalInvalid;
  const accountUpdates = accountRows.filter((r) => r.isDuplicate).length;
  const accountNew = accountRows.length - accountUpdates;

  const totalRows =
    importType === 'trades' ? tradeRows.length :
    importType === 'income' || importType === 'expense' ? incExpRows.length :
    importType === 'journal' ? journalRows.length :
    accountRows.length;

  const committableCount =
    importType === 'trades' ? tradeValid :
    importType === 'income' || importType === 'expense' ? incExpRows.length :
    importType === 'journal' ? journalValid :
    accountRows.length;

  return (
    <div className="space-y-6">
      {/* Import Type Tabs */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-wrap items-center gap-1.5">
        {IMPORT_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTypeChange(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              importType === tab.id
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Upload Zone & Instructions */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Excel / Spreadsheet Import — {currentTab.label}</h2>
            <p className="text-xs text-slate-400">
              Import {currentTab.label.toLowerCase()} in bulk (XLSX, XLS, CSV, XLSB, ODS). Every row is placed
              automatically into the software once you confirm — nothing needs to be re-typed.
            </p>
          </div>
        </div>

        {/* Feature highlight badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-start gap-2.5">
            <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block">Duplicate Protection</span>
              <span className="text-slate-400 text-[11px]">
                {importType === 'trades' && `Trades with existing broker reference IDs in FY ${selectedYear} are automatically flagged and skipped.`}
                {(importType === 'income' || importType === 'expense') && 'Every valid row is added as a new record — review the preview before confirming.'}
                {importType === 'journal' && 'Rows whose debit/credit account name cannot be matched to an existing ledger account are flagged and skipped.'}
                {importType === 'accounts' && 'A row whose account name already exists updates that account in place instead of creating a duplicate.'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-start gap-2.5">
            <FileCheck size={18} className="text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block">Intelligent Column Mapping</span>
              <span className="text-slate-400 text-[11px]">
                {importType === 'trades' && 'Maps Stock Name, Action, Exchange, Execution Qty, Price, Brokerage, and Order Types automatically.'}
                {(importType === 'income' || importType === 'expense') && 'Maps Date, Category, Description/Narration, and Amount columns automatically.'}
                {importType === 'journal' && 'Maps Trd Date, Due Date, Exchange, Seg, Voucher Type/No, Bill No, Narration, and either Debit/Credit Account + Amount or Dr Amount/Cr Amount automatically.'}
                {importType === 'accounts' && 'Maps Account Name, Type/Classification, and Opening Balance columns automatically.'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-start gap-2.5">
            <RefreshCw size={18} className="text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block">Sub-Second Cross-Device Sync</span>
              <span className="text-slate-400 text-[11px]">
                Imported entries instantly appear on connected Flutter Android, iOS apps, and web sessions.
              </span>
            </div>
          </div>
        </div>

        {/* Upload and Controls */}
        <div className="mt-5 p-6 rounded-2xl border-2 border-dashed border-slate-700 hover:border-cyan-500/50 bg-slate-950/40 text-center transition-colors">
          <Upload size={32} className="mx-auto text-slate-500 mb-3" />
          <h3 className="text-sm font-semibold text-white">Select or drop {currentTab.label.toLowerCase()} file</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">Supported: .xlsx, .xls, .xlsb, .csv, .ods</p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xl mx-auto">
            <input
              ref={fileInputRef}
              type="file"
              accept={currentTab.accept}
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 transition-colors shadow shadow-cyan-600/20 cursor-pointer shrink-0"
            >
              <Upload size={15} />
              <span>{isProcessing ? 'Reading File...' : `Upload ${currentTab.label} File`}</span>
            </button>

            {importType === 'trades' && (
              <select
                value={importAction}
                onChange={(e) => handleActionPrefChange(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="AUTO">Auto-detect BUY / SELL from Action column</option>
                <option value="BUY">Import all as BUY</option>
                <option value="SELL">Import all as SELL</option>
              </select>
            )}
          </div>

          {importType === 'journal' && (
            <div className="mt-4 max-w-xl mx-auto text-left">
              <p className="text-[11px] text-slate-400 mb-2 flex items-center gap-1.5">
                <Info size={12} className="shrink-0" />
                Only needed if your file has <strong className="text-slate-300">Dr Amount / Cr Amount</strong> columns
                instead of named Debit/Credit Account columns (e.g. a broker Financial Ledger export).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Ledger Account (this file's statement)</label>
                  <select
                    value={journalLedgerAccountId}
                    onChange={(e) => handleJournalLedgerAccountChange(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">-- Select Account --</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.type})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Contra Account (balances each voucher)</label>
                  <select
                    value={journalContraAccountId}
                    onChange={(e) => handleJournalContraAccountChange(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">-- Select Account --</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {file && (
            <p className="mt-3 text-xs text-emerald-400 font-medium">
              Loaded: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {importResult && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-emerald-400" />
              <span>
                Successfully placed <strong>{importResult.imported}</strong> {currentTab.label.toLowerCase()} records into
                the software (FY {selectedYear})!{' '}
                {importResult.skipped > 0 && `(${importResult.skipped} rows skipped)`}
              </span>
            </div>
            <span className="text-[11px] text-emerald-400 font-mono">Synced to Firebase</span>
          </div>
        )}
      </div>

      {/* Trades Preview */}
      {importType === 'trades' && tradeRows.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">Parsed Spreadsheet Preview</h3>
              <p className="text-xs text-slate-400">
                Found {tradeRows.length} trades: <span className="text-emerald-400 font-bold">{tradeValid} valid</span>,{' '}
                <span className="text-amber-400 font-bold">{tradeDuplicates} duplicates</span>
              </p>
            </div>
            <button
              onClick={handleConfirmImport}
              disabled={isImporting || tradeValid === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 transition-all shadow-md shadow-cyan-600/20 cursor-pointer"
            >
              <span>{isImporting ? 'Syncing to Cloud...' : `Commit ${tradeValid} Trades to Software`}</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-950">
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Stock Name</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Exch</th>
                  <th className="py-2.5 px-3 text-right">Exec Qty</th>
                  <th className="py-2.5 px-3 text-right">Price</th>
                  <th className="py-2.5 px-3">Ref No</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {tradeRows.map((r, i) => (
                  <tr key={i} className={r.isDuplicate ? 'bg-amber-500/5 opacity-60' : 'hover:bg-slate-800/40'}>
                    <td className="py-2.5 px-3">
                      {r.isDuplicate ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-medium border border-amber-500/30">
                          Duplicate (Skip)
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-medium border border-emerald-500/30">
                          Ready
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-bold">
                      <span className={r.tradeType === 'BUY' ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                        {r.tradeType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-white">{r.stockName}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">{r.dateTime}</td>
                    <td className="py-2.5 px-3 font-mono">{r.exchange}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{r.execQty}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(r.orderPrice)}</td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400">{r.hslRefNo || '---'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Income / Expense Preview */}
      {(importType === 'income' || importType === 'expense') && incExpRows.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">Parsed Spreadsheet Preview</h3>
              <p className="text-xs text-slate-400">
                Found <span className="text-emerald-400 font-bold">{incExpRows.length}</span> {importType} records ready to place
              </p>
            </div>
            <button
              onClick={handleConfirmImport}
              disabled={isImporting || incExpRows.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 transition-all shadow-md shadow-cyan-600/20 cursor-pointer"
            >
              <span>{isImporting ? 'Syncing to Cloud...' : `Commit ${incExpRows.length} Records to Software`}</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-950">
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {incExpRows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">{r.date}</td>
                    <td className="py-2.5 px-3 font-semibold text-white">{r.category}</td>
                    <td className="py-2.5 px-3">{r.description}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Journal Preview */}
      {importType === 'journal' && journalRows.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">Parsed Spreadsheet Preview</h3>
              <p className="text-xs text-slate-400">
                Found {journalRows.length} vouchers: <span className="text-emerald-400 font-bold">{journalValid} valid</span>,{' '}
                <span className="text-amber-400 font-bold">{journalInvalid} skipped</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <Info size={12} /> Debit/Credit account names must match an existing ledger account exactly (case-insensitive).
              </p>
            </div>
            <button
              onClick={handleConfirmImport}
              disabled={isImporting || journalValid === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 transition-all shadow-md shadow-cyan-600/20 cursor-pointer"
            >
              <span>{isImporting ? 'Syncing to Cloud...' : `Commit ${journalValid} Vouchers to Software`}</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-[11px]">
              <thead className="sticky top-0 bg-slate-950">
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Trd Date</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3">Exch / Seg</th>
                  <th className="py-2.5 px-3">Debit (Dr)</th>
                  <th className="py-2.5 px-3">Credit (Cr)</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3">Voucher Type</th>
                  <th className="py-2.5 px-3">Voucher No</th>
                  <th className="py-2.5 px-3">Bill No</th>
                  <th className="py-2.5 px-3">Narration / Issue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {journalRows.map((r, i) => (
                  <tr key={i} className={r.isDuplicate ? 'bg-amber-500/5 opacity-60' : 'hover:bg-slate-800/40'}>
                    <td className="py-2.5 px-3">
                      {r.isDuplicate ? (
                        <span
                          className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-medium border border-amber-500/30"
                          title={r.errorText}
                        >
                          Skip
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-medium border border-emerald-500/30">
                          Ready
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{r.date}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{r.dueDate || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-400">{[r.exchange, r.segment].filter(Boolean).join(' / ') || '—'}</td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-400">{r.debitAccountName}</td>
                    <td className="py-2.5 px-3 font-semibold text-rose-400">{r.creditAccountName}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(r.amount)}</td>
                    <td className="py-2.5 px-3 text-slate-400">{r.voucherType || '—'}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{r.voucherNo || '—'}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{r.billNo || '—'}</td>
                    <td className="py-2.5 px-3 italic text-slate-400 max-w-[180px] truncate">{r.errorText || r.narration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Accounts Preview */}
      {importType === 'accounts' && accountRows.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">Parsed Spreadsheet Preview</h3>
              <p className="text-xs text-slate-400">
                Found {accountRows.length} accounts: <span className="text-emerald-400 font-bold">{accountNew} new</span>,{' '}
                <span className="text-cyan-400 font-bold">{accountUpdates} will update existing</span>
              </p>
            </div>
            <button
              onClick={handleConfirmImport}
              disabled={isImporting || accountRows.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 transition-all shadow-md shadow-cyan-600/20 cursor-pointer"
            >
              <span>{isImporting ? 'Syncing to Cloud...' : `Commit ${accountRows.length} Accounts to Software`}</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-950">
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Account Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Opening Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {accountRows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3">
                      {r.isDuplicate ? (
                        <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-medium border border-cyan-500/30">
                          Update
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-medium border border-emerald-500/30">
                          New
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-white">{r.name}</td>
                    <td className="py-2.5 px-3 font-mono">{r.type}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(r.openingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
