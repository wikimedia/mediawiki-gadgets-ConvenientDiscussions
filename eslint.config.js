// import babelParser from '@babel/eslint-parser';
import eslint from '@eslint/js';
// import stylistic from '@stylistic/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import jsdocPlugin from 'eslint-plugin-jsdoc';
import noOneTimeVarsPlugin from 'eslint-plugin-no-one-time-vars';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';

const config = tseslint.config(
  // Base configuration for all files
  {
    ignores: ['dist/**', 'misc/**', '*.json5', 'w-he.js'],
  },

  eslintPluginUnicorn.configs['recommended'],

  // stylistic.configs.customize({
  //   semi: true,
  //   arrowParens: true,
  // }),

  // Main configuration
  {
    languageOptions: {
      sourceType: 'module',
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
      ...eslint.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,

      // Handled by TypeScript
      'no-undef': 'off',

      // Modified rules from eslint:recommended
      'no-control-regex': 'off', // We use them for text masking
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-unsafe-optional-chaining': 'off', // Enabled in TypeScript with strictNullChecks

      // Wait until enough browsers support it
      'unicorn/prefer-string-replace-all': 'off',
      'unicorn/prefer-at': 'off',

      // Popular abbreviations like `el` or `i` are simultaneously the ones that don't need to be
      // expanded because they are commonly understood
      'unicorn/prevent-abbreviations': 'off',

      // Not critical/relevant/helpful
      'unicorn/explicit-length-check': 'off',
      'unicorn/filename-case': 'off',
      'unicorn/catch-error-name': 'off',
      'unicorn/no-typeof-undefined': 'off',
      'unicorn/switch-case-braces': 'off',
      'unicorn/prefer-global-this': 'off',
      'unicorn/no-single-promise-in-promise-methods': 'off',

      // .substring() swaps values if start > end
      'unicorn/prefer-string-slice': 'off',

      // Callback references make the code neat, but the concern of the rule is legit
      'unicorn/no-array-callback-reference': 'off',

      // Less readable for me (jwbth)
      'unicorn/prefer-regexp-test': 'off',
      'unicorn/prefer-spread': 'off',
      'unicorn/no-array-for-each': 'off',
      'unicorn/no-array-reduce': 'off',
      'unicorn/no-await-expression-member': 'off',
      'unicorn/no-nested-ternary': 'off',

      'unicorn/consistent-function-scoping': ['error', {
        checkArrowFunctions: false,
      }],
      'unicorn/no-abusive-eslint-disable': 'off',

      // .innerText has legitimate usages.
      'unicorn/prefer-dom-node-text-content': 'off',

      'unicorn/prefer-ternary': 'warn',

      // I never do that, and it gives false positives with any methods named .filter()
      'unicorn/no-array-method-this-argument': 'off',

      'unicorn/no-empty-file': 'warn',
      'unicorn/no-lonely-if': 'warn',

      // Duplicated @typescript-eslint/no-this-alias
      'unicorn/no-this-assignment': 'off',

      // Turn off for now
      'unicorn/no-null': 'off',

      // Confuses OO.EventEmitter for Node's EventEmitter
      'unicorn/prefer-event-target': 'off',

      // The default kills `undefined`s in .reduce() where they are typed
      'unicorn/no-useless-undefined': ['error', {
        checkArguments: false,
      }],

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
        allowedVariableLength: 9_999_999,  // Allow any length
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

  // Environment configs
  {
    files: ['**/*.js'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
      },
    },
  },

  // Configuration for .d.ts files
  {
    files: ['**/*.d.ts'],
    languageOptions: {
      parser: tseslint.parser,
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/array-type': ['error', { default: 'array' }],
      // Disable some rules that are not applicable to declaration files
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'jsdoc/require-jsdoc': 'off',
      'import/order': 'off',
    },
  },

);

export default config;
