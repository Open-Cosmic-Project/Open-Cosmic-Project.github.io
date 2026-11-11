import { Injectable, signal } from '@angular/core';

export interface DocMeta { slug: string; title: string; section: string; sub: string; file: string; summary: string; words: number; }
export interface DocIndex { generatedAt: string | null; repo: string; branch?: string; pages: DocMeta[]; }
export interface DocPage { slug: string; title: string; html: string; toc: { id: string; text: string; level: number }[]; source: string; edit: string; words: number; }
interface SearchDoc { slug: string; title: string; text: string; norm: string; nt: string; }
export interface Hit { meta: DocMeta; score: number; before: string; match: string; after: string; }

// Quita tildes sin cambiar la longitud del texto (para poder cortar el fragmento del original).
const flat = (s: string) => s.toLowerCase().replace(/[áàäâã]/g, 'a').replace(/[éèëê]/g, 'e').replace(/[íìïî]/g, 'i').replace(/[óòöôõ]/g, 'o').replace(/[úùüû]/g, 'u').replace(/ñ/g, 'n');

@Injectable({ providedIn: 'root' })
export class DocsService {
  readonly index = signal<DocIndex | null>(null);
  readonly failed = signal(false);
  private idxP?: Promise<void>;
  private pages = new Map<string, Promise<DocPage | null>>();
  private searchP?: Promise<SearchDoc[]>;

  ensureIndex(): Promise<void> {
    return (this.idxP ??= fetch('/docs-data/index.json').then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((i: DocIndex) => this.index.set(i)).catch(() => { this.failed.set(true); this.index.set({ generatedAt: null, repo: '', pages: [] }); }));
  }

  page(slug: string): Promise<DocPage | null> {
    let p = this.pages.get(slug);
    if (!p) { p = fetch(`/docs-data/p/${encodeURIComponent(slug)}.json`).then(r => (r.ok ? (r.json() as Promise<DocPage>) : null)).catch(() => null); this.pages.set(slug, p); }
    return p;
  }

  private loadSearch(): Promise<SearchDoc[]> {
    return (this.searchP ??= fetch('/docs-data/search.json').then(r => (r.ok ? r.json() : [])).catch(() => [])
      .then((a: { slug: string; title: string; text: string }[]) => a.map(d => ({ ...d, norm: flat(d.text), nt: flat(d.title) }))));
  }

  async search(q: string): Promise<Hit[]> {
    const terms = flat(q).split(/\s+/).filter(t => t.length > 1);
    if (!terms.length) return [];
    const [docs] = await Promise.all([this.loadSearch(), this.ensureIndex()]);
    const meta = new Map(this.index()?.pages.map(p => [p.slug, p]));
    const hits: Hit[] = [];
    for (const d of docs) {
      let score = 0, first = -1, len = 0;
      for (const t of terms) {
        const inTitle = d.nt.includes(t); let n = 0, i = -1, at = -1;
        while ((i = d.norm.indexOf(t, i + 1)) !== -1 && n < 25) { if (at < 0) at = i; n++; }
        if (!inTitle && !n) { score = 0; break; }
        score += (inTitle ? 12 : 0) + n; if (first < 0 || (at >= 0 && at < first)) { first = at; len = t.length; }
      }
      const m = meta.get(d.slug);
      if (!score || !m) continue;
      const s = Math.max(0, first - 60), e = Math.min(d.text.length, first + len + 90);
      hits.push({ meta: m, score, before: (s ? '…' : '') + d.text.slice(s, Math.max(first, s)), match: first >= 0 ? d.text.slice(first, first + len) : '', after: first >= 0 ? d.text.slice(first + len, e) + (e < d.text.length ? '…' : '') : '' });
    }
    return hits.sort((a, b) => b.score - a.score).slice(0, 12);
  }
}
