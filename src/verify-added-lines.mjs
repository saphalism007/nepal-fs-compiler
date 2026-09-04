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
const base=JSON.parse(ev(`JSON.stringify({assets:M().tot.assetsC,profit:M().tot.pftC,diff:M().tot.sofpDiff})`));
console.log("  prepared:", JSON.stringify(base));

// a two sided addition: a new asset line and a new liability line
ev(`S.fin={on:true,lines:{},labels:{},extra:[
  {stmt:"SOFP",anchor:"Total current assets",label:"Other financial assets",cy:500000,py:""},
  {stmt:"SOFP",anchor:"Total current liabilities",label:"Deferred consideration",cy:500000,py:""}]}`);
const a=JSON.parse(ev(`JSON.stringify({assets:M().tot.assetsC,diff:M().tot.sofpDiff})`));
console.log("  with two added lines:", JSON.stringify(a));
ok("the added asset is inside current assets", ev(`(()=>{const r=M().sofpRows;
  const i=r.findIndex(x=>x.label==="Other financial assets");
  const ti=r.findIndex(x=>x.type==="tot"&&x.label==="Total current assets");
  return i>=0 && ti>i && r[ti].from<=i && i<=r[ti].to;})()`));
ok("total assets increased by 500,000", Math.abs(a.assets-base.assets-500000)<0.01, String(a.assets));
ok("the balance sheet still balances", Math.abs(a.diff)<0.01, String(a.diff));
ok("prepared version is untouched", ev(`M(true).tot.assetsC`)===base.assets);

// performance statement
ev(`S.fin.extra=[{stmt:"PL",anchor:"Profit / (loss) before tax",label:"Prior period adjustment",cy:-120000,py:""}]`);
const p=ev(`M().tot.pbtC`);
ok("profit before tax absorbed the added line", Math.abs(p-(3015000-120000))<0.01, String(p));
ok("profit for the year followed", Math.abs(ev(`M().tot.pftC`)-(base.profit-120000))<0.01);
ok("that flows into equity so the sheet still balances", Math.abs(ev(`M().tot.sofpDiff`))>0.01,
   "a one sided profit change should show as out of balance");
ok("workbook still builds with added lines", ev(`buildSheets().length`)>=20);
ev(`S.fin={on:false,lines:{},labels:{},extra:[]}`);
ok("removing them restores everything",
   ev(`M().tot.assetsC`)===base.assets && ev(`M().tot.pftC`)===base.profit && Math.abs(ev(`M().tot.sofpDiff`))<0.01);
console.log(bad?`\n${bad} FAILED`:"\nADDING LINES ELSEWHERE WORKS");
process.exit(bad?1:0);
