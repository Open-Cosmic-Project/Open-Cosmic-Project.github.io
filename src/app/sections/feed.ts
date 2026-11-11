import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { GithubService } from '../core/github.service';
import { FeedKind, KIND_META } from '../core/models';
import { GlassDirective, RevealDirective, FreshDirective } from '../core/directives';
import { AvatarComponent } from '../core/widgets';
import { Clock, ago } from '../core/util';

type Filter = 'todo' | 'code' | 'pr' | 'star' | 'release' | 'issue';
const GROUPS: Record<Filter, FeedKind[]> = {
  todo: [], code: ['commit', 'create'], pr: ['pr-open', 'merge', 'pr-close', 'review'],
  star: ['star', 'fork', 'member'], release: ['release'], issue: ['issue', 'comment'],
};

@Component({
  selector: 'oc-feed',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GlassDirective, RevealDirective, FreshDirective, AvatarComponent],
  template: `
  <section class="section" id="actividad">
    <header class="section-head" reveal>
      <span class="label-s eyebrow">Actividad en vivo</span>
      <h2 class="headline-l">Cada commit, estrella y merge, al instante</h2>
      <p class="body-l">La página escucha a la organización: cuando algo pasa en GitHub, aparece aquí, mueve los contadores y lanza un pulso en la órbita.</p>
    </header>

    <div class="layout">
      <div class="panel glass" glass reveal>
        <div class="bar" role="toolbar" aria-label="Filtrar actividad">
          @for (f of filters; track f.id) {
            <button class="chip" [class.on]="filter() === f.id" (click)="filter.set(f.id)" [attr.aria-pressed]="filter() === f.id"><span class="ms">{{ f.icon }}</span>{{ f.label }}</button>
          }
        </div>

        @if (items().length) {
          <ul class="list" aria-live="polite">
            @for (it of items(); track it.id) {
              <li [fresh]="!!it.fresh" [class]="'row tone-' + meta[it.kind].tone">
                <span class="ico"><span class="ms">{{ meta[it.kind].icon }}</span></span>
                <oc-avatar [src]="it.avatar" [name]="it.actor" style="--s: 34px"/>
                <div class="txt">
                  <p><a class="who" [href]="'https://github.com/' + it.actor" target="_blank" rel="noopener">{{ it.actor }}</a> {{ it.text }}
                    <a class="repo" [href]="it.url" target="_blank" rel="noopener">{{ it.repo }}</a></p>
                  @if (it.detail) { <p class="det mono">{{ it.detail }}</p> }
                </div>
                <time class="when label-s muted" [attr.datetime]="it.at">{{ ago(it.at) }}</time>
              </li>
            }
          </ul>
          @if (hidden() > 0) { <button class="btn text more" (click)="limit.set(limit() + 12)">Mostrar más ({{ hidden() }})</button> }
        } @else {
          <div class="empty"><span class="ms">radar</span><p class="title-m">Todavía no hay actividad que mostrar</p>
            <p class="muted">Cuando llegue el primer evento aparecerá aquí, en tiempo real.</p></div>
        }
      </div>

      <aside class="side">
        <div class="glass card" glass reveal>
          <h3 class="title-m">Pulso de 14 días</h3>
          <div class="bars" role="img" [attr.aria-label]="'Eventos por día, últimos 14 días: ' + days().join(', ')">
            @for (d of days(); track $index) { <span class="b" [style.--h]="(d / maxDay()) * 100" [title]="d + ' eventos'"></span> }
          </div>
          <p class="label-s muted">{{ total() }} eventos en la ventana cargada</p>
        </div>
        <div class="glass card" glass reveal>
          <h3 class="title-m">¿Qué se mide?</h3>
          <p class="muted small">Los eventos vienen de la API pública de GitHub, que puede retrasarlos entre unos segundos y varios minutos. Los totales se concilian con la API cada pocos minutos, así que un contador puede corregirse solo. «Commits · 7 días» suma los de los últimos 100 eventos, así que es un mínimo.</p>
        </div>
      </aside>
    </div>
  </section>`,
  styles: [`
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 20px; align-items: start; }
    .panel { padding: 18px; border-radius: 32px; } .bar { display: flex; gap: 8px; flex-wrap: wrap; padding: 4px 4px 14px; }
    .list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
    .row { display: grid; grid-template-columns: auto auto 1fr auto; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 20px; position: relative; transition: background .3s; }
    .row:hover { background: color-mix(in srgb, var(--on-surface) 6%, transparent); }
    .row.is-fresh { background: color-mix(in srgb, var(--tone) 16%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--tone) 50%, transparent), 0 0 30px -6px var(--tone); }
    .ico { width: 36px; height: 36px; border-radius: 12px; display: grid; place-items: center; background: color-mix(in srgb, var(--tone) 20%, transparent); color: var(--tone); }
    .ico .ms { font-size: 1.3rem; }
    .txt p { margin: 0; line-height: 1.35; overflow-wrap: anywhere; } .who { font-weight: 650; } .repo { font-weight: 650; color: var(--tone); }
    .who:hover, .repo:hover { text-decoration: underline; } .det { font-size: .78rem; color: var(--on-surface-variant); margin-top: 3px !important; }
    .when { white-space: nowrap; } .more { margin: 10px auto 0; display: flex; }
    .empty { text-align: center; padding: 56px 20px; display: grid; gap: 4px; justify-items: center; } .empty .ms { font-size: 3rem; color: var(--primary); animation: spin 6s linear infinite; }
    .empty p { margin: 0; } @keyframes spin { to { transform: rotate(360deg); } }
    .side { display: grid; gap: 20px; } .card { padding: 22px; display: grid; gap: 12px; border-radius: 28px; } .card h3 { margin: 0; } .small { font-size: .875rem; margin: 0; }
    .bars { display: flex; align-items: flex-end; gap: 5px; height: 96px; } .b { flex: 1; height: max(6%, calc(var(--h) * 1%)); background: linear-gradient(to top, var(--primary-container), var(--primary)); border-radius: 6px 6px 3px 3px; transition: height .8s var(--ease-emph-dec); }
    @media (max-width: 960px) { .layout { grid-template-columns: 1fr; } .row { grid-template-columns: auto 1fr auto; } .row oc-avatar { display: none; } }
  `],
})
export class FeedComponent {
  gh = inject(GithubService); private clock = inject(Clock);
  meta = KIND_META;
  filters: { id: Filter; label: string; icon: string }[] = [
    { id: 'todo', label: 'Todo', icon: 'bolt' }, { id: 'code', label: 'Código', icon: 'commit' }, { id: 'pr', label: 'PR y merges', icon: 'merge' },
    { id: 'star', label: 'Comunidad', icon: 'star' }, { id: 'release', label: 'Releases', icon: 'rocket_launch' }, { id: 'issue', label: 'Issues', icon: 'bug_report' },
  ];
  filter = signal<Filter>('todo'); limit = signal(12);
  private filtered = computed(() => { const g = GROUPS[this.filter()]; const all = this.gh.feed(); return g.length ? all.filter(i => g.includes(i.kind)) : all; });
  items = computed(() => this.filtered().slice(0, this.limit()));
  hidden = computed(() => Math.max(0, this.filtered().length - this.limit()));
  total = computed(() => this.gh.feed().length);
  days = computed(() => {
    const out = Array(14).fill(0); const now = this.clock.now();
    for (const f of this.gh.feed()) { const d = Math.floor((now - Date.parse(f.at)) / 864e5); if (d >= 0 && d < 14) out[13 - d]++; }
    return out as number[];
  });
  maxDay = computed(() => Math.max(1, ...this.days()));
  ago = (iso: string) => ago(iso, this.clock.now());
}
