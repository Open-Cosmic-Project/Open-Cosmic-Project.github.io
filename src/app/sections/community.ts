import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, effect, inject, untracked, viewChild } from '@angular/core';
import { animate, stagger } from 'animejs';
import { GithubService } from '../core/github.service';
import { ORG, ORG_URL } from '../core/models';
import { GlassDirective, RevealDirective, RippleDirective } from '../core/directives';
import { AvatarComponent, CountComponent } from '../core/widgets';
import { Clock, ago, motionOK } from '../core/util';

@Component({
  selector: 'oc-community',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GlassDirective, RevealDirective, RippleDirective, AvatarComponent, CountComponent],
  template: `
  <section class="section" id="comunidad">
    <header class="section-head" reveal>
      <span class="label-s eyebrow">Comunidad y versiones</span>
      <h2 class="headline-l">Quién construye esto y qué ha salido</h2>
    </header>
    <div class="cols">
      <div class="glass box" glass reveal #box>
        <div class="bh"><h3 class="title-m">Miembros</h3><span class="count"><oc-count [value]="gh.members().length"/></span></div>
        @if (gh.members().length) {
          <ul class="faces" #faces>
            @for (m of gh.members(); track m.login) {
              <li><a [href]="m.url" target="_blank" rel="noopener" [attr.aria-label]="m.login"><oc-avatar [src]="m.avatar" [name]="m.login" style="--s: 56px"/><span class="tip">{{ m.login }}</span></a></li>
            }
          </ul>
        } @else {
          <div class="empty"><span class="ms">person_add</span><p class="title-m">Aún no hay miembros públicos</p><p class="muted">Quien se una y haga pública su pertenencia aparecerá aquí al instante.</p></div>
        }
        <a class="btn tonal" ripple [href]="peopleUrl" target="_blank" rel="noopener"><span class="ms">groups</span>Ver la organización</a>
        <span class="burst" #burst aria-hidden="true"></span>
      </div>

      <div class="glass box" glass reveal>
        <div class="bh"><h3 class="title-m">Versiones</h3><span class="count"><oc-count [value]="gh.releases().length"/></span></div>
        @if (gh.releases().length) {
          <ol class="tl">
            @for (r of gh.releases().slice(0, 6); track r.repo + r.tag) {
              <li><a [href]="r.url" target="_blank" rel="noopener"><span class="pt"></span>
                <span class="rt"><b>{{ r.name || r.tag }}</b><span class="muted">{{ r.repo }} · {{ r.tag }}</span></span>
                @if (r.prerelease) { <span class="pre">pre</span> }<time class="label-s muted">{{ ago(r.at) }}</time></a></li>
            }
          </ol>
        } @else {
          <div class="empty"><span class="ms">rocket_launch</span><p class="title-m">Todavía no hay versiones</p><p class="muted">Todo vive en la rama <code class="mono">eventhorizon</code>. La primera release aparecerá aquí.</p></div>
        }
      </div>
    </div>
  </section>`,
  styles: [`
    .cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; } .box { padding: 26px; border-radius: 32px; display: grid; gap: 18px; align-content: start; position: relative; overflow: hidden; }
    .bh { display: flex; justify-content: space-between; align-items: center; } .bh h3 { margin: 0; } .count { font-size: 1.8rem; font-weight: 700; color: var(--primary); }
    .faces { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 10px; } .faces a { position: relative; display: block; border-radius: 50%; transition: transform .4s var(--ease-emph); } .faces a:hover { transform: scale(1.18) translateY(-3px); z-index: 2; }
    .tip { position: absolute; left: 50%; top: 100%; transform: translate(-50%, 6px); padding: 3px 10px; border-radius: 8px; font-size: .75rem; white-space: nowrap; background: var(--surface-container-high); opacity: 0; pointer-events: none; transition: opacity .2s; }
    .faces a:hover .tip, .faces a:focus-visible .tip { opacity: 1; }
    .empty { display: grid; gap: 4px; justify-items: center; text-align: center; padding: 22px 8px; } .empty p { margin: 0; } .empty .ms { font-size: 2.8rem; color: var(--primary); }
    .tl { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; } .tl a { display: grid; grid-template-columns: auto 1fr auto auto; align-items: center; gap: 14px; padding: 10px 12px; border-radius: 16px; transition: background .25s; } .tl a:hover { background: color-mix(in srgb, var(--on-surface) 7%, transparent); }
    .pt { width: 12px; height: 12px; border-radius: 50%; background: var(--tone-rose); box-shadow: 0 0 0 4px color-mix(in srgb, var(--tone-rose) 25%, transparent); } .rt { display: grid; font-size: .92rem; } .rt .muted { font-size: .8rem; }
    .pre { font-size: .68rem; font-weight: 700; padding: 2px 8px; border-radius: 6px; background: color-mix(in srgb, var(--tone-amber) 22%, transparent); color: var(--tone-amber); text-transform: uppercase; letter-spacing: .06em; }
    .burst { position: absolute; left: 50%; top: 40%; width: 0; height: 0; pointer-events: none; } :host ::ng-deep .burst i { position: absolute; width: 8px; height: 8px; border-radius: 50%; }
    .box .btn { justify-self: start; } @media (max-width: 860px) { .cols { grid-template-columns: 1fr; } }
  `],
})
export class CommunityComponent {
  gh = inject(GithubService); private clock = inject(Clock);
  peopleUrl = `${ORG_URL.replace(`/${ORG}`, '')}/orgs/${ORG}/people`;
  private burst = viewChild.required<ElementRef<HTMLElement>>('burst');
  ago = (iso: string) => ago(iso, this.clock.now());

  constructor() {
    // un miembro nuevo = confeti
    effect(() => {
      const p = this.gh.pulse();
      untracked(() => { if (p?.kind === 'member' && motionOK()) this.confetti(); });
    });
  }
  private confetti() {
    const host = this.burst().nativeElement, colors = ['--tone-rose', '--tone-cyan', '--tone-amber', '--tone-green', '--tone-violet'];
    const bits = Array.from({ length: 26 }, (_, i) => {
      const e = document.createElement('i'); e.style.background = `var(${colors[i % 5]})`; host.appendChild(e); return e;
    });
    animate(bits, {
      translateX: () => (Math.random() - .5) * 420, translateY: () => (Math.random() - .7) * 320, rotate: () => Math.random() * 720,
      scale: [1, 0], opacity: [1, 0], duration: 1500, ease: 'outCubic', delay: stagger(12), onComplete: () => bits.forEach(b => b.remove()),
    });
  }
}
