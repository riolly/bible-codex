// Android backup rules (ADR-0011): correct-by-policy, not correct-by-luck.
// Without rules Android backs up EVERYTHING under the sandbox; Auto Backup has
// a ~25MB per-app quota, so any large stray file silently kills the backup of
// user.db — the user's annotations lose their safety net. These rules include
// ONLY the user DB (expo-sqlite's default dir is files/SQLite); everything
// else — the corpus working copy already lives in the auto-excluded cache dir
// (src/db/paths.ts) — is excluded by omission.
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const { mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');

// API ≤ 30 (android:fullBackupContent)
const BACKUP_RULES = `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
    <include domain="file" path="SQLite/user.db" />
    <include domain="file" path="SQLite/user.db-wal" />
    <include domain="file" path="SQLite/user.db-shm" />
</full-backup-content>
`;

// API 31+ (android:dataExtractionRules): same policy for cloud backup and
// device-to-device transfer.
const DATA_EXTRACTION_RULES = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup>
        <include domain="file" path="SQLite/user.db" />
        <include domain="file" path="SQLite/user.db-wal" />
        <include domain="file" path="SQLite/user.db-shm" />
    </cloud-backup>
    <device-transfer>
        <include domain="file" path="SQLite/user.db" />
        <include domain="file" path="SQLite/user.db-wal" />
        <include domain="file" path="SQLite/user.db-shm" />
    </device-transfer>
</data-extraction-rules>
`;

function withAndroidBackupRules(config) {
  config = withDangerousMod(config, [
    'android',
    (cfg) => {
      const resXml = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res/xml');
      mkdirSync(resXml, { recursive: true });
      writeFileSync(path.join(resXml, 'backup_rules.xml'), BACKUP_RULES);
      writeFileSync(path.join(resXml, 'data_extraction_rules.xml'), DATA_EXTRACTION_RULES);
      return cfg;
    },
  ]);
  config = withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.$['android:allowBackup'] = 'true';
    app.$['android:fullBackupContent'] = '@xml/backup_rules';
    app.$['android:dataExtractionRules'] = '@xml/data_extraction_rules';
    return cfg;
  });
  return config;
}

module.exports = withAndroidBackupRules;
