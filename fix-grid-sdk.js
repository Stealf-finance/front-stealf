const fs = require('fs');
const path = require('path');

// Patch Grid SDK to handle expo-secure-store correctly
const gridSdkPath = path.join(__dirname, 'node_modules/@sqds/grid/dist/index.native.js');

if (!fs.existsSync(gridSdkPath)) {
  console.error('❌ Grid SDK not found at:', gridSdkPath);
  process.exit(1);
}

let content = fs.readFileSync(gridSdkPath, 'utf8');

// Find and replace ExpoSecureStore.default.setValueWithKeyAsync with ExpoSecureStore.setItemAsync
content = content.replace(
  /ExpoSecureStore\.default\.setValueWithKeyAsync/g,
  'ExpoSecureStore.setItemAsync'
);

content = content.replace(
  /ExpoSecureStore\.default\.getValueWithKeyAsync/g,
  'ExpoSecureStore.getItemAsync'
);

content = content.replace(
  /ExpoSecureStore\.default\.deleteValueWithKeyAsync/g,
  'ExpoSecureStore.deleteItemAsync'
);

fs.writeFileSync(gridSdkPath, content, 'utf8');
console.log('✅ Grid SDK patched for expo-secure-store compatibility!');
