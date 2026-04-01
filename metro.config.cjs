const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);
config.maxWorkers = 1;

// 1. Resolve NativeWind configuration
const finalConfig = withNativeWind(config, { input: "./global.css" });

// 2. ULTRA-SAFE WEB INTERCEPTOR (Obsidian Shield)
// This resolver uses a path-comparison guard to prevent infinite recursion.
const MOCK_PATH = path.resolve(__dirname, "constants/maps-mock.js");

finalConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    // 🛡️ OBSIDIAN SHIELD: Prevent infinite loop if already targeting mock
    if (context.originModulePath === MOCK_PATH) {
      return { type: "sourceFile", filePath: MOCK_PATH };
    }
    return {
      type: "sourceFile",
      filePath: MOCK_PATH,
    };
  }
  
  // Chain to default resolver
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = finalConfig;
