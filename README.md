# SMART ERP — Web

Browser implementation of the **SMART ERP System Architecture & Functional Master Specification** (Bhargavi Soft-Tech Pvt Ltd), rebuilt from the VB6 / MS Access design as a React + TypeScript web app.

## What is implemented

- **frmLogin** – financial-year selector (`DB_Years`), user selector (`user1`), encoded 5-character password check, session logging (`Logs`, `OnLineUsers`).
- **mdiSSI** – MDI shell: top menu bars (Security, Masters, Sales, PPC, SubContract, Purchase, Stores, Dispatch, Quality, Maintenance, HR & Payroll, Finance, Others), quick toolbar, tabbed child windows, status bar, financial-year switcher and a dashboard that renders the §4 business flows and the §5 form-to-table mapping.
- **79-flag permission matrix** (`frmUserRights` → `userrights`). Menu items, toolbar buttons and flow steps are enabled only when the user's flag is granted; changes apply immediately.
- **Every form in §3/§5** under its exact name (`frmEnquiry`, `frmMfgPO`, `frmProdnWOIssue`, `frmDCSubConOut`, `frmPurchaseGRN`, `frmInspectionIn`, `frmSalary`, …) with header fields, line-item grids (`EnquirySub`, `MfgPOSub`, `PurchaseSub`, …), computed columns (Qty × Rate, GST, costing sheet, payroll), New / Edit / Save / Delete / Print / record navigation and a browse list.
- **Workflows** exactly as in §4: each document offers *Create next step* (Enquiry → Estimate → Quote → Customer PO → DC → Invoice → Receipt; Customer PO → Schedule → IWO → Production log / IWO return; SubCon PO → Outward DC → Inward DC → SubCon QC → SubCon bill → Payment; Purchase PO → GRN → Incoming QC → Purchase bill → Payment; …) that pre-fills the next form from the source, plus a *Linked documents* panel.
- **Stock postings** (`StockLedger`): GRN → Quarantine, Incoming QC → RM store, MIN (RM → WIP), IWO return → FG, DC → FG reduction, SubCon out/in, tool crib, credit notes, scrap. Negative stock is blocked. `frmStock` / `frmStockDetails` are live reports.
- **Derived tracking & ledgers**: `MfgPOTrack` / `PurchPOTrack` (ordered vs dispatched / received), customer & supplier / vendor outstanding, bank book balance.
- **Analysis forms**: `frmViewPODetails`, `frmAssmReqAnaly`, `frmMatReqAnaly` (multi-level BOM explosion vs stock), `frmPlanProdCapacity`, `frmCalibrateDUE`, `frmMaintainPro`, `frmViewSearch`, `frmMisc` (backup / restore / compact / audit log).

## Storage model

Mirrors the dual-database layout: `DBStart` (users, rights, company, year registry, logs) and one transactional database per financial year (`DB2026_27`, …), persisted in the browser's localStorage. Opening a year that has no database creates it with master tables carried forward.

Default accounts (from spec §6): `ADMIN` / `ADMIN` and `CHECK26` / `CTY9J`.

## Run

```bash
npm install
npm run dev      # development server
npm run build    # type-check + production build
```

## Scope notes

Field lists are derived from the specification's functional descriptions (the source document does not list column-level schemas). Persistence is browser-local; a shared server database, printing templates and statutory returns are outside this build.
