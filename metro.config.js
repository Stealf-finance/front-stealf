const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = false;

config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

config.resolver.extraNodeModules = {
  stream: require.resolve('readable-stream'),
  buffer: require.resolve('buffer'),
  crypto: path.resolve(__dirname, 'crypto-shim.js'),
};

// Manual module resolution overrides
const moduleOverrides = {
  // Browser builds (Node CJS versions use readline/crypto/os/fs)
  snarkjs: path.resolve(__dirname, 'node_modules/snarkjs/build/browser.esm.js'),
  ffjavascript: path.resolve(__dirname, 'node_modules/ffjavascript/build/browser.esm.js'),
  // Subpath exports not resolvable with unstable_enablePackageExports=false
  '@bufbuild/protobuf/codegenv2': path.resolve(__dirname, 'node_modules/@bufbuild/protobuf/dist/cjs/codegenv2/index.js'),
  // ethers v6: Metro can't resolve .cjs without extension mapping
  '@adraffy/ens-normalize': path.resolve(__dirname, 'node_modules/ethers/node_modules/@adraffy/ens-normalize/dist/index.mjs'),
};

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleOverrides[moduleName]) {
    return { type: 'sourceFile', filePath: moduleOverrides[moduleName] };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...config.resolver.sourceExts, 'svg'],
};

module.exports = config;
