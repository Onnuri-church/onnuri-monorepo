const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// pnpm uses symlinked node_modules; Metro needs these enabled to resolve
// hoisted/workspace packages like @onnuri/shared correctly.
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
