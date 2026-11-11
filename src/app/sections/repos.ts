import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { GithubService } from '../core/github.service';
import { LANG_COLOR, Repo } from '../core/models';
import { GlassDirective, RevealDirective, TiltDirective } from '../core/directives';
import { CountComponent } from '../core/widgets';
import { Clock, ago } from '../core/util';

type Sort = 'actividad' | 'estrellas' | 'nombre';

@Component({
  selector: 'oc-repos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GlassDirective, RevealDirective, TiltDirective, CountComponent],
  template: `
  <section class="section" id="repos">
    <header class="section-head" reveal>
      <span class="label-s eyebrow">Repositorios</span>
      <h2 class="headline-l">Un repositorio por carpeta, cada uno con su licencia</h2>
      <p class="body-l">Buscar, filtrar por lenguaje u ordenar: los datos son los de la organización, no los de esta página.</p>
    </header>

    <div class="tools glass" glass reveal>
      <label class="search"><span class="ms">search</span><span class="sr">Buscar repositorio</span>
        <input type="search" placeholder="Buscar por nombre o descripción" [value]="q()" (input)="q.set($any($event.target).value)"></label>
      <div class="row">
        <button class="chip" [class.on]="!lang()" (click)="lang.set('')">Todos</button>
        @for (l of langs(); track l) {
          <button class="chip" [class.on]="lang() === l" (click)="lang.set(lang() === l ? '' : l)"><span class="dot" [style.background]="color(l)"></span>{{ l }}</button>
        }
      </div>
      <div class="row">
        @for (s of sorts; track s.id) { <button class="chip" [class.on]="sort() === s.id" (click)="sort.set(s.id)"><span class="ms">{{ s.icon }}</span>{{ s.label }}</button> }
      </div>
    </div>

    <div class="grid" reveal=".card">
      @for (r of list(); track r.name) {
        <a class="card glass" glass tilt="5" [href]="r.url" target="_blank" rel="noopener">
          <div class="top"><h3 class="title-m">{{ r.name }}</h3>
            @if (recent(r)) { <span class="live" title="Actividad en las últimas 24 h"></span> }
            <span class="ms go">arrow_outward</span></div>
          <p class="desc muted">{{ r.description || 'Sin descripción.' }}</p>
          <div class="foot">
            @if (r.language) { <span class="lang"><span class="dot" [style.background]="color(r.language)"></span>{{ r.language }}</span> }
            @if (r.license) { <span class="lic">{{ r.license }}</span> }
            <span class="sp"></span>
            <span class="st" title="Estrellas"><span class="ms">star</span><oc-count [value]="r.stars"/></span>
            <span class="st" title="Forks"><span class="ms">fork_right</span>{{ r.forks }}</span>
          </div>
          <span class="label-s muted when">{{ r.pushedAt ? 'Actualizado ' + ago(r.pushedAt) : 'Sin actividad registrada' }}</span>
        </a>
      } @empty {
        <p class="none muted">Ningún repositorio coincide con la búsqueda.</p>
      }
    </div>
  </section>`,
  styles: [`
    .tools { padding: 18px; border-radius: 28px; display: grid; gap: 12px; margin-bottom: 20px; }
    .search { display: flex; align-items: center; gap: 12px; height: 52px; padding: 0 18px; border-radius: 999px; background: color-mix(in srgb, var(--on-surface) 7%, transparent); border: 1px solid var(--outline-variant); }
    .search:focus-within { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 25%, transparent); }
    .search input { flex: 1; min-width: 0; border: 0; background: none; outline: none; color: inherit; font: inherit; } .search .ms { color: var(--on-surface-variant); }
    .row { display: flex; gap: 8px; flex-wrap: wrap; } .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 16px; }
    .card { padding: 22px; border-radius: 28px; display: grid; gap: 12px; align-content: start; will-change: transform; }
    .top { display: flex; align-items: center; gap: 10px; } .top h3 { margin: 0; flex: 1; } .go { color: var(--on-surface-variant); transition: transform .4s var(--ease-emph), color .3s; }
    .card:hover .go { transform: translate(3px, -3px); color: var(--primary); }
    .live { width: 9px; height: 9px; border-radius: 50%; background: var(--tone-green); box-shadow: 0 0 0 0 var(--tone-green); animation: pulse 2s infinite; }
    @keyframes pulse { 70% { box-shadow: 0 0 0 9px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
    .desc { margin: 0; font-size: .9rem; min-height: 3.6em; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .foot { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: .82rem; font-weight: 550; } .sp { flex: 1; }
    .lang { display: inline-flex; align-items: center; gap: 6px; } .lic { padding: 2px 9px; border-radius: 8px; border: 1px solid var(--outline-variant); font-size: .72rem; color: var(--on-surface-variant); }
    .st { display: inline-flex; align-items: center; gap: 3px; color: var(--on-surface-variant); } .st .ms { font-size: 1.05rem; } .st:first-of-type .ms { color: var(--tone-amber); }
    .when { margin-top: -2px; } .none { grid-column: 1/-1; text-align: center; padding: 40px 0; }
  `],
})
export class ReposComponent {
  private gh = inject(GithubService); private clock = inject(Clock);
  q = signal(''); lang = signal(''); sort = signal<Sort>('actividad');
  sorts: { id: Sort; label: string; icon: string }[] = [{ id: 'actividad', label: 'Actividad', icon: 'schedule' }, { id: 'estrellas', label: 'Estrellas', icon: 'star' }, { id: 'nombre', label: 'Nombre', icon: 'sort_by_alpha' }];
  langs = computed(() => [...new Set(this.gh.repos().map(r => r.language).filter((l): l is string => !!l))].sort());
  list = computed(() => {
    const q = this.q().trim().toLowerCase(), l = this.lang();
    const out = this.gh.repos().filter(r => (!l || r.language === l) && (!q || (r.name + ' ' + r.description).toLowerCase().includes(q)));
    const s = this.sort();
    return [...out].sort((a, b) => s === 'estrellas' ? b.stars - a.stars || a.name.localeCompare(b.name)
      : s === 'nombre' ? a.name.localeCompare(b.name) : (Date.parse(b.pushedAt) || 0) - (Date.parse(a.pushedAt) || 0) || a.name.localeCompare(b.name));
  });
  color = (l: string) => LANG_COLOR[l] ?? 'var(--outline)';
  recent = (r: Repo) => !!r.pushedAt && this.clock.now() - Date.parse(r.pushedAt) < 864e5;
  ago = (iso: string) => ago(iso, this.clock.now());
}
