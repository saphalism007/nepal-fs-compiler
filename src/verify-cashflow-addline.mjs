import fs from "node:fs";
import { createRequire } from "node:module";
const { JSDOM } = createRequire("/tmp/nm/x.js")("jsdom");
const dom=new JSDOM(fs.readFileSync("src/nepal-fs-compiler.html","utf8"),
  {runScripts:"dangerously",pretendToBeVisual:true,url:"https://x.test/"});
const w=dom.window; await new Promise(r=>w.addEventListener("load",r));
const ev=c=>w.eval(c); let bad=0;
const ok=(n,c,d="")=>{ console.log(`  ${c?"PASS":"FAIL"}  ${n}${!c&&d?"  <- "+d:""}`); if(!c) bad++; };
ev(`localStorage.clear(); S=DEF(); applyFw("SME"); loadDemo(); S.cf.pyMap={}; S.cf.other=[];`);
const has = l => ev(`M().cfRows.some(r=>r.label===${JSON.stringify(l)})`);

ok("a line with no current year amount used to vanish; now it shows",
  (ev(`S.cf.other=[{label:"Dividends paid",sec:"F",amt:0}]`), has("Dividends paid")));
ok("it is inside the financing section, not floating",
  ev(`(()=>{const rows=M().cfRows;
       const i=rows.findIndex(r=>r.label==="Dividends paid");
       const ti=rows.findIndex(r=>r.type==="tot"&&/financing/.test(r.label));
       const t=rows[ti];
       return i>=0 && ti>i && t.from<=i && i<=t.to;})()`));
// give it a comparative and check the financing subtotal picks it up
ev(`S.cf.pyMap={"Dividends paid":-300000,"Net repayment of borrowings":-400000,
  "Cash and cash equivalents at the beginning of the year":1500000}`);
const fin = ev(`(()=>{const t=M().cfRows.find(r=>r.type==="tot"&&/financing/.test(r.label)); return t?t.py:null;})()`);
ok("financing comparative includes the added line", fin===-700000, String(fin));
ok("closing cash still ties",
  ev(`(()=>{const g=l=>{const r=M().cfRows.find(x=>x.type==="tot"&&x.label.toLowerCase().includes(l)); return r?r.py:null;};
       const o=M().cfRows.find(r=>r.label&&r.label.includes("beginning")).py;
       return Math.abs(g("at the end of the year")-(o+g("net increase")))<0.01;})()`));
ok("a current year amount still works as before",
  (ev(`S.cf.other=[{label:"Dividends paid",sec:"F",amt:-250000}]`),
   ev(`M().cfRows.find(r=>r.label==="Dividends paid").cy`)===-250000));
ok("an unnamed row is still ignored",
  (ev(`S.cf.other=[{label:"",sec:"F",amt:0}]`), !ev(`M().cfRows.some(r=>r.added)`)));
ev(`S.cf.other=[]; S.cf.pyMap={}`);
ok("current year statement still reconciles", Math.abs(ev(`M().tot.cfDiff`))<0.01);
console.log(bad?`\n${bad} FAILED`:"\nADDING A LINE WORKS");
process.exit(bad?1:0);
