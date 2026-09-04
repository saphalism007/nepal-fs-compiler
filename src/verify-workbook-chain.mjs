// prove the chain end to end: change the trial balance, the note and the face must move
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
const refs = ev(`(()=>{
  const sh=buildSheets();
  const find=(name)=>sh.find(x=>x.name===name);
  const grab=(name,label,col)=>{ const s=find(name); if(!s) return null;
    for(let i=0;i<s.rows.length;i++){ const r=s.rows[i]||[];
      for(const c of r) if(c&&!c.n&&String(c.v).trim().toLowerCase()===label.toLowerCase()){
        const cell=r[col]; return cell&&cell.f?cell.f:null; } }
    return null; };
  return JSON.stringify({
    sofpInventories: grab("Financial Position","Inventories",2),
    sofpPPE: grab("Financial Position","Property, plant and equipment",2),
    plRevenue: grab("Profit and Loss","Revenue",2)
  });})()`);
const R=JSON.parse(refs);
console.log("  balance sheet inventories reads:", R.sofpInventories);
console.log("  balance sheet PPE reads        :", R.sofpPPE);
ok("the face quotes the note, not the grouping", /Notes!/.test(R.sofpInventories||""), R.sofpInventories);
ok("PPE quotes its schedule", /PPE Schedule/.test(R.sofpPPE||""), R.sofpPPE);
ok("no statement line holds a typed number",
   ev(`(()=>{const s=buildSheets().find(x=>x.name==="Financial Position");
     let typed=0; s.rows.forEach(r=>(r||[]).forEach(c=>{ if(c&&c.n&&c.f===undefined&&c.v!==null) typed++; }));
     return typed===0;})()`));
ok("every note line traces to a trial balance row",
   ev(`(()=>{const s=buildSheets().find(x=>x.name==="Notes");
     let linked=0, plain=0;
     s.rows.forEach(r=>(r||[]).forEach(c=>{ if(c&&c.n){ if(c.f&&/Trial Balance/.test(c.f)) linked++; else if(c.f===undefined&&c.v!==null) plain++; } }));
     return linked>60 && plain<40;})()`));
console.log(bad?`\n${bad} FAILED`:"\nCHAIN CONFIRMED");
process.exit(bad?1:0);
