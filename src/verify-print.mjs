import fs from "node:fs";
import { createRequire } from "node:module";
const { JSDOM } = createRequire("/tmp/nm/x.js")("jsdom");
const dom=new JSDOM(fs.readFileSync("src/nepal-fs-compiler.html","utf8"),
  {runScripts:"dangerously",pretendToBeVisual:true,url:"https://x.test/"});
const w=dom.window; await new Promise(r=>w.addEventListener("load",r));
const ev=c=>w.eval(c); let bad=0;
const ok=(n,c,d="")=>{ console.log(`  ${c?"PASS":"FAIL"}  ${n}${!c&&d?"  <- "+d:""}`); if(!c) bad++; };
ev(`localStorage.clear(); S=DEF(); applyFw("SME"); loadDemo(); nav("fs");`);

// the print stylesheet must hide every piece of software furniture
const css = fs.readFileSync("src/nepal-fs-compiler.html","utf8");
const block = css.slice(css.indexOf("@media print{"));
const printCss = block.slice(0, block.indexOf("\n}") + 2);
for (const sel of [".rail",".topbar",".docbar",".pane-head",".subtabs",".btnrow","button",".rowdel",".chip",".kpis"])
  ok(`print hides ${sel}`, printCss.includes(sel), "not in the print rules");
ok("a field still holding a figure loses its border", /input,select,textarea\{[^}]*border:0!important/.test(printCss));
ok("A4 page box is set", /@page\{size:A4/.test(printCss));

// and editing must close before the paper is drawn
ev(`curFsView="NOTES"; S.cf.editNotes=true; S.cf.editPY=true; renderFs();`);
ok("note editor is open before printing", ev(`document.querySelectorAll("[data-note]").length`)>0);
ev(`leaveEditModesForPrint()`);
ok("note editing closed", ev(`!S.cf.editNotes`));
ok("comparative editing closed", ev(`!S.cf.editPY`));
ev(`curFsView="NOTES"; renderFs();`);
ok("no text boxes left in the notes", ev(`document.querySelectorAll("#fsBody textarea").length`)===0);
ev(`curFsView="CF"; renderFs();`);
ok("no input boxes left in the cash flow", ev(`document.querySelectorAll("#fsBody input").length`)===0);
ok("the statement itself is still there", ev(`document.querySelectorAll("#fsBody table.fs tr").length`)>10);
console.log(bad?`\n${bad} FAILED`:"\nONLY THE STATEMENTS REACH THE PAPER");
process.exit(bad?1:0);
