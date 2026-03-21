module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: { '@': './' },
          extensions: [
            '.ios.js', '.ios.ts', '.ios.tsx', '.ios.jsx',
            '.android.js', '.android.ts', '.android.tsx', '.android.jsx',
            '.js', '.ts', '.tsx', '.jsx', '.json'
          ],
        },
      ],
    ],
  };
};
