import fs from "node:fs";
import { createRequire } from "node:module";
const { JSDOM } = createRequire("/tmp/nm/x.js")("jsdom");
const dom=new JSDOM(fs.readFileSync("src/nepal-fs-compiler.html","utf8"),
  {runScripts:"dangerously",pretendToBeVisual:true,url:"https://x.test/"});
const w=dom.window; await new Promise(r=>w.addEventListener("load",r));
const ev=c=>w.eval(c); let bad=0;
const ok=(n,c,d="")=>{ console.log(`  ${c?"PASS":"FAIL"}  ${n}${!c&&d?"  <- "+d:""}`); if(!c) bad++; };
ev(`localStorage.clear(); S=DEF(); applyFw("SME"); loadDemo(); S.cf.pyMap={};`);
const blankTots = ()=>ev(`M().cfRows.filter(r=>r.type==="tot"&&(r.py===null||r.py===undefined)).length`);
ok("with nothing entered the column stays blank, no invented zeros", blankTots()>0, String(blankTots()));
// enter only the working capital lines, as you would from last year's statement
ev(`S.cf.pyMap={
  "Decrease / (increase) in inventories": -300000,
  "Decrease / (increase) in trade receivables": -450000,
  "Increase / (decrease) in trade payables": 200000,
  "Interest paid": -705000,
  "Income taxes paid": -600000,
  "Purchase of property, plant and equipment": -250000,
  "Net repayment of borrowings": -400000,
  "Cash and cash equivalents at the beginning of the year": 1500000 }`);
const after = blankTots();
ok("subtotals now roll up", after===0, `${after} still blank`);
const g = l => ev(`(()=>{const r=M().cfRows.find(x=>x.type==="tot"&&x.label&&x.label.toLowerCase().includes(${JSON.stringify(l)})); return r?r.py:null;})()`);
console.log("    cash generated from operations :", g("cash generated from operations"));
console.log("    net operating                  :", g("operating activities"));
console.log("    net investing                  :", g("investing activities"));
console.log("    net financing                  :", g("financing activities"));
console.log("    net movement                   :", g("net increase"));
console.log("    closing cash                   :", g("at the end of the year"));
const netOp=g("operating activities"), netInv=g("investing activities"), netFin=g("financing activities");
ok("net movement equals the three sections", Math.abs(g("net increase")-(netOp+netInv+netFin))<0.01);
ok("closing equals opening plus movement",
   Math.abs(g("at the end of the year")-(1500000+g("net increase")))<0.01);
ok("current year untouched", Math.abs(ev(`M().tot.cfDiff`))<0.01);
console.log(bad?`\n${bad} FAILED`:"\nCOMPARATIVE CASH FLOW ROLLS UP");
process.exit(bad?1:0);
