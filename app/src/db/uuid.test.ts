import { describe, expect, it } from 'vitest';

import { uuidv7 } from './uuid';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('uuidv7', () => {
  it('emits a well-formed v7 UUID (version + variant nibbles)', () => {
    for (let i = 0; i < 200; i++) expect(uuidv7()).toMatch(UUID_RE);
  });

  it('is collision-free across a burst (client-generated identity, ADR-0011)', () => {
    const ids = new Set(Array.from({ length: 5000 }, () => uuidv7()));
    expect(ids.size).toBe(5000);
  });

  it('is time-sortable: a later id string-sorts after an earlier one', () => {
    const before = uuidv7();
    // Force a later millisecond so the 48-bit timestamp prefix advances.
    const now = Date.now();
    while (Date.now() === now) {
      /* spin < 1ms */
    }
    const after = uuidv7();
    expect(after > before).toBe(true);
  });
});
