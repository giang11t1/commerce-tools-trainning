process.env.ENABLE_NEW_JSX_TRANSFORM = 'true';
module.exports = [
  ...require('@commercetools-frontend/eslint-config-mc-app'),
  {
    files: ['src/*.test.ts'],
    rules: { 'import/extensions': 'off' },
  },
];
