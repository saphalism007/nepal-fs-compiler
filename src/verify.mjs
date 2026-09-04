import fs from "node:fs";
import { createRequire } from "node:module";
import { CompressionStream, DecompressionStream } from "node:stream/web";
const { JSDOM } = createRequire("/tmp/nm/x.js")("jsdom");
const dom=new JSDOM(fs.readFileSync("src/nepal-fs-compiler.html","utf8"),
  {runScripts:"dangerously",pretendToBeVisual:true,url:"https://x.test/"});
const w=dom.window; w.CompressionStream=CompressionStream; w.DecompressionStream=DecompressionStream;
await new Promise(r=>w.addEventListener("load",r));
const ev=c=>w.eval(c); let bad=0;
const ok=(n,c,d="")=>{ console.log(`  ${c?"PASS":"FAIL"}  ${n}${!c&&d?"  <- "+d:""}`); if(!c) bad++; };
ev(`localStorage.clear(); S=DEF(); applyFw("SME"); loadDemo();`);

console.log("\nSidebar");
ok("Tools sits below Export as a utility",
  ev(`[...document.querySelectorAll(".step")].map(b=>b.dataset.step).join(",")`).endsWith("exp,tools"),
  ev(`[...document.querySelectorAll(".step")].map(b=>b.dataset.step).join(",")`));
ok("workflow numbering has no gaps",
  ev(`[...document.querySelectorAll(".step:not(.util) .step-n")].map(e=>e.textContent).join(",")`)==="1,2,3,4,5,6,7,8,9,10");

console.log("\nCalculator is scoped to its own panel");
ev(`nav("sch")`);
const schBefore = ev(`(()=>{const i=document.querySelector("#schBody input[data-k]"); return !!(i&&i.onclick);})()`);
ev(`nav("tools")`);
const schAfter = ev(`(()=>{const i=document.querySelector("#schBody input[data-k]"); return !!(i&&i.onclick);})()`);
ok("visiting Tools does not attach handlers to schedule inputs", !schAfter, `before ${schBefore}, after ${schAfter}`);
ok("keypad still wired", ev(`document.querySelectorAll("#toolsBody [data-k]").length`)===19,
   String(ev(`document.querySelectorAll("#toolsBody [data-k]").length`)));
ev(`CALC={cur:"0",prev:null,op:null,fresh:true}; ["1","2","5","*","4","="].forEach(calcKey)`);
ok("125 x 4 = 500", ev(`calcNum()`)===500);
ok("calendar renders the month", ev(`document.querySelectorAll("#toolsBody .cell[data-day]").length`)===ev(`NEP_CAL[CALV.y][CALV.m-1]`));

console.log("\nCore accounting still intact");
ok("statements balance", Math.abs(ev(`M().tot.sofpDiff`))<0.01);
ok("comparative balances", Math.abs(ev(`M().tot.sofpDiffP`))<0.01);
ok("all nine checks pass", ev(`M().checks.filter(c=>!c.ok).length`)===0);
ev(`S.je=[{ref:"AJE-1",on:true,narration:"t",lines:[
  {row:S.tb.find(r=>r.name==="Audit fee").id,dr:50000,cr:0},
  {row:S.tb.find(r=>r.name==="Audit fee payable").id,dr:0,cr:50000}]}]`);
ok("a journal entry flows through and still balances",
   Math.abs(ev(`M().tot.sofpDiff`))<0.01 && ev(`M().cy.exp_audit`)===200000);
ev(`S.je=[]`);
ev(`S.fin={on:true,lines:{"PL|exp_audit|cy":-250000,"SOFP|cl_op|cy":670000},labels:{}}`);
ok("a two sided adjustment finalises and balances", Math.abs(ev(`M().tot.sofpDiff`))<0.01);
ok("the prepared version is unchanged", ev(`M(true).tot.pftC`)===2250800);
ev(`S.fin={on:false,lines:{},labels:{}}`);
ok("workbook builds", ev(`buildSheets().length`)>=20);
console.log(bad?`\n${bad} FAILED`:"\nEVERYTHING VERIFIED");
process.exit(bad?1:0);
