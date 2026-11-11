#!/usr/bin/env node
// Genera public/snapshot.json con el estado actual de la organización.
// Se ejecuta en CI antes de `ng build` (usa GITHUB_TOKEN: 5000 peticiones/h).
// Si algo falla, conserva el snapshot anterior y sale con código 0: la web no debe romperse por esto.
import { readFile, writeFile } from 'node:fs/promises';

const ORG = process.env.OCP_ORG ?? 'Open-Cosmic-Project';
const OUT = process.env.OCP_OUT ? new URL(process.env.OCP_OUT, 'file://' + process.cwd() + '/') : new URL('../public/snapshot.json', import.meta.url);
const H = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28',
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };

const warn = (what) => (e) => { console.warn(`snapshot: ${what} no disponible (${e.message})`); return null; };
const get = async (path) => {
  const r = await fetch(`https://api.github.com${path}`, { headers: H });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.json();
};

const kindOf = (e) => {
  const p = e.payload ?? {};
  switch (e.type) {
    case 'WatchEvent': return { kind: 'star', text: 'marcó con estrella' };
    case 'ForkEvent': return { kind: 'fork', text: 'hizo un fork de' };
    case 'PushEvent': {
      const n = p.size ?? p.commits?.length ?? 1;
      return { kind: 'commit', count: n, text: `subió ${n} commit${n === 1 ? '' : 's'} a ${String(p.ref ?? '').replace('refs/heads/', '') || 'una rama'} de`,
        detail: p.commits?.at(-1)?.message?.split('\n')[0] };
    }
    case 'PullRequestEvent': {
      const pr = p.pull_request ?? {}; const detail = `#${pr.number} ${pr.title ?? ''}`.trim();
      if (p.action === 'opened' || p.action === 'reopened') return { kind: 'pr-open', text: 'abrió una PR en', detail, url: pr.html_url };
      if (p.action === 'closed') return pr.merged ? { kind: 'merge', text: 'fusionó una PR en', detail, url: pr.html_url }
        : { kind: 'pr-close', text: 'cerró una PR en', detail, url: pr.html_url };
      return null;
    }
    case 'IssuesEvent': return p.action === 'opened' ? { kind: 'issue', text: 'abrió un issue en', detail: `#${p.issue?.number} ${p.issue?.title ?? ''}`, url: p.issue?.html_url } : null;
    case 'ReleaseEvent': return p.action === 'published' ? { kind: 'release', text: 'publicó una versión en', detail: p.release?.name || p.release?.tag_name, url: p.release?.html_url } : null;
    case 'CreateEvent': return p.ref_type === 'repository' ? { kind: 'create', text: 'creó el repositorio' } : { kind: 'create', text: `creó ${p.ref_type === 'tag' ? 'el tag' : 'la rama'} ${p.ref} en` };
    case 'MemberEvent': return { kind: 'member', text: `añadió a ${p.member?.login ?? 'alguien'} en` };
    default: return null;
  }
};

try {
  const [repos, members, events, prs] = await Promise.all([
    get(`/orgs/${ORG}/repos?type=public&per_page=100`),                        // imprescindible
    get(`/orgs/${ORG}/public_members?per_page=100`).catch(warn('miembros')),     // lo demás es opcional
    get(`/orgs/${ORG}/events?per_page=100`).catch(warn('eventos')),
    get(`/search/issues?q=org:${ORG}+type:pr+state:open&per_page=1`).catch(warn('PR abiertas')),
  ]);
  if (!repos) throw new Error('la organización no devolvió repositorios');
  const live = repos.filter((r) => !r.archived && r.name !== '.github' && !r.name.endsWith('.github.io'));

  const releases = (await Promise.all(live.map(async (r) => {
    const list = await get(`/repos/${ORG}/${r.name}/releases?per_page=5`).catch(warn(`releases de ${r.name}`));
    return (list ?? []).filter((x) => !x.draft).map((x) => ({
      repo: r.name, tag: x.tag_name, name: x.name || x.tag_name, at: x.published_at, url: x.html_url, prerelease: x.prerelease }));
  }))).flat().sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 30);

  const feed = (events ?? []).map((e) => {
    const k = kindOf(e); if (!k) return null;
    const repo = e.repo.name.split('/').pop();
    return { id: e.id, repo, actor: e.actor.login, avatar: e.actor.avatar_url, at: e.created_at,
      url: k.url ?? `https://github.com/${e.repo.name}`, ...k };
  }).filter(Boolean);

  const snap = {
    generatedAt: new Date().toISOString(),
    repos: live.map((r) => ({ name: r.name, description: r.description ?? '', language: r.language,
      license: r.license?.spdx_id && r.license.spdx_id !== 'NOASSERTION' ? r.license.spdx_id : null,
      stars: r.stargazers_count, forks: r.forks_count, openIssues: r.open_issues_count, pushedAt: r.pushed_at, url: r.html_url })),
    members: (members ?? []).map((m) => ({ login: m.login, avatar: m.avatar_url, url: m.html_url })),
    releases, openPrs: prs?.total_count ?? 0, feed,
  };
  await writeFile(OUT, JSON.stringify(snap, null, 1) + '\n');
  console.log(`snapshot: ${snap.repos.length} repos, ${snap.members.length} miembros, ${feed.length} eventos, ${releases.length} releases`);
} catch (err) {
  console.warn('snapshot: no se pudo actualizar, se conserva el anterior →', err.message);
  try { await readFile(OUT); } catch { process.exitCode = 1; }
}
