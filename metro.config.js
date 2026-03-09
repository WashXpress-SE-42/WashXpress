// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add the api directory to the exclusion list
config.resolver.blockList = [
    ...Array.from(config.resolver.blockList || []),
    /.*\/app\/api\/.*/,
];

module.exports = config;
