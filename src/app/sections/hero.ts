import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, effect, inject, untracked, viewChild } from '@angular/core';
import { animate, createTimeline, stagger } from 'animejs';
import { GithubService } from '../core/github.service';
import { GlassDirective, TiltDirective, RippleDirective } from '../core/directives';
import { CountComponent } from '../core/widgets';
import { ORG_URL, KIND_META } from '../core/models';
import { Clock, ago, motionOK } from '../core/util';

const CHANNELS = [
  { n: 'EventHorizon', r: 92, c: 'var(--tone-rose)', d: 14000 },
  { n: 'Quasar', r: 140, c: 'var(--tone-cyan)', d: 22000 },
  { n: 'Pulsar', r: 188, c: 'var(--tone-amber)', d: 31000 },
  { n: 'Nebula', r: 236, c: 'var(--tone-green)', d: 44000 },
  { n: 'Singularity', r: 284, c: 'var(--tone-violet)', d: 60000 },
];

@Component({
  selector: 'oc-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GlassDirective, TiltDirective, RippleDirective, CountComponent],
  template: `
  <section class="hero" id="inicio">
    <div class="copy" #copy>
      <p class="chip-live glass-pill" glass>
        <span class="dot" [class.on]="gh.status() === 'vivo' || gh.status() === 'demo'"></span>
        @switch (gh.status()) {
          @case ('vivo') { En vivo desde GitHub }
          @case ('demo') { Modo demo: eventos simulados }
          @case ('instantanea') { Instantánea {{ snapAge() }} }
          @case ('sin-red') { Sin conexión con GitHub }
          @default { Conectando… }
        }
      </p>
      <h1 class="display-l title" aria-label="Open Cosmic Project">
        <span class="w"><span class="g">Open</span></span>&ngsp;<span class="w"><span class="g">Cosmic</span></span>&ngsp;<span class="w"><span class="g">Project</span></span>
      </h1>
      <p class="body-l lead">
        <strong>CosmicOS</strong> (nombre temporal) es un sistema móvil alternativo a Android e iOS: kernel Linux, paquetes firmados con
        <strong>SPS</strong>, notificaciones push propias y un dispositivo que tú puedes desbloquear y volver a bloquear.
        Todo se construye a la vista; esta página late con la organización.
      </p>
      <div class="cta">
        <a class="btn filled" ripple [href]="orgUrl" target="_blank" rel="noopener"><span class="ms">code</span>Ver en GitHub</a>
        <a class="btn tonal" ripple href="#contribuir"><span class="ms">volunteer_activism</span>Contribuir</a>
      </div>
      @if (gh.latestRelease(); as rel) {
        <a class="rel glass" glass [href]="rel.url" target="_blank" rel="noopener">
          <span class="ms">rocket_launch</span>
          <span><span class="label-s muted">Última versión</span><br><b>{{ rel.repo }}</b> · {{ rel.tag }} <span class="muted">· {{ ago(rel.at) }}</span></span>
        </a>
      }
    </div>

    <div class="orbit" aria-hidden="true" #orbit>
      <svg viewBox="0 0 600 600">
        <defs>
          <radialGradient id="core" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#e6deff"/><stop offset=".5" stop-color="#7c5cff"/><stop offset="1" stop-color="#1c0f55"/></radialGradient>
          <radialGradient id="halo"><stop offset="0" stop-color="#7c5cff" stop-opacity=".55"/><stop offset="1" stop-color="#7c5cff" stop-opacity="0"/></radialGradient>
        </defs>
        <circle cx="300" cy="300" r="150" fill="url(#halo)" class="halo"/>
        @for (c of channels; track c.n) {
          <circle cx="300" cy="300" [attr.r]="c.r" fill="none" stroke="currentColor" stroke-opacity=".16" stroke-dasharray="2 7"/>
        }
        <circle class="ping" cx="300" cy="300" r="40" fill="none" stroke="var(--primary)" stroke-width="2" opacity="0"/>
        <circle cx="300" cy="300" r="46" fill="url(#core)"/>
        <ellipse cx="300" cy="300" rx="70" ry="16" fill="none" stroke="var(--tone-rose)" stroke-width="3" transform="rotate(-24 300 300)" opacity=".9"/>
        @for (c of channels; track c.n) {
          <g class="sat" [style.transform-origin]="'300px 300px'" [attr.data-d]="c.d">
            <a href="#canales" [attr.aria-label]="c.n"><circle [attr.cx]="300 + c.r" cy="300" r="9" [attr.fill]="c.c"/><circle [attr.cx]="300 + c.r" cy="300" r="16" [attr.fill]="c.c" opacity=".22"/><title>{{ c.n }}</title></a>
          </g>
        }
      </svg>
    </div>

    <div class="stats" #stats>
      <article class="stat glass" glass tilt="5" style="--tone: var(--tone-amber)"><span class="ms">star</span><b class="num"><oc-count [value]="gh.stars()"/></b><span class="label-s muted">Estrellas</span></article>
      <article class="stat glass" glass tilt="5" style="--tone: var(--tone-green)"><span class="ms">groups</span><b class="num"><oc-count [value]="gh.members().length"/></b><span class="label-s muted">Miembros públicos</span></article>
      <article class="stat glass" glass tilt="5" style="--tone: var(--tone-cyan)"><span class="ms">call_split</span><b class="num"><oc-count [value]="gh.openPrs()"/></b><span class="label-s muted">PR abiertas</span></article>
      <article class="stat glass" glass tilt="5" style="--tone: var(--tone-violet)"><span class="ms">commit</span><b class="num"><oc-count [value]="gh.commits7d()"/></b><span class="label-s muted">Commits · 7 días</span></article>
      <article class="stat glass" glass tilt="5" style="--tone: var(--tone-rose)"><span class="ms">deployed_code</span><b class="num"><oc-count [value]="gh.repos().length"/></b><span class="label-s muted">Repositorios</span></article>
    </div>
  </section>`,
  styles: [`
    :host { display: block; }
    .hero { max-width: 1240px; margin: 0 auto; padding: clamp(112px, 16vw, 168px) var(--pad) 40px; display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr); gap: clamp(16px, 4vw, 56px); align-items: center; }
    .copy { display: grid; gap: 22px; justify-items: start; }
    .glass-pill { margin: 0; display: inline-flex; align-items: center; gap: 10px; height: 34px; padding: 0 16px 0 12px; border-radius: 999px; font-size: .8125rem; font-weight: 600; letter-spacing: .02em; }
    .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--outline); position: relative; }
    .dot.on { background: var(--tone-green); box-shadow: 0 0 10px var(--tone-green); }
    .dot.on::after { content: ''; position: absolute; inset: -5px; border-radius: 50%; border: 2px solid var(--tone-green); animation: ring 1.8s var(--ease-emph-dec) infinite; }
    @keyframes ring { from { transform: scale(.5); opacity: .9; } to { transform: scale(1.7); opacity: 0; } }
    .title { margin: 0; } .w { display: inline-block; overflow: hidden; padding-bottom: .12em; margin-bottom: -.12em; }
    .g { display: inline-block; background: linear-gradient(120deg, var(--on-surface) 10%, var(--primary) 55%, var(--tone-rose) 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .lead { margin: 0; max-width: 56ch; } .lead strong { color: var(--on-surface); font-weight: 650; }
    .cta { display: flex; gap: 12px; flex-wrap: wrap; }
    .rel { display: inline-flex; align-items: center; gap: 14px; padding: 12px 20px 12px 16px; border-radius: 20px; font-size: .9rem; line-height: 1.35; max-width: 100%; }
    .rel .ms { color: var(--tone-rose); font-size: 1.75rem; }
    .orbit { aspect-ratio: 1; width: 100%; max-width: 560px; justify-self: center; color: var(--on-surface); }
    .orbit svg { width: 100%; height: 100%; overflow: visible; } .sat { transform-box: view-box; } .sat a { cursor: pointer; }
    .stats { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; margin-top: 28px; }
    .stat { padding: 20px 20px 18px; display: grid; gap: 4px; border-radius: 28px; }
    .stat .ms { color: var(--tone); font-size: 1.6rem; }
    .num { font-size: clamp(1.9rem, 3.4vw, 2.6rem); font-weight: 700; letter-spacing: -.03em; line-height: 1.1; }
    @media (max-width: 960px) { .hero { grid-template-columns: 1fr; } .orbit { max-width: 420px; order: -1; margin-bottom: -20px; } .stats { grid-template-columns: repeat(2, 1fr); } .stats .stat:last-child { grid-column: 1 / -1; } }
  `],
})
export class HeroComponent {
  gh = inject(GithubService);
  private clock = inject(Clock);
  channels = CHANNELS; orgUrl = ORG_URL; meta = KIND_META;
  private copy = viewChild.required<ElementRef<HTMLElement>>('copy');
  private orbit = viewChild.required<ElementRef<HTMLElement>>('orbit');
  private stats = viewChild.required<ElementRef<HTMLElement>>('stats');

  ago = (iso: string) => ago(iso, this.clock.now());
  snapAge = () => { const g = this.gh.generatedAt(); return g ? ago(g, this.clock.now()) : ''; };

  constructor() {
    afterNextRender(() => {
      const root = this.copy().nativeElement, orbit = this.orbit().nativeElement;
      if (!motionOK()) return;
      createTimeline({ defaults: { ease: 'outExpo' } })
        .add(root.querySelectorAll('.glass-pill'), { opacity: [0, 1], translateY: [-14, 0], duration: 700 })
        .add(root.querySelectorAll('.g'), { translateY: ['110%', '0%'], rotate: [6, 0], duration: 1100, delay: stagger(110) }, '-=400')
        .add(root.querySelectorAll('.lead, .cta, .rel'), { opacity: [0, 1], translateY: [22, 0], duration: 900, delay: stagger(110) }, '-=700')
        .add(this.stats().nativeElement.querySelectorAll('.stat'), { opacity: [0, 1], translateY: [40, 0], scale: [.94, 1], duration: 900, delay: stagger(90) }, '-=600');
      orbit.querySelectorAll<SVGGElement>('.sat').forEach((g, i) =>
        animate(g, { rotate: 360, duration: Number(g.dataset['d']), ease: 'linear', loop: true, delay: -i * 2500 }));
      animate(orbit.querySelector('.halo')!, { scale: [1, 1.12], opacity: [.8, 1], duration: 3200, ease: 'inOutSine', alternate: true, loop: true });
    });
    // cada evento en vivo lanza un pulso desde el núcleo
    effect(() => {
      const p = this.gh.pulse();
      untracked(() => {
        if (!p || !motionOK()) return;
        const ping = this.orbit().nativeElement.querySelector('.ping');
        if (ping) animate(ping, { r: [40, 300], opacity: [.9, 0], strokeWidth: [4, .5], duration: 1800, ease: 'outCubic' });
      });
    });
  }
}
