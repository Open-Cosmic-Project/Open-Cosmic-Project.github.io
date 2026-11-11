export const ORG = 'Open-Cosmic-Project';
export const ORG_URL = `https://github.com/${ORG}`;

export interface Repo {
  name: string;
  description: string;
  language: string | null;
  license: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  pushedAt: string;
  url: string;
}
export interface Member { login: string; avatar: string; url: string; }
export interface Release { repo: string; tag: string; name: string; at: string; url: string; prerelease: boolean; }

export type FeedKind =
  | 'star' | 'commit' | 'pr-open' | 'merge' | 'pr-close' | 'release'
  | 'issue' | 'fork' | 'member' | 'create' | 'comment' | 'review';

export interface FeedItem {
  id: string;
  kind: FeedKind;
  repo: string;
  actor: string;
  avatar: string;
  text: string;
  detail?: string;
  count?: number;
  url: string;
  at: string;
  fresh?: boolean;
}

export interface Snapshot {
  generatedAt: string | null;
  repos: Repo[];
  members: Member[];
  releases: Release[];
  openPrs: number;
  feed: FeedItem[];
}

export type LiveStatus = 'cargando' | 'vivo' | 'instantanea' | 'demo' | 'sin-red';

export const KIND_META: Record<FeedKind, { icon: string; label: string; tone: string }> = {
  'star':     { icon: 'star',           label: 'Estrella',  tone: 'amber' },
  'commit':   { icon: 'commit',         label: 'Commit',    tone: 'violet' },
  'pr-open':  { icon: 'call_split',     label: 'PR abierta', tone: 'cyan' },
  'merge':    { icon: 'merge',          label: 'Merge',     tone: 'green' },
  'pr-close': { icon: 'cancel',         label: 'PR cerrada', tone: 'rose' },
  'release':  { icon: 'rocket_launch',  label: 'Release',   tone: 'rose' },
  'issue':    { icon: 'bug_report',     label: 'Issue',     tone: 'amber' },
  'fork':     { icon: 'fork_right',     label: 'Fork',      tone: 'cyan' },
  'member':   { icon: 'person_add',     label: 'Miembro',   tone: 'green' },
  'create':   { icon: 'add_circle',     label: 'Nuevo',     tone: 'violet' },
  'comment':  { icon: 'forum',          label: 'Comentario', tone: 'violet' },
  'review':   { icon: 'rate_review',    label: 'Revisión',  tone: 'cyan' },
};

export const LANG_COLOR: Record<string, string> = {
  Rust: '#f0a072', Go: '#4fd1e8', C: '#9aa7c9', 'C++': '#ff7aa8', Lua: '#7aa2ff',
  QML: '#6ee7a0', Shell: '#b8e986', Python: '#ffd166', TypeScript: '#6ea8ff', XML: '#c3b1ff',
};
