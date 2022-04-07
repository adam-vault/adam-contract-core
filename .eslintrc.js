module.exports = {
  env: {
    browser: false,
    es2021: true,
    mocha: true,
    node: true,
  },
  extends: [
    'standard',
    // 'plugin:prettier/recommended',
    'plugin:node/recommended',
  ],
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    'comma-dangle': [2, 'always-multiline'],
    semi: [2, 'always'],
    'no-unused-expressions': [0],
  },
  overrides: [
    {
      files: ['hardhat.config.js', 'tasks/*.js'],
      globals: { task: true },
    },
  ],
};
