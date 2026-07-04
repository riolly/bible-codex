/**
 * Pinned upstream USFM sources. Full corpora are NOT committed — the download
 * script fetches these zips into scripts/ingest/sources/ (gitignored) and
 * verifies the pinned sha256. If upstream re-publishes (ebible.org refreshes
 * zips when a text is revised), the checksum fails LOUDLY: updating the pin is
 * a conscious act that produces a new `translation.edition` (ADR-0013) and
 * triggers the quote-witness reconciliation story downstream.
 *
 * Pinned 2026-07-04.
 */

import type { TranslationMeta } from './write-db';

export interface SourceDef {
  readonly meta: TranslationMeta & { edition: '' }; // edition computed at ingest (edition.ts)
  readonly url: string;
  readonly sha256: string;
  /** Directory under scripts/ingest/sources/ the zip unpacks into. */
  readonly dir: string;
  /**
   * Opt-in to the versified-\d → \qd grammar-gap rewrite (parse.ts). Only set
   * after eyeballing the source's \d+\v constructs — parse fails loudly when
   * the construct appears without this flag, so a new translation never gets
   * markers silently rewritten.
   */
  readonly rewriteVersifiedD: boolean;
}

export const SOURCES: readonly SourceDef[] = [
  {
    meta: {
      name: 'King James Version',
      abbrev: 'KJV',
      language: 'english',
      year: 1769,
      license: 'Public Domain',
      versification: 'av11n',
      edition: '',
    },
    url: 'https://ebible.org/Scriptures/eng-kjv_usfm.zip',
    sha256: '1ba522157152c537013c1be86c5eb96c17a9c7a0f8e02e23262d61eea5bef054',
    dir: 'kjv',
    rewriteVersifiedD: false,
  },
  {
    meta: {
      name: 'Berean Standard Bible',
      abbrev: 'BSB',
      language: 'english',
      year: 2023,
      license: 'Public Domain',
      versification: 'av11n',
      edition: '',
    },
    url: 'https://ebible.org/Scriptures/engbsb_usfm.zip',
    sha256: 'a7f61bf7986aa11cf3ced7044af79dadce029053573ce99703c2a8d66601e41b',
    dir: 'bsb',
    rewriteVersifiedD: true, // BSB Zech 12 versified \d (grammar gap, parse.ts)
  },
];
