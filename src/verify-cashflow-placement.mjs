import fs from "node:fs";
import { createRequire } from "node:module";
const { JSDOM } = createRequire("/tmp/nm/x.js")("jsdom");
const dom=new JSDOM(fs.readFileSync("src/nepal-fs-compiler.html","utf8"),
  {runScripts:"dangerously",pretendToBeVisual:true,url:"https://x.test/"});
const w=dom.window; await new Promise(r=>w.addEventListener("load",r));
const ev=c=>w.eval(c); let bad=0;
const ok=(n,c,d="")=>{ console.log(`  ${c?"PASS":"FAIL"}  ${n}${!c&&d?"  <- "+d:""}`); if(!c) bad++; };
ev(`localStorage.clear(); S=DEF(); applyFw("SME"); loadDemo(); S.cf.pyMap={};`);
const base = ev(`M().tot.netOp`);
console.log("  baseline net operating:", base);

// one line into each of the five places, all outflows of 10,000
ev(`S.cf.other=[
  {label:"Adj line",sec:"O-adj",amt:-10000},
  {label:"WC line",sec:"O-wc",amt:-10000},
  {label:"Tail line",sec:"O-tail",amt:-10000},
  {label:"Inv line",sec:"I",amt:-10000},
  {label:"Fin line",sec:"F",amt:-10000}]`);
const m = ()=>ev(`(()=>{const r=M().cfRows; return JSON.stringify(r.map((x,i)=>({i,t:x.type,l:x.label,cy:x.cy})));})()`);
const rows = JSON.parse(m());
const idx = l => rows.findIndex(r=>r.l===l);
const tot = l => rows.find(r=>r.t==="tot" && r.l && r.l.toLowerCase().includes(l));
const between = (name, a, b) => { const i=idx(name), ia=rows.findIndex(r=>r.t==="tot"&&r.l.toLowerCase().includes(a)),
  ib=rows.findIndex(r=>r.t==="tot"&&r.l.toLowerCase().includes(b)); return i>ia && i<ib; };

ok("adjustment line sits above operating profit before working capital",
   idx("Adj line") < rows.findIndex(r=>r.t==="tot"&&/before working capital/i.test(r.l)));
ok("working capital line sits between operating profit and cash generated",
   between("WC line","before working capital","cash generated from operations"));
ok("tail line sits between cash generated and net operating",
   between("Tail line","cash generated from operations","operating activities"));
ok("investing line sits before the investing total",
   idx("Inv line") < rows.findIndex(r=>r.t==="tot"&&/investing activities/i.test(r.l)));
ok("financing line sits before the financing total",
   idx("Fin line") < rows.findIndex(r=>r.t==="tot"&&/financing activities/i.test(r.l)));

// each one must actually move its subtotal by 10,000
const opBefore = tot("before working capital").cy, gen = tot("cash generated from operations").cy;
const netOp = tot("operating activities").cy, netInv = tot("investing activities").cy, netFin = tot("financing activities").cy;
ok("operating profit before WC absorbed the adjustment line", Math.abs(opBefore-(4720000-10000))<0.01, String(opBefore));
ok("cash generated absorbed adjustment and working capital lines", Math.abs(gen-(4258000-20000))<0.01, String(gen));
ok("net operating absorbed all three", Math.abs(netOp-(2788000-30000))<0.01, String(netOp));
ok("net investing absorbed its line", Math.abs(netInv-(115000-10000))<0.01, String(netInv));
ok("net financing absorbed its line", Math.abs(netFin-(-1800000-10000))<0.01, String(netFin));
// and the statement must still reconcile to the movement in cash
ok("statement still reconciles to cash", Math.abs(ev(`M().tot.cfDiff`)-(-50000))<0.01,
   "expected the 50,000 of added outflows to show as unexplained: "+ev(`M().tot.cfDiff`));
ev(`S.cf.other=[]`);
ok("removing them restores the original", Math.abs(ev(`M().tot.netOp`)-base)<0.01 && Math.abs(ev(`M().tot.cfDiff`))<0.01);
console.log(bad?`\n${bad} FAILED`:"\nPLACEMENT WORKS");
process.exit(bad?1:0);
