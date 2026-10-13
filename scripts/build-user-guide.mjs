import { readFile, writeFile } from "node:fs/promises";
import { marked } from "marked";

const markdownUrl = new URL("../docs/guide-utilisateur-prod.md", import.meta.url);
const outputUrl = new URL("../public/guide-utilisateur-prod.html", import.meta.url);
const markdown = await readFile(markdownUrl, "utf8");
const content = await marked.parse(markdown, { gfm: true });

const page = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>Guide d’utilisation · Eliccir CRM PROD 1.0.4</title>
    <style>
      :root { color-scheme: light; --ink: #25332b; --muted: #647168; --green: #1f3c32; --line: #e1e5df; --paper: #fff; --canvas: #f3f5f1; --accent: #d9e383; }
      * { box-sizing: border-box; }
      body { background: var(--canvas); color: var(--ink); font: 16px/1.65 "Avenir Next", Avenir, sans-serif; margin: 0; }
      .guide-topbar { align-items: center; background: var(--green); color: #f4f3ec; display: flex; justify-content: space-between; padding: 14px max(20px, calc((100% - 980px) / 2)); }
      .guide-brand { align-items: center; display: flex; font-weight: 700; gap: 10px; }
      .guide-mark { align-items: center; background: var(--accent); border-radius: 3px 10px 3px 10px; color: var(--green); display: inline-flex; font: 22px Georgia, serif; height: 38px; justify-content: center; width: 38px; }
      .guide-return { border: 1px solid rgba(217, 227, 131, .45); border-radius: 4px; color: #edf3b5; font-size: 13px; padding: 7px 11px; }
      .guide-return:hover { background: rgba(217, 227, 131, .12); }
      main { background: var(--paper); border: 1px solid var(--line); margin: 28px auto 64px; max-width: 980px; padding: clamp(22px, 5vw, 58px); width: calc(100% - 32px); }
      h1, h2, h3 { color: var(--green); font-family: Georgia, "Times New Roman", serif; font-weight: 500; line-height: 1.25; }
      h1 { border-bottom: 1px solid var(--line); font-size: 34px; padding-bottom: 18px; }
      h2 { border-top: 1px solid var(--line); font-size: 25px; margin-top: 42px; padding-top: 22px; }
      h3 { font-size: 19px; margin-top: 28px; }
      p, li { color: #435148; }
      a { color: #236347; text-underline-offset: 3px; }
      blockquote { background: #f3f6e4; border-left: 3px solid #a7b94d; margin: 20px 0; padding: 10px 18px; }
      table { border-collapse: collapse; display: block; margin: 18px 0; max-width: 100%; overflow-x: auto; width: max-content; }
      th, td { border: 1px solid var(--line); padding: 9px 12px; text-align: left; vertical-align: top; }
      th { background: #f3f5f1; color: #354139; }
      code { background: #f1f3ef; border-radius: 3px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .9em; padding: 2px 5px; overflow-wrap: anywhere; }
      pre { background: #1f3028; border-radius: 4px; color: #f4f3ec; overflow-x: auto; padding: 16px; }
      pre code { background: transparent; color: inherit; padding: 0; }
      @media (max-width: 600px) { body { font-size: 15px; } .guide-topbar { padding: 10px 16px; } .guide-brand { font-size: 14px; } .guide-return { font-size: 12px; } main { margin-top: 14px; width: calc(100% - 20px); } h1 { font-size: 28px; } h2 { font-size: 22px; } }
      @media print { body { background: #fff; } .guide-topbar { display: none; } main { border: 0; margin: 0 auto; max-width: none; width: 100%; } a { color: inherit; text-decoration: none; } }
    </style>
  </head>
  <body>
    <header class="guide-topbar">
      <div class="guide-brand"><span class="guide-mark">E</span><span>Eliccir CRM · Guide PROD 1.0.4</span></div>
      <a class="guide-return" href="/">Retour à Eliccir CRM</a>
    </header>
    <main>${content}</main>
  </body>
</html>
`;

await writeFile(outputUrl, page, "utf8");
console.log("Guide utilisateur généré : public/guide-utilisateur-prod.html");