const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Resolve the async-require module issue with Grid SDK
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.includes('@expo/metro-config/build/async-require')) {
    // Redirect to the correct location
    return {
      filePath: require.resolve('@expo/metro-config/build/async-require.js'),
      type: 'sourceFile',
    };
  }

  // Default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
