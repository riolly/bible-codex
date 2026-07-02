// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Bundle the prebuilt read-only corpus DB as an asset (ADR-0009). The corpus
// `.db` is produced by the build-time ingest pipeline (#6, ADR-0010).
config.resolver.assetExts.push('db');

// Drizzle ships SQL migrations bundled as strings via a metro transformer.
config.resolver.sourceExts.push('sql');

module.exports = config;
