import { describe, expect, it } from 'vitest';

import { buildEnvelope, isImportable, parseEnvelope } from './envelope';

// Timestamp-prefixed drizzle migration tags, oldest → newest.
const TAGS = [
  '20260629050607_large_grey_gargoyle',
  '20260705112511_drop_scroll_mode',
  '20260705133931_flawless_firedrake',
];

describe('buildEnvelope', () => {
  it('stamps the NEWEST migration tag as the schema version', () => {
    const env = buildEnvelope({
      appVersion: '0.1.1',
      corpusEditions: ['sha256:abc'],
      // Order must not matter — the max tag is the schema version.
      migrationTags: [TAGS[2], TAGS[0], TAGS[1]],
      now: 1000,
    });
    expect(env.schemaVersion).toBe(TAGS[2]);
    expect(env.appVersion).toBe('0.1.1');
    expect(env.exportedAt).toBe(1000);
    expect(env.corpusEditions).toEqual(['sha256:abc']);
  });

  it('throws on an empty migration set (a bundle always has migrations)', () => {
    expect(() =>
      buildEnvelope({ appVersion: '0.1.1', corpusEditions: [], migrationTags: [] }),
    ).toThrow();
  });
});

describe('parseEnvelope', () => {
  it('round-trips a built envelope', () => {
    const env = buildEnvelope({
      appVersion: '0.1.1',
      corpusEditions: ['sha256:abc', 'sha256:def'],
      migrationTags: TAGS,
      now: 42,
    });
    expect(parseEnvelope(JSON.stringify(env))).toEqual(env);
  });

  it('rejects malformed JSON', () => {
    expect(() => parseEnvelope('{ not json')).toThrow();
  });

  it('rejects a shape missing required fields', () => {
    expect(() => parseEnvelope(JSON.stringify({ schemaVersion: 'x' }))).toThrow();
  });

  it('rejects a non-string corpus edition', () => {
    const bad = { schemaVersion: 'x', appVersion: '1', exportedAt: 1, corpusEditions: [1] };
    expect(() => parseEnvelope(JSON.stringify(bad))).toThrow();
  });
});

describe('isImportable', () => {
  const env = (schemaVersion: string) =>
    buildEnvelope({ appVersion: '0.1.1', corpusEditions: [], migrationTags: [schemaVersion] });

  it('accepts a file at the SAME schema version', () => {
    expect(isImportable(env(TAGS[2]), TAGS).ok).toBe(true);
  });

  it('accepts an OLDER file (the migrator upgrades it on import)', () => {
    expect(isImportable(env(TAGS[0]), TAGS).ok).toBe(true);
  });

  it('rejects a NEWER file (export from a newer app the bundle cannot migrate)', () => {
    const gate = isImportable(env('20270101000000_future_dragon'), TAGS);
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.reason).toMatch(/newer/i);
  });
});
