const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const path = require('path');

// Add Node.js polyfills for React Native
config.resolver.extraNodeModules = {
  stream: require.resolve('readable-stream'),
  buffer: require.resolve('buffer'),
  crypto: path.resolve(__dirname, 'src/shims/crypto-shim.js'),
};

module.exports = config;
