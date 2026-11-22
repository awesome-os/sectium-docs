import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';
import {
  buildMarkdownRegistry,
  DEFAULT_ROOT_DIR,
  queryByLabel,
  type MarkdownRegistry,
} from './index.mts';

function listMdRelative(rootDir: string, subDir: string): string[] {
  const results: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        results.push(relative(rootDir, full).split('\\').join('/'));
      }
    }
  };
  walk(join(rootDir, subDir));
  return results.sort();
}

let cachedRegistry: MarkdownRegistry | undefined;
function getRegistry(): MarkdownRegistry {
  if (!cachedRegistry) {
    cachedRegistry = buildMarkdownRegistry(DEFAULT_ROOT_DIR);
  }
  return cachedRegistry;
}

test('buildMarkdownRegistry() indexes >50 docs with SHA-256 digests and deterministic labels', () => {
  const reg = getRegistry();
  assert.ok(
    reg.totalDocs > 50,
    `Expected >50 indexed docs, got ${reg.totalDocs}`,
  );
  assert.equal(reg.docs.length, reg.totalDocs);

  for (const doc of reg.docs) {
    assert.ok(doc.path.length > 0, 'doc.path must be non-empty');
    assert.ok(!doc.path.includes('\\'), `doc.path must use POSIX slashes: ${doc.path}`);
    assert.ok(doc.title.length > 0, `doc.title must be non-empty for ${doc.path}`);
    assert.ok(doc.bytes >= 0, `doc.bytes must be non-negative for ${doc.path}`);
    assert.match(
      doc.sha256,
      /^[0-9a-f]{64}$/,
      `doc.sha256 must be a 64-char lowercase hex SHA-256 for ${doc.path}`,
    );
    assert.ok(Array.isArray(doc.labels), `doc.labels must be an array for ${doc.path}`);
  }
});

test('queryByLabel(reg, "devops-signing") finds DEVOPS-BUILD-DISTRIBUTION-AND-SIGNING-GUIDE.md', () => {
  const reg = getRegistry();
  const matches = queryByLabel(reg, 'devops-signing');
  const paths = matches.map((d) => d.path);
  assert.ok(
    paths.includes('docs/architecture/DEVOPS-BUILD-DISTRIBUTION-AND-SIGNING-GUIDE.md'),
    `Expected docs/architecture/DEVOPS-BUILD-DISTRIBUTION-AND-SIGNING-GUIDE.md in devops-signing matches, got ${paths.length} matches`,
  );
});

test('queryByLabel(reg, "sectium-control-plane") finds SECTIUM-CLOUD-CONTROL-PLANE.md', () => {
  const reg = getRegistry();
  const matches = queryByLabel(reg, 'sectium-control-plane');
  const paths = matches.map((d) => d.path);
  assert.ok(
    paths.includes('docs/architecture/SECTIUM-CLOUD-CONTROL-PLANE.md'),
    `Expected docs/architecture/SECTIUM-CLOUD-CONTROL-PLANE.md in sectium-control-plane matches, got ${paths.length} matches`,
  );
});

test('queryByLabel(reg, "skill") and queryByLabel(reg, "rule") return all .agents/skills/ and .agents/rules/ docs', () => {
  const reg = getRegistry();

  const expectedSkills = listMdRelative(DEFAULT_ROOT_DIR, '.agents/skills');
  assert.ok(expectedSkills.length > 0, 'Expected at least one .agents/skills markdown doc');
  const skillPaths = new Set(queryByLabel(reg, 'skill').map((d) => d.path));
  for (const skillDoc of expectedSkills) {
    assert.ok(
      skillPaths.has(skillDoc),
      `Missing .agents/skills doc from "skill" label query: ${skillDoc}`,
    );
  }

  const expectedRules = listMdRelative(DEFAULT_ROOT_DIR, '.agents/rules');
  assert.ok(expectedRules.length > 0, 'Expected at least one .agents/rules markdown doc');
  const rulePaths = new Set(queryByLabel(reg, 'rule').map((d) => d.path));
  for (const ruleDoc of expectedRules) {
    assert.ok(
      rulePaths.has(ruleDoc),
      `Missing .agents/rules doc from "rule" label query: ${ruleDoc}`,
    );
  }
});
