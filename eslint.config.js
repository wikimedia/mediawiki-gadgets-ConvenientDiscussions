// import babelParser from '@babel/eslint-parser';
import importPlugin from 'eslint-plugin-import';
import jsdocPlugin from 'eslint-plugin-jsdoc';
import noOneTimeVarsPlugin from 'eslint-plugin-no-one-time-vars';
import tseslint from 'typescript-eslint';

const config = tseslint.config(
  // Base configuration for all files
  {
    ignores: ['dist/**', 'misc/**', '*.json5', 'w-he.js'],
  },

  // Main configuration
  {
    languageOptions: {
      // ecmaVersion: 2018,
      sourceType: 'module',
      // parser: babelParser,
      // parserOptions: {
      //   requireConfigFile: false,
      // },
      ecmaVersion: 2022,
      parserOptions: { project: true },
      globals: {
        CONFIG_FILE_NAME: 'readonly',
        IS_DEV: 'readonly',
        IS_TEST: 'readonly',
        IS_SINGLE: 'readonly',
        LANG_CODE: 'readonly',

        mw: 'readonly',
        $: 'readonly',
        OO: 'readonly',
        moment: 'readonly',

        convenientDiscussions: 'readonly',
        getInterwikiPrefixForHostname: 'readonly', // en:User:Jack who built the house/getUrlFromInterwikiLink.js
        getInterwikiPrefixForHostnameSync: 'readonly', // en:User:Jack who built the house/getUrlFromInterwikiLink.js
        getUrlFromInterwikiLink: 'readonly', // en:User:Jack who built the house/getUrlFromInterwikiLink.js

        cdOnlyRunByFooterLink: 'readonly',
        cdShowLoadingOverlay: 'readonly',
      },
    },
    plugins: {
      'jsdoc': jsdocPlugin,
      'import': importPlugin,
      'no-one-time-vars': noOneTimeVarsPlugin,
    },
    linterOptions: {
      reportUnusedDisableDirectives: false,
      noInlineConfig: false,
    },
    rules: {
      // Start with recommended rules
      //...eslint.configs.recommended.rules,
      //...tseslint.configs.recommended.rules,

      // Handled by TypeScript
      'no-undef': 'off',

      // Modified rules from eslint:recommended
      'no-control-regex': 'off', // We use them for text masking
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-unsafe-optional-chaining': 'off', // Enabled in TypeScript with strictNullChecks

      // Import plugin rules
      'import/order': [
        'warn',
        {
          'alphabetize': {
            caseInsensitive: false,
            order: 'asc',
          },
          'newlines-between': 'always',
        },
      ],

      // JSDoc plugin rules
      'jsdoc/check-alignment': 'warn',
      'jsdoc/check-param-names': 'warn',
      'jsdoc/check-tag-names': 'warn',
      'jsdoc/check-types': 'warn',
      'jsdoc/implements-on-classes': 'warn',
      'jsdoc/require-jsdoc': [
        'warn',
        {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
            ClassExpression: true,
          },
        },
      ],
      'jsdoc/require-param': 'warn',
      'jsdoc/require-param-name': 'warn',
      'jsdoc/require-param-type': 'warn',
      'jsdoc/require-returns': 'warn',
      'jsdoc/require-returns-check': 'warn',
      'jsdoc/require-returns-type': 'warn',
      'jsdoc/tag-lines': [
        'warn',
        'any',
        {
          startLines: 1,
        },
      ],
      'jsdoc/check-line-alignment': ['warn', 'any', { 'wrapIndent': '  ' }],

      // No one-time vars plugin rules
      'no-one-time-vars/no-one-time-vars': ['warn', {
        allowedVariableLength: 9999999,  // Allow any length
        ignoreObjectDestructuring: true,
        ignoreTemplateLiterals: true,
      }],
    },
  },

  // Overrides for specific files
  {
    files: ['./*', 'src/tribute/**', 'jsdoc/**', '*.test.js'],
    rules: {
      'jsdoc/require-jsdoc': 'off',
      'import/order': 'off',
    },
  },

  // Configuration for JavaScript files with TypeScript-aware JSDoc linting
  {
    files: ['**/*.js'],
    languageOptions: {
      parser: tseslint.parser,
      // parserOptions: {
      //   project: true,
      //   ecmaVersion: 2022,
      //   sourceType: 'module',
      // },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // Enable TypeScript-aware JSDoc type checking
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/await-thenable': 'warn',
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/prefer-as-const': 'warn',
      '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
    },
  },

  // Environment configs
  // {
  //   files: ['**/*.js'],
  //   ...tseslint.configs.disableTypeChecked,
  //   languageOptions: {
  //     globals: {
  //       // Browser globals
  //       window: 'readonly',
  //       document: 'readonly',
  //     },
  //   },
  // },

  // Configuration for .d.ts files
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      // parserOptions: {
      //   project: './tsconfig.json',
      //   tsconfigRootDir: import.meta.dirname,
      // },
    },
    // plugins: {
    //   '@typescript-eslint': tseslint.plugin,
    // },
    // rules: {
    //   ...tseslint.configs.recommended.rules,
    //   '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
    //   // Disable some rules that are not applicable to declaration files
    //   '@typescript-eslint/no-unused-vars': 'off',
    //   'jsdoc/require-jsdoc': 'off',
    //   'import/order': 'off',
    // },
  },
);

export default config;
