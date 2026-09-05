// build the worked example workbook, for checking the exported file
import fs from "node:fs";
import { createRequire } from "node:module";
import { CompressionStream, DecompressionStream } from "node:stream/web";
const { JSDOM } = createRequire("/tmp/nm/x.js")("jsdom");
const dom=new JSDOM(fs.readFileSync("src/nepal-fs-compiler.html","utf8"),
  {runScripts:"dangerously",pretendToBeVisual:true,url:"https://x.test/"});
const w=dom.window; w.CompressionStream=CompressionStream; w.DecompressionStream=DecompressionStream;
await new Promise(r=>w.addEventListener("load",r));
const ev=c=>w.eval(c);
ev(`localStorage.clear(); S=DEF(); applyFw("SME"); loadDemo();`);
const b64=await ev(`(async()=>{const b=await buildWorkbook(buildSheets());
  const u=new Uint8Array(await b.arrayBuffer()); let s=""; for(const x of u) s+=String.fromCharCode(x);
  return btoa(s);})()`);
const out=process.argv[2]||"/tmp/linked2.xlsx";
fs.writeFileSync(out, Buffer.from(b64,"base64"));
console.log("workbook:", fs.statSync(out).size, "bytes ->", out);
