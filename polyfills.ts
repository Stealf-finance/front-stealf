import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

if (typeof global.TextEncoder === 'undefined') {
  require('text-encoding-polyfill');
}

require('react-native-get-random-values');
require('react-native-url-polyfill/auto');