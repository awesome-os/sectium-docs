import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SKIP_DIRS: ReadonlySet<string> = new Set([
  'node_modules',
  '.git',
  '.b8g-cas',
  'third_party',
  'upstream',
  'dist',
  'out',
  'repository',
]);

export const KNOWN_LABELS = [
  'architecture',
  'skill',
  'rule',
  'book',
  'blog',
  'sectium-control-plane',
  'holo-compiler',
  'devops-signing',
  'b8g-runtime',
  'wasi',
  'web-streams',
  'section-readme',
  'root',
] as const;

export type KnownLabel = (typeof KNOWN_LABELS)[number];

export interface MarkdownDocEntry {
  path: string;
  title: string;
  bytes: number;
  sha256: string;
  labels: string[];
}

export interface MarkdownRegistry {
  schemaVersion: 1;
  generatedAt: string;
  rootDir: string;
  totalDocs: number;
  labelCounts: Record<string, number>;
  docs: MarkdownDocEntry[];
}

const THIS_FILE = fileURLToPath(import.meta.url);
export const DEFAULT_ROOT_DIR = resolve(dirname(THIS_FILE), '..', '..');
export const DEFAULT_REGISTRY_PATH = join(
  DEFAULT_ROOT_DIR,
  'docs',
  'MARKDOWN-REGISTRY.json',
);

function toPosixPath(p: string): string {
  return p.split('\\').join('/');
}

/**
 * Extracts the first level-1 `# Title` outside fenced code blocks.
 * Falls back to the file basename without extension if none is present.
 */
export function extractTitle(content: string, fallbackPath: string): string {
  const lines = content.split(/\r?\n/);
  let inFence = false;
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      continue;
    }
    const match = /^#\s+(.+?)\s*$/.exec(trimmed);
    if (match && match[1]) {
      return match[1].replace(/\s+#+\s*$/, '').trim();
    }
  }
  return basename(fallbackPath, '.md');
}

/**
 * Computes deterministic, sorted labels from relative POSIX path and content keywords.
 */
export function classifyLabels(relPath: string, content: string): string[] {
  const normPath = toPosixPath(relPath);
  const lowerPath = normPath.toLowerCase();
  const lowerContent = content.toLowerCase();
  const labels = new Set<string>();

  // Path-structural labels
  if (!normPath.includes('/')) {
    labels.add('root');
  }

  if (
    lowerPath.startsWith('docs/architecture/') ||
    lowerPath === 'architecture.md' ||
    lowerPath.includes('/architecture/')
  ) {
    labels.add('architecture');
  }

  if (
    lowerPath.startsWith('.agents/skills/') ||
    lowerPath.includes('/skills/') ||
    basename(lowerPath) === 'skill.md'
  ) {
    labels.add('skill');
  }

  if (
    lowerPath.startsWith('.agents/rules/') ||
    lowerPath.includes('/rules/')
  ) {
    labels.add('rule');
  }

  if (
    lowerPath.includes('-book/') ||
    lowerPath.includes('/book/') ||
    lowerPath.startsWith('docs/white-dragon-book/') ||
    lowerPath.startsWith('docs/little-white-dragon-book/') ||
    lowerPath.startsWith('docs/young-frank-book/')
  ) {
    labels.add('book');
  }

  if (lowerPath.includes('-blog/') || lowerPath.includes('/blog/')) {
    labels.add('blog');
  }

  if (/^sections\/[^/]+\/readme\.md$/i.test(normPath)) {
    labels.add('section-readme');
  }

  // Domain & keyword labels (path + content)
  if (
    lowerPath.includes('sectium-cloud-control-plane') ||
    lowerPath.includes('sectium-control-plane') ||
    lowerContent.includes('sectium-cloud-control-plane') ||
    lowerContent.includes('b8g_abi_magic_v3') ||
    lowerContent.includes('sectium cloud control plane')
  ) {
    labels.add('sectium-control-plane');
  }

  if (
    lowerPath.includes('holo-compiler') ||
    lowerContent.includes('holo-compiler') ||
    /\bholoc\b/.test(lowerContent)
  ) {
    labels.add('holo-compiler');
  }

  if (
    lowerPath.includes('devops') ||
    lowerPath.includes('signing') ||
    lowerPath.includes('docs/deploy/') ||
    lowerPath.includes('distribution') ||
    lowerContent.includes('code signing') ||
    lowerContent.includes('release-manifest.json') ||
    lowerContent.includes('sovereign distribution') ||
    lowerContent.includes('mark-of-the-web')
  ) {
    labels.add('devops-signing');
  }

  if (
    lowerPath.includes('b8g-runtime') ||
    lowerPath.startsWith('sections/runtime/') ||
    lowerPath === 'b8g.md' ||
    lowerContent.includes('b8g-runtime') ||
    lowerContent.includes('b8g_arena_v1') ||
    lowerContent.includes('b8g microkernel')
  ) {
    labels.add('b8g-runtime');
  }

  if (
    lowerPath.includes('wasi') ||
    /\bwasi\b/.test(lowerContent) ||
    lowerContent.includes('wasm32-wasi')
  ) {
    labels.add('wasi');
  }

  if (
    lowerPath.includes('web-streams') ||
    lowerPath.includes('web_streams') ||
    lowerContent.includes('readablestream') ||
    lowerContent.includes('transformstream') ||
    lowerContent.includes('writablestream') ||
    lowerContent.includes('web streams')
  ) {
    labels.add('web-streams');
  }

  return Array.from(labels).sort();
}

function walkMarkdownFiles(rootDir: string, currentDir: string, out: string[]): void {
  let entries;
  try {
    entries = readdirSync(currentDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(currentDir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }
      walkMarkdownFiles(rootDir, fullPath, out);
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      out.push(fullPath);
      continue;
    }

    if (entry.isSymbolicLink()) {
      try {
        const st = statSync(fullPath);
        if (st.isFile() && entry.name.toLowerCase().endsWith('.md')) {
          out.push(fullPath);
        }
      } catch {
        // Ignore broken symlinks
      }
    }
  }
}

export function getLabelStats(registry: MarkdownRegistry): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const label of KNOWN_LABELS) {
    counts[label] = 0;
  }
  for (const doc of registry.docs) {
    for (const label of doc.labels) {
      counts[label] = (counts[label] ?? 0) + 1;
    }
  }
  const sorted: Record<string, number> = {};
  for (const key of Object.keys(counts).sort()) {
    sorted[key] = counts[key] ?? 0;
  }
  return sorted;
}

export function buildMarkdownRegistry(rootDir: string = DEFAULT_ROOT_DIR): MarkdownRegistry {
  const resolvedRoot = resolve(rootDir);
  const absPaths: string[] = [];
  walkMarkdownFiles(resolvedRoot, resolvedRoot, absPaths);

  const docs: MarkdownDocEntry[] = [];
  for (const absPath of absPaths) {
    const relPath = toPosixPath(relative(resolvedRoot, absPath));
    let raw: Buffer;
    try {
      raw = readFileSync(absPath);
    } catch {
      continue;
    }
    const content = raw.toString('utf8');
    const sha256 = createHash('sha256').update(raw).digest('hex');
    const title = extractTitle(content, relPath);
    const labels = classifyLabels(relPath, content);

    docs.push({
      path: relPath,
      title,
      bytes: raw.length,
      sha256,
      labels,
    });
  }

  docs.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  const partial: MarkdownRegistry = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    rootDir: toPosixPath(resolvedRoot),
    totalDocs: docs.length,
    labelCounts: {},
    docs,
  };
  partial.labelCounts = getLabelStats(partial);
  return partial;
}

export function writeMarkdownRegistry(
  registry: MarkdownRegistry,
  outputPath: string = DEFAULT_REGISTRY_PATH,
): string {
  const resolvedOut = resolve(outputPath);
  mkdirSync(dirname(resolvedOut), { recursive: true });
  writeFileSync(resolvedOut, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
  return resolvedOut;
}

export function readMarkdownRegistry(
  inputPath: string = DEFAULT_REGISTRY_PATH,
): MarkdownRegistry {
  const raw = readFileSync(resolve(inputPath), 'utf8');
  return JSON.parse(raw) as MarkdownRegistry;
}

export function queryByLabel(
  registry: MarkdownRegistry,
  label: string,
): MarkdownDocEntry[] {
  const target = label.trim().toLowerCase();
  return registry.docs.filter((doc) => doc.labels.includes(target));
}

function loadOrBuildRegistry(rootDir: string): MarkdownRegistry {
  const registryPath = join(resolve(rootDir), 'docs', 'MARKDOWN-REGISTRY.json');
  if (existsSync(registryPath)) {
    return readMarkdownRegistry(registryPath);
  }
  return buildMarkdownRegistry(rootDir);
}

function printLabelStats(labelCounts: Record<string, number>): void {
  const entries = Object.entries(labelCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  for (const [label, count] of entries) {
    console.log(`  ${label.padEnd(24)} ${count}`);
  }
}

export function runCli(
  argv: readonly string[],
  rootDir: string = DEFAULT_ROOT_DIR,
): number {
  const [subcommand, ...rest] = argv;
  const resolvedRoot = resolve(rootDir);
  const registryPath = join(resolvedRoot, 'docs', 'MARKDOWN-REGISTRY.json');

  if (!subcommand || subcommand === 'help' || subcommand === '--help' || subcommand === '-h') {
    console.log('Usage: b8g-docs-registry <build | query --label <label> | stats>');
    return 0;
  }

  if (subcommand === 'build') {
    const registry = buildMarkdownRegistry(resolvedRoot);
    const outPath = writeMarkdownRegistry(registry, registryPath);
    console.log(`Built Markdown Registry: ${toPosixPath(outPath)}`);
    console.log(`Total indexed docs: ${registry.totalDocs}`);
    console.log('Label distribution:');
    printLabelStats(registry.labelCounts);
    return 0;
  }

  if (subcommand === 'query') {
    let label = '';
    for (let i = 0; i < rest.length; i++) {
      const arg = rest[i] ?? '';
      if (arg === '--label' && rest[i + 1]) {
        label = rest[i + 1] ?? '';
        i++;
      } else if (arg.startsWith('--label=')) {
        label = arg.slice('--label='.length);
      } else if (!arg.startsWith('-') && !label) {
        label = arg;
      }
    }
    if (!label) {
      console.error('Error: query requires --label <label>');
      return 1;
    }
    const registry = loadOrBuildRegistry(resolvedRoot);
    const matches = queryByLabel(registry, label);
    console.log(`Label "${label}" matched ${matches.length} doc(s):`);
    for (const doc of matches) {
      console.log(`- ${doc.path} | ${doc.title} [${doc.labels.join(', ')}]`);
    }
    return 0;
  }

  if (subcommand === 'stats') {
    const registry = loadOrBuildRegistry(resolvedRoot);
    console.log(`Total indexed docs: ${registry.totalDocs}`);
    console.log('Counts per label:');
    printLabelStats(registry.labelCounts);
    return 0;
  }

  console.error(`Unknown subcommand: ${subcommand}`);
  console.error('Usage: b8g-docs-registry <build | query --label <label> | stats>');
  return 1;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath.toLowerCase() === resolve(THIS_FILE).toLowerCase()) {
  const code = runCli(process.argv.slice(2));
  process.exitCode = code;
}
