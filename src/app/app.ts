import { ChangeDetectionStrategy, Component, ElementRef, HostListener, OnInit, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { animate } from 'animejs';
import { GithubService } from './core/github.service';
import { KIND_META, ORG, ORG_URL } from './core/models';
import { GlassDirective, RippleDirective } from './core/directives';
import { motionOK } from './core/util';
import { StarsComponent } from './sections/stars';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GlassDirective, RippleDirective, StarsComponent, RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  gh = inject(GithubService);
  org = ORG; orgUrl = ORG_URL; meta = KIND_META;
  theme = signal<'dark' | 'light'>('dark');
  scrolled = signal(false); menu = signal(false); active = signal('inicio');
  toast = signal<{ icon: string; tone: string; text: string; sub: string } | null>(null);
  nav = [['actividad', 'Actividad'], ['canales', 'Canales'], ['arquitectura', 'Arquitectura'], ['repos', 'Repositorios'], ['comunidad', 'Comunidad'], ['contribuir', 'Contribuir']];
  private router = inject(Router);
  onDocs = signal(false);
  private toastEl = viewChild<ElementRef<HTMLElement>>('toastEl');
  private tt: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => {
      const p = this.gh.pulse();
      untracked(() => {
        if (!p) return;
        const it = this.gh.feed()[0]; if (!it) return;
        const m = KIND_META[p.kind];
        this.toast.set({ icon: m.icon, tone: m.tone, text: `${it.actor} ${it.text} ${it.repo}`, sub: it.detail ?? m.label });
        clearTimeout(this.tt); this.tt = setTimeout(() => this.toast.set(null), 5200);
        queueMicrotask(() => { const el = this.toastEl()?.nativeElement; if (el && motionOK()) animate(el, { translateY: [30, 0], opacity: [0, 1], scale: [.92, 1], duration: 700, ease: 'outElastic(1, .8)' }); });
      });
    });
  }

  ngOnInit() {
    this.gh.start();
    const cur = document.documentElement.dataset['theme'];
    this.theme.set(cur === 'light' || (!cur && matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark');
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      const url = this.router.url; this.onDocs.set(url.startsWith('/docs')); this.menu.set(false);
      if (!this.onDocs()) this.spy(); else { this.io?.disconnect(); this.active.set('docs'); }
    });
  }
  toggleTheme() {
    const t = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(t); document.documentElement.dataset['theme'] = t;
    try { localStorage.setItem('ocp-theme', t); } catch { /* sin almacenamiento */ }
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', t === 'dark' ? '#0a0919' : '#f7f4ff');
  }
  @HostListener('window:scroll') onScroll() { this.scrolled.set(scrollY > 24); }
  private io?: IntersectionObserver;
  private spy() {
    if (!('IntersectionObserver' in window)) return;
    this.io?.disconnect();
    const io = this.io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && this.active.set(e.target.id)), { rootMargin: '-45% 0px -50% 0px' });
    setTimeout(() => ['inicio', ...this.nav.map(n => n[0])].forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); }), 400);
  }
}
