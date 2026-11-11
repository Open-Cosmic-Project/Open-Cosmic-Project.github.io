import { ChangeDetectionStrategy, Component, ElementRef, signal, viewChild } from '@angular/core';
import { animate, createTimeline, stagger } from 'animejs';
import { GlassDirective, RevealDirective, RippleDirective } from '../core/directives';
import { motionOK } from '../core/util';

interface Ch { id: string; name: string; tag: string; tone: string; icon: string; blurb: string; gets: string; }
const CH: Ch[] = [
  { id: 'eventhorizon', name: 'EventHorizon', tag: 'Ultraexperimental', tone: 'rose', icon: 'science',
    blurb: 'Aquí se forjan las ideas más locas. Es la rama por defecto de todos los repositorios hasta que exista un Quasar publicado.', gets: 'Todo, nada más entrar. Puede romperse.' },
  { id: 'quasar', name: 'Quasar', tag: 'Rolling', tone: 'cyan', icon: 'bolt',
    blurb: 'Cada commit es una actualización. Lo que se sostiene en EventHorizon sube aquí.', gets: 'Cambios continuos, sin esperar a una versión.' },
  { id: 'pulsar', name: 'Pulsar', tag: 'Beta', tone: 'amber', icon: 'sync',
    blurb: 'Semiestable: lo que ya aguantó en Quasar y se prueba antes de declararse estable.', gets: 'Candidatas a estable para probadores.' },
  { id: 'nebula', name: 'Nebula', tag: 'Estable', tone: 'green', icon: 'verified',
    blurb: 'El canal del día a día. Una versión estable es un tag firmado del manifiesto.', gets: 'Versiones firmadas y verificadas.' },
  { id: 'singularity', name: 'Singularity', tag: 'LTS', tone: 'violet', icon: 'shield',
    blurb: 'Soporte largo. Puede nacer de EventHorizon cuando una idea madura lo suficiente.', gets: 'Solo correcciones, durante mucho tiempo.' },
];

@Component({
  selector: 'oc-channels',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GlassDirective, RevealDirective, RippleDirective],
  template: `
  <section class="section" id="canales">
    <header class="section-head" reveal>
      <span class="label-s eyebrow">Canales de estabilidad</span>
      <h2 class="headline-l">Un cambio viaja de la locura a la calma</h2>
      <p class="body-l">En el manifiesto, <b>rama = canal</b>. Pulsa un canal y manda un paquete a verlo viajar.</p>
    </header>

    <div class="track glass" glass reveal #track>
      <div class="line"><span class="fill" #fill></span><span class="pkt" #pkt></span></div>
      <ol class="nodes">
        @for (c of ch; track c.id; let i = $index) {
          <li>
            <button class="node" ripple [class.sel]="sel().id === c.id" [class]="'node tone-' + c.tone + (sel().id === c.id ? ' sel' : '')" (click)="pick(c, i)" [attr.aria-pressed]="sel().id === c.id">
              <span class="orb"><span class="ms">{{ c.icon }}</span></span>
              <span class="name">{{ c.name }}</span><span class="label-s muted">{{ c.tag }}</span>
            </button>
          </li>
        }
      </ol>
    </div>

    <div class="detail glass" glass [class]="'detail glass tone-' + sel().tone" #detail>
      <div class="d-head"><span class="ms big">{{ sel().icon }}</span><div><h3 class="headline-s">{{ sel().name }}</h3><span class="label-s muted">{{ sel().tag }}</span></div>
        <button class="btn tonal" ripple (click)="promote()"><span class="ms">send</span>Promover un cambio hasta aquí</button></div>
      <p class="body-l">{{ sel().blurb }}</p>
      <p class="gets"><span class="ms">inbox</span><b>Recibe:</b> {{ sel().gets }}</p>
      <code class="mono">repo init -u https://github.com/Open-Cosmic-Project/Cosmic-Manifest.git -b {{ sel().id }}</code>
    </div>
  </section>`,
  styles: [`
    .track { padding: 38px 24px 26px; border-radius: 36px; position: relative; overflow: hidden; }
    .line { position: absolute; left: 10%; right: 10%; top: 72px; height: 4px; border-radius: 4px; background: color-mix(in srgb, var(--on-surface) 12%, transparent); }
    .fill { position: absolute; inset: 0 auto 0 0; width: 0; border-radius: 4px; background: linear-gradient(90deg, var(--tone-rose), var(--tone-cyan), var(--tone-amber), var(--tone-green), var(--tone-violet)); background-size: 1000% 100%; }
    .pkt { position: absolute; top: 50%; left: 0; width: 18px; height: 18px; margin: -9px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 5px color-mix(in srgb, var(--primary) 40%, transparent), 0 0 24px 6px var(--primary); opacity: 0; }
    .nodes { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(5, 1fr); position: relative; }
    .node { width: 100%; display: grid; justify-items: center; gap: 4px; padding: 6px 4px 12px; border-radius: 20px; position: relative; overflow: hidden; text-align: center; }
    .orb { width: 68px; height: 68px; border-radius: 50%; display: grid; place-items: center; color: var(--tone); background: color-mix(in srgb, var(--tone) 18%, var(--surface-container));
      border: 2px solid color-mix(in srgb, var(--tone) 50%, transparent); transition: transform .5s var(--ease-emph-dec), box-shadow .4s; }
    .node:hover .orb { transform: translateY(-4px) scale(1.06); } .node.sel .orb { transform: scale(1.14); box-shadow: 0 0 0 6px color-mix(in srgb, var(--tone) 24%, transparent), 0 0 34px -2px var(--tone); background: var(--tone); color: var(--surface); }
    .name { font-weight: 700; margin-top: 4px; }
    .detail { margin-top: 20px; padding: 28px; border-radius: 32px; display: grid; gap: 14px; border-color: color-mix(in srgb, var(--tone) 40%, var(--glass-edge)); }
    .d-head { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; } .d-head > div { flex: 1; min-width: 160px; } .d-head h3 { margin: 0; }
    .big { font-size: 2.6rem; color: var(--tone); } .detail p { margin: 0; } .gets { display: flex; gap: 10px; align-items: center; color: var(--on-surface-variant); } .gets .ms { color: var(--tone); }
    code { display: block; padding: 12px 16px; border-radius: 14px; background: color-mix(in srgb, var(--on-surface) 8%, transparent); font-size: .82rem; overflow-x: auto; white-space: nowrap; }
    @media (max-width: 700px) {
      .nodes { grid-template-columns: 1fr; gap: 6px; } .node { grid-template-columns: auto 1fr; justify-items: start; text-align: left; column-gap: 14px; row-gap: 0; } .orb { grid-row: span 2; width: 52px; height: 52px; }
      .line { left: 36px; right: auto; width: 4px; top: 40px; bottom: 40px; height: auto; } .fill { inset: 0 0 auto 0; width: 100% !important; height: 0; } .pkt { display: none; }
    }
  `],
})
export class ChannelsComponent {
  ch = CH; sel = signal<Ch>(CH[0]);
  private fill = viewChild.required<ElementRef<HTMLElement>>('fill');
  private pkt = viewChild.required<ElementRef<HTMLElement>>('pkt');
  private detail = viewChild.required<ElementRef<HTMLElement>>('detail');
  private idx = 0;

  pick(c: Ch, i: number) {
    this.sel.set(c); this.idx = i;
    if (motionOK()) animate(this.detail().nativeElement.children, { opacity: [0, 1], translateY: [14, 0], duration: 600, ease: 'outExpo', delay: stagger(60) });
    this.fill().nativeElement.style.width = `${(i / (CH.length - 1)) * 100}%`;
    this.fill().nativeElement.style.height = '';
  }
  promote() {
    const pkt = this.pkt().nativeElement, fill = this.fill().nativeElement, to = (this.idx / (CH.length - 1)) * 100;
    if (!motionOK() || this.idx === 0) { fill.style.width = `${to}%`; return; }
    createTimeline({ defaults: { ease: 'inOutQuad' } })
      .set(pkt, { opacity: 1, left: '0%' })
      .add(pkt, { left: `${to}%`, duration: 400 + this.idx * 650, ease: 'inOutCubic' }, 0)
      .add(fill, { width: ['0%', `${to}%`], duration: 400 + this.idx * 650, ease: 'inOutCubic' }, 0)
      .add(pkt, { opacity: 0, scale: [1, 3], duration: 450, ease: 'outQuad' });
  }
}
