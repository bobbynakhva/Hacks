import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Ctx, Row, StartDB, YearDB } from './db'
import { RIGHTS, addLog, customerOutstanding, encodePassword, flagFor, fmt, fmtQty, loadStart, loadYear, lookupName, nextNumber, num, resetAll, rows, saveStart, saveYear, stockBalance, stockMatrix, supplierOutstanding, today, uid, yearFile } from './db'
import { FORMS, MENUS, formById, linkedForms, nextForms, storeOf } from './forms'
import type { Field, FormDef } from './forms'

type Session = { UserId: string; UserName: string; rights: Row }
type Seed = { header: Row; lines?: Row[] }
type Win = { wid: string; formId: string; seed?: Seed; openKey?: string }
type Commit = (mutate: (ctx: Ctx) => void, log?: { Action: string; Form: string; Detail?: string }) => void
type Opener = (formId: string, opts?: { seed?: Seed; openKey?: string }) => void

const FLOWS = [
  { title: '4.1 Sales & Order Fulfilment', steps: ['frmEnquiry', 'frmEstimation', 'frmQuote', 'frmMfgPO', 'frmDCOutgoing', 'frmInvoice', 'frmReceipts'] },
  { title: '4.2 Production Planning & Control', steps: ['frmMfgPO', 'frmMatReqAnaly', 'frmAutoFillBOMList', 'frmPlanProdCapacity', 'frmProdSchedule', 'frmProdnWOIssue', 'frmProdn', 'frmProdnWOReturn'] },
  { title: '4.3 Subcontracting & Job Work', steps: ['frmSubConPO', 'frmDCSubConOut', 'frmDCSubConIn', 'frmInspectionSC', 'frmInvoiceSC', 'frmPayments'] },
  { title: '4.4 Procurement & Material', steps: ['frmPurchasePO', 'frmPurchaseGRN', 'frmInspectionIn', 'frmInvoicePurch', 'frmPurchStoreCrNote'] },
  { title: '4.5 Stores & Inventory', steps: ['frmStock', 'frmStockIssue', 'frmStoreInterTrans', 'frmToolCrib'] },
  { title: '4.6 Quality & Calibration', steps: ['frmInspectionIn', 'frmInspectionInde', 'frmRejection', 'frmCalibrate', 'frmCalibrateDUE'] },
  { title: '4.7 HR & Payroll', steps: ['frmStaff', 'frmAttendance', 'frmShiftAlloc', 'frmStaffLoan', 'frmSalary'] },
  { title: '4.8 Financial Accounts & Banking', steps: ['frmReceipts', 'frmPayments', 'frmBankTrans', 'frmExpense', 'frmIncome', 'frmDbCrNote', 'frmAdvAdjust'] },
]

export default function App() {
  const [start, setStart] = useState<StartDB>(() => loadStart())
  const [db, setDb] = useState<YearDB | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [, force] = useState(0)
  const ctx = useMemo<Ctx | null>(() => db ? { db, start } : null, [db, start])

  const commit: Commit = (mutate, log) => {
    if (!ctx) return
    mutate(ctx)
    if (log && session) addLog(ctx.start, { UserId: session.UserId, ...log, DB: ctx.db.file })
    saveYear(ctx.db); saveStart(ctx.start)
    force(v => v + 1)
  }

  function login(year: string, userId: string, password: string) {
    const user = start.user1.find(u => u.UserId === userId)
    if (!user || user.Active === false) return 'User not found or inactive.'
    if (user.Password !== encodePassword(password)) return 'Invalid password.'
    const rights = start.userrights.find(r => r.UserId === userId) || { UserId: userId }
    const yearDb = loadYear(year)
    const nextStart = { ...start, OnLineUsers: [...start.OnLineUsers.filter(o => o.UserId !== userId), { UserId: userId, LoginTime: new Date().toISOString(), DB: yearDb.file }] }
    addLog(nextStart, { UserId: userId, Action: 'Login', Form: 'frmLogin', Detail: `Connected ${yearDb.file}`, DB: yearDb.file })
    saveStart(nextStart); setStart(nextStart); setDb(yearDb); setSession({ UserId: userId, UserName: user.UserName, rights })
    return ''
  }
  function logout() {
    if (!session) return
    const nextStart = { ...start, OnLineUsers: start.OnLineUsers.filter(o => o.UserId !== session.UserId) }
    addLog(nextStart, { UserId: session.UserId, Action: 'Logout', Form: 'mdiSSI' })
    saveStart(nextStart); setStart(nextStart); setSession(null); setDb(null)
  }
  function switchYear(year: string) { if (!session) return; setDb(loadYear(year)) }

  if (!session || !ctx) return <Login start={start} onLogin={login} />
  return <Shell ctx={ctx} session={session} commit={commit} onLogout={logout} onSwitchYear={switchYear} />
}

// ───────────────────────── frmLogin
function Login({ start, onLogin }: { start: StartDB; onLogin: (year: string, user: string, password: string) => string }) {
  const [year, setYear] = useState(() => start.DB_Years.find(y => y.Active)?.Year || start.DB_Years[0].Year)
  const [user, setUser] = useState(start.user1[0]?.UserId || '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  return <div className="login-screen"><form className="login-box" onSubmit={e => { e.preventDefault(); setError(onLogin(year, user, password)) }}>
    <div className="login-title"><span className="login-logo">SE</span><div><h1>SMART ERP</h1><small>Bhargavi Soft-Tech Pvt Ltd · frmLogin</small></div></div>
    <div className="login-db">DataBase/DBStart.mdb connected · {start.user1.length} users · {start.DB_Years.length} financial years</div>
    <label>Financial Year (cmbYear)<select value={year} onChange={e => setYear(e.target.value)}>{start.DB_Years.map(y => <option key={y.Year} value={y.Year}>{y.Year}  —  {y.File}{y.Active ? '  (Active)' : ''}</option>)}</select></label>
    <label>User Name (cmbUser)<select value={user} onChange={e => setUser(e.target.value)}>{start.user1.map(u => <option key={u.UserId} value={u.UserId}>{u.UserId} — {u.UserName}</option>)}</select></label>
    <label>Password (txtPassword)<input type="password" maxLength={12} autoFocus value={password} onChange={e => setPassword(e.target.value)} /></label>
    {error && <div className="login-error">{error}</div>}
    <div className="login-actions"><button type="submit" className="btn primary">Login</button><button type="button" className="btn" onClick={() => { setPassword(''); setError('') }}>Clear</button></div>
    <div className="login-hint">Default accounts: <b>ADMIN</b> / <code>ADMIN</code> · <b>CHECK26</b> / <code>CTY9J</code> (spec §6). Passwords are stored encoded in user1.</div>
  </form></div>
}

// ───────────────────────── mdiSSI
function Shell({ ctx, session, commit, onLogout, onSwitchYear }: { ctx: Ctx; session: Session; commit: Commit; onLogout: () => void; onSwitchYear: (y: string) => void }) {
  const [wins, setWins] = useState<Win[]>([])
  const [active, setActive] = useState('home')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  // Rights are read live from userrights so edits in frmUserRights apply immediately.
  const rights = ctx.start.userrights.find(r => r.UserId === session.UserId) || {}
  const can = (formId: string) => { const flag = flagFor(formId); return !flag || rights[flag] === true }
  const open: Opener = (formId, opts) => {
    setMenuOpen(null)
    if (!can(formId)) { alert(`Access denied: permission flag ${flagFor(formId)} is not granted to ${session.UserId}.`); return }
    const existing = !opts && wins.find(w => w.formId === formId && !w.seed)
    if (existing) { setActive(existing.wid); return }
    const wid = uid()
    setWins(ws => [...ws, { wid, formId, ...opts }]); setActive(wid); setMenuOpen(null)
    commit(() => {}, { Action: 'Open', Form: formId })
  }
  const close = (wid: string) => { setWins(ws => ws.filter(w => w.wid !== wid)); if (active === wid) setActive('home') }
  const settled = (wid: string) => setWins(ws => ws.map(w => w.wid === wid ? { ...w, seed: undefined, openKey: undefined } : w))
  useEffect(() => { const h = () => setMenuOpen(null); window.addEventListener('click', h); return () => window.removeEventListener('click', h) }, [])

  return <div className="mdi">
    <div className="menubar" onClick={e => e.stopPropagation()}>
      <span className="app-name">SMART ERP</span>
      {MENUS.map(menu => <div key={menu} className={`menu ${menuOpen === menu ? 'open' : ''}`}><button onClick={() => setMenuOpen(menuOpen === menu ? null : menu)} onMouseEnter={() => menuOpen && setMenuOpen(menu)}>{menu}</button>
        {menuOpen === menu && <div className="dropdown">{FORMS.filter(f => f.menu === menu).map(f => <button key={f.id} disabled={!can(f.id)} onClick={() => open(f.id)}><span>{f.title}</span><small>{f.id}</small></button>)}</div>}
      </div>)}
      <div className="menubar-right">
        <select className="year-switch" value={ctx.db.year} onChange={e => { onSwitchYear(e.target.value); setWins([]); setActive('home') }} title="Financial Year Switcher (frmCompMaster)">{ctx.start.DB_Years.map(y => <option key={y.Year} value={y.Year}>FY {y.Year}</option>)}</select>
        <span className="user-chip">{session.UserId}</span><button className="btn small" onClick={onLogout}>Logout</button>
      </div>
    </div>
    <div className="toolbar">{['frmEnquiry', 'frmQuote', 'frmMfgPO', 'frmProdnWOIssue', 'frmPurchasePO', 'frmPurchaseGRN', 'frmStock', 'frmDCOutgoing', 'frmInvoice', 'frmReceipts'].map(id => { const f = formById(id)!; return <button key={id} className="tool" disabled={!can(id)} onClick={() => open(id)}>{f.title}</button> })}</div>
    <div className="tabs">
      <button className={`tab ${active === 'home' ? 'active' : ''}`} onClick={() => setActive('home')}>Dashboard</button>
      {wins.map(w => { const f = formById(w.formId)!; return <button key={w.wid} className={`tab ${active === w.wid ? 'active' : ''}`} onClick={() => setActive(w.wid)}>{f.title}{w.seed ? ' (new)' : ''}<span className="tab-close" onClick={e => { e.stopPropagation(); close(w.wid) }}>×</span></button> })}
    </div>
    <div className="workspace">
      <div style={{ display: active === 'home' ? 'block' : 'none' }} className="win"><Dashboard ctx={ctx} open={open} can={can} /></div>
      {wins.map(w => <div key={w.wid} style={{ display: active === w.wid ? 'flex' : 'none' }} className="win"><Window win={w} ctx={ctx} commit={commit} open={open} session={session} onClose={() => close(w.wid)} onSaved={() => settled(w.wid)} /></div>)}
    </div>
    <div className="statusbar"><span>User: <b>{session.UserId}</b> ({session.UserName})</span><span>DB: DataBase/{ctx.db.file}</span><span>FY {ctx.db.year}</span><span>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span><span>{wins.length} window(s) open</span><span className="grow" />{RIGHTS.filter(r => rights[r.flag]).length}/{RIGHTS.length} rights granted</div>
  </div>
}

function Window({ win, ctx, commit, open, session, onClose, onSaved }: { win: Win; ctx: Ctx; commit: Commit; open: Opener; session: Session; onClose: () => void; onSaved: () => void }) {
  const def = formById(win.formId)!
  if (def.custom === 'rights') return <RightsMatrix ctx={ctx} commit={commit} def={def} />
  if (def.custom === 'upload') return <UploadAssembly ctx={ctx} commit={commit} def={def} open={open} />
  if (def.custom === 'search') return <UniversalSearch ctx={ctx} def={def} open={open} />
  if (def.custom === 'misc') return <MiscUtilities ctx={ctx} commit={commit} def={def} />
  if (def.report) return <ReportWindow ctx={ctx} def={def} open={open} />
  return <FormWindow def={def} ctx={ctx} commit={commit} open={open} session={session} seed={win.seed} openKey={win.openKey} onClose={onClose} onSaved={onSaved} />
}

// ───────────────────────── Dashboard (MDI home)
function Dashboard({ ctx, open, can }: { ctx: Ctx; open: Opener; can: (id: string) => boolean }) {
  const db = ctx.db
  const openPOs = rows(db, 'MfgPO').filter(p => !['Closed', 'Cancelled'].includes(p.Status))
  const openIWO = rows(db, 'ProdnIWOIss').filter(w => !['Completed', 'Closed'].includes(w.Status))
  const grnPending = rows(db, 'Purchase').filter(g => g.Status === 'Awaiting Inspection')
  const below = rows(db, 'Item').filter(i => num(i.ReorderLevel) > 0 && stockBalance(db, i.ItemId) < num(i.ReorderLevel))
  const calDue = rows(db, 'Calibrate').filter(c => { const d = new Date(c.LastCalDate); d.setMonth(d.getMonth() + num(c.FrequencyMonths)); return d.getTime() < Date.now() + 30 * 86400000 })
  const receivable = rows(db, 'Customer').reduce((s, c) => s + customerOutstanding(db, c.CustId), 0)
  const payable = rows(db, 'SUPPLIER').reduce((s, c) => s + supplierOutstanding(db, 'Supplier', c.SuppId), 0) + rows(db, 'Vendor').reduce((s, v) => s + supplierOutstanding(db, 'Vendor', v.VendorId), 0)
  const stockValue = stockMatrix(db).reduce((s, r) => s + r.Qty * num(rows(db, 'Item').find(i => i.ItemId === r.ItemId)?.Rate), 0)
  const Card = ({ label, value, form, tone = '' }: { label: string; value: string | number; form: string; tone?: string }) => <button className={`card ${tone}`} onClick={() => open(form)} disabled={!can(form)}><small>{label}</small><strong>{value}</strong><span>{form}</span></button>
  return <div className="dashboard">
    <div className="cards">
      <Card label="Open Customer POs" value={openPOs.length} form="frmViewPODetails" />
      <Card label="Active Job Cards (IWO)" value={openIWO.length} form="frmProdnWOIssue" />
      <Card label="GRNs Awaiting Inspection" value={grnPending.length} form="frmInspectionIn" tone={grnPending.length ? 'warn' : ''} />
      <Card label="Items Below Reorder Level" value={below.length} form="frmStock" tone={below.length ? 'warn' : ''} />
      <Card label="Calibration Due (30 days)" value={calDue.length} form="frmCalibrateDUE" tone={calDue.length ? 'alert' : ''} />
      <Card label="Stock Value (Std Rate)" value={`₹${fmt(stockValue)}`} form="frmStock" />
      <Card label="Receivables" value={`₹${fmt(receivable)}`} form="frmReceipts" />
      <Card label="Payables" value={`₹${fmt(payable)}`} form="frmPayments" />
    </div>
    <h2>End-to-end business flows (spec §4)</h2>
    <div className="flows">{FLOWS.map(fl => <div key={fl.title} className="flow"><h3>{fl.title}</h3><div className="flow-steps">{fl.steps.map((s, i) => { const f = formById(s)!; return <span key={s + i}><button className="step" disabled={!can(s)} onClick={() => open(s)}><b>{f.title}</b><small>{s}</small></button>{i < fl.steps.length - 1 && <i className="arrow">→</i>}</span> })}</div></div>)}</div>
    <h2>Form-to-database mapping (spec §5) — {FORMS.length + 2} forms</h2>
    <table className="grid"><thead><tr><th>Form</th><th>UI Display Title</th><th>Menu</th><th>Primary Tables</th><th>Primary Key</th><th>Permission Flag</th><th>Records</th></tr></thead><tbody>
      <tr><td>frmLogin</td><td>User Login & Database Selector</td><td>—</td><td>user1, DB_Years, userrights</td><td>UserId</td><td>—</td><td>{ctx.start.user1.length}</td></tr>
      <tr><td>mdiSSI</td><td>MDI Main Executive Dashboard</td><td>—</td><td>MENU, ViewRights, userrights</td><td>Id, UserId</td><td>—</td><td>—</td></tr>
      {FORMS.map(f => <tr key={f.id} className={can(f.id) ? 'link' : 'muted'} onClick={() => can(f.id) && open(f.id)}><td>{f.id}</td><td>{f.title}</td><td>{f.menu}</td><td>{f.tables.join(', ')}</td><td>{f.key}</td><td>{flagFor(f.id)}</td><td>{f.scope === 'start' ? ((ctx.start as unknown as Record<string, Row[]>)[storeOf(f)] || []).length : rows(db, storeOf(f)).length}</td></tr>)}
    </tbody></table>
  </div>
}

// ───────────────────────── Generic form engine
function tableOf(ctx: Ctx, def: FormDef, table = storeOf(def)): Row[] {
  if (def.scope === 'start') { const s = ctx.start as unknown as Record<string, Row[]>; return s[table] || (s[table] = []) }
  return rows(ctx.db, table)
}
function lookupRows(ctx: Ctx, f: Field): Row[] { return f.lookup?.scope === 'start' ? (ctx.start as unknown as Record<string, Row[]>)[f.lookup.table] || [] : rows(ctx.db, f.lookup!.table) }
function defaults(def: FormDef, fields: Field[], ctx: Ctx): Row {
  const row: Row = {}
  fields.forEach(f => { if (f.default !== undefined) row[f.name] = typeof f.default === 'function' ? (f.default as (c: Ctx) => unknown)(ctx) : f.default })
  void def
  return row
}
function recompute(def: FormDef, header: Row, lines: Row[], ctx: Ctx) {
  const key = header[def.key]
  lines.forEach(l => { l.ParentId = key; def.lines?.fields.forEach(f => { if (f.type === 'computed' && f.compute) l[f.name] = f.compute(l, lines, ctx) }) })
  def.fields.forEach(f => { if (f.type === 'computed' && f.compute) header[f.name] = f.compute(header, lines, ctx) })
}
function display(ctx: Ctx, f: Field, v: unknown) {
  if (v === undefined || v === null || v === '') return ''
  if (f.type === 'check') return v ? 'Yes' : 'No'
  if (f.type === 'password') return '•••••'
  if (f.type === 'lookup') { const r = lookupRows(ctx, f).find(x => x[f.lookup!.key] === v); return r ? `${v} — ${r[f.lookup!.label]}` : String(v) }
  if (f.money) return fmt(v)
  if (f.type === 'number') return fmtQty(v)
  return String(v)
}

function FormWindow({ def, ctx, commit, open, session, seed, openKey, onClose, onSaved }: { def: FormDef; ctx: Ctx; commit: Commit; open: Opener; session: Session; seed?: Seed; openKey?: string; onClose: () => void; onSaved: () => void }) {
  const records = tableOf(ctx, def)
  const [mode, setMode] = useState<'browse' | 'edit'>(seed || def.single ? 'edit' : 'browse')
  const [isNew, setIsNew] = useState(Boolean(seed) || (def.single && records.length === 0))
  const [header, setHeader] = useState<Row>(() => seed ? { ...defaults(def, def.fields, ctx), ...seed.header, ...(def.prefix ? { [def.key]: nextNumber(ctx.db, storeOf(def), def.key, def.prefix) } : {}) } : def.single && records[0] ? { ...records[0] } : {})
  const [lines, setLines] = useState<Row[]>(() => seed?.lines?.map(l => ({ Id: uid(), ...defaults(def, def.lines?.fields || [], ctx), ...l })) || [])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [showList, setShowList] = useState(!seed)
  const original = useRef<Row | null>(null)
  const key = header[def.key]
  const hasDoc = key !== undefined && key !== ''
  const editing = mode === 'edit'

  useEffect(() => { if (openKey) { const r = records.find(x => x[def.key] === openKey); if (r) load(r) } }, [openKey]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (seed) { const h = { ...header }; const ls = lines.map(l => ({ ...l })); recompute(def, h, ls, ctx); setHeader(h); setLines(ls) } }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function load(r: Row) {
    original.current = r
    const h = { ...r }; const ls = def.lines ? tableOf(ctx, def, def.lines.table).filter(l => l.ParentId === r[def.key]).map(l => ({ ...l })) : []
    recompute(def, h, ls, ctx); setHeader(h); setLines(ls); setMode('browse'); setIsNew(false); setError(''); setMsg('')
  }
  function startNew() {
    original.current = null
    const h = defaults(def, def.fields, ctx); if (def.prefix) h[def.key] = nextNumber(ctx.db, storeOf(def), def.key, def.prefix)
    recompute(def, h, [], ctx); setHeader(h); setLines([]); setMode('edit'); setIsNew(true); setError(''); setMsg('')
  }
  function update(patch: Row, f?: Field) {
    const h = { ...header, ...patch }
    if (f?.fill && f.lookup) { const src = lookupRows(ctx, f).find(x => x[f.lookup!.key] === patch[f.name]); if (src) Object.entries(f.fill).forEach(([target, from]) => { if (def.fields.some(x => x.name === target)) h[target] = src[from] }) }
    const ls = lines.map(l => ({ ...l })); recompute(def, h, ls, ctx); setHeader(h); setLines(ls)
  }
  function updateLine(i: number, patch: Row, f?: Field) {
    const ls = lines.map((l, idx) => idx === i ? { ...l, ...patch } : { ...l })
    if (f?.fill && f.lookup) { const src = lookupRows(ctx, f).find(x => x[f.lookup!.key] === patch[f.name]); if (src) Object.entries(f.fill).forEach(([target, from]) => { if (def.lines!.fields.some(x => x.name === target)) ls[i][target] = src[from] }) }
    const h = { ...header }; recompute(def, h, ls, ctx); setHeader(h); setLines(ls)
  }
  function addLine() { const ls = [...lines, { Id: uid(), ...defaults(def, def.lines!.fields, ctx) }]; const h = { ...header }; recompute(def, h, ls, ctx); setHeader(h); setLines(ls) }
  function removeLine(i: number) { const ls = lines.filter((_, idx) => idx !== i); const h = { ...header }; recompute(def, h, ls, ctx); setHeader(h); setLines(ls) }

  function save() {
    const missing = def.fields.filter(f => f.required && (header[f.name] === undefined || header[f.name] === '')).map(f => f.label)
    if (missing.length) return setError(`Required: ${missing.join(', ')}`)
    if (def.lines) { const bad = lines.findIndex(l => def.lines!.fields.some(f => f.required && (l[f.name] === undefined || l[f.name] === ''))); if (bad >= 0) return setError(`Line ${bad + 1}: fill all required columns (${def.lines.fields.filter(f => f.required).map(f => f.label).join(', ')})`) }
    const h = { ...header }; const ls = lines.map(l => ({ ...l }))
    if (isNew && !def.prefix && !def.single) { if (records.some(r => r[def.key] === h[def.key])) return setError(`${def.key} "${h[def.key]}" already exists.`) }
    if (isNew && def.prefix) h[def.key] = nextNumber(ctx.db, storeOf(def), def.key, def.prefix)
    if (def.single && !h[def.key]) h[def.key] = 'COMP'
    recompute(def, h, ls, ctx)
    if (def.stock) {
      // Stock cannot go negative: check net outward movement per store/item against current balance (excluding this document's earlier posting).
      const net = new Map<string, number>()
      def.stock(h, ls, ctx).forEach(mv => net.set(`${mv.storeID}|${mv.ItemId}`, (net.get(`${mv.storeID}|${mv.ItemId}`) || 0) + mv.Qty))
      for (const [k2, qty] of net) {
        if (qty >= 0) continue
        const [storeID, itemId] = k2.split('|')
        const posted = rows(ctx.db, 'StockLedger').filter(mv => mv.RefForm === def.id && mv.RefId === h[def.key] && mv.storeID === storeID && mv.ItemId === itemId).reduce((s2, mv) => s2 + num(mv.Qty), 0)
        const available = stockBalance(ctx.db, itemId, storeID) - posted
        if (available + qty < -0.0001) return setError(`Insufficient stock: ${itemId} in store ${storeID} has ${fmtQty(available)}, required ${fmtQty(-qty)}.`)
      }
    }
    def.fields.filter(f => f.type === 'password').forEach(f => { if (h[f.name] !== original.current?.[f.name]) h[f.name] = encodePassword(String(h[f.name])) })
    commit(c => {
      const table = tableOf(c, def); const idx = table.findIndex(r => r[def.key] === (original.current?.[def.key] ?? h[def.key]))
      if (idx >= 0) table[idx] = h; else table.unshift(h)
      if (def.lines) { const lt = tableOf(c, def, def.lines.table); const keep = lt.filter(l => l.ParentId !== h[def.key] && l.ParentId !== original.current?.[def.key]); lt.splice(0, lt.length, ...keep, ...ls) }
      if (def.stock) { const led = rows(c.db, 'StockLedger'); const keep = led.filter(m => !(m.RefForm === def.id && m.RefId === h[def.key])); led.splice(0, led.length, ...keep, ...def.stock(h, ls, c).map(mv => ({ Id: uid(), Date: h[def.docDate || 'Date'] || today(), ...mv, RefForm: def.id, RefId: h[def.key], Remarks: def.title }))) }
      def.after?.(h, ls, c)
      if (def.id === 'frmUserEntry' && isNew && !c.start.userrights.some(r => r.UserId === h.UserId)) c.start.userrights.push({ UserId: h.UserId })
      if (def.id === 'frmCompMaster') c.start.DB_Years.forEach(y => { y.Active = y.Year === h.FinYear })
    }, { Action: isNew ? 'INSERT' : 'UPDATE', Form: def.id, Detail: `${storeOf(def)}.${def.key}=${h[def.key]}` })
    recompute(def, h, ls, ctx) // refresh derived ledger/stock fields now that the document is posted
    onSaved()
    original.current = h; setHeader(h); setLines(ls); setMode(def.single ? 'edit' : 'browse'); setIsNew(false); setError(''); setMsg(`${isNew ? 'Saved' : 'Updated'} ${h[def.key]} → ${storeOf(def)}${def.lines ? ` + ${ls.length} rows in ${def.lines.table}` : ''}${def.stock ? ' · stock posted' : ''}`)
  }
  function remove() {
    if (!original.current || !confirm(`DELETE ${storeOf(def)} record ${key}?`)) return
    const k = original.current[def.key]
    commit(c => {
      const table = tableOf(c, def); table.splice(0, table.length, ...table.filter(r => r[def.key] !== k))
      if (def.lines) { const lt = tableOf(c, def, def.lines.table); lt.splice(0, lt.length, ...lt.filter(l => l.ParentId !== k)) }
      const led = rows(c.db, 'StockLedger'); led.splice(0, led.length, ...led.filter(m => !(m.RefForm === def.id && m.RefId === k)))
    }, { Action: 'DELETE', Form: def.id, Detail: `${storeOf(def)}.${def.key}=${k}` })
    original.current = null; setHeader({}); setLines([]); setMode('browse'); setMsg(`Deleted ${k}`)
  }
  function cancel() { if (original.current) load(original.current); else { setHeader({}); setLines([]); setMode('browse'); setIsNew(false) } setError('') }
  function navigate(step: number) { if (!records.length) return; const i = records.findIndex(r => r[def.key] === key); const next = step === Infinity ? records.length - 1 : step === -Infinity ? 0 : Math.min(records.length - 1, Math.max(0, (i < 0 ? 0 : i) + step)); load(records[next]) }

  const listCols = def.fields.filter(f => f.type !== 'textarea' && f.type !== 'password').slice(0, 6)
  const filtered = records.filter(r => !search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))
  const links = hasDoc && !isNew ? linkedForms(def).map(l => ({ ...l, docs: tableOf(ctx, l.form).filter(r => r[l.field] === key) })).filter(l => l.docs.length) : []
  const nexts = hasDoc && !isNew ? nextForms(def.id) : []

  return <div className="form-window">
    <div className="win-title"><span><b>{def.title}</b> <code>{def.id}</code></span><span className="win-tables">Tables: {def.tables.join(', ')} · Key: {def.key}</span><button className="btn small" onClick={onClose}>Close</button></div>
    <div className="btnbar">
      {!def.single && <button className="btn" onClick={startNew} disabled={editing}>New</button>}
      {!def.single && <button className="btn" onClick={() => { setMode('edit'); setError('') }} disabled={editing || !hasDoc}>Edit</button>}
      <button className="btn primary" onClick={save} disabled={!editing}>Save</button>
      {!def.single && <button className="btn" onClick={cancel} disabled={!editing}>Cancel</button>}
      {!def.single && <button className="btn danger" onClick={remove} disabled={editing || !hasDoc}>Delete</button>}
      <button className="btn" onClick={() => window.print()} disabled={!hasDoc}>Print</button>
      {!def.single && <span className="nav"><button className="btn" onClick={() => navigate(-Infinity)}>|◀</button><button className="btn" onClick={() => navigate(-1)}>◀</button><button className="btn" onClick={() => navigate(1)}>▶</button><button className="btn" onClick={() => navigate(Infinity)}>▶|</button></span>}
      {!def.single && <button className="btn" onClick={() => setShowList(!showList)}>{showList ? 'Hide' : 'Show'} Browse</button>}
      <span className="grow" /><span className="mode">{isNew ? 'NEW RECORD' : editing ? 'EDIT MODE' : hasDoc ? 'VIEW' : `${records.length} records`}</span>
    </div>
    {error && <div className="error">{error}</div>}{msg && !error && <div className="ok">{msg}</div>}
    <div className="form-body">
      {showList && !def.single && <div className="browse"><input placeholder={`Find in ${storeOf(def)}…`} value={search} onChange={e => setSearch(e.target.value)} />
        <div className="browse-list"><table className="grid"><thead><tr><th>{def.key}</th>{listCols.filter(f => f.name !== def.key).slice(0, 3).map(f => <th key={f.name}>{f.label}</th>)}</tr></thead><tbody>{filtered.map(r => <tr key={String(r[def.key])} className={r[def.key] === key ? 'sel' : ''} onClick={() => !editing && load(r)}><td>{String(r[def.key])}</td>{listCols.filter(f => f.name !== def.key).slice(0, 3).map(f => <td key={f.name}>{display(ctx, f, r[f.name])}</td>)}</tr>)}{!filtered.length && <tr><td colSpan={4} className="muted">No records</td></tr>}</tbody></table></div></div>}
      <div className="doc print-area">
        <div className="print-head"><b>{ctx.start.CompMaster[0]?.CompName}</b> · {def.title} · {String(key ?? '')} · FY {ctx.db.year}</div>
        {!hasDoc && !editing ? <div className="empty">Select a record from the browse list, or click <b>New</b>.<p>{def.description}</p></div> : <>
          <p className="desc">{def.description}</p>
          <div className="fields">
            {def.prefix && <div className="field"><label>{def.key}</label><input readOnly value={String(key ?? '')} /></div>}
            {def.fields.map(f => <FieldInput key={f.name} f={f} value={header[f.name]} ctx={ctx} header={header} editing={editing && !(isNew === false && f.name === def.key && !def.single)} onChange={v => update({ [f.name]: v }, f)} />)}
          </div>
          {def.lines && <div className="lines"><div className="lines-head"><b>{def.lines.title}</b> <code>{def.lines.table}</code>{editing && <button className="btn small" onClick={addLine}>+ Add row</button>}</div>
            <table className="grid lines-grid"><thead><tr><th>#</th>{def.lines.fields.map(f => <th key={f.name}>{f.label}</th>)}{editing && <th />}</tr></thead><tbody>
              {lines.map((l, i) => <tr key={l.Id || i}><td>{i + 1}</td>{def.lines!.fields.map(f => <td key={f.name}><FieldInput f={f} value={l[f.name]} ctx={ctx} header={header} editing={editing} compact onChange={v => updateLine(i, { [f.name]: v }, f)} /></td>)}{editing && <td><button className="btn small danger" onClick={() => removeLine(i)}>✕</button></td>}</tr>)}
              {!lines.length && <tr><td colSpan={def.lines.fields.length + 2} className="muted">No rows{editing ? ' — click Add row' : ''}</td></tr>}
            </tbody></table></div>}
          {(nexts.length > 0 || links.length > 0) && <div className="workflow">
            {nexts.length > 0 && <div><b>Next step in workflow</b><div className="chips">{nexts.map(nf => <button key={nf.id} className="btn chip" onClick={() => open(nf.id, { seed: nf.from![def.id](header, lines, ctx) })}>Create {nf.title} <small>{nf.id}</small></button>)}</div></div>}
            {links.length > 0 && <div><b>Linked documents</b><div className="chips">{links.map(l => l.docs.map(dc => <button key={l.form.id + dc[l.form.key]} className="btn chip ghost" onClick={() => open(l.form.id, { openKey: String(dc[l.form.key]) })}>{l.form.title}: {String(dc[l.form.key])}{dc.Status ? ` · ${dc.Status}` : ''}</button>))}</div></div>}
          </div>}
          <div className="audit">Operator: {session.UserId} · {def.scope === 'start' ? 'DBStart.mdb' : ctx.db.file}</div>
        </>}
      </div>
    </div>
  </div>
}

function FieldInput({ f, value, ctx, header, editing, compact, onChange }: { f: Field; value: unknown; ctx: Ctx; header: Row; editing: boolean; compact?: boolean; onChange: (v: unknown) => void }) {
  const ro = !editing || f.type === 'computed'
  const id = useRef(`f-${f.name}-${uid()}`).current
  const wrap = (el: ReactNode) => compact ? <>{el}</> : <div className={`field ${f.wide ? 'wide' : ''} ${f.type === 'computed' ? 'computed' : ''}`}><label htmlFor={id}>{f.label}{f.required && <i> *</i>}</label>{el}</div>
  const a11y = { id, 'aria-label': f.label }
  if (f.type === 'computed') return wrap(<input {...a11y} readOnly className="ro" value={display(ctx, f, value)} />)
  if (!editing) return wrap(<input {...a11y} readOnly className="ro" value={display(ctx, f, value)} />)
  if (f.type === 'select') return wrap(<select {...a11y} value={String(value ?? '')} onChange={e => onChange(e.target.value)}><option value="">—</option>{f.options!.map(o => <option key={o}>{o}</option>)}</select>)
  if (f.type === 'lookup') { const list = lookupRows(ctx, f).filter(r => !f.lookup!.filter || f.lookup!.filter(r, header)); return wrap(<select {...a11y} value={String(value ?? '')} onChange={e => onChange(e.target.value)}><option value="">— select —</option>{list.map(r => <option key={String(r[f.lookup!.key])} value={String(r[f.lookup!.key])}>{String(r[f.lookup!.key])} — {String(r[f.lookup!.label] ?? '')}</option>)}</select>) }
  if (f.type === 'check') return wrap(<label className="check"><input {...a11y} type="checkbox" checked={Boolean(value)} onChange={e => onChange(e.target.checked)} /> {compact ? '' : 'Yes'}</label>)
  if (f.type === 'textarea') return wrap(<textarea {...a11y} rows={2} value={String(value ?? '')} onChange={e => onChange(e.target.value)} />)
  if (f.type === 'number') return wrap(<input {...a11y} type="number" step="any" value={value === undefined || value === null ? '' : String(value)} onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))} readOnly={ro} />)
  const type = f.type === 'password' ? 'password' : f.type === 'date' ? 'date' : f.type === 'month' ? 'month' : f.type === 'time' ? 'time' : 'text'
  return wrap(<input {...a11y} type={type} value={String(value ?? '')} onChange={e => onChange(e.target.value)} readOnly={ro} />)
}

// ───────────────────────── Reports (SELECT-only forms)
function ReportWindow({ ctx, def, open }: { ctx: Ctx; def: FormDef; open: Opener }) {
  const [params, setParams] = useState<Row>(() => defaults(def, def.report!.params || [], ctx))
  const result = def.report!.run(ctx, params)
  const exportCsv = () => { const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`; const csv = [result.columns.join(','), ...result.rows.map(r => result.columns.map(c => esc(r[c])).join(','))].join('\r\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `${def.id}-${ctx.db.year}.csv`; a.click() }
  const owner = (col: string, v: unknown) => { const map: Record<string, string> = { POId: 'frmMfgPO', ItemId: 'frmItem', Machine: 'frmMachine', InstrumentCode: 'frmCalibrate', RefId: '' }; return map[col] && v ? { form: map[col], key: String(v) } : null }
  return <div className="form-window"><div className="win-title"><span><b>{def.title}</b> <code>{def.id}</code></span><span className="win-tables">SELECT · Tables: {def.tables.join(', ')}</span></div>
    <div className="btnbar">{def.report!.params?.map(p => <span key={p.name} className="param"><label>{p.label}</label><FieldInput f={p} value={params[p.name]} ctx={ctx} header={params} editing compact onChange={v => setParams({ ...params, [p.name]: v })} /></span>)}<span className="grow" /><span className="mode">{result.rows.length} rows</span><button className="btn" onClick={exportCsv}>Export CSV</button><button className="btn" onClick={() => window.print()}>Print</button></div>
    <p className="desc pad">{def.description}</p>
    <div className="report print-area"><table className="grid"><thead><tr>{result.columns.map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{result.rows.map((r, i) => <tr key={i} className={/OVERDUE|BOTTLENECK|BELOW REORDER|Raise|Schedule/.test(String(r.Alert || r.Remark || r.Reorder || r.Action)) ? 'hot' : ''}>{result.columns.map(c => { const o = owner(c, r[c]); return <td key={c}>{o ? <button className="linkbtn" onClick={() => open(o.form, { openKey: o.key })}>{String(r[c])}</button> : typeof r[c] === 'number' ? fmtQty(r[c]) : String(r[c] ?? '')}</td> })}</tr>)}{!result.rows.length && <tr><td colSpan={result.columns.length} className="muted">No data</td></tr>}</tbody></table></div></div>
}

// ───────────────────────── frmUserRights
function RightsMatrix({ ctx, commit, def }: { ctx: Ctx; commit: Commit; def: FormDef }) {
  const [userId, setUserId] = useState(ctx.start.user1[0]?.UserId || '')
  const row = ctx.start.userrights.find(r => r.UserId === userId) || { UserId: userId }
  const set = (patch: Row) => commit(c => { const i = c.start.userrights.findIndex(r => r.UserId === userId); if (i >= 0) c.start.userrights[i] = { ...c.start.userrights[i], ...patch }; else c.start.userrights.push({ UserId: userId, ...patch }) }, { Action: 'UPDATE', Form: def.id, Detail: `userrights.UserId=${userId}` })
  const granted = RIGHTS.filter(r => row[r.flag]).length
  return <div className="form-window"><div className="win-title"><span><b>{def.title}</b> <code>{def.id}</code></span><span className="win-tables">Tables: userrights · Key: UserId · {RIGHTS.length} permission flags</span></div>
    <div className="btnbar"><label>User</label><select value={userId} onChange={e => setUserId(e.target.value)}>{ctx.start.user1.map(u => <option key={u.UserId} value={u.UserId}>{u.UserId} — {u.UserName}</option>)}</select><button className="btn" onClick={() => set(Object.fromEntries(RIGHTS.map(r => [r.flag, true])))}>Grant all</button><button className="btn" onClick={() => set(Object.fromEntries(RIGHTS.map(r => [r.flag, false])))}>Revoke all</button><span className="grow" /><span className="mode">{granted}/{RIGHTS.length} granted · changes save immediately</span></div>
    <div className="rights">{MENUS.map(menu => { const items = RIGHTS.filter(r => formById(r.form)?.menu === menu); if (!items.length) return null; return <div key={menu} className="rights-group"><h3>{menu} <button className="linkbtn" onClick={() => set(Object.fromEntries(items.map(r => [r.flag, true])))}>all</button> <button className="linkbtn" onClick={() => set(Object.fromEntries(items.map(r => [r.flag, false])))}>none</button></h3>{items.map(r => <label key={r.flag} className="right"><input type="checkbox" checked={Boolean(row[r.flag])} onChange={e => set({ [r.flag]: e.target.checked })} /><code>{r.flag}</code><span>{r.form}</span><small>{r.label}</small></label>)}</div> })}</div></div>
}

// ───────────────────────── frmUploadAssembly
function UploadAssembly({ ctx, commit, def, open }: { ctx: Ctx; commit: Commit; def: FormDef; open: Opener }) {
  const [text, setText] = useState('ASSY-DRV-01,SHAFT-008,1,NOS,Manufactured\nASSY-DRV-01,BRG-6205,2,NOS,Bought-out')
  const [result, setResult] = useState('')
  const parsed = text.split(/\n+/).map(l => l.split(',').map(s => s.trim())).filter(p => p.length >= 3 && p[0])
  const unknown = parsed.flatMap(p => [p[0], p[1]]).filter(i => !rows(ctx.db, 'Item').some(it => it.ItemId === i))
  function upload() {
    const parents = [...new Set(parsed.map(p => p[0]))]
    commit(c => parents.forEach(parent => {
      let bom = rows(c.db, 'AssmblyDef').find(b => b.ParentItem === parent && b.Status !== 'Archived')
      if (!bom) { bom = { Id: nextNumber(c.db, 'AssmblyDef', 'Id', 'BOM'), ParentItem: parent, Description: 'Uploaded assembly', Rev: 'A', Date: today(), Status: 'Active' }; rows(c.db, 'AssmblyDef').unshift(bom) }
      parsed.filter(p => p[0] === parent).forEach(p => rows(c.db, 'AssmblyDefSub').push({ Id: uid(), ParentId: bom!.Id, ChildItem: p[1], QtyPer: num(p[2]) || 1, UOM: p[3] || rows(c.db, 'Item').find(i => i.ItemId === p[1])?.UOM || 'NOS', Level: p[4] || 'Manufactured', ScrapPct: num(p[5]) }))
    }), { Action: 'INSERT', Form: def.id, Detail: `${parsed.length} BOM rows for ${parents.length} assemblies` })
    setResult(`Uploaded ${parsed.length} rows into AssmblyDef / AssmblyDefSub for ${parents.join(', ')}.`)
  }
  return <div className="form-window"><div className="win-title"><span><b>{def.title}</b> <code>{def.id}</code></span><span className="win-tables">INSERT · AssmblyDef</span></div>
    <div className="pad"><p className="desc">Paste CSV rows: <code>Parent, Child, QtyPer, UOM, Type(Manufactured|Bought-out|Raw Material|Sub-Assembly), Scrap%</code></p>
      <textarea rows={10} className="csv" value={text} onChange={e => setText(e.target.value)} />
      <div className="btnbar"><button className="btn primary" disabled={!parsed.length || unknown.length > 0} onClick={upload}>Upload {parsed.length} rows</button><button className="btn" onClick={() => open('frmAutoFillBOMList')}>Open BOM form</button><span className="grow" />{unknown.length > 0 && <span className="error inline">Unknown item codes: {[...new Set(unknown)].join(', ')} — create them in frmItem first.</span>}</div>
      {result && <div className="ok">{result}</div>}</div></div>
}

// ───────────────────────── frmViewSearch
function UniversalSearch({ ctx, def, open }: { ctx: Ctx; def: FormDef; open: Opener }) {
  const [q, setQ] = useState('')
  const [table, setTable] = useState('')
  const tables = Object.keys(ctx.db.tables).sort()
  const hits = q.length > 1 ? Object.entries(ctx.db.tables).filter(([t]) => !table || t === table).flatMap(([t, rs]) => rs.filter(r => JSON.stringify(r).toLowerCase().includes(q.toLowerCase())).slice(0, 50).map(r => ({ table: t, row: r }))) : []
  const ownerOf = (t: string) => FORMS.find(f => storeOf(f) === t && !f.report && !f.custom)
  return <div className="form-window"><div className="win-title"><span><b>{def.title}</b> <code>{def.id}</code></span><span className="win-tables">SELECT across {tables.length} tables in {ctx.db.file}</span></div>
    <div className="btnbar"><input className="search" autoFocus placeholder="Search value in any table (e.g. Apex, SHAFT-008, SO/26-27/0001)…" value={q} onChange={e => setQ(e.target.value)} /><select value={table} onChange={e => setTable(e.target.value)}><option value="">All tables</option>{tables.map(t => <option key={t}>{t}</option>)}</select><span className="grow" /><span className="mode">{hits.length} hits</span></div>
    <div className="report"><table className="grid"><thead><tr><th>Table</th><th>Key</th><th>Record</th><th>Open</th></tr></thead><tbody>{hits.map((h, i) => { const f = ownerOf(h.table); const k = f ? h.row[f.key] : h.row.Id || h.row.ParentId; return <tr key={i}><td>{h.table}</td><td>{String(k ?? '')}</td><td className="json">{Object.entries(h.row).filter(([k2]) => k2 !== 'Id').slice(0, 8).map(([k2, v]) => `${k2}=${String(v)}`).join(' · ')}</td><td>{f && <button className="linkbtn" onClick={() => open(f.id, { openKey: String(k) })}>{f.id}</button>}</td></tr> })}{!hits.length && <tr><td colSpan={4} className="muted">{q.length > 1 ? 'No matches' : 'Type at least 2 characters'}</td></tr>}</tbody></table></div></div>
}

// ───────────────────────── frmMisc
function MiscUtilities({ ctx, commit, def }: { ctx: Ctx; commit: Commit; def: FormDef }) {
  const [msg, setMsg] = useState('')
  const backup = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ DBStart: ctx.start, [ctx.db.file]: ctx.db }, null, 1)], { type: 'application/json' })); a.download = `smart-erp-backup-${ctx.db.year}-${today()}.json`; a.click(); setMsg('Backup downloaded.') }
  const restore = (file: File) => file.text().then(txt => { const data = JSON.parse(txt); commit(c => { if (data.DBStart) Object.assign(c.start, data.DBStart); if (data[c.db.file]) Object.assign(c.db, data[c.db.file]) }, { Action: 'RESTORE', Form: def.id, Detail: file.name }); setMsg(`Restored ${file.name}.`) }).catch(e => setMsg(`Restore failed: ${e}`))
  const tables = Object.entries(ctx.db.tables).sort(([a], [b]) => a.localeCompare(b))
  return <div className="form-window"><div className="win-title"><span><b>{def.title}</b> <code>{def.id}</code></span><span className="win-tables">errlog, Logs · {ctx.db.file}</span></div>
    <div className="pad">
      <div className="btnbar"><button className="btn primary" onClick={backup}>Backup (export JSON)</button><label className="btn">Restore <input type="file" accept="application/json" hidden onChange={e => e.target.files?.[0] && restore(e.target.files[0])} /></label><button className="btn" onClick={() => { commit(c => { c.start.Logs = []; c.start.errlog = [] }, { Action: 'COMPACT', Form: def.id }); setMsg('Logs compacted.') }}>Compact & clear logs</button><button className="btn danger" onClick={() => { if (confirm('Reset ALL databases to factory demo data? This clears every financial year.')) { resetAll(); location.reload() } }}>Reset to demo data</button></div>
      {msg && <div className="ok">{msg}</div>}
      <h3>Table statistics — {ctx.db.file} ({tables.length} tables)</h3>
      <div className="table-stats">{tables.map(([t, rs]) => <span key={t}><code>{t}</code> {rs.length}</span>)}</div>
      <h3>Audit log (Logs) — last {Math.min(50, ctx.start.Logs.length)}</h3>
      <table className="grid"><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Form</th><th>Detail</th><th>DB</th></tr></thead><tbody>{ctx.start.Logs.slice(0, 50).map(l => <tr key={l.entryID}><td>{new Date(l.Time).toLocaleString('en-IN')}</td><td>{l.UserId}</td><td>{l.Action}</td><td>{l.Form}</td><td>{l.Detail}</td><td>{l.DB}</td></tr>)}</tbody></table>
      <p className="desc">Year files registered in DB_Years: {ctx.start.DB_Years.map(y => yearFile(y.Year)).join(', ')}</p>
    </div></div>
}
