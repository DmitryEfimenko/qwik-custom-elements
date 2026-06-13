#!/usr/bin/env node
/**
 * Compatibility matrix automation.
 *
 * Automatically updates COMPATIBILITY.md when package versions are bumped
 * during `pnpm version-packages`. Copies the first (most recent) row of each
 * table and updates only the package version column.
 *
 * This provides a "best effort" automation - authors can manually edit the
 * generated rows if peer dependencies or Node.js versions have changed.
 *
 * Usage: node scripts/update-compatibility-matrix.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import { parseVersionsFromSection } from './check-compatibility-matrix.mjs';

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

/** @param {string} rel @param {string} content */
function writeText(rel, content) {
  writeFileSync(join(ROOT, rel), content, 'utf8');
}

/**
 * Find the table node in the AST for a given section heading.
 *
 * @param {import('mdast').Root} ast
 * @param {string} heading
 * @returns {import('mdast').Table | null}
 */
function findTableForSection(ast, heading) {
  let foundHeading = false;

  for (let i = 0; i < ast.children.length; i++) {
    const node = ast.children[i];

    if (node.type === 'heading' && node.depth === 3) {
      const text = node.children
        .filter((c) => c.type === 'text')
        .map((c) => c.value)
        .join('');
      if (text === heading) {
        foundHeading = true;
        continue;
      } else if (foundHeading) {
        // Hit next section heading, stop
        break;
      }
    }

    if (foundHeading && node.type === 'table') {
      return node;
    }
  }

  return null;
}

/**
 * Insert a new row at the top of a table (after the header row).
 *
 * @param {import('mdast').Table} table
 * @param {string} newVersion
 * @returns {boolean} true if row was added
 */
function insertRowIntoTable(table, newVersion) {
  if (!table.children || table.children.length < 1) {
    throw new Error('Table has no rows to copy');
  }

  // First row is the header (index 0)
  // Second row onward are data rows
  // We want to copy row at index 1 (first data row)
  const firstDataRowIndex = 1;

  if (table.children.length < firstDataRowIndex + 1) {
    throw new Error('Table has no data rows to copy (only header exists)');
  }

  const templateRow = table.children[firstDataRowIndex];

  // Clone the template row
  const newRow = JSON.parse(JSON.stringify(templateRow));

  // Update the first cell with the new version
  if (
    newRow.children &&
    newRow.children[0] &&
    newRow.children[0].children &&
    newRow.children[0].children[0]
  ) {
    newRow.children[0].children[0].value = newVersion;
  } else {
    throw new Error('Could not update version cell in cloned row');
  }

  // Insert the new row after the header (at index 1)
  table.children.splice(firstDataRowIndex, 0, newRow);

  return true;
}

/**
 * Update COMPATIBILITY.md for all packages.
 *
 * @returns {{ updated: string[], skipped: string[], errors: string[] }}
 */
function updateCompatibilityMatrix() {
  const matrixPath = 'COMPATIBILITY.md';
  const matrixContent = readText(matrixPath);

  const packages = [
    {
      name: 'core',
      packageJsonPath: 'packages/core/package.json',
      section: 'Core',
    },
    {
      name: 'adapter-lit',
      packageJsonPath: 'packages/adapter-lit/package.json',
      section: 'adapter-lit',
    },
    {
      name: 'adapter-stencil',
      packageJsonPath: 'packages/adapter-stencil/package.json',
      section: 'adapter-stencil',
    },
  ];

  const updated = [];
  const skipped = [];
  const errors = [];

  // Parse the markdown
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkStringify, {
      bullet: '-',
      emphasis: '_',
      fences: true,
      listItemIndent: 'one',
      rule: '-',
      strong: '*',
      tightDefinitions: true,
    });

  const ast = processor.parse(matrixContent);

  for (const pkg of packages) {
    try {
      const { version, name: pkgName } = readJson(pkg.packageJsonPath);
      const existingVersions = parseVersionsFromSection(
        matrixContent,
        pkg.section,
      );

      if (existingVersions.includes(version)) {
        skipped.push(`${pkgName}@${version}`);
        continue;
      }

      // Find the table for this section
      const table = findTableForSection(ast, pkg.section);
      if (!table) {
        errors.push(
          `${pkgName}@${version} - could not find table for section "${pkg.section}"`,
        );
        continue;
      }

      // Insert the new row
      insertRowIntoTable(table, version);
      updated.push(`${pkgName}@${version}`);
    } catch (err) {
      errors.push(`${pkg.name} - ${err.message}`);
    }
  }

  // Only write if we made changes
  if (updated.length > 0) {
    const updatedContent = processor.stringify(ast);
    writeText(matrixPath, updatedContent);
  }

  return { updated, skipped, errors };
}

// --- Main ---
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const result = updateCompatibilityMatrix();

    if (result.updated.length > 0) {
      for (const pkg of result.updated) {
        console.log(`✓  Added ${pkg} to COMPATIBILITY.md`);
      }
    }

    if (result.skipped.length > 0) {
      for (const pkg of result.skipped) {
        console.log(`⦿  ${pkg} already in COMPATIBILITY.md`);
      }
    }

    if (result.errors.length > 0) {
      for (const error of result.errors) {
        console.error(`✗  ${error}`);
      }
      process.exit(1);
    }

    process.exit(0);
  } catch (err) {
    console.error('✗  Failed to update COMPATIBILITY.md:', err.message);
    process.exit(1);
  }
}
