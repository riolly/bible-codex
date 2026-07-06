import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type FsOps, type SwapPaths, swapUserDb } from './swap-db';

const PATHS: SwapPaths = {
  staged: '/cache/import-staging.bcxbackup',
  live: '/db/user.db',
  importTmp: '/db/user.db.import',
  backup: '/db/user.db.bak',
  wal: '/db/user.db-wal',
  shm: '/db/user.db-shm',
};

/**
 * In-memory fake of the small fs surface swapUserDb needs. `files` is the set of
 * paths that currently exist; copy/move mutate it. `failOn` makes the next
 * copy/move to a given destination throw, to exercise the recovery branches.
 */
function makeFs(
  initial: string[],
): FsOps & { files: Set<string>; has(path: string): boolean; failCopyTo?: string; failMoveTo?: string } {
  const files = new Set(initial);
  const fs = {
    files,
    failCopyTo: undefined as string | undefined,
    failMoveTo: undefined as string | undefined,
    has: (path: string) => files.has(path),
    exists: (path: string) => files.has(path),
    copy(from: string, to: string) {
      if (fs.failCopyTo === to) throw new Error(`copy to ${to} failed`);
      if (!files.has(from)) throw new Error(`copy source missing: ${from}`);
      files.add(to);
    },
    move(from: string, to: string) {
      if (fs.failMoveTo === to) {
        // One-shot: the transient failure hits once, so recovery can still run.
        fs.failMoveTo = undefined;
        throw new Error(`move to ${to} failed`);
      }
      if (!files.has(from)) throw new Error(`move source missing: ${from}`);
      files.delete(from);
      files.add(to);
    },
    delete(path: string) {
      files.delete(path);
    },
  };
  return fs;
}

describe('swapUserDb', () => {
  let fs: ReturnType<typeof makeFs>;

  beforeEach(() => {
    // A live DB with stale WAL/SHM sidecars, plus the staged import in cache.
    fs = makeFs([PATHS.staged, PATHS.live, PATHS.wal, PATHS.shm]);
  });

  it('replaces the live DB and drops the old sidecars + scratch files', () => {
    swapUserDb(fs, PATHS);

    expect(fs.has(PATHS.live)).toBe(true);
    // Old WAL/SHM belong to the discarded DB — they must be gone.
    expect(fs.has(PATHS.wal)).toBe(false);
    expect(fs.has(PATHS.shm)).toBe(false);
    // No scratch left behind.
    expect(fs.has(PATHS.importTmp)).toBe(false);
    expect(fs.has(PATHS.backup)).toBe(false);
  });

  it('leaves the live DB untouched when staging the import fails', () => {
    fs.failCopyTo = PATHS.importTmp;

    expect(() => swapUserDb(fs, PATHS)).toThrow(/copy to/);

    // Live DB never moved; no gap, nothing to recover.
    expect(fs.has(PATHS.live)).toBe(true);
    expect(fs.has(PATHS.importTmp)).toBe(false);
  });

  it('restores the original when the final move into place fails', () => {
    fs.failMoveTo = PATHS.live;

    expect(() => swapUserDb(fs, PATHS)).toThrow(/move to/);

    // The live DB must be back — never left absent-and-unreplaced.
    expect(fs.has(PATHS.live)).toBe(true);
    expect(fs.has(PATHS.importTmp)).toBe(false);
  });

  it('clears a leftover importTmp/backup from a previous aborted run', () => {
    fs.files.add(PATHS.importTmp);
    fs.files.add(PATHS.backup);

    swapUserDb(fs, PATHS);

    expect(fs.has(PATHS.live)).toBe(true);
    expect(fs.has(PATHS.importTmp)).toBe(false);
    expect(fs.has(PATHS.backup)).toBe(false);
  });

  it('swallows delete errors during final cleanup (best-effort)', () => {
    const del = vi.fn((path: string) => {
      if (path === PATHS.wal) throw new Error('wal delete failed');
      fs.files.delete(path);
    });

    // Cleanup of a stale sidecar throwing must not fail the whole import.
    expect(() => swapUserDb({ ...fs, delete: del }, PATHS)).not.toThrow();
    expect(fs.has(PATHS.live)).toBe(true);
  });
});
