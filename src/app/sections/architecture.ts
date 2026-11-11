import { ChangeDetectionStrategy, Component, ElementRef, computed, signal, viewChild } from '@angular/core';
import { animate, stagger } from 'animejs';
import { GlassDirective, RevealDirective, RippleDirective } from '../core/directives';
import { motionOK } from '../core/util';
import { ORG_URL } from '../core/models';

interface Part { n: string; d: string; }
interface Layer { id: string; name: string; sub: string; icon: string; tone: string; repo: string; lic: string; parts: Part[]; note: string; }

const LAYERS: Layer[] = [
  { id: 'apps', name: 'Apps', sub: 'Paquetes .sps', icon: 'widgets', tone: 'rose', repo: 'Sdk', lic: 'LGPL-2.1',
    parts: [{ n: 'cosmic-sdk', d: 'Lo necesario para escribir una app.' }, { n: 'sps', d: 'Instala, verifica y actualiza paquetes firmados.' }],
    note: 'Cada app es un repositorio git propio; SPS la referencia por su commit.' },
  { id: 'ui', name: 'Interfaz', sub: 'Compositor y shell', icon: 'devices', tone: 'violet', repo: 'UI', lic: 'GPL-3.0',
    parts: [{ n: 'PhanteonWM', d: 'Compositor.' }, { n: 'CreationDE', d: 'Shell.' }, { n: 'cboard', d: 'Teclado en pantalla.' }, { n: 'cosmic-splash', d: 'Pantalla de arranque.' }],
    note: 'Lo que ves y tocas.' },
  { id: 'daemons', name: 'Demonios', sub: 'Servicios del sistema', icon: 'hub', tone: 'cyan', repo: 'Daemons', lic: 'AGPL-3.0',
    parts: [{ n: 'cbrokerd', d: 'Broker de permisos.' }, { n: 'cfronterad', d: 'Cortafuegos Frontera FireWall.' }, { n: 'clogd', d: 'Logging.' }, { n: 'cnotifd', d: 'Notificaciones.' },
      { n: 'cpowerd', d: 'Energía.' }, { n: 'cpushd', d: 'Cliente de push propio.' }, { n: 'csettingsd', d: 'Ajustes.' }, { n: 'cupdated', d: 'Actualizaciones.' }],
    note: 'Ocho procesos con un solo trabajo cada uno.' },
  { id: 'core', name: 'Núcleo', sub: 'Init y supervisión', icon: 'memory', tone: 'amber', repo: 'Core', lic: 'GPL-3.0',
    parts: [{ n: 'cinitd', d: 'Init (PID 1).' }, { n: 'kernel.root', d: 'Supervisor.' }, { n: 'cdevd', d: 'Gestor de dispositivos.' }, { n: 'clauncher', d: 'Launcher en Rust.' }, { n: 'corchd', d: 'Orquestador en Go.' }],
    note: 'Lo privilegiado: exige dos revisores.' },
  { id: 'kernel', name: 'Kernel', sub: 'Linux 6.18 LTS', icon: 'developer_board', tone: 'green', repo: 'Kernel', lic: 'GPL-2.0',
    parts: [{ n: 'linux/', d: 'Árbol LTS purgado: solo arm64 y riscv.' }, { n: 'configs/', d: 'Configuraciones por dispositivo.' }, { n: 'scripts/purge-arch.sh', d: 'La purga, reproducible.' }],
    note: 'Un fork propio dentro del repositorio Kernel, no el árbol de kernel.org.' },
];

@Component({
  selector: 'oc-architecture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GlassDirective, RevealDirective, RippleDirective],
  template: `
  <section class="section" id="arquitectura">
    <header class="section-head" reveal>
      <span class="label-s eyebrow">Arquitectura</span>
      <h2 class="headline-l">Cinco capas, un repositorio por carpeta</h2>
      <p class="body-l">De abajo arriba. Toca una capa para ver qué contiene y dónde vive su código.</p>
    </header>
    <div class="wrap">
      <div class="stack" #stack reveal=".layer">
        @for (l of layers; track l.id) {
          <button class="layer glass" glass ripple [class]="'layer glass tone-' + l.tone + (sel().id === l.id ? ' sel' : '')" (click)="pick(l)" [attr.aria-pressed]="sel().id === l.id">
            <span class="ms">{{ l.icon }}</span><span class="t"><b>{{ l.name }}</b><small class="muted">{{ l.sub }}</small></span><span class="ms chev">chevron_right</span>
          </button>
        }
        <span class="beam" #beam aria-hidden="true"></span>
      </div>
      <div class="info glass" glass [class]="'info glass tone-' + sel().tone" #info>
        <div class="ih"><span class="ms big">{{ sel().icon }}</span><div><h3 class="headline-s">{{ sel().name }}</h3><span class="label-s muted">{{ sel().sub }}</span></div></div>
        <p class="muted">{{ sel().note }}</p>
        <ul class="parts">
          @for (p of sel().parts; track p.n) { <li><code class="mono">{{ p.n }}</code><span class="muted">{{ p.d }}</span></li> }
        </ul>
        <div class="meta">
          <a class="chip on" [href]="repoUrl()" target="_blank" rel="noopener"><span class="ms">folder</span>{{ sel().repo }}</a>
          <span class="chip"><span class="ms">balance</span>{{ sel().lic }}</span>
        </div>
      </div>
    </div>
  </section>`,
  styles: [`
    .wrap { display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); gap: 20px; align-items: stretch; }
    .stack { display: grid; gap: 12px; position: relative; }
    .layer { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 16px; padding: 20px 22px; text-align: left; border-radius: 26px; }
    .layer .ms:first-child { font-size: 2rem; color: var(--tone); } .t { display: grid; } .t small { font-size: .85rem; }
    .chev { color: var(--on-surface-variant); transition: transform .4s var(--ease-emph); }
    .layer:hover { transform: translateX(6px); } .layer.sel { border-color: color-mix(in srgb, var(--tone) 60%, transparent); background: linear-gradient(135deg, color-mix(in srgb, var(--tone) 24%, transparent), var(--glass-fill-2)); }
    .layer.sel .chev { transform: translateX(4px); color: var(--tone); }
    .beam { position: absolute; left: -2px; bottom: 0; width: 4px; height: 36px; border-radius: 4px; background: linear-gradient(to top, transparent, var(--primary), transparent); opacity: 0; pointer-events: none; }
    .info { padding: 30px; border-radius: 34px; display: grid; gap: 16px; align-content: start; border-color: color-mix(in srgb, var(--tone) 40%, var(--glass-edge)); }
    .ih { display: flex; gap: 16px; align-items: center; } .ih h3 { margin: 0; } .big { font-size: 2.8rem; color: var(--tone); } .info p { margin: 0; }
    .parts { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; } .parts li { display: grid; grid-template-columns: minmax(130px, auto) 1fr; gap: 14px; align-items: baseline; padding: 8px 0; border-bottom: 1px solid var(--outline-variant); }
    code { color: var(--tone); font-weight: 600; font-size: .86rem; } .meta { display: flex; gap: 8px; flex-wrap: wrap; }
    @media (max-width: 860px) { .wrap { grid-template-columns: 1fr; } .parts li { grid-template-columns: 1fr; gap: 2px; } }
  `],
})
export class ArchitectureComponent {
  layers = LAYERS; sel = signal<Layer>(LAYERS[3]);
  repoUrl = computed(() => `${ORG_URL}/${this.sel().repo}`);
  private info = viewChild.required<ElementRef<HTMLElement>>('info');
  private beam = viewChild.required<ElementRef<HTMLElement>>('beam');
  private stack = viewChild.required<ElementRef<HTMLElement>>('stack');

  pick(l: Layer) {
    this.sel.set(l);
    if (!motionOK()) return;
    animate(this.info().nativeElement.querySelectorAll('.ih, p, .parts li, .meta'), { opacity: [0, 1], translateY: [16, 0], duration: 650, ease: 'outExpo', delay: stagger(45) });
    const s = this.stack().nativeElement, h = s.clientHeight, b = this.beam().nativeElement;
    animate(b, { translateY: [0, -(h - 36)], opacity: [{ to: 1, duration: 150 }, { to: 0, delay: 600, duration: 250 }], duration: 900, ease: 'inOutCubic' });
  }
}
