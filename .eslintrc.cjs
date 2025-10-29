/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  ignorePatterns: ["**/dist/**", "**/.next/**", "**/node_modules/**"],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  env: {
    es6: true,
    node: true,
    browser: true,
  },
  extends: [
    // Keep minimal to avoid noisy failures initially
    'eslint:recommended',
  ],
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-undef': 'off',
  },
}
