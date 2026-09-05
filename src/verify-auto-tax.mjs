import fs from "node:fs";
import { createRequire } from "node:module";
const { JSDOM } = createRequire("/tmp/nm/x.js")("jsdom");
const dom=new JSDOM(fs.readFileSync("src/nepal-fs-compiler.html","utf8"),
  {runScripts:"dangerously",pretendToBeVisual:true,url:"https://x.test/"});
const w=dom.window; await new Promise(r=>w.addEventListener("load",r));
const ev=c=>w.eval(c); let bad=0;
const ok=(n,c,d="")=>{ console.log(`  ${c?"PASS":"FAIL"}  ${n}${!c&&d?"  <- "+d:""}`); if(!c) bad++; };
ev(`localStorage.clear(); S=DEF(); applyFw("SME"); loadDemo();`);

console.log("\n1. A trial balance that already provides for tax is left alone");
ok("current tax stays as the ledger has it", ev(`M().cy.tax_cur`)===720000, String(ev(`M().cy.tax_cur`)));
ok("nothing was brought in", ev(`M().autoTax.length`)===0);
const withProv = ev(`JSON.stringify({pft:M().tot.pftC, diff:M().tot.sofpDiff})`);
console.log("   ", withProv);

console.log("\n2. Strip the tax provision out, as a draft trial balance would be");
/* A draft trial balance: the year's tax was never provided. Remove the charge and
   its provision together, and roll the deferred tax liability back to its opening,
   so the trial balance still balances the way a real draft would. */
ev(`S.tb=S.tb.filter(r=>!/^income tax expense$|^deferred tax expense$|^provision for income tax$/i.test(r.name.trim()));
    const d=S.tb.find(r=>/deferred tax liability/i.test(r.name)); if(d) d.cr=d.pcr;`);
ok("the draft trial balance still balances", Math.abs(ev(`tbTotals().diff`))<0.01, String(ev(`tbTotals().diff`)));
ok("the ledger now has no current tax", Math.abs(ev(`(()=>{const a=agg(); return a.cy.tax_cur||0;})()`))<0.01);
const m = JSON.parse(ev(`JSON.stringify({auto:M().autoTax, taxCur:M().cy.tax_cur, taxDef:M().cy.tax_def,
  ctax:M().cy.cl_ctax, dtl:M().cy.ncl_dtl, pbt:M().tot.pbtC, pft:M().tot.pftC, diff:M().tot.sofpDiff})`));
console.log("    brought in:", JSON.stringify(m.auto));
ok("a charge was brought in", m.auto.length>0);
ok("it reached the profit and loss", Math.abs(m.taxCur)>0, String(m.taxCur));
ok("the other side reached the balance sheet", Math.abs(m.ctax-m.taxCur)<0.01, `${m.ctax} vs ${m.taxCur}`);
ok("the position still balances", Math.abs(m.diff)<0.01, String(m.diff));
ok("tax equals the rate applied to taxable income",
   Math.abs(m.taxCur - ev(`r2(Math.max(0,taxComp().taxable)*num(S.meta.taxrate)/100)`))<0.5,
   `${m.taxCur} vs ${ev("taxComp().taxOn")}`);
ok("the note explains where it came from",
   ev(`(()=>{const b=noteBlocks(M()).find(x=>x.id==="tax_cur");
     return !!(b&&b.rows.some(r=>/income tax computation/i.test(r.label)));})()`));
ok("deferred tax also came through", Math.abs(m.taxDef)>0 || ev(`S.dt.every(r=>!num(r.carry)&&!num(r.base))`),
   String(m.taxDef));

console.log("\n3. It can be switched off");
ev(`S.meta.autoTax="no"`);
ok("nothing is brought in when switched off", ev(`M().autoTax.length`)===0);
ok("and the position still balances", Math.abs(ev(`M().tot.sofpDiff`))<0.01);
ev(`S.meta.autoTax="yes"`);

console.log("\n4. Nothing else moved");
ok("workbook still builds", ev(`buildSheets().length`)>=20);
console.log(bad?`\n${bad} FAILED`:"\nCOMPUTED TAX REACHES THE ACCOUNTS");
process.exit(bad?1:0);
