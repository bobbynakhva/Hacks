// Storage layer modelled on the SMART ERP dual-database layout:
// DBStart (users, rights, company, year registry, logs) + one transactional DB per financial year.
export type Row = Record<string, any>
export type Tables = Record<string, Row[]>
export type YearDB = { year: string; file: string; tables: Tables }
export type StartDB = { user1: Row[]; userrights: Row[]; CompMaster: Row[]; DB_Years: Row[]; Logs: Row[]; OnLineUsers: Row[]; errlog: Row[] }
export type Ctx = { db: YearDB; start: StartDB }
export type StockMove = { ItemId: string; storeID: string; Qty: number }

const PREFIX = 'smart-erp/'
const startKey = `${PREFIX}DBStart`
const yearKey = (year: string) => `${PREFIX}DB${year.replace('-', '_')}`
export const yearFile = (year: string) => `DB${year.replace('-', '_')}.mdb`
export const today = () => new Date().toISOString().slice(0, 10)
export const uid = () => Math.random().toString(36).slice(2, 10)

// Custom 5-character password encoding routine (byte shift + XOR), stored in user1.Password.
export const encodePassword = (clear: string) =>
  Array.from(clear).map((ch, i) => String.fromCharCode((ch.charCodeAt(0) ^ (0x2a + i)) + 1536)).join('')

export const RIGHTS: { flag: string; form: string; label: string }[] = [
  ['mnuUser', 'frmUserEntry', 'User Account Creation, Modification & Password Management'],
  ['mnuUserRight', 'frmUserRights', 'Master Security Matrix Setup'],
  ['mnuUserStatus', 'frmViewUserScreens', 'Active Session Audit & Online User Status Monitor'],
  ['mnuCompDB', 'frmCompMaster', 'Company Profile Master & Financial Year Switcher'],
  ['mnuCategory', 'frmCategory', 'Item Group / Category Master'],
  ['mnuItem', 'frmItem', 'Item Master'],
  ['ItemAssign', 'frmItemAssign', 'Customer / Supplier Part Number Mapping'],
  ['ItemMoreDet', 'frmMiscMore', 'Extended Technical Details, Drawing No & Rev Level'],
  ['mnuBOM', 'frmAutoFillBOMList', 'Multi-Level Bill of Materials'],
  ['mnuMeasure', 'frmMeasure', 'Unit of Measurement Master'],
  ['mnuProcID', 'frmProcessID', 'Operation / Process Master'],
  ['mnuMachine', 'frmMachine', 'Machine & Equipment Master'],
  ['mnuStores', 'frmStores', 'Warehouse / Store Location Master'],
  ['mnuCustomer', 'frmCustomer', 'Customer Master'],
  ['mnuSupplier', 'frmSupplier', 'Supplier Master'],
  ['mnuVendor', 'frmVendor', 'Subcontractor Vendor Master'],
  ['mnuCurrency', 'frmCurrency', 'Multi-Currency Master'],
  ['mnuCurrToday', 'frmCurrToday', 'Daily Exchange Rate Maintenance'],
  ['mnuCostCntr', 'frmCostCenter', 'Cost Center Setup'],
  ['mnuBank', 'frmBanks', 'Bank Account Master Setup'],
  ['mnuEnquiry', 'frmEnquiry', 'Customer Sales Enquiry Register'],
  ['mnuEsti', 'frmEstimation', 'Costing & Price Estimation Sheet'],
  ['mnuQuote', 'frmQuote', 'Customer Sales Quotation'],
  ['mnuMfgPOin', 'frmMfgPO', 'Customer Purchase Order Entry'],
  ['mnuViewPODetails', 'frmViewPODetails', 'Customer PO Status Monitor'],
  ['mnuAssmReqAnaly', 'frmAssmReqAnaly', 'Assembly Requirement Analysis'],
  ['mnuMatlReqAnaly', 'frmMatReqAnaly', 'Material Requirement Planning (MRP)'],
  ['mnuPlanProdCapa', 'frmPlanProdCapacity', 'Machine Capacity & Workload Analysis'],
  ['mnuPlanChart', 'frmPlanY', 'Production Planning Master Chart'],
  ['mnuprodSchd', 'frmProdSchedule', 'Production Scheduling & Job Card Allocation'],
  ['mnuProductionLog', 'frmProdn', 'Daily Shop Floor Production Log'],
  ['mnuIWOiss', 'frmProdnWOIssue', 'Internal Work Order (IWO) Issue'],
  ['mnuIWOret', 'frmProdnWOReturn', 'Internal Work Order (IWO) Return'],
  ['mnuSubConPOout', 'frmSubConPO', 'Subcontract Work Order'],
  ['mnuDcSubConOut', 'frmDCSubConOut', 'Subcontract Delivery Challan Outward'],
  ['mnuDcSubConIn', 'frmDCSubConIn', 'Subcontract Delivery Challan Inward'],
  ['mnuInvSubConIn', 'frmInvoiceSC', 'Subcontract Job Work Invoice Verification'],
  ['mnuDcSubConStoreCrNote', 'frmDcSubConStoreCrNote', 'Subcontract Store Credit Note'],
  ['mnuPurchPOout', 'frmPurchasePO', 'Supplier Purchase Order Outward'],
  ['mnuInvPurchIn', 'frmPurchaseGRN', 'Goods Receipt Note (GRN)'],
  ['mnuPurchBills', 'frmInvoicePurch', 'Purchase Invoice Entry & Clearing'],
  ['mnuPurchStoreCrNote', 'frmPurchStoreCrNote', 'Purchase Store Credit Note'],
  ['mnuStock', 'frmStock', 'Real-Time Stock Status & Valuation'],
  ['mnuStockDetails', 'frmStockDetails', 'Detailed Bin Stock / Bin Card'],
  ['mnuStkIssueBill', 'frmStockIssue', 'Material Issue Note (MIN)'],
  ['mnuStoreInterTrans', 'frmStoreInterTrans', 'Inter-Store Stock Transfer'],
  ['mnuProdnStoreCrNote', 'frmProdnStoreCrNote', 'Production Excess Stock Return'],
  ['mnuToolCrib', 'frmToolCrib', 'Tool Crib Inventory, Issue & Return'],
  ['mnuStkRedDefine', 'frmStkRedDefine', 'Stock Reduction & Wastage'],
  ['mnuMfgDC', 'frmDCOutgoing', 'Outward Delivery Challan (Sales Dispatch)'],
  ['mnuMfgInvoice', 'frmInvoice', 'Commercial Tax Invoice'],
  ['mnuSCNGen', 'frmSCNGen', 'Sales Credit Note / Customer Sales Return'],
  ['CrDbNote', 'frmDbCrNote', 'Financial Credit Note & Debit Note'],
  ['mnuAdvAdjust', 'frmAdvAdjust', 'Advance Payment Adjustment'],
  ['mnuInsCommon', 'frmInspection', 'General Quality Inspection Ledger'],
  ['mnuInsMfgLabIndivi', 'frmInspectionIn', 'Incoming GRN Quality Clearance'],
  ['mnuInsMfgLabRand', 'frmInspectionInde', 'In-Process / Shopfloor Sampling Inspection'],
  ['mnuInsSubCon', 'frmInspectionSC', 'Subcontract Job Work Quality Clearance'],
  ['RejRework', 'frmRejection', 'Rejection Log, Rework Order & Scrap Disposition'],
  ['mnuCalibrate', 'frmCalibrate', 'Equipment Calibration Master'],
  ['mnuCalibrateDUE', 'frmCalibrateDUE', 'Calibration Due Date Alerts'],
  ['mnuMaintainSch', 'frmMaintain', 'Preventive Maintenance Schedule'],
  ['mnuMaintainPro', 'frmMaintainPro', 'Repairs & Downtime Tracker'],
  ['mnuBreak', 'frmBrkDnMaint', 'Breakdown Maintenance Log'],
  ['mnuStaff', 'frmStaff', 'Employee Profile Master'],
  ['mnuAttendance', 'frmAttendance', 'Daily Attendance Logging'],
  ['mnuShiftAlloc', 'frmShiftAlloc', 'Employee Shift Allocation'],
  ['mnuSalHead', 'frmPTDetails', 'Salary Head Setup & PT Slabs'],
  ['mnuSalary', 'frmSalary', 'Monthly Salary Processing'],
  ['mnuStaffLoan', 'frmStaffLoan', 'Employee Advance & Loan Tracking'],
  ['mnureceipts', 'frmReceipts', 'Customer Receipt Voucher'],
  ['mnuPayments', 'frmPayments', 'Vendor Payment Voucher'],
  ['mnuBankTrans', 'frmBankTrans', 'Bank Transaction Log'],
  ['mnuExpense', 'frmExpense', 'Expense Vouchers'],
  ['mnuIncome', 'frmIncome', 'Income Vouchers'],
  ['mnuLabPOin', 'frmLabourPO', 'Laboratory Testing Purchase Orders'],
  ['mnuFileCorres', 'frmFileCorres', 'File Correspondence & Attachments'],
  ['mnuViewSrch', 'frmViewSearch', 'Universal Search & Query Engine'],
  ['mnuMisc', 'frmMisc', 'Database Utilities, Backup & Audit Logs'],
].map(([flag, form, label]) => ({ flag, form, label }))

// Forms that share a flag with their sibling form in the spec's permission matrix.
const SHARED_FLAG: Record<string, string> = { frmUploadAssembly: 'mnuBOM' }
export const flagFor = (form: string) => SHARED_FLAG[form] || RIGHTS.find(r => r.form === form)?.flag

const fullRights = (UserId: string) => Object.fromEntries([['UserId', UserId], ...RIGHTS.map(r => [r.flag, true])])

const master = (): Tables => ({
  Measurement: [['NOS', 'Numbers'], ['KG', 'Kilogram'], ['MTR', 'Metre'], ['LTR', 'Litre'], ['SET', 'Set'], ['HRS', 'Hours']].map(([Id, UOMName]) => ({ Id, UOMName })),
  CATEGORY: [['RM', 'Raw Material'], ['COMP', 'Component Parts'], ['ASSY', 'Assemblies'], ['HW', 'Hardware'], ['TOOL', 'Tooling'], ['CONS', 'Consumables']].map(([Id, CategoryName]) => ({ Id, CategoryName })),
  Stores: [['RM', 'Raw Material Store', 'RM'], ['WIP', 'Shop Floor / WIP', 'Production'], ['FG', 'Finished Goods Store', 'FG'], ['SC', 'SubCon Store', 'SubCon'], ['QRT', 'Quarantine / Inspection Store', 'Quarantine'], ['SCRAP', 'Scrap Yard', 'Scrap'], ['TOOL', 'Tool Crib', 'Tool Crib']].map(([storeID, StoreName, StoreType]) => ({ storeID, StoreName, StoreType, Location: 'Plant 1' })),
  Item: [
    { ItemId: 'RM-EN8-40', ItemName: 'EN8 Round Bar Ø40', Category: 'RM', ItemType: 'Raw Material', UOM: 'KG', Rate: 78, WeightKg: 1, HSN: '7214', GST: 18, ReorderLevel: 200, DrawingNo: '', RevLevel: '' },
    { ItemId: 'RM-AL6061', ItemName: 'Aluminium 6061 Billet', Category: 'RM', ItemType: 'Raw Material', UOM: 'KG', Rate: 280, WeightKg: 1, HSN: '7601', GST: 18, ReorderLevel: 100, DrawingNo: '', RevLevel: '' },
    { ItemId: 'SHAFT-008', ItemName: 'Precision Shaft 8mm', Category: 'COMP', ItemType: 'Component', UOM: 'NOS', Rate: 1800, WeightKg: 1.6, HSN: '8483', GST: 18, ReorderLevel: 20, DrawingNo: 'DRG-SH-008', RevLevel: 'C' },
    { ItemId: 'HSG-214', ItemName: 'CNC Housing 214', Category: 'COMP', ItemType: 'Component', UOM: 'NOS', Rate: 2500, WeightKg: 2.4, HSN: '8483', GST: 18, ReorderLevel: 10, DrawingNo: 'DRG-HS-214', RevLevel: 'B' },
    { ItemId: 'BRG-6205', ItemName: 'Ball Bearing 6205', Category: 'HW', ItemType: 'Hardware', UOM: 'NOS', Rate: 350, WeightKg: 0.13, HSN: '8482', GST: 18, ReorderLevel: 50, DrawingNo: '', RevLevel: '' },
    { ItemId: 'ASSY-DRV-01', ItemName: 'Drive Assembly DRV-01', Category: 'ASSY', ItemType: 'Assembly', UOM: 'SET', Rate: 7800, WeightKg: 5.2, HSN: '8483', GST: 18, ReorderLevel: 5, DrawingNo: 'DRG-DRV-01', RevLevel: 'A' },
    { ItemId: 'TOOL-EM12', ItemName: 'Carbide End Mill 12mm', Category: 'TOOL', ItemType: 'Tool', UOM: 'NOS', Rate: 1500, WeightKg: 0.1, HSN: '8207', GST: 18, ReorderLevel: 4, DrawingNo: '', RevLevel: '' },
  ],
  AssmblyDef: [{ Id: 'BOM/26-27/0001', ParentItem: 'ASSY-DRV-01', Description: 'Drive assembly product structure', Rev: 'A', Date: '2026-04-01', Status: 'Active' }],
  AssmblyDefSub: [
    { Id: uid(), ParentId: 'BOM/26-27/0001', ChildItem: 'SHAFT-008', QtyPer: 1, UOM: 'NOS', Level: 'Manufactured', ScrapPct: 2 },
    { Id: uid(), ParentId: 'BOM/26-27/0001', ChildItem: 'HSG-214', QtyPer: 1, UOM: 'NOS', Level: 'Manufactured', ScrapPct: 0 },
    { Id: uid(), ParentId: 'BOM/26-27/0001', ChildItem: 'BRG-6205', QtyPer: 2, UOM: 'NOS', Level: 'Bought-out', ScrapPct: 0 },
    { Id: uid(), ParentId: 'BOM/26-27/0001', ChildItem: 'RM-EN8-40', QtyPer: 2.2, UOM: 'KG', Level: 'Raw Material', ScrapPct: 5 },
  ],
  ProcessID: [['P01', 'CNC Turning', 'Machining', 12, 650, 'In-house'], ['P02', 'VMC Milling', 'Machining', 18, 850, 'In-house'], ['P03', 'Heat Treatment', 'Heat Treatment', 0, 0, 'Subcontract'], ['P04', 'Zinc Plating', 'Plating', 0, 0, 'Subcontract'], ['P05', 'Final Inspection', 'QC', 5, 300, 'In-house'], ['P06', 'Assembly', 'Assembly', 25, 400, 'In-house']].map(([ProcID, ProcessName, ProcessType, StdTimeMin, RatePerHr, Mode]) => ({ ProcID, ProcessName, ProcessType, StdTimeMin, RatePerHr, Mode })),
  Machine: [['CNC-01', 'CNC Turning Center 01', 'Turning', 20, 650, 'Ace Micromatic', 'Operational'], ['CNC-02', 'CNC Turning Center 02', 'Turning', 20, 650, 'Ace Micromatic', 'Operational'], ['VMC-01', 'Vertical Machining Center 01', 'Milling', 20, 850, 'BFW', 'Operational'], ['GRD-01', 'Cylindrical Grinder', 'Grinding', 16, 500, 'Micromatic', 'Operational']].map(([Id, MachineName, WorkCenter, CapacityHrsPerDay, HourlyRate, Make, Status]) => ({ Id, MachineName, WorkCenter, CapacityHrsPerDay, HourlyRate, Make, Status })),
  Customer: [
    { CustId: 'C001', CustName: 'Apex Automotive Ltd', Address: 'Plot 14, MIDC Bhosari', City: 'Pune', State: 'Maharashtra', GSTIN: '27AABCA1234F1Z5', PAN: 'AABCA1234F', ContactPerson: 'R. Kulkarni', Phone: '020-27130000', Email: 'purchase@apexauto.example', PaymentTerms: 45, CreditLimit: 2500000, Currency: 'INR', OpeningBalance: 0 },
    { CustId: 'C002', CustName: 'Meridian Industries', Address: 'Andheri East', City: 'Mumbai', State: 'Maharashtra', GSTIN: '27AACCM5678G1Z2', PAN: 'AACCM5678G', ContactPerson: 'S. Iyer', Phone: '022-28300000', Email: 'buy@meridian.example', PaymentTerms: 30, CreditLimit: 1500000, Currency: 'INR', OpeningBalance: 0 },
  ],
  SUPPLIER: [
    { SuppId: 'S001', SuppName: 'Steelworks India', SupplierType: 'Material Supplier', Address: 'Taloja MIDC', City: 'Navi Mumbai', State: 'Maharashtra', GSTIN: '27AADCS9012H1Z8', ContactPerson: 'A. Shah', Phone: '022-27400000', PaymentTerms: 30, OpeningBalance: 0 },
    { SuppId: 'S002', SuppName: 'MotionTech Bearings', SupplierType: 'Material Supplier', Address: 'Peenya', City: 'Bengaluru', State: 'Karnataka', GSTIN: '29AAECM3456J1Z1', ContactPerson: 'K. Rao', Phone: '080-28390000', PaymentTerms: 30, OpeningBalance: 0 },
  ],
  Vendor: [{ VendorId: 'V001', VendorName: 'ThermoTreat Works', Processes: 'Heat Treatment, Zinc Plating', Address: 'Chakan', City: 'Pune', State: 'Maharashtra', GSTIN: '27AAFCT7890K1Z3', ContactPerson: 'M. Patil', Phone: '02135-660000', PaymentTerms: 15, OpeningBalance: 0 }],
  CurrencyType: [['INR', 'Indian Rupee', '₹'], ['USD', 'US Dollar', '$'], ['EUR', 'Euro', '€'], ['GBP', 'Pound Sterling', '£']].map(([Id, CurrencyName, Symbol]) => ({ Id, CurrencyName, Symbol })),
  CurrencyToday: [{ Id: 'FX/26-27/0001', Date: '2026-09-25', Currency: 'USD', RateINR: 83.6 }],
  CostCenter: [['CC01', 'Machine Shop', 'Production'], ['CC02', 'Quality', 'Quality'], ['CC03', 'Administration', 'Admin'], ['CC04', 'Maintenance', 'Maintenance']].map(([CostCntrId, CostCenterName, Department]) => ({ CostCntrId, CostCenterName, Department, Budget: 0 })),
  Banks: [{ Id: 'BK01', BankName: 'HDFC Bank', Branch: 'Bhosari', AccountNo: '50200012345678', IFSC: 'HDFC0000123', AccountType: 'Current', OpeningBalance: 1250000 }],
  STAFF: [
    { Id: 'E001', EmpName: 'Arjun Mehta', Designation: 'CNC Operator', Department: 'Machine Shop', DOJ: '2024-04-11', DOB: '1994-06-02', Phone: '9800000001', Address: 'Pune', BankAccount: '1234567890', IFSC: 'HDFC0000123', PFNo: 'MH/PUN/12345/1', ESINo: '3100012345', WageType: 'Monthly', BasicPay: 18000, DA: 4000, HRA: 5000, OtherAllow: 2000, PFPct: 12, ESIPct: 0.75, Status: 'Active' },
    { Id: 'E002', EmpName: 'Priya Desai', Designation: 'QC Engineer', Department: 'Quality', DOJ: '2023-07-08', DOB: '1996-01-15', Phone: '9800000002', Address: 'Pune', BankAccount: '2234567890', IFSC: 'HDFC0000123', PFNo: 'MH/PUN/12345/2', ESINo: '', WageType: 'Monthly', BasicPay: 30000, DA: 6000, HRA: 9000, OtherAllow: 3000, PFPct: 12, ESIPct: 0, Status: 'Active' },
  ],
  ProfessionalTax: [['PT1', 0, 7500, 0], ['PT2', 7501, 10000, 175], ['PT3', 10001, 999999999, 200]].map(([Id, SlabFrom, SlabTo, PTAmount]) => ({ Id, SlabFrom, SlabTo, PTAmount })),
  Calibrate: [
    { Id: 'CAL/26-27/0001', InstrumentCode: 'VC-01', InstrumentName: 'Digital Vernier Caliper 0-150', InstrumentType: 'Vernier', Range: '0-150 mm', LeastCount: '0.01 mm', SerialNo: 'MT-77821', Location: 'QC Lab', LastCalDate: '2025-10-01', FrequencyMonths: 12, Agency: 'NABL Lab Pune', CertificateNo: 'NC-2025-4410', Status: 'Active' },
    { Id: 'CAL/26-27/0002', InstrumentCode: 'MM-01', InstrumentName: 'Outside Micrometer 0-25', InstrumentType: 'Micrometer', Range: '0-25 mm', LeastCount: '0.001 mm', SerialNo: 'MT-31002', Location: 'QC Lab', LastCalDate: '2025-08-15', FrequencyMonths: 12, Agency: 'NABL Lab Pune', CertificateNo: 'NC-2025-3902', Status: 'Active' },
  ],
  StockLedger: [
    { Id: uid(), Date: '2026-04-01', ItemId: 'RM-EN8-40', storeID: 'RM', Qty: 850, RefForm: 'Opening', RefId: 'OPENING', Remarks: 'Opening stock' },
    { Id: uid(), Date: '2026-04-01', ItemId: 'RM-AL6061', storeID: 'RM', Qty: 120, RefForm: 'Opening', RefId: 'OPENING', Remarks: 'Opening stock' },
    { Id: uid(), Date: '2026-04-01', ItemId: 'BRG-6205', storeID: 'RM', Qty: 60, RefForm: 'Opening', RefId: 'OPENING', Remarks: 'Opening stock' },
    { Id: uid(), Date: '2026-04-01', ItemId: 'SHAFT-008', storeID: 'FG', Qty: 40, RefForm: 'Opening', RefId: 'OPENING', Remarks: 'Opening stock' },
    { Id: uid(), Date: '2026-04-01', ItemId: 'TOOL-EM12', storeID: 'TOOL', Qty: 12, RefForm: 'Opening', RefId: 'OPENING', Remarks: 'Opening stock' },
  ],
})

const defaultStart = (): StartDB => ({
  user1: [
    { UserId: 'ADMIN', UserName: 'Administrator', Password: encodePassword('ADMIN'), Designation: 'System Administrator', Active: true },
    { UserId: 'CHECK26', UserName: 'Verification User', Password: encodePassword('CTY9J'), Designation: 'Verification', Active: true },
  ],
  userrights: [fullRights('ADMIN'), fullRights('CHECK26')],
  CompMaster: [{ CustId: 'COMP', CompName: 'Bhargavi Soft-Tech Pvt Ltd', Address: 'Plot 22, Industrial Estate', City: 'Pune', State: 'Maharashtra', PIN: '411026', GSTIN: '27AAACB0000A1Z9', PAN: 'AAACB0000A', Phone: '020-00000000', Email: 'info@example.com', Currency: 'INR', FinYear: '2026-27' }],
  DB_Years: [['2024-25', false], ['2025-26', false], ['2026-27', true]].map(([Year, Active]) => ({ Year, File: yearFile(Year as string), Active })),
  Logs: [], OnLineUsers: [], errlog: [],
})

function read<T>(key: string): T | null {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : null } catch { return null }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage unavailable: keep in-memory copy only */ }
}

export function loadStart(): StartDB {
  const saved = read<StartDB>(startKey)
  return saved ? { ...defaultStart(), ...saved } : defaultStart()
}
export const saveStart = (start: StartDB) => write(startKey, start)

export function loadYear(year: string): YearDB {
  const saved = read<YearDB>(yearKey(year))
  if (saved) return saved
  // A new financial-year database is created with master tables carried forward.
  const tables = master()
  if (year !== '2026-27') tables.StockLedger = []
  const db: YearDB = { year, file: yearFile(year), tables }
  write(yearKey(year), db)
  return db
}
export const saveYear = (db: YearDB) => write(yearKey(db.year), db)
export const resetYear = (year: string) => { localStorage.removeItem(yearKey(year)); return loadYear(year) }
export const resetAll = () => { Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k)) }

export const rows = (db: YearDB, table: string): Row[] => db.tables[table] || (db.tables[table] = [])

export function nextNumber(db: YearDB, table: string, key: string, prefix: string) {
  const tag = `${prefix}/${db.year.slice(2)}/`
  const max = rows(db, table).map(r => String(r[key] || '')).filter(v => v.startsWith(tag)).map(v => Number(v.slice(tag.length))).filter(Number.isFinite)
  return `${tag}${String(Math.max(0, ...max) + 1).padStart(4, '0')}`
}

export const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
export const r2 = (v: number) => Math.round(v * 100) / 100
export const fmt = (v: unknown) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num(v))
export const fmtQty = (v: unknown) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(num(v))

export function stockBalance(db: YearDB, itemId: string, storeID?: string) {
  return rows(db, 'StockLedger').filter(m => m.ItemId === itemId && (!storeID || m.storeID === storeID)).reduce((s, m) => s + num(m.Qty), 0)
}
export function stockMatrix(db: YearDB) {
  const map = new Map<string, { storeID: string; ItemId: string; Qty: number }>()
  rows(db, 'StockLedger').forEach(m => {
    const k = `${m.storeID}|${m.ItemId}`
    const cur = map.get(k) || { storeID: m.storeID, ItemId: m.ItemId, Qty: 0 }
    cur.Qty += num(m.Qty); map.set(k, cur)
  })
  return [...map.values()]
}

export const lookupName = (db: YearDB, table: string, key: string, labelField: string, value: unknown) =>
  rows(db, table).find(r => r[key] === value)?.[labelField] ?? String(value ?? '')

// Multi-level BOM explosion (AssmblyDef → AssmblyDefSub) returning leaf requirements per level.
export function explodeBOM(db: YearDB, item: string, qty: number, level = 0, seen = new Set<string>()): { Level: number; ItemId: string; Qty: number; Type: string }[] {
  const bom = rows(db, 'AssmblyDef').find(b => b.ParentItem === item && b.Status !== 'Archived')
  if (!bom || seen.has(item)) return []
  seen.add(item)
  return rows(db, 'AssmblyDefSub').filter(l => l.ParentId === bom.Id).flatMap(l => {
    const need = r2(qty * num(l.QtyPer) * (1 + num(l.ScrapPct) / 100))
    return [{ Level: level + 1, ItemId: l.ChildItem, Qty: need, Type: l.Level }, ...explodeBOM(db, l.ChildItem, need, level + 1, new Set(seen))]
  })
}

export function customerOutstanding(db: YearDB, custId: string) {
  const sum = (table: string, field: string, f: (r: Row) => boolean) => rows(db, table).filter(f).reduce((s, r) => s + num(r[field]), 0)
  const opening = num(rows(db, 'Customer').find(c => c.CustId === custId)?.OpeningBalance)
  return r2(opening + sum('DCINV', 'GrandTotal', r => r.Customer === custId) - sum('Receipts', 'Amount', r => r.Customer === custId)
    - sum('SCNGen', 'GrandTotal', r => r.Customer === custId)
    + sum('DbCrNote', 'Amount', r => r.PartyType === 'Customer' && r.Party === custId && r.NoteType === 'Debit Note')
    - sum('DbCrNote', 'Amount', r => r.PartyType === 'Customer' && r.Party === custId && r.NoteType === 'Credit Note'))
}
export function supplierOutstanding(db: YearDB, partyType: 'Supplier' | 'Vendor', id: string) {
  const sum = (table: string, field: string, f: (r: Row) => boolean) => rows(db, table).filter(f).reduce((s, r) => s + num(r[field]), 0)
  const opening = partyType === 'Supplier' ? num(rows(db, 'SUPPLIER').find(s => s.SuppId === id)?.OpeningBalance) : num(rows(db, 'Vendor').find(v => v.VendorId === id)?.OpeningBalance)
  const bills = partyType === 'Supplier' ? sum('InvoicePurch', 'GrandTotal', r => r.Supplier === id) - sum('PurchStoreCrNote', 'Value', r => r.Supplier === id) : sum('InvoiceSC', 'GrandTotal', r => r.Vendor === id) - sum('DcSubConStoreCrNote', 'Value', r => r.Vendor === id)
  return r2(opening + bills - sum('Payments', 'Amount', r => r.PartyType === partyType && r.Party === id)
    + sum('DbCrNote', 'Amount', r => r.PartyType === partyType && r.Party === id && r.NoteType === 'Credit Note')
    - sum('DbCrNote', 'Amount', r => r.PartyType === partyType && r.Party === id && r.NoteType === 'Debit Note'))
}

// Track tables (MfgPOTrack / PurchPOTrack / SubConPOTrack) are derived from linked documents.
export function dispatchedQty(db: YearDB, poId: string, itemId: string) {
  const dcs = rows(db, 'DCOUTGOINGINV').filter(d => d.MfgPORef === poId).map(d => d.DcId)
  return rows(db, 'DcOutgoingSubInv').filter(l => dcs.includes(l.ParentId) && l.Item === itemId).reduce((s, l) => s + num(l.Qty), 0)
}
export function receivedQty(db: YearDB, poId: string, itemId: string) {
  const grns = rows(db, 'Purchase').filter(g => g.PurchPORef === poId).map(g => g.PurchId)
  return rows(db, 'PurchaseSub').filter(l => grns.includes(l.ParentId) && l.Item === itemId).reduce((s, l) => s + num(l.Qty), 0)
}

export function addLog(start: StartDB, entry: Row) {
  start.Logs.unshift({ entryID: uid(), Time: new Date().toISOString(), ...entry })
  start.Logs = start.Logs.slice(0, 500)
}
