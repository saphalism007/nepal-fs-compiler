/* Self test for the Nepal FS Compiler.
   Needs jsdom:  npm install jsdom
   Run:          node src/selftest.mjs                                        */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { CompressionStream, DecompressionStream } from "node:stream/web";

const require = createRequire(import.meta.url);
let JSDOM;
try { ({ JSDOM } = require("jsdom")); }
catch { console.error("jsdom is not installed.  Run:  npm install jsdom"); process.exit(2); }

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.join(HERE, "nepal-fs-compiler.html");
const FIXTURE = path.join(HERE, "..", "sample", "trial-balance-opening-transactions-closing.xlsx");
let fail = 0, total = 0;
const ok = (n, c, d = "") => { total++; if (!c) fail++;
  console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${!c && d ? "   <- " + d : ""}`); };
const eq = (n, a, b, tol = 0.01) => ok(n + " = " + a, Math.abs(a - b) < tol, "expected " + b);

function boot() {
  const dom = new JSDOM(fs.readFileSync(HTML, "utf8"),
    { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/" });
  const w = dom.window;
  w.CompressionStream = CompressionStream; w.DecompressionStream = DecompressionStream;
  return new Promise(r => w.addEventListener("load", () => r({ w, ev: c => w.eval(c) })));
}

/* ------------------------------------------------------------------ */
console.log("\n=== every framework produces a balanced set ===");
{
  const { ev } = await boot();
  for (const fw of ["SME", "NFRS", "ME", "NPO"]) {
    ev(`localStorage.clear(); S=DEF(); applyFw(${JSON.stringify(fw)}); loadDemo(); S.fw=${JSON.stringify(fw)};
        S.tb.forEach(r=>r.map=autoMapOne(r.name,S.fw)); seedSchedules();`);
    const r = JSON.parse(ev(`(()=>{const m=M();return JSON.stringify({
      sofp:m.tot.sofpDiff, sofpPY:m.tot.sofpDiffP, cf:m.tot.cfDiff, soce:m.soce.diffC,
      unmapped:tbTotals().unmapped, checks:m.checks.filter(c=>!c.ok).length,
      failing:m.checks.filter(c=>!c.ok).map(c=>c.label+" ("+c.detail+")").join("; "),
      mat:materiality().om, ratios:ratioSet().length, sheets:buildSheets().length});})()`));
    console.log(` ${fw}`);
    eq("  position balances", r.sofp, 0);
    eq("  comparative balances", r.sofpPY, 0);
    eq("  cash flow reconciles", r.cf, 0);
    eq("  changes in equity ties", r.soce, 0);
    ok("  every ledger mapped", r.unmapped === 0, r.unmapped + " unmapped");
    ok("  all tie-out checks pass", r.checks === 0, r.failing);
    ok("  materiality and ratios computed", r.mat > 0 && r.ratios >= 6);
    ok("  workbook builds", r.sheets >= 13, r.sheets + " sheets");
  }
}

/* ------------------------------------------------------------------ */
console.log("\n=== opening / transactions / closing trial balance ===");
{
  const { ev } = await boot();
  ev(`localStorage.clear(); S=DEF(); applyFw("SME"); S.meta.cyLabel="FY 2082/83"; S.meta.pyLabel="FY 2081/82";`);
  const b64 = fs.readFileSync(FIXTURE).toString("base64");
  const r = JSON.parse(await ev(`(async()=>{
    const bin=atob(${JSON.stringify(b64)}); const u=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i);
    openImport(await readXlsx(u.buffer));
    const roles=IMP.roles.slice();
    if(document.getElementById("impOk").disabled) return JSON.stringify({blocked:true,roles});
    document.getElementById("impMode").value="replace"; runImport();
    const t=tbTotals(), m=M();
    return JSON.stringify({roles:roles.filter(Boolean), cyDr:t.dr, pyDr:t.pdr,
      revCY:m.tot.revC, revPY:m.tot.revP, assetsCY:m.tot.assetsC, assetsPY:m.tot.assetsP,
      profit:m.tot.pftC, sofp:m.tot.sofpDiff, sofpPY:m.tot.sofpDiffP, unmapped:t.unmapped});})()`));
  ok("opening/transaction/closing recognised",
     JSON.stringify(r.roles) === JSON.stringify(["code","name","odr","ocr","tdr","tcr","dr","cr"]),
     JSON.stringify(r.roles));
  eq("current year from closing", r.cyDr, 97325200);
  eq("comparative from opening", r.pyDr, 33428000);
  eq("revenue this year", r.revCY, 62376000);
  eq("revenue last year (no opening P&L)", r.revPY, 0);
  eq("total assets this year", r.assetsCY, 31645000);
  eq("total assets last year", r.assetsPY, 30178000);
  eq("profit for the year", r.profit, 2250800);
  eq("position balances", r.sofp, 0);
  eq("comparative balances", r.sofpPY, 0);
  ok("every ledger mapped", r.unmapped === 0, r.unmapped + " unmapped");
}

/* ------------------------------------------------------------------ */
console.log("\n=== contra accounts are netted, not expensed ===");
{
  const { ev } = await boot();
  ev(`localStorage.clear(); S=DEF(); applyFw("SME");`);
  const cases = [
    ["Accumulated depreciation - buildings", "nca_ppe"],
    ["Acc. depreciation – vehicles", "nca_ppe"],
    ["Acc Dep Plant & Machinery", "nca_ppe"],
    ["Less: Depreciation", "nca_ppe"],
    ["Provision for depreciation", "nca_ppe"],
    ["Accumulated amortisation - software", "nca_intan"],
    ["Depreciation and amortisation", "exp_dep"],
    ["Depreciation", "exp_dep"],
    ["Allowance for doubtful debts", "ca_tr"],
    ["Provision for income tax", "cl_ctax"],
    ["Income tax expense", "tax_cur"],
    ["Audit fee payable", "cl_op"],
    ["Audit fee", "exp_audit"],
    ["Provision for gratuity", "ncl_gratuity"],
    ["Gratuity expense", "exp_emp"],
    ["Salary payable", "cl_op"],
    ["Salaries and wages", "exp_emp"],
    ["Provision for staff bonus", "cl_bonus"],
    ["Prepaid insurance", "ca_adv"],
    ["Insurance premium", "exp_admin"],
  ];
  for (const [name, want] of cases) {
    const got = ev(`autoMapOne(${JSON.stringify(name)},"SME")`);
    ok(`"${name}" -> ${want}`, got === want, "got " + (got || "(unmapped)"));
  }
}

/* ------------------------------------------------------------------ */
console.log("\n=== restricted funds are kept out of free reserves ===");
{
  const { ev } = await boot();
  const r = JSON.parse(ev(`(()=>{
    localStorage.clear(); S=DEF(); applyFw("NPO"); seedSchedules();
    S.tb=[
     {id:"a",code:"1",name:"Cash at bank",dr:500000,cr:0,pdr:0,pcr:0,map:"ca_cce"},
     {id:"b",code:"2",name:"Unrestricted grant",dr:0,cr:400000,pdr:0,pcr:0,map:"inc_grant_u"},
     {id:"c",code:"3",name:"Restricted project grant",dr:0,cr:1000000,pdr:0,pcr:0,map:"inc_grant_r"},
     {id:"d",code:"4",name:"Programme expenses",dr:600000,cr:0,pdr:0,pcr:0,map:"exp_prog"},
     {id:"e",code:"5",name:"Administrative expenses",dr:300000,cr:0,pdr:0,pcr:0,map:"exp_admin"}];
    const m=M(), f=fundResult(m.a,0);
    const eqRow=id=>{const r=m.sofpRows.find(x=>x.src===id); return r?r.cy:0;};
    return JSON.stringify({unres:f.unres,res:f.res,tbDiff:tbTotals().diff,
      fundUnres:eqRow("fund_unres"), fundRes:eqRow("fund_res"), sofp:m.tot.sofpDiff});})()`));
  eq("unrestricted result 400,000 income less 300,000 admin", r.unres, 100000);
  eq("restricted result 1,000,000 grant less 600,000 spent", r.res, 400000);
  eq("unspent restricted grant sits in the restricted fund", r.fundRes, 400000);
  eq("unrestricted fund carries only its own surplus", r.fundUnres, 100000);
  eq("position still balances", r.sofp, 0);
}

console.log(`\n${fail ? fail + " of " + total + " FAILED" : "all " + total + " checks passed"}\n`);
process.exit(fail ? 1 : 0);
