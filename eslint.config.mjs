// import babelParser from '@babel/eslint-parser';
import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import jsdocPlugin from 'eslint-plugin-jsdoc';
import noOneTimeVarsPlugin from 'eslint-plugin-no-one-time-vars';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

const config = defineConfig(
  // Base configuration for all files
  {
    ignores: ['dist/**', 'misc/**', '*.json5', 'w-he.js'],
  },

  stylistic.configs.customize({
    semi: true,
    arrowParens: true,
  }),

  eslint.configs.recommended,
  tseslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  eslintPluginUnicorn.configs.recommended,

  // Main configuration
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 2020,
      // parser: '@typescript-eslint/parser',
      // parserOptions: {
      //   requireConfigFile: false,
      // },
      parserOptions: {
        projectService: {
          defaultProject: 'jsconfig.json',
          // allowDefaultProject: ['*.js', '*.mjs'],
        },
        tsconfigRootDir: import.meta.dirname,
        jsDocParsingMode: 'all',
      },
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
      // 'unicorn': eslintPluginUnicorn,
      '@stylistic': stylistic,
      // '@typescript-eslint': tseslint.plugin,
    },
    linterOptions: {
      reportUnusedDisableDirectives: false,
      noInlineConfig: false,
    },
    rules: {
      // ...eslint.configs.recommended.rules,
      // ...eslintPluginUnicorn.configs.recommended.rules,

      'prefer-const': ['warn', {
        destructuring: 'all',
      }],
      'arrow-body-style': ['error', 'as-needed'],
      'prefer-arrow-callback': 'error',
      'one-var': ['error', 'never'],
      'no-promise-executor-return': 'error',
      'no-constructor-return': 'error',
      'default-param-last': 'error',
      'object-shorthand': 'error',
      'no-lonely-if': 'warn',
      'func-style': ['error', 'declaration', {
        allowArrowFunctions: true,
      }],
      'no-new': 'error',
      'func-names': 'error',
      'no-unused-expressions': 'warn',
      'max-params': ['warn', 4],
      'max-lines-per-function': ['warn', {
        max: 100,
        skipBlankLines: true,
        skipComments: true,
      }],
      'max-statements': ['warn', 40],
      'max-classes-per-file': ['error', {
        ignoreExpressions: true,
      }],
      'max-nested-callbacks': ['warn', 5],
      'max-depth': ['warn', 5],
      'no-else-return': 'error',
      'prefer-regex-literals': 'error',
      'eqeqeq': 'error',
      'no-lone-blocks': 'error',
      'prefer-object-spread': 'error',

      // We use these for text masking
      'no-control-regex': 'off',
      'no-constant-condition': ['error', {
        checkLoops: false,
      }],

      // Those are useful in array destructuring
      'no-sparse-arrays': 'off',

      // Overriden by @typescript-eslint/class-methods-use-this
      'class-methods-use-this': 'off',

      // Handled by TypeScript
      'no-undef': 'off',

      // Enabled in TypeScript with strictNullChecks
      'no-unsafe-optional-chaining': 'off',

      // Handled by @typescript-eslint
      'no-unused-vars': 'off',

      // Impractical strict rules
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/restrict-template-expressions': ['error', {
        allowNumber: true,
      }],
      '@typescript-eslint/no-dynamic-delete': 'off',

      // We use inline require() because some global identifiers like OO.ui become available to us
      // only after they are loaded with mw.loader.
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'unicorn/prefer-module': 'off',

      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        args: 'all',
      }],
      '@typescript-eslint/no-misused-promises': ['error', {
        checksConditionals: false,
        checksVoidReturn: false,
      }],

      // I (jwbth) prefer types, but there are some uses for interfaces, e.g. to match @types/ooui
      '@typescript-eslint/consistent-type-definitions': 'off',

      // Used when extending OOUI classes, e.g. to match the style of @types/ooui
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/no-unsafe-declaration-merging': 'off',

      // Many legit uses
      '@typescript-eslint/no-floating-promises': 'off',

      // @typescript-eslint doesn't seem to do type narrowing well anyway
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',

      // Temporarily disable until we make sure this doesn't increase file size or debugging or
      // users (e.g. somebody wants to use an old browser). This is also useful for ternary
      // expressions (e.g. `variable === undefined ? ... : variable`) but they can't be enabled
      // individually.
      '@typescript-eslint/prefer-nullish-coalescing': 'off',

      '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
      '@typescript-eslint/parameter-properties': 'error',
      '@typescript-eslint/no-shadow': 'error',
      // '@typescript-eslint/class-methods-use-this': ['error', {
      //   enforceForClassFields: true,
      //   ignoreOverrideMethods: true,
      // }],
      '@typescript-eslint/no-unnecessary-condition': ['warn', {
        allowConstantLoopConditions: true,
      }],
      '@typescript-eslint/prefer-promise-reject-errors': 'off',

      // We use it only when necessary.
      '@typescript-eslint/no-this-alias': 'off',

      // We have a use for empty classes - see mixInObject()
      '@typescript-eslint/no-extraneous-class': ['error', {
        allowEmpty: true,
      }],

      // We use it for Tribute
      '@typescript-eslint/ban-ts-comment': 'off',

      // {} is neat in conditional types with conditional object props, e.g.
      // `AD extends false ? { date: Date } : {}`
      '@typescript-eslint/no-empty-object-type': 'off',

      // I (jwbth) consider .match() to be more readable simply because chaining with
      // c.h.a.i.n.match() is more readable than backwards reading with .exec(c.h.a.i.n), especially
      // if the chain is multiline.
      '@typescript-eslint/prefer-regexp-exec': 'off',

      // Wait until enough browsers support it
      'unicorn/prefer-string-replace-all': 'off',
      'unicorn/prefer-at': 'off',
      'unicorn/no-array-reverse': 'off',
      'unicorn/prefer-structured-clone': 'off',

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

      // I (jwbth) never do that, and the rule gives false positives with any methods named .filter()
      'unicorn/no-array-method-this-argument': 'off',

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

      // We have files with JSDoc types
      'unicorn/no-empty-file': 'off',

      // We build with an old babel-loader which doesn't support this
      'unicorn/prefer-top-level-await': 'off',

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
      // 'jsdoc/check-alignment': 'warn',
      'jsdoc/check-param-names': 'warn',
      // 'jsdoc/check-tag-names': 'warn',
      // 'jsdoc/check-types': 'warn',
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
      'jsdoc/check-line-alignment': ['warn', 'any', { wrapIndent: '  ' }],

      '@stylistic/no-multi-spaces': ['error', {
        ignoreEOLComments: true,
      }],
      '@stylistic/comma-dangle': ['error', {
        arrays: 'always-multiline',
        objects: 'always-multiline',
        functions: 'only-multiline',
      }],
      '@stylistic/brace-style': ['error', '1tbs'],
      '@stylistic/arrow-parens': 'error',
      '@stylistic/lines-between-class-members': ['error', {
        enforce: [
          {
            blankLine: 'always',
            prev: 'method',
            next: 'method',
          },
        ],
      }],
      '@stylistic/array-bracket-newline': ['error', 'consistent'],
      '@stylistic/array-element-newline': ['error', 'consistent'],
      '@stylistic/object-property-newline': ['error', {
        allowAllPropertiesOnSameLine: true,
      }],
      '@stylistic/object-curly-newline': ['error', {
        consistent: true,
        multiline: true,
      }],
      '@stylistic/max-len': ['error', {
        code: 110,  // Non-rigid 100; it doesn't autofix anyway
        tabWidth: 2,
        ignoreComments: true,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
      }],
      '@stylistic/operator-linebreak': ['error', 'after', {
        overrides: {
          '?': 'before',
          ':': 'before',
        },
      }],
      '@stylistic/newline-per-chained-call': ['error', {
        ignoreChainWithDepth: 3,
      }],
      '@stylistic/padding-line-between-statements': [
        'error',
        // Always require a blank line before any return
        {
          blankLine: 'always',
          prev: '*',
          next: 'return',
        },
      ],

      // Trimmed on save by IDE
      '@stylistic/no-trailing-spaces': 'off',

      '@stylistic/indent': ['warn', 2, {
        SwitchCase: 1,
        offsetTernaryExpressions: true,
      }],

      // Attacks JSDoc comments like `.../** @type {string} */ (smth)`
      '@stylistic/rest-spread-spacing': 'off',

      // No one-time vars plugin rules
      'no-one-time-vars/no-one-time-vars': ['warn', {
        allowedVariableLength: 9_999_999,  // Allow any length
        ignoreObjectDestructuring: true,
        ignoreTemplateLiterals: true,
      }],

      // Slow rules (run `cross-env TIMING=1 eslint --config eslint.config.mjs --fix-dry-run src/`)
      'unicorn/no-unnecessary-polyfills': 'off',
      'jsdoc/check-tag-names': 'off',
      'jsdoc/check-alignment': 'off',
      'jsdoc/check-types': 'off',
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

  {
    files: ['src/shared/**', 'src/worker/**'],
    rules: {
      'unicorn/prefer-query-selector': 'off',
      'unicorn/prefer-dom-node-dataset': 'off',
    },
  },

  // Environment configs
  {
    files: ['**/*.js'],
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
      // Disable some rules that are not applicable to declaration files
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'jsdoc/require-jsdoc': 'off',
      'import/order': 'off',

      '@typescript-eslint/array-type': ['error', { default: 'array' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },
);

export default config;
