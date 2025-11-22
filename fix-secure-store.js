const fs = require('fs');
const path = require('path');

const secureStorePath = path.join(__dirname, 'node_modules/expo-secure-store/build/SecureStore.js');
let content = fs.readFileSync(secureStorePath, 'utf8');

// Remove ALL our previous patches
content = content.replace(/\/\/ Compatibility patch for Grid SDK v0\.1\.0[\s\S]*?export default \{[\s\S]*?\};/g, '');
content = content.replace(/\/\/ PATCH APPLIED - Grid SDK compatibility[\s\S]*?module\.exports = Object\.assign[\s\S]*?\}\);/g, '');
content = content.replace(/\/\/ Also for CommonJS[\s\S]*?module\.exports = Object\.assign[\s\S]*?\}\);/g, '');

// Remove duplicate exports if any
const lines = content.split('\n');
const cleanedLines = [];
let foundDefault = false;

for (const line of lines) {
  if (line.trim().startsWith('export default {') && foundDefault) {
    // Skip duplicate export default
    continue;
  }
  if (line.trim().startsWith('export default {')) {
    foundDefault = true;
  }
  cleanedLines.push(line);
}

content = cleanedLines.join('\n');

// Add ONLY CommonJS module.exports.default (no ES6 export)
const patch = `
// PATCH for Grid SDK v0.1.0 compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports.default = {
    setValueWithKeyAsync: setItemAsync,
    getValueWithKeyAsync: getItemAsync,
    deleteValueWithKeyAsync: deleteItemAsync,
    setItemAsync,
    getItemAsync,
    deleteItemAsync,
    setItem,
    getItem,
    canUseBiometricAuthentication,
    AFTER_FIRST_UNLOCK,
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    ALWAYS,
    WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
    ALWAYS_THIS_DEVICE_ONLY,
    WHEN_UNLOCKED,
    WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  };
}
`;

fs.writeFileSync(secureStorePath, content + patch, 'utf8');
console.log('✅ expo-secure-store cleaned and patched!');
