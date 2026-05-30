#!/usr/bin/env node
/**
 * Compatibility matrix policy check.
 *
 * Enforces that COMPATIBILITY.md contains a row for the current version of
 * each publishable package. If a package version is bumped (e.g. for a
 * breaking change) without updating the matrix, this script exits non-zero.
 *
 * Usage: node scripts/check-compatibility-matrix.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/** @param {string} rel */
function readJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));
}

/** @param {string} rel */
function readText(rel) {
  return readFileSync(join(ROOT, rel), 'utf8');
}

/**
 * Parse the first-column version values from a Markdown table section.
 *
 * Finds the section starting with `### <heading>` and collects the first
 * pipe-delimited column from every data row (skipping the header and
 * separator rows).
 *
 * @param {string} markdown
 * @param {string} heading - exact section heading, e.g. "Core"
 * @returns {string[]} version strings found in the first column
 */
export function parseVersionsFromSection(markdown, heading) {
  const lines = markdown.split('\n');
  const sectionPattern = new RegExp(`^###\\s+${heading}\\s*$`);
  let inSection = false;
  let headerRow = true;
  const versions = [];

  for (const line of lines) {
    if (sectionPattern.test(line)) {
      inSection = true;
      headerRow = true;
      continue;
    }

    // Stop at the next section heading
    if (inSection && /^#{1,3}\s/.test(line)) {
      break;
    }

    if (!inSection) continue;

    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;

    // Skip the separator row (| --- | --- |)
    if (/^\|[\s|:-]+\|$/.test(trimmed)) continue;

    if (headerRow) {
      headerRow = false;
      continue;
    }

    // Data row: extract first column value
    const cells = trimmed
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((c) => c.trim());
    if (cells.length > 0 && cells[0]) {
      versions.push(cells[0]);
    }
  }

  return versions;
}

/**
 * @typedef {{ package: string, version: string, found: boolean }} CheckResult
 */

/**
 * @param {string} matrix - COMPATIBILITY.md content
 * @returns {CheckResult[]}
 */
export function checkMatrix(matrix) {
  const checks = [
    { package: 'packages/core/package.json', section: 'Core' },
    { package: 'packages/adapter-lit/package.json', section: 'adapter-lit' },
    {
      package: 'packages/adapter-stencil/package.json',
      section: 'adapter-stencil',
    },
  ];

  return checks.map(({ package: pkgPath, section }) => {
    const { version, name } = readJson(pkgPath);
    const versions = parseVersionsFromSection(matrix, section);
    return {
      package: name,
      version,
      found: versions.includes(version),
    };
  });
}

// --- Main (only when run directly, not when imported) ---
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const matrix = readText('COMPATIBILITY.md');
  const results = checkMatrix(matrix);

  let exitCode = 0;
  for (const { package: pkg, version, found } of results) {
    if (found) {
      console.log(`✓  ${pkg}@${version} — found in COMPATIBILITY.md`);
    } else {
      console.error(
        `✗  ${pkg}@${version} — NOT found in COMPATIBILITY.md. ` +
          `Update the compatibility matrix before merging this change.`,
      );
      exitCode = 1;
    }
  }

  process.exit(exitCode);
}
