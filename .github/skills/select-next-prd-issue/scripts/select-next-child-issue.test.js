'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  extractSection,
  extractBlockerNumbers,
  validateBlockedBySection,
} = require('./select-next-child-issue.js');

// extractBlockerNumbers

test('extractBlockerNumbers: returns empty array for empty content', () => {
  assert.deepEqual(extractBlockerNumbers(''), []);
});

test('extractBlockerNumbers: parses single canonical blocker line', () => {
  assert.deepEqual(
    extractBlockerNumbers('- Blocked by #123: API contract must land'),
    [123]
  );
});

test('extractBlockerNumbers: parses multiple canonical blocker lines', () => {
  assert.deepEqual(
    extractBlockerNumbers(
      '- Blocked by #123: API contract must land\n- Blocked by #456 next line'
    ),
    [123, 456]
  );
});

test('extractBlockerNumbers: deduplicates repeated numbers', () => {
  assert.deepEqual(
    extractBlockerNumbers('- Blocked by #123: first\n- Blocked by #123: second'),
    [123]
  );
});

test('extractBlockerNumbers: returns empty array for None line', () => {
  assert.deepEqual(extractBlockerNumbers('None - can start immediately'), []);
});

test('extractBlockerNumbers: sorts numerically ascending', () => {
  assert.deepEqual(
    extractBlockerNumbers('- Blocked by #456: last\n- Blocked by #123: first'),
    [123, 456]
  );
});

// validateBlockedBySection

test('validateBlockedBySection: accepts canonical blocker line', () => {
  assert.doesNotThrow(() =>
    validateBlockedBySection('- Blocked by #123: API contract must land\n', 11)
  );
});

test('validateBlockedBySection: accepts None line', () => {
  assert.doesNotThrow(() =>
    validateBlockedBySection('None - can start immediately', 11)
  );
});

test('validateBlockedBySection: accepts empty content', () => {
  assert.doesNotThrow(() => validateBlockedBySection('', 11));
});

test('validateBlockedBySection: throws on malformed line', () => {
  assert.throws(
    () => validateBlockedBySection('- Depends on #123: wrong format\n', 12),
    /invalid Blocked by line/
  );
});

// extractSection

test('extractSection: extracts content under matching heading', () => {
  const body =
    '## Parent PRD\nhttps://github.com/org/repo/issues/1\n## Next Section\nother';
  const result = extractSection(body, 'Parent\\s*PRD');
  assert.ok(result.includes('https://github.com/org/repo/issues/1'));
  assert.ok(!result.includes('other'));
});

test('extractSection: returns empty string when heading not found', () => {
  const body = '## Some Other Section\ncontent';
  assert.equal(extractSection(body, 'Parent\\s*PRD').trim(), '');
});

test('extractSection: stops at next h2 heading', () => {
  const body =
    '## Blocked by\n- Blocked by #1: reason\n## Other\nshould not appear';
  const result = extractSection(body, 'Blocked\\s*by');
  assert.ok(result.includes('Blocked by #1'));
  assert.ok(!result.includes('should not appear'));
});
