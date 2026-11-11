import { ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, ViewEncapsulation, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, Title } from '@angular/platform-browser';
import { map } from 'rxjs';
import { animate } from 'animejs';
import { DocMeta, DocPage, DocsService, Hit } from './docs.service';
import { GlassDirective, RippleDirective } from '../core/directives';
import { motionOK } from '../core/util';

interface Group { section: string; subs: { sub: string; pages: DocMeta[] }[]; }

@Component({
  selector: 'oc-docs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [RouterLink, GlassDirective, RippleDirective],
  templateUrl: './docs.html',
  styleUrl: './docs.scss',
})
export class DocsComponent implements OnDestroy {
  svc = inject(DocsService);
  private route = inject(ActivatedRoute); private router = inject(Router);
  private san = inject(DomSanitizer); private titleSvc = inject(Title);
  slug = toSignal(this.route.paramMap.pipe(map(p => p.get('slug'))), { initialValue: null });
  page = signal<DocPage | null>(null);
  state = signal<'cargando' | 'listo' | 'no-existe'>('cargando');
  q = signal(''); hits = signal<Hit[]>([]); searching = signal(false);
  drawer = signal(false); active = signal('');
  private input = viewChild<ElementRef<HTMLInputElement>>('search');
  private body = viewChild<ElementRef<HTMLElement>>('body');
  private io?: IntersectionObserver; private qt: ReturnType<typeof setTimeout> | undefined;

  pages = computed(() => this.svc.index()?.pages ?? []);
  groups = computed<Group[]>(() => {
    const out: Group[] = [];
    for (const p of this.pages()) {
      let g = out.find(x => x.section === p.section); if (!g) out.push(g = { section: p.section, subs: [] });
      let s = g.subs.find(x => x.sub === p.sub); if (!s) g.subs.push(s = { sub: p.sub, pages: [] });
      s.pages.push(p);
    }
    return out;
  });
  pos = computed(() => this.pages().findIndex(p => p.slug === this.slug()));
  prev = computed(() => this.pages()[this.pos() - 1] ?? null);
  next = computed(() => { const i = this.pos(); return i >= 0 ? this.pages()[i + 1] ?? null : null; });
  meta = computed(() => this.pages()[this.pos()] ?? null);
  html = computed(() => { const p = this.page(); return p ? this.san.bypassSecurityTrustHtml(p.html) : ''; }); // saneado al generar (build-docs.mjs)
  minutes = computed(() => Math.max(1, Math.round((this.page()?.words ?? 0) / 200)));

  constructor() {
    void this.svc.ensureIndex();
    effect(() => {
      const slug = this.slug(), idx = this.svc.index();
      if (!idx) return;
      untracked(async () => {
        if (!slug) { if (idx.pages[0]) void this.router.navigate(['/docs', idx.pages[0].slug], { replaceUrl: true }); else this.state.set('listo'); return; }
        this.state.set('cargando'); this.drawer.set(false);
        const p = await this.svc.page(slug);
        if (this.slug() !== slug) return;           // el usuario ya navegó a otra
        this.page.set(p); this.state.set(p ? 'listo' : 'no-existe');
        this.titleSvc.setTitle(p ? `${p.title} · Docs · OpenCosmicProject` : 'Docs · OpenCosmicProject');
        setTimeout(() => this.afterLoad(), 30);
      });
    });
  }

  private afterLoad() {
    const body = this.body()?.nativeElement; if (!body) return;
    const frag = this.route.snapshot.fragment;
    const target = frag ? body.querySelector<HTMLElement>(`[id="${CSS.escape(frag)}"]`) : null;
    if (target) target.scrollIntoView({ block: 'start' }); else if (!frag) scrollTo({ top: 0 });
    if (motionOK()) animate(body, { opacity: [0, 1], translateY: [14, 0], duration: 500, ease: 'outExpo' });
    this.io?.disconnect();
    const heads = Array.from(body.querySelectorAll<HTMLElement>('h2[id], h3[id]'));
    if (!heads.length || !('IntersectionObserver' in window)) return;
    this.io = new IntersectionObserver(es => { const v = es.find(e => e.isIntersecting); if (v) this.active.set(v.target.id); }, { rootMargin: '-90px 0px -70% 0px' });
    heads.forEach(h => this.io!.observe(h));
  }

  onSearch(v: string) {
    this.q.set(v); clearTimeout(this.qt);
    if (v.trim().length < 2) { this.hits.set([]); this.searching.set(false); return; }
    this.searching.set(true);
    this.qt = setTimeout(async () => { const h = await this.svc.search(v); if (this.q() === v) { this.hits.set(h); this.searching.set(false); } }, 120);
  }
  clear() { this.q.set(''); this.hits.set([]); }
  scrollToId(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: motionOK() ? 'smooth' : 'auto' }); history.replaceState(null, '', `${location.pathname}#${id}`); }

  onBodyClick(ev: MouseEvent) {
    const t = ev.target as HTMLElement;
    const copy = t.closest<HTMLElement>('.copy');
    if (copy) {
      const code = copy.parentElement?.querySelector('code')?.textContent ?? '';
      navigator.clipboard?.writeText(code).then(() => { const i = copy.querySelector('.ms'); if (i) { i.textContent = 'check'; setTimeout(() => (i.textContent = 'content_copy'), 1500); } }).catch(() => {});
      return;
    }
    const a = t.closest<HTMLAnchorElement>('a[data-doc]');
    if (a && !ev.metaKey && !ev.ctrlKey && !ev.shiftKey && ev.button === 0) {
      ev.preventDefault();
      const [slug, frag] = (a.dataset['doc'] ?? '').split('#');
      void this.router.navigate(['/docs', slug], { fragment: frag || undefined }).then(() => { if (slug === this.slug() && frag) document.getElementById(frag)?.scrollIntoView(); });
    }
  }

  @HostListener('document:keydown', ['$event']) key(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement)?.tagName;
    if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') { e.preventDefault(); this.drawer.set(true); setTimeout(() => this.input()?.nativeElement.focus(), 50); }
    if (e.key === 'Escape') { this.clear(); this.drawer.set(false); }
  }
  ngOnDestroy() { this.io?.disconnect(); clearTimeout(this.qt); }
}
