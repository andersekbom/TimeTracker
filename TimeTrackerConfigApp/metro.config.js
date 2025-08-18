const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add Buffer polyfill for BLE data handling
config.resolver.alias = {
  buffer: 'buffer',
};

module.exports = config;