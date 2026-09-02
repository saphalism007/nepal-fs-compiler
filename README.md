# Nepal FS Compiler

Turn a trial balance into a complete, presentation-quality set of financial statements
under Nepali reporting frameworks — with the schedules, the income tax computation and
a formatted Excel workbook a Chartered Accountant actually has to hand over.

**▶ Open the app: https://saphalism007.github.io/nepal-fs-compiler/**

Runs entirely in the browser. No server, no sign-in, no data leaves your device.
Installs as an app on macOS, Windows, iPhone, iPad and Android, and works offline.

---

## Reporting frameworks

It asks which framework applies before anything else, and that choice drives the
captions, the required primary statements and the whole note pack:

| Framework | Applies to |
| --- | --- |
| **NFRS** (full) | Listed companies, banks and financial institutions, insurance, other public interest entities |
| **NFRS for SMEs** | Entities without public accountability — most owner-managed private limited companies |
| **NAS for Micro Entities** | Micro entities below the SME thresholds |
| **NAS for NPOs** | NGOs and INGOs, associations and trusts — fund accounting |

## What it produces

**Primary statements**, with prior-year comparatives throughout —
Statement of Financial Position · Statement of Profit or Loss and Other Comprehensive
Income · Statement of Changes in Equity (or Fund Balances) · Statement of Cash Flows.

**Schedules and notes** — property, plant and equipment · intangible assets ·
deferred tax · financial instruments (measurement categories, NFRS 13 fair value
hierarchy, expected credit loss provision matrix, liquidity maturity analysis) ·
significant accounting policies · and an auto-generated note for every line on the
face of the statements showing the ledger-level breakdown behind it.

**Nepal income tax** — pool depreciation under Schedule 2 of the Income Tax Act, 2058
(Classes A–E, the 100% / 66.67% / 33.33% trimester absorption, the 7% repairs limit
with the excess capitalised, the additional one-third for special industries) ·
computation of taxable income · effective tax rate reconciliation · Bonus Act
computation.

**Excel export** — a 16-sheet workbook with accounting number formats, a single rule
above subtotals and a double rule beneath totals, frozen headers and A4 print setup,
plus the mapped trial balance and a lead schedule as working papers.

## How it works

1. **Set up** the engagement — entity, fiscal year (B.S. and A.D.), presentation
   units, tax status.
2. **Paste the trial balance** — straight out of Tally, Busy, IMS, Swastik or Excel.
   Column layout is detected automatically; ledgers are mapped to statement lines by
   name, and you override anything that looks wrong.
3. **Fill the schedules** — each one shows whether it ties to the ledger.
4. **Read the statements**, then **export**.

It flags rather than force-balances. Nine checks run continuously — trial balance
agreement, both years' balance sheets, cash flow reconciliation, changes in equity
against the balance sheet, PPE schedule against the ledger, depreciation against the
schedules, deferred tax against the ledger. Anything out shows in red with the amount,
so nothing quietly plugs itself.

Click **Load worked example** in the app for a complete, tied-out engagement
(63 ledgers, two full years) before entering your own data.

## Install it

Open the link above, then:

| Platform | How |
| --- | --- |
| Windows / macOS — Chrome, Edge | **Install app** in the top bar, or the ⊕ icon in the address bar |
| macOS — Safari | File → **Add to Dock** |
| iPhone / iPad — Safari | Share → **Add to Home Screen** |
| Android — Chrome | **Install app**, or ⋮ → Install app |

## Repository layout

```
index.html                the installable app served by GitHub Pages
manifest.webmanifest      installed-app name, icons, colours
sw.js                     service worker — offline cache
src/nepal-fs-compiler.html  single-file source; also works standalone offline
src/build-app.py          rebuilds the app at the repo root from the source
sample/                   an example of the Excel output
```

To change the app, edit `src/nepal-fs-compiler.html` and run:

```bash
python3 src/build-app.py
```

That regenerates `index.html`, `manifest.webmanifest` and `sw.js` and stamps a new
cache version, so installed copies refresh on next launch.

## Notes and limitations

- Everything is computed in the browser; no trial balance data is transmitted anywhere.
- Engagements autosave to that browser's local storage. Use **Save file** to export a
  `.json` for anything you need to keep, move between devices or hand to a colleague.
- Comparative cash flows cannot be derived from a two-column trial balance — working
  capital movements need the balances at the *start* of the comparative year. The app
  fills in what it can derive and asks you to enter the rest from the signed prior year
  accounts.
- The only network request is Google Fonts. Offline it falls back to system fonts and
  everything, including the Excel export, still works.
- This is a preparation tool. The judgements, the disclosures and the opinion remain
  the preparer's and the auditor's.

## Licence

MIT — see [LICENSE](LICENSE).
