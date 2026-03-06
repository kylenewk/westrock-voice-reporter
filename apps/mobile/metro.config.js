const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

// Find the monorepo root (two levels up from apps/mobile)
const monorepoRoot = path.resolve(__dirname, "../..");

const config = getDefaultConfig(__dirname);

// Watch all files in the monorepo
config.watchFolders = [monorepoRoot];

// Let Metro know where to resolve packages from the monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = config;
