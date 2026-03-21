const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix @/ alias explicitly
config.resolver.alias = {
  '@': '.',
};

config.resolver.blockList = [
  ...Array.from(config.resolver.blockList || []),
  /.*\/app\/api\/.*/,
];

module.exports = config;
