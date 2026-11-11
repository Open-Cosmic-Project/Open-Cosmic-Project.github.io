#!/usr/bin/env node
// Convierte el repositorio Docs (Markdown) en JSON estático para la web: public/docs-data/
//   index.json  → árbol de páginas (título, sección, resumen)
//   search.json → texto plano para la búsqueda en el navegador
//   p/<slug>.json → HTML ya saneado + tabla de contenidos de cada página
//   assets/…    → imágenes relativas copiadas del propio repositorio
// Descubre solo cualquier .md nuevo (incluidas subcarpetas como References/): no hay que tocar la web.
// Uso: OCP_DOCS=ruta/a/Docs node scripts/build-docs.mjs   (por defecto ./.docs-src)
import { mkdir, readdir, readFile, rm, writeFile, copyFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { Marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import hljs from 'highlight.js/lib/common';

const SRC = path.resolve(process.env.OCP_DOCS ?? '.docs-src');
const OUT = path.resolve('public/docs-data');
const REPO = process.env.OCP_DOCS_REPO ?? 'Open-Cosmic-Project/Docs';
const BRANCH = process.env.OCP_DOCS_BRANCH ?? 'eventhorizon';
const IMG = /\.(png|jpe?g|gif|svg|webp|avif)$/i;
// Orden de lectura de los archivos de la raíz; lo que no esté aquí va después, por orden alfabético.
const ORDER = ['README', 'CosmicOS-spec', 'architecture', 'repositories', 'building', 'kernel', 'sps-and-security'];
const SECTION_NAMES = { '': 'Proyecto', References: 'Referencias' };

const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s+/g, '-');
const strip = (h) => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

async function walk(dir, rel = '') {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...(await walk(path.join(dir, e.name), r)));
    else out.push(r);
  }
  return out;
}

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(path.join(OUT, 'p'), { recursive: true });
  const empty = async (why) => {
    console.warn(`docs: ${why}; se genera un índice vacío.`);
    await writeFile(path.join(OUT, 'index.json'), JSON.stringify({ generatedAt: null, repo: REPO, pages: [] }));
    await writeFile(path.join(OUT, 'search.json'), '[]');
  };
  try { await stat(SRC); } catch { return empty(`no existe ${SRC}`); }

  const files = (await walk(SRC)).sort();
  const mds = files.filter((f) => /\.md$/i.test(f) && !/^(LICENSE|COPYING)/i.test(path.basename(f)));
  if (!mds.length) return empty('no hay archivos .md');

  // 1) slugs y títulos primero, para poder resolver enlaces entre páginas
  const pages = [];
  for (const f of mds) {
    const raw = await readFile(path.join(SRC, f), 'utf8');
    const dir = path.posix.dirname(f) === '.' ? '' : path.posix.dirname(f);
    const base = path.posix.basename(f, path.posix.extname(f));
    const slug = slugify(f.replace(/\.md$/i, '').replace(/\//g, '--').replace(/\bREADME$/i, 'readme')).replace(/-{3,}/g, '--');
    const h1 = /^#\s+(.+)$/m.exec(raw)?.[1]?.replace(/[`*_]/g, '').trim();
    const sectionKey = dir.split('/')[0] ?? '';
    pages.push({ file: f, dir, base, slug, raw, title: h1 || base.replace(/[-_]/g, ' '), sectionKey,
      sub: dir.split('/').slice(1).join(' / ') });
  }
  const bySource = new Map(pages.map((p) => [p.file.toLowerCase(), p]));

  // 2) render
  for (const p of pages) {
    const toc = []; const used = new Map();
    const marked = new Marked({ gfm: true });
    marked.use({
      renderer: {
        heading({ tokens, depth }) {
          const html = this.parser.parseInline(tokens);
          let id = slugify(strip(html)) || 'sec'; const n = used.get(id) ?? 0; used.set(id, n + 1); if (n) id += `-${n}`;
          if (depth >= 2 && depth <= 3) toc.push({ id, text: strip(html), level: depth });
          return `<h${depth} id="${id}">${html}<a class="anchor" href="#${id}" aria-label="Enlace a esta sección">#</a></h${depth}>\n`;
        },
        code({ text, lang }) {
          const l = (lang ?? '').split(/\s/)[0];
          const ok = l && hljs.getLanguage(l);
          const body = ok ? hljs.highlight(text, { language: l }).value : sanitizeHtml(text, { allowedTags: [] }).replace(/"/g, '&quot;');
          return `<div class="code"><button class="copy" type="button" aria-label="Copiar código"><span class="ms">content_copy</span></button><pre><code class="hljs${l ? ' language-' + l : ''}">${body}</code></pre></div>\n`;
        },
        table(token) {
          const h = token.header.map((c) => `<th${c.align ? ` align="${c.align}"` : ''}>${this.parser.parseInline(c.tokens)}</th>`).join('');
          const rows = token.rows.map((r) => `<tr>${r.map((c) => `<td${c.align ? ` align="${c.align}"` : ''}>${this.parser.parseInline(c.tokens)}</td>`).join('')}</tr>`).join('');
          return `<div class="tbl"><table><thead><tr>${h}</tr></thead><tbody>${rows}</tbody></table></div>\n`;
        },
        link({ href, tokens, title }) {
          return `<a href="${href}"${title ? ` title="${title}"` : ''}>${this.parser.parseInline(tokens)}</a>`;
        },
        image({ href, text, title }) {
          return `<img src="${href}" alt="${text ?? ''}"${title ? ` title="${title}"` : ''} loading="lazy">`;
        },
      },
    });
    let html = marked.parse(p.raw);

    html = sanitizeHtml(html, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'img', 'details', 'summary', 'span', 'div', 'button', 'del', 'sup', 'sub', 'kbd', 'mark']),
      allowedAttributes: {
        a: ['href', 'id', 'name', 'title', 'class', 'aria-label', 'data-doc', 'target', 'rel'],
        img: ['src', 'alt', 'title', 'loading', 'width', 'height'],
        h1: ['id'], h2: ['id'], h3: ['id'], h4: ['id'], h5: ['id'], h6: ['id'],
        code: ['class'], span: ['class'], div: ['class'], button: ['class', 'type', 'aria-label'],
        td: ['align'], th: ['align'],
      },
      allowedSchemes: ['http', 'https', 'mailto'],
      allowedSchemesAppliedToAttributes: ['href', 'src'],
      allowProtocolRelative: false,
      transformTags: { a: (tag, attrs) => (/^https?:/i.test(attrs.href ?? '') ? { tagName: 'a', attribs: { ...attrs, rel: 'noopener', target: '_blank' } } : { tagName: 'a', attribs: attrs }) },
    });

    // enlaces y recursos relativos
    html = html.replace(/<a ([^>]*?)href="([^"#?][^"]*?)(#[^"]*)?"/g, (m, pre, href, hash = '') => {
      if (/^(https?:|mailto:|\/)/i.test(href)) return m;
      if (!/\.md$/i.test(href)) return m;
      const target = bySource.get(path.posix.normalize(path.posix.join(p.dir, decodeURI(href))).toLowerCase());
      return target ? `<a ${pre}data-doc="${target.slug}${hash}" href="/docs/${target.slug}${hash}"` : m;
    });
    html = html.replace(/<a ([^>]*?)href="#([^"]+)"/g, (m, pre, id) => (pre.includes('class="anchor"') ? m : `<a ${pre}data-doc="${p.slug}#${id}" href="/docs/${p.slug}#${id}"`));
    const assets = [];
    html = html.replace(/<img ([^>]*?)src="([^"]+)"/g, (m, pre, src) => {
      if (/^(https?:|data:)/i.test(src)) return m;
      const rel = path.posix.normalize(path.posix.join(p.dir, decodeURI(src)));
      if (!IMG.test(rel) || rel.startsWith('..')) return m;
      assets.push(rel); return `<img ${pre}src="/docs-data/assets/${rel}"`;
    });
    for (const a of new Set(assets)) {
      try { await mkdir(path.dirname(path.join(OUT, 'assets', a)), { recursive: true }); await copyFile(path.join(SRC, a), path.join(OUT, 'assets', a)); }
      catch { console.warn(`docs: imagen no encontrada: ${a} (en ${p.file})`); }
    }
    // etiquetas de estado de la especificación, fuera de <code>/<pre>
    html = html.split(/(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>|<[^>]+>)/g).map((s) => (s.startsWith('<') ? s
      : s.replace(/\[(Acordado|Propuesto|Abierto|Aplazado)\]/g, '<span class="tag tag-$1">$1</span>'))).join('');

    const text = strip(html.replace(/<(pre|button)[\s\S]*?<\/\1>/g, ' ').replace(/<\/(p|li|tr|h\d|div)>/g, ' ')).replace(/\s+/g, ' ').trim();
    const firstP = /<p>([\s\S]*?)<\/p>/.exec(html)?.[1];
    p.summary = firstP ? strip(firstP).slice(0, 180) : '';
    p.words = text.split(' ').length;
    p.text = text; p.html = html; p.toc = toc;
  }

  // 3) orden y salida
  const rank = (p) => { const i = ORDER.findIndex((o) => o.toLowerCase() === p.base.toLowerCase()); return p.dir === '' ? (i < 0 ? 100 : i) : 1000; };
  pages.sort((a, b) => rank(a) - rank(b) || a.file.localeCompare(b.file, 'es'));
  for (const p of pages) {
    await writeFile(path.join(OUT, 'p', `${p.slug}.json`), JSON.stringify({ slug: p.slug, title: p.title, html: p.html, toc: p.toc,
      source: p.file, edit: `https://github.com/${REPO}/edit/${BRANCH}/${p.file}`, words: p.words }));
  }
  const index = { generatedAt: new Date().toISOString(), repo: REPO, branch: BRANCH,
    pages: pages.map((p) => ({ slug: p.slug, title: p.title, section: SECTION_NAMES[p.sectionKey] ?? p.sectionKey, sub: p.sub, file: p.file, summary: p.summary, words: p.words })) };
  await writeFile(path.join(OUT, 'index.json'), JSON.stringify(index));
  await writeFile(path.join(OUT, 'search.json'), JSON.stringify(pages.map((p) => ({ slug: p.slug, title: p.title, text: p.text }))));
  console.log(`docs: ${pages.length} páginas, ${(pages.reduce((a, p) => a + p.text.length, 0) / 1024).toFixed(0)} KB de texto`);
}
main().catch((e) => { console.error('docs: error', e); process.exitCode = 1; });
