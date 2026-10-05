// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

if (!config.resolver.assetExts.includes('ttf')) {
  config.resolver.assetExts.push('ttf');
}

const originalResolveRequest = config.resolver.resolveRequest;

const ALIASES = {
  'tslib': require.resolve('tslib/tslib.es6.js'),
  'moti': path.resolve(__dirname, 'node_modules/moti/build/index.js'),
  'moti/skeleton': path.resolve(__dirname, 'node_modules/moti/build/skeleton/index.js'),
  'moti/interactions': path.resolve(__dirname, 'node_modules/moti/build/interactions/index.js'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (ALIASES[moduleName]) {
    return {
      filePath: ALIASES[moduleName],
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
