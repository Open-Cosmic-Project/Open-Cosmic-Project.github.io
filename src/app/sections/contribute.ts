import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { GlassDirective, RevealDirective, RippleDirective } from '../core/directives';
import { ORG, ORG_URL } from '../core/models';

@Component({
  selector: 'oc-contribute',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GlassDirective, RevealDirective, RippleDirective],
  template: `
  <section class="section" id="contribuir">
    <header class="section-head" reveal>
      <span class="label-s eyebrow">Contribuir</span>
      <h2 class="headline-l">De tu idea a un merge, en cuatro pasos</h2>
      <p class="body-l">Sin CLA: el copyright de cada aporte sigue siendo de quien lo escribe. Basta con firmar el commit (DCO).</p>
    </header>
    <ol class="steps" reveal=".st">
      <li class="st glass" glass><span class="n">1</span><span class="ms">fork_right</span><h3 class="title-m">Haz un fork</h3><p class="muted">Elige el repositorio de la capa que quieres tocar (mira la sección de arquitectura).</p></li>
      <li class="st glass" glass><span class="n">2</span><span class="ms">draw</span><h3 class="title-m">Firma tus commits</h3><p class="muted">Con <code class="mono">-s</code> añades el <i>Signed-off-by</i> del DCO.</p></li>
      <li class="st glass" glass><span class="n">3</span><span class="ms">call_split</span><h3 class="title-m">Abre una PR</h3><p class="muted">Contra <code class="mono">eventhorizon</code>. Lo privilegiado exige dos revisores.</p></li>
      <li class="st glass" glass><span class="n">4</span><span class="ms">merge</span><h3 class="title-m">Mira cómo sube</h3><p class="muted">Tu cambio aparece arriba, en la actividad en vivo.</p></li>
    </ol>
    <div class="code glass" glass reveal>
      <pre class="mono"><span class="c"># clona, crea tu rama y firma el commit</span>
git clone git&#64;github.com:<b>tu-usuario</b>/Core.git && cd Core
git switch -c mi-cambio
git commit <b>-s</b> -m "cdevd: enumera dispositivos USB"</pre>
      <button class="btn tonal" ripple (click)="copy()"><span class="ms">{{ copied() ? 'check' : 'content_copy' }}</span>{{ copied() ? 'Copiado' : 'Copiar' }}</button>
    </div>
    <div class="links" reveal>
      <a class="btn text" [href]="org + '/.github/blob/main/CONTRIBUTING.md'" target="_blank" rel="noopener"><span class="ms">menu_book</span>CONTRIBUTING</a>
      <a class="btn text" [href]="org + '/.github/blob/main/SECURITY.md'" target="_blank" rel="noopener"><span class="ms">shield</span>Seguridad (90 días)</a>
      <a class="btn text" [href]="org + '/Docs'" target="_blank" rel="noopener"><span class="ms">description</span>Documentación</a>
    </div>
  </section>`,
  styles: [`
    .steps { list-style: none; margin: 0 0 20px; padding: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; counter-reset: s; }
    .st { padding: 24px; border-radius: 28px; display: grid; gap: 8px; position: relative; } .st h3, .st p { margin: 0; } .st .ms { font-size: 2rem; color: var(--primary); }
    .n { position: absolute; top: 16px; right: 20px; font-size: 3.2rem; font-weight: 800; line-height: 1; color: color-mix(in srgb, var(--on-surface) 9%, transparent); }
    .code { padding: 22px 24px; border-radius: 28px; display: flex; gap: 16px; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; }
    pre { margin: 0; font-size: .86rem; line-height: 1.8; overflow-x: auto; max-width: 100%; } pre b { color: var(--tone-rose); } .c { color: var(--on-surface-variant); }
    .links { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 18px; } code { font-size: .82rem; }
    @media (max-width: 960px) { .steps { grid-template-columns: repeat(2, 1fr); } } @media (max-width: 520px) { .steps { grid-template-columns: 1fr; } }
  `],
})
export class ContributeComponent {
  org = ORG_URL; copied = signal(false);
  async copy() {
    const text = `git clone git@github.com:tu-usuario/Core.git && cd Core\ngit switch -c mi-cambio\ngit commit -s -m "cdevd: enumera dispositivos USB"`;
    try { await navigator.clipboard.writeText(text); this.copied.set(true); setTimeout(() => this.copied.set(false), 2000); } catch { /* sin portapapeles */ }
  }
}
