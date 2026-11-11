#!/usr/bin/env node
/* Safe comment stripper for Angular web sources.
 * .ts  -> TypeScript scanner (correctly distinguishes regex/strings/templates)
 * .scss-> string-aware char scanner (no regex/template literals in SCSS)
 * .html-> <!-- --> removal
 * Preserves functional directives. Usage: strip_web_comments.js <tsLibPath> --apply <file>...
 */
const fs = require("fs");
const tsLib = process.argv[2];
const args = process.argv.slice(3);
const apply = args.includes("--apply");
const files = args.filter((a) => a !== "--apply");
const ts = require(tsLib);

const KEEP_TS = /(@ts-ignore|@ts-expect-error|@ts-nocheck|eslint|prettier-ignore|stylelint|webpackChunkName|webpackMode|webpackPrefetch|webpackPreload|@license|@preserve|@__PURE__|^\/\/\/\s*<reference)/;
const KEEP_SCSS = /^\/\*!|stylelint/;

function postprocess(text) {
  let lines = text.split("\n").map((l) => l.replace(/[ \t]+$/g, ""));
  const out = [];
  let blanks = 0;
  for (const l of lines) {
    if (l.trim() === "") {
      blanks++;
      if (blanks <= 1) out.push(l);
    } else {
      blanks = 0;
      out.push(l);
    }
  }
  while (out.length && out[0].trim() === "") out.shift();
  while (out.length && out[out.length - 1].trim() === "") out.pop();
  return out.join("\n") + "\n";
}

function stripTs(text) {
  const sf = ts.createSourceFile("f.ts", text, ts.ScriptTarget.Latest, true);
  const seen = new Set();
  const ranges = [];
  function add(r) {
    if (!r) return;
    for (const c of r) {
      const key = c.pos + ":" + c.end;
      if (seen.has(key)) continue;
      seen.add(key);
      const ctext = text.slice(c.pos, c.end);
      if (!KEEP_TS.test(ctext)) ranges.push([c.pos, c.end]);
    }
  }
  function walk(node) {
    add(ts.getLeadingCommentRanges(text, node.getFullStart()));
    add(ts.getTrailingCommentRanges(text, node.getEnd()));
    ts.forEachChild(node, walk);
  }
  walk(sf);
  add(ts.getLeadingCommentRanges(text, sf.endOfFileToken.getFullStart()));
  ranges.sort((a, b) => a[0] - b[0]);
  let t = text;
  for (let i = ranges.length - 1; i >= 0; i--) t = t.slice(0, ranges[i][0]) + t.slice(ranges[i][1]);
  return [postprocess(t), ranges.length];
}

function stripScss(text) {
  let out = "";
  let i = 0,
    n = text.length,
    removed = 0;
  let str = null; // current string quote char or null
  while (i < n) {
    const c = text[i],
      d = text[i + 1];
    if (str) {
      out += c;
      if (c === "\\") {
        out += text[i + 1] || "";
        i += 2;
        continue;
      }
      if (c === str) str = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      str = c;
      out += c;
      i++;
      continue;
    }
    if (c === "/" && d === "/") {
      let j = i;
      while (j < n && text[j] !== "\n") j++;
      removed++;
      i = j;
      continue;
    }
    if (c === "/" && d === "*") {
      const block = text.slice(i, text.indexOf("*/", i + 2) + 2);
      if (KEEP_SCSS.test(block)) {
        out += block;
      } else {
        removed++;
      }
      i += block.length;
      continue;
    }
    out += c;
    i++;
  }
  return [postprocess(out), removed];
}

function stripHtml(text) {
  let removed = 0;
  const t = text.replace(/<!--[\s\S]*?-->/g, () => {
    removed++;
    return "";
  });
  return [postprocess(t), removed];
}

let totalFiles = 0,
  totalRemoved = 0;
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  let res;
  if (f.endsWith(".ts")) res = stripTs(src);
  else if (f.endsWith(".scss") || f.endsWith(".css")) res = stripScss(src);
  else if (f.endsWith(".html")) res = stripHtml(src);
  else continue;
  const [out, n] = res;
  if (n > 0 && out !== src) {
    totalFiles++;
    totalRemoved += n;
    if (apply) fs.writeFileSync(f, out);
    else console.log(`${String(n).padStart(4)}  ${f}`);
  }
}
console.log(`\n${apply ? "APPLIED" : "DRY-RUN"}: ${totalRemoved} comments across ${totalFiles} files`);
