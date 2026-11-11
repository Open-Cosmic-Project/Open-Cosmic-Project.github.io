import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DocsService } from './docs.service';
import { GlassDirective, RevealDirective, RippleDirective, TiltDirective } from '../core/directives';

@Component({
  selector: 'oc-docs-teaser',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, GlassDirective, RevealDirective, RippleDirective, TiltDirective],
  template: `
  <section class="section" id="documentacion">
    <header class="section-head" reveal>
      <span class="label-s eyebrow">Documentación</span>
      <h2 class="headline-l">Léela aquí mismo</h2>
      <p class="body-l">La especificación, la arquitectura y las referencias se publican desde el repositorio <b>Docs</b>, con búsqueda y sin salir de la página.</p>
    </header>
    @if (top().length) {
      <div class="grid" reveal=".card">
        @for (p of top(); track p.slug) {
          <a class="card glass" glass tilt="5" [routerLink]="['/docs', p.slug]">
            <span class="label-s muted">{{ p.section }}{{ p.sub ? ' · ' + p.sub : '' }}</span>
            <h3 class="title-m">{{ p.title }}</h3>
            <p class="muted">{{ p.summary || 'Sin resumen.' }}</p>
            <span class="go"><span class="ms">arrow_forward</span></span>
          </a>
        }
      </div>
      <div class="more"><a class="btn filled" ripple routerLink="/docs"><span class="ms">menu_book</span>Abrir toda la documentación ({{ total() }})</a></div>
    } @else {
      <div class="glass empty" glass reveal><span class="ms">menu_book</span><p class="title-m">La documentación aparecerá aquí</p><p class="muted">Se publica en cada despliegue a partir del repositorio Docs.</p>
        <a class="btn tonal" ripple routerLink="/docs">Ir a Docs</a></div>
    }
  </section>`,
  styles: [`
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
    .card { padding: 22px; border-radius: 28px; display: grid; gap: 8px; align-content: start; position: relative; will-change: transform; } .card h3, .card p { margin: 0; }
    .card p { font-size: .9rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .go { margin-top: 6px; color: var(--primary); } .card:hover .go .ms { transform: translateX(6px); } .go .ms { transition: transform .4s var(--ease-emph); }
    .more { margin-top: 22px; display: flex; } .empty { padding: 36px; border-radius: 32px; display: grid; gap: 6px; justify-items: start; } .empty p { margin: 0; } .empty .ms { font-size: 2.6rem; color: var(--primary); }
  `],
})
export class DocsTeaserComponent {
  private svc = inject(DocsService);
  constructor() { void this.svc.ensureIndex(); }
  total = computed(() => this.svc.index()?.pages.length ?? 0);
  top = computed(() => this.svc.index()?.pages.filter(p => !p.sub && p.section !== 'Referencias').slice(0, 6) ?? []);
}
