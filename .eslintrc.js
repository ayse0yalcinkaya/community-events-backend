module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2023,
    sourceType: 'module',
  },
  extends: [
    '@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  plugins: ['@typescript-eslint', 'import', 'simple-import-sort'],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist/**/*', 'coverage/**/*', 'node_modules/**/*'],
  rules: {
    // NestJS best practices
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/array-type': ['error', { default: 'generic' }],
    '@typescript-eslint/explicit-member-accessibility': [
      'error',
      { accessibility: 'explicit' },
    ],
    '@typescript-eslint/prefer-readonly': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',

    // TypeScript strict rules (aligning with tsconfig.json)
    '@typescript-eslint/strict-boolean-expressions': 'off',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',

    // Disable strict type checking rules to reduce errors
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',

    // No console.log in production
    'no-console': 'error',

    // Import organization (hrsync-backend 8-category pattern)
    // Categories: 1.Libraries 2.DTOs 3.Services 4.Repositories 5.Entities 6.Interfaces 7.Enums 8.Events
    'import/order': [
      'error',
      {
        groups: [
          'builtin', // 1. Node.js built-ins
          'external', // 1. External libraries
          'internal', // 2-8. Internal imports (DTOs, Services, Repos, etc.)
          'parent', // Parent directory
          'sibling', // Same directory
          'index', // Index imports
          'object', // Object imports
          'type', // Type-only imports
        ],
        // Map specific import patterns to 'internal' group
        pathGroups: [
          {
            pattern: '**/dto/**',
            group: 'internal',
            position: 'after',
          },
          {
            pattern: '**/*/*.service.ts',
            group: 'internal',
            position: 'after',
          },
          {
            pattern: '**/*/*.repository.ts',
            group: 'internal',
            position: 'after',
          },
          {
            pattern: '**/*/*.entity.ts',
            group: 'internal',
            position: 'after',
          },
          {
            pattern: '**/*/*.interface.ts',
            group: 'internal',
            position: 'after',
          },
          {
            pattern: '**/*/*.enum.ts',
            group: 'internal',
            position: 'after',
          },
          {
            pattern: '**/*/*.event.ts',
            group: 'internal',
            position: 'after',
          },
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],

    // Unused variables
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],

    // General code quality
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',
  },
};
