import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { db } from '@/db/client';
import migrations from '@/db/migrations/migrations';

export default function RootLayout() {
  // Apply bundled migrations on this device before any screen queries the DB
  // (ADR-0009). Runs only unapplied migrations, in order, tracked per-device in
  // __drizzle_migrations. Forward-only — no down-migrations on device.
  //
  // Cast: drizzle-kit 1.0-rc emits `migrations.js` without `journal`, but the
  // useMigrations *type* still requires it. The runtime migrator reads only
  // `{ migrations }` (it derives dates from the timestamp keys), so this is a
  // type/runtime mismatch in the rc, not a missing file — hence the cast.
  const { success, error } = useMigrations(
    db,
    migrations as unknown as Parameters<typeof useMigrations>[1],
  );

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: 'red' }}>Migration failed: {error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
