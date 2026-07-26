const assert = require('node:assert/strict');
const test = require('node:test');

const { computeDiff, hashValue, indexRecords } = require('../../api/sync/prodMirror');

test('stable hashes ignore object key insertion order', () => {
  assert.equal(
    hashValue({ event: { date: '2026-07-26', id: '42' }, published: true }),
    hashValue({ published: true, event: { id: '42', date: '2026-07-26' } }),
  );
});

test('manifest diff identifies changed and deleted records', () => {
  const previous = indexRecords([
    { id: '1', title: 'Original' },
    { id: '2', title: 'Removed' },
  ]);
  const next = indexRecords([
    { id: '1', title: 'Updated' },
    { id: '3', title: 'Added' },
  ]);

  assert.deepEqual(computeDiff(previous, next), {
    changed: ['1', '3'],
    deleted: ['2'],
  });
});
