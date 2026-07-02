import { sql } from 'drizzle-orm';
import Constants from 'expo-constants';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { db } from '@/db/client';
import { ParagraphCanvas } from '@/draw/paragraph-canvas';

const SAMPLE = 'In the beginning God created the heaven and the earth.';

// Drizzle-over-expo-sqlite smoke query (ADR-0009): proves the seam is wired.
// expo-sqlite is synchronous, so this runs once at first render. Real screens
// (#6+) apply bundled migrations via useMigrations first.
function smokeQuery(): string {
  try {
    const row = db.get<{ ok: number }>(sql`select 1 as ok`);
    return row?.ok === 1 ? 'db ok' : 'db ?';
  } catch (e) {
    return `db error: ${(e as Error).message}`;
  }
}

export default function Index() {
  const [dbStatus] = useState(smokeQuery);

  return (
    <View style={{ flex: 1, paddingTop: Constants.statusBarHeight }}>
      <ParagraphCanvas text={SAMPLE} />
      <Text style={{ padding: 12, opacity: 0.5 }}>{dbStatus}</Text>
    </View>
  );
}
