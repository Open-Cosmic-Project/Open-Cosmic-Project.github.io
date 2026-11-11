import { Injectable, computed, signal } from '@angular/core';
import {
  FeedItem, FeedKind, LiveStatus, Member, ORG, Release, Repo, Snapshot,
} from './models';

const API = 'https://api.github.com';
const MAX_FEED = 120;
const WEEK = 7 * 24 * 3600 * 1000;

/** Un evento crudo de la API de eventos de GitHub (solo lo que usamos). */
interface RawEvent {
  id: string; type: string; created_at: string;
  actor: { login: string; avatar_url: string };
  repo: { name: string };
  payload: any;
}

@Injectable({ providedIn: 'root' })
export class GithubService {
  readonly repos = signal<Repo[]>([]);
  readonly members = signal<Member[]>([]);
  readonly releases = signal<Release[]>([]);
  readonly openPrs = signal(0);
  readonly feed = signal<FeedItem[]>([]);
  readonly status = signal<LiveStatus>('cargando');
  readonly generatedAt = signal<string | null>(null);
  readonly lastSync = signal<Date | null>(null);
  /** Se incrementa con cada evento nuevo en vivo: sirve para disparar animaciones. */
  readonly pulse = signal<{ n: number; kind: FeedKind } | null>(null);

  readonly stars = computed(() => this.repos().reduce((a, r) => a + r.stars, 0));
  readonly forks = computed(() => this.repos().reduce((a, r) => a + r.forks, 0));
  readonly commits7d = computed(() => {
    const limit = Date.now() - WEEK;
    return this.feed().filter(f => f.kind === 'commit' && Date.parse(f.at) >= limit)
      .reduce((a, f) => a + (f.count ?? 1), 0);
  });
  readonly latestRelease = computed(() => this.releases()[0] ?? null);

  private seen = new Set<string>();
  private seeded = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private demoTimer: ReturnType<typeof setInterval> | undefined;
  private pollCount = 0;
  private demo = false;

  async start(): Promise<void> {
    this.demo = new URLSearchParams(location.search).has('demo');
    const snap = await this.json<Snapshot>(this.demo ? 'demo.json' : 'snapshot.json');
    if (snap) this.applySnapshot(snap);
    if (this.demo) { this.status.set('demo'); this.startDemo(); return; }
    this.status.set(snap?.generatedAt ? 'instantanea' : 'cargando');
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.schedule(500);
    });
    this.schedule(300);
  }

  /* ---------- carga inicial ---------- */
  private applySnapshot(s: Snapshot) {
    this.repos.set(s.repos ?? []);
    this.members.set(s.members ?? []);
    this.releases.set(s.releases ?? []);
    this.openPrs.set(s.openPrs ?? 0);
    this.generatedAt.set(s.generatedAt);
    const feed = (s.feed ?? []).slice(0, MAX_FEED);
    feed.forEach(f => this.seen.add(f.id));
    this.feed.set(feed);
  }

  private async json<T>(url: string): Promise<T | null> {
    try {
      const r = await fetch(url, { headers: url.startsWith('http') ? { Accept: 'application/vnd.github+json' } : {} });
      if (!r.ok) return null;
      return (await r.json()) as T;
    } catch { return null; }
  }

  /* ---------- sondeo en vivo ---------- */
  private schedule(ms: number) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.poll(), ms);
  }

  private async poll() {
    if (document.hidden) return;                     // no gastamos cuota con la pestaña oculta
    let wait = 60_000;
    try {
      const r = await fetch(`${API}/orgs/${ORG}/events?per_page=100`, {
        headers: { Accept: 'application/vnd.github+json' },
      });
      if (r.status === 403 || r.status === 429) {   // límite de uso: nos quedamos con la instantánea
        this.status.set(this.generatedAt() ? 'instantanea' : 'sin-red');
        this.schedule(10 * 60_000); return;
      }
      if (!r.ok) throw new Error(String(r.status));
      wait = Math.max(60, Number(r.headers.get('X-Poll-Interval') ?? 60)) * 1000;
      const events = (await r.json()) as RawEvent[];
      const items = events.map(e => this.toItem(e)).filter((x): x is FeedItem => !!x);
      const fresh = items.filter(i => !this.seen.has(i.id));
      fresh.forEach(i => this.seen.add(i.id));
      if (fresh.length) this.ingest(fresh.reverse(), this.seeded);
      this.seeded = true;
      this.status.set('vivo');
      this.lastSync.set(new Date());
      const need = this.pollCount++ % 5 === 0 || fresh.some(f => ['star', 'fork', 'member', 'pr-open', 'merge', 'pr-close', 'create'].includes(f.kind));
      if (need) void this.refreshTotals();
    } catch {
      this.status.set(this.generatedAt() ? 'instantanea' : 'sin-red');
    }
    this.schedule(wait);
  }

  /** Reconcilia totales con la API (una llamada por recurso). */
  private async refreshTotals() {
    const [repos, members, prs] = await Promise.all([
      this.json<any[]>(`${API}/orgs/${ORG}/repos?type=public&per_page=100`),
      this.json<any[]>(`${API}/orgs/${ORG}/public_members?per_page=100`),
      this.json<{ total_count: number }>(`${API}/search/issues?q=org:${ORG}+type:pr+state:open&per_page=1`),
    ]);
    if (repos) {
      const mapped = repos.filter(r => !r.archived && !GithubService.isMeta(r.name)).map(GithubService.mapRepo);
      this.repos.set(mapped);
    }
    if (members) {
      const mapped = members.map(m => ({ login: m.login, avatar: m.avatar_url, url: m.html_url }));
      const before = this.members().length;
      this.members.set(mapped);
      if (this.seeded && mapped.length > before) this.pulse.set({ n: Date.now(), kind: 'member' });
    }
    if (prs && typeof prs.total_count === 'number') this.openPrs.set(prs.total_count);
  }

  /** `.github` y el repo de esta web no son componentes del sistema: no se listan. */
  static isMeta(name: string) { return name === '.github' || name.endsWith('.github.io'); }

  static mapRepo(r: any): Repo {
    return {
      name: r.name, description: r.description ?? '', language: r.language,
      license: r.license?.spdx_id && r.license.spdx_id !== 'NOASSERTION' ? r.license.spdx_id : null,
      stars: r.stargazers_count ?? 0, forks: r.forks_count ?? 0, openIssues: r.open_issues_count ?? 0,
      pushedAt: r.pushed_at ?? '', url: r.html_url,
    };
  }

  /* ---------- eventos → feed ---------- */
  private toItem(e: RawEvent): FeedItem | null {
    const repo = e.repo.name.split('/').pop() ?? e.repo.name;
    const base = {
      id: e.id, repo, actor: e.actor.login, avatar: e.actor.avatar_url, at: e.created_at,
      url: `https://github.com/${e.repo.name}`,
    };
    const p = e.payload ?? {};
    switch (e.type) {
      case 'WatchEvent': return { ...base, kind: 'star', text: 'marcó con estrella' };
      case 'ForkEvent': return { ...base, kind: 'fork', text: 'hizo un fork de' };
      case 'PushEvent': {
        const n = p.size ?? p.commits?.length ?? 1;
        const msg = p.commits?.[p.commits.length - 1]?.message?.split('\n')[0];
        const branch = String(p.ref ?? '').replace('refs/heads/', '');
        return { ...base, kind: 'commit', count: n, text: `subió ${n} commit${n === 1 ? '' : 's'} a ${branch || 'una rama'} de`, detail: msg,
          url: p.commits?.[0] ? `https://github.com/${e.repo.name}/commit/${p.head}` : base.url };
      }
      case 'PullRequestEvent': {
        const pr = p.pull_request ?? {};
        const url = pr.html_url ?? base.url, detail = `#${pr.number} ${pr.title ?? ''}`.trim();
        if (p.action === 'opened' || p.action === 'reopened') return { ...base, kind: 'pr-open', text: 'abrió una PR en', detail, url };
        if (p.action === 'closed') return pr.merged
          ? { ...base, kind: 'merge', text: 'fusionó una PR en', detail, url }
          : { ...base, kind: 'pr-close', text: 'cerró una PR en', detail, url };
        return null;
      }
      case 'IssuesEvent':
        if (p.action !== 'opened') return null;
        return { ...base, kind: 'issue', text: 'abrió un issue en', detail: `#${p.issue?.number} ${p.issue?.title ?? ''}`, url: p.issue?.html_url ?? base.url };
      case 'ReleaseEvent':
        if (p.action !== 'published') return null;
        return { ...base, kind: 'release', text: 'publicó una versión en', detail: p.release?.name || p.release?.tag_name, url: p.release?.html_url ?? base.url };
      case 'MemberEvent': return { ...base, kind: 'member', text: `añadió a ${p.member?.login ?? 'alguien'} en`, };
      case 'CreateEvent':
        if (p.ref_type === 'branch' || p.ref_type === 'tag') return { ...base, kind: 'create', text: `creó ${p.ref_type === 'tag' ? 'el tag' : 'la rama'} ${p.ref} en` };
        return { ...base, kind: 'create', text: 'creó el repositorio' };
      case 'IssueCommentEvent': return { ...base, kind: 'comment', text: 'comentó en', detail: p.issue?.title, url: p.comment?.html_url ?? base.url };
      case 'PullRequestReviewEvent': return { ...base, kind: 'review', text: 'revisó una PR en', detail: p.pull_request?.title, url: p.review?.html_url ?? base.url };
      default: return null;
    }
  }

  /** Mete elementos nuevos en el feed y ajusta contadores al instante. */
  private ingest(items: FeedItem[], live: boolean) {
    for (const it of items) {
      if (live) {
        it.fresh = true;
        this.bump(it);
        this.pulse.set({ n: Date.now(), kind: it.kind });
      }
      this.feed.update(f => [it, ...f].slice(0, MAX_FEED));
    }
  }

  private bump(it: FeedItem) {
    const patch = (fn: (r: Repo) => Repo) => this.repos.update(rs => rs.map(r => r.name === it.repo ? fn(r) : r));
    switch (it.kind) {
      case 'star': patch(r => ({ ...r, stars: r.stars + 1 })); break;
      case 'fork': patch(r => ({ ...r, forks: r.forks + 1 })); break;
      case 'commit': patch(r => ({ ...r, pushedAt: it.at })); break;
      case 'pr-open': this.openPrs.update(n => n + 1); break;
      case 'merge': case 'pr-close': this.openPrs.update(n => Math.max(0, n - 1)); break;
      case 'release': {
        const tag = it.detail ?? '';
        this.releases.update(rs => [{ repo: it.repo, tag, name: tag, at: it.at, url: it.url, prerelease: false }, ...rs]);
        break;
      }
    }
  }

  /* ---------- modo demo: eventos sintéticos para probar la interfaz ---------- */
  private startDemo() {
    const kinds: [FeedKind, string, string?][] = [
      ['star', 'marcó con estrella'], ['commit', 'subió 3 commits a eventhorizon de', 'cdevd: enumera dispositivos USB por udev'],
      ['pr-open', 'abrió una PR en', '#42 cosmic-fastboot: módulo de transporte'], ['merge', 'fusionó una PR en', '#41 workspace: edición 2024'],
      ['release', 'publicó una versión en', 'v0.1.0-eventhorizon'], ['issue', 'abrió un issue en', '#17 Documentar el arranque en riscv64'],
      ['fork', 'hizo un fork de'], ['comment', 'comentó en', 'Política de licencias (D-47)'],
    ];
    const who = ['Ange', 'lumen-dev', 'nova_rs', 'quark42', 'orbita'];
    let n = 1000;
    this.demoTimer = setInterval(() => {
      const [kind, text, detail] = kinds[Math.floor(Math.random() * kinds.length)];
      const repos = this.repos();
      const repo = repos[Math.floor(Math.random() * repos.length)]?.name ?? 'Core';
      const actor = who[Math.floor(Math.random() * who.length)];
      const it: FeedItem = {
        id: `demo-${n++}`, kind, repo, actor, avatar: "",
        text, detail, count: kind === 'commit' ? 3 : undefined, url: `https://github.com/${ORG}/${repo}`, at: new Date().toISOString(),
      };
      this.ingest([it], true);
      if (Math.random() < 0.18) {   // de vez en cuando entra un miembro nuevo
        const m = { login: actor + n, avatar: "", url: `https://github.com/${actor}` };
        this.members.update(ms => [...ms, m]);
        this.pulse.set({ n: Date.now(), kind: 'member' });
      }
    }, 4200);
  }
}
