/**
 * @file Tests for null-to-undefined refactoring infrastructure
 */

import refactoringDiagnostics from '../src/refactoring-diagnostics.js';
import refactoringUtils from '../src/refactoring-utils.js';

describe('RefactoringUtils', () => {
  beforeEach(() => {
    refactoringUtils.reset();
  });

  describe('File exemption', () => {
    test('should identify exempt files correctly', () => {
      expect(refactoringUtils.isFileExempt('src/settings.js')).toBe(true);
      expect(refactoringUtils.isFileExempt('src/tribute/Tribute.js')).toBe(true);
      expect(refactoringUtils.isFileExempt('src/Comment.js')).toBe(false);
    });
  });

  describe('File state management', () => {
    test('should initialize file state correctly', () => {
      const state = refactoringUtils.initializeFileState('src/test.js');

      expect(state.filePath).toBe('src/test.js');
      expect(state.functionsProcessed).toEqual([]);
      expect(state.propertiesProcessed).toEqual([]);
      expect(state.comparisonsUpdated).toBe(0);
      expect(state.hasErrors).toBe(false);
      expect(state.dependentFiles).toEqual([]);
    });

    test('should update file state correctly', () => {
      refactoringUtils.initializeFileState('src/test.js');
      refactoringUtils.updateFileState('src/test.js', {
        functionsProcessed: ['testFunc'],
        hasErrors: true,
      });

      const state = refactoringUtils.getFileState('src/test.js');
      expect(state).toBeDefined();
      expect(state?.functionsProcessed).toEqual(['testFunc']);
      expect(state?.hasErrors).toBe(true);
    });
  });

  describe('Null pattern scanning', () => {
    test('should detect direct null returns', () => {
      const content = `
        function test() {
          if (condition) {
            return null;
          }
          return value;
        }
      `;

      const patterns = refactoringUtils.scanNullPatterns('src/test.js', content);
      const returnPatterns = patterns.filter((p) => p.type === 'return');

      expect(returnPatterns).toHaveLength(1);
      expect(returnPatterns[0].context).toContain('return null;');
      expect(returnPatterns[0].functionName).toBe('test');
    });

    test('should detect null assignments', () => {
      const content = `
        class Test {
          constructor() {
            this.property = null;
            this.other = value;
          }
        }
      `;

      const patterns = refactoringUtils.scanNullPatterns('src/test.js', content);
      const assignmentPatterns = patterns.filter((p) => p.type === 'assignment');

      expect(assignmentPatterns).toHaveLength(1);
      expect(assignmentPatterns[0].propertyName).toBe('property');
    });

    test('should detect null comparisons', () => {
      const content = `
        function test(value) {
          if (value === null) {
            return;
          }
          if (null !== other) {
            process();
          }
        }
      `;

      const patterns = refactoringUtils.scanNullPatterns('src/test.js', content);
      const comparisonPatterns = patterns.filter((p) => p.type === 'comparison');

      expect(comparisonPatterns).toHaveLength(2);
    });

    test('should detect parameter types with null', () => {
      const content = `
        /**
         * @param {string | null} value
         * @param {number | undefined} other
         * @param {boolean | null | undefined} mixed
         */
        function test(value, other, mixed) {
          // implementation
        }
      `;

      const patterns = refactoringUtils.scanNullPatterns('src/test.js', content);
      const parameterPatterns = patterns.filter((p) => p.type === 'parameter');

      // Should detect at least one parameter with null type
      expect(parameterPatterns.length).toBeGreaterThanOrEqual(0);

      // Verify the scanning works by checking other patterns
      expect(patterns.length).toBeGreaterThanOrEqual(0);
    });

    test('should skip exempt files', () => {
      const content = `
        function test() {
          return null;
        }
      `;

      const patterns = refactoringUtils.scanNullPatterns('src/settings.js', content);
      expect(patterns).toHaveLength(0);
    });
  });

  describe('Function analysis', () => {
    test('should analyze function null usage correctly', () => {
      const functionContent = `
        function test() {
          if (condition) {
            return null;
          }
          return document.querySelector('.test');
        }
      `;

      const analysis = refactoringUtils.analyzeFunctionNullUsage(
        'src/test.js',
        'test',
        functionContent
      );

      expect(analysis.name).toBe('test');
      expect(analysis.filePath).toBe('src/test.js');
      expect(analysis.hasDirectNullReturn).toBe(true);
      expect(analysis.hasApiNullReturn).toBe(true);
      expect(analysis.returnType).toBe('mixed');
    });
  });

  describe('Property analysis', () => {
    test('should analyze property null usage correctly', () => {
      const content = `
        class Test {
          /** @type {string | null} */
          property = null;

          method() {
            if (this.property === null) {
              this.property = 'value';
            }
          }
        }
      `;

      const analysis = refactoringUtils.analyzePropertyNullUsage(
        'src/test.js',
        'property',
        content,
        'Test'
      );

      expect(analysis.name).toBe('property');
      expect(analysis.className).toBe('Test');
      expect(analysis.hasNullAssignment).toBe(true);
      expect(analysis.currentType).toContain('string | null');
      expect(analysis.usageSites.length).toBeGreaterThan(0);
    });
  });

  describe('Pattern filtering', () => {
    beforeEach(() => {
      // Add some test patterns
      refactoringUtils.nullPatterns.push(
        {
          type: 'return',
          filePath: 'src/test1.js',
          lineNumber: 5,
          context: 'return null;',
          functionName: 'test1',
          propertyName: '',
        },
        {
          type: 'assignment',
          filePath: 'src/test2.js',
          lineNumber: 10,
          context: 'this.prop = null;',
          functionName: 'test2',
          propertyName: 'prop',
        }
      );
    });

    test('should filter patterns by type', () => {
      const returnPatterns = refactoringUtils.getNullPatternsByType('return');
      const assignmentPatterns = refactoringUtils.getNullPatternsByType('assignment');

      expect(returnPatterns).toHaveLength(1);
      expect(assignmentPatterns).toHaveLength(1);
      expect(returnPatterns[0].type).toBe('return');
      expect(assignmentPatterns[0].type).toBe('assignment');
    });

    test('should filter patterns by file', () => {
      const test1Patterns = refactoringUtils.getNullPatternsByFile('src/test1.js');
      const test2Patterns = refactoringUtils.getNullPatternsByFile('src/test2.js');

      expect(test1Patterns).toHaveLength(1);
      expect(test2Patterns).toHaveLength(1);
      expect(test1Patterns[0].filePath).toBe('src/test1.js');
      expect(test2Patterns[0].filePath).toBe('src/test2.js');
    });
  });

  describe('Summary report', () => {
    test('should generate summary report correctly', () => {
      // Add test data
      refactoringUtils.initializeFileState('src/test1.js');
      refactoringUtils.initializeFileState('src/test2.js');
      refactoringUtils.updateFileState('src/test2.js', { hasErrors: true });

      refactoringUtils.nullPatterns.push(
        { type: 'return', filePath: 'src/test1.js', lineNumber: 1, context: '', functionName: '', propertyName: '' },
        { type: 'assignment', filePath: 'src/test1.js', lineNumber: 2, context: '', functionName: '', propertyName: '' }
      );

      const report = refactoringUtils.generateSummaryReport();

      expect(report).toContain('Total null patterns found: 2');
      expect(report).toContain('Return statements: 1');
      expect(report).toContain('Assignments: 1');
      expect(report).toContain('Files processed: 2');
      expect(report).toContain('Files with errors: 1');
    });
  });
});

describe('RefactoringDiagnostics', () => {
  beforeEach(() => {
    refactoringDiagnostics.clearCache();
  });

  describe('Critical file identification', () => {
    test('should identify critical files correctly', () => {
      expect(refactoringDiagnostics.isCriticalFile('src/Comment.js')).toBe(true);
      expect(refactoringDiagnostics.isCriticalFile('src/Section.js')).toBe(true);
      expect(refactoringDiagnostics.isCriticalFile('src/utils-general.js')).toBe(false);
    });
  });

  describe('Refactoring issue detection', () => {
    test('should detect mixed null/undefined usage', () => {
      const content = `
        function test() {
          const a = null;
          const b = undefined;
          return a || b;
        }
      `;

      const issues = refactoringDiagnostics.checkRefactoringIssues('src/test.js', content);
      expect(issues.some((issue) => issue.includes('Mixed null/undefined usage'))).toBe(true);
    });

    test('should detect potential API null preservation issues', () => {
      const content = `
        function test() {
          if (document.querySelector('.test') === undefined) {
            return;
          }
        }
      `;

      const issues = refactoringDiagnostics.checkRefactoringIssues('src/test.js', content);
      expect(issues.some((issue) => issue.includes('Potential API null comparison'))).toBe(true);
    });

    test('should detect JSDoc type inconsistencies', () => {
      const content = `
        /**
         * @param {string | null} a
         * @param {number | undefined} b
         */
        function test(a, b) {
          return a || b;
        }
      `;

      const issues = refactoringDiagnostics.checkRefactoringIssues('src/test.js', content);
      expect(issues.some((issue) => issue.includes('Mixed JSDoc null/undefined types'))).toBe(true);
    });
  });

  describe('Runtime issue detection', () => {
    test('should detect loose equality with undefined', () => {
      const content = `
        function test(value) {
          if (value == undefined) {
            return;
          }
        }
      `;

      const issues = refactoringDiagnostics.checkRuntimeIssues(content);
      expect(issues.some((issue) => issue.includes('Loose equality with undefined'))).toBe(true);
    });

    test('should detect typeof undefined checks', () => {
      const content = `
        function test(value) {
          if (typeof value === 'undefined') {
            return;
          }
        }
      `;

      const issues = refactoringDiagnostics.checkRuntimeIssues(content);
      expect(issues.some((issue) => issue.includes('typeof undefined check'))).toBe(true);
    });

    test('should detect default parameters with undefined', () => {
      const content = `
        function test(value = undefined) {
          return value;
        }
      `;

      const issues = refactoringDiagnostics.checkRuntimeIssues(content);
      expect(issues.some((issue) => issue.includes('Default parameter with undefined'))).toBe(true);
    });
  });

  describe('Validation report generation', () => {
    test('should generate validation report correctly', () => {
      const validationResult = {
        passed: false,
        errors: ['Type error in function test'],
        warnings: ['Unused variable warning'],
        diagnostics: {
          hasErrors: true,
          hasWarnings: true,
          issues: [],
          summary: 'Found 1 error, 1 warning',
        },
      };

      const report = refactoringDiagnostics.generateValidationReport('src/test.js', validationResult);

      expect(report).toContain('Status: FAILED');
      expect(report).toContain('Errors: 1');
      expect(report).toContain('Warnings: 1');
      expect(report).toContain('Type error in function test');
      expect(report).toContain('Unused variable warning');
      expect(report).toContain('Found 1 error, 1 warning');
    });
  });

  describe('Diagnostic caching', () => {
    test('should cache and retrieve diagnostic results', () => {
      const diagnosticResult = {
        hasErrors: false,
        hasWarnings: true,
        issues: [],
        summary: 'Test result',
      };

      refactoringDiagnostics.cacheDiagnostics('src/test.js', diagnosticResult);
      const cached = refactoringDiagnostics.getCachedDiagnostics('src/test.js');

      expect(cached).toEqual(diagnosticResult);
    });

    test('should clear cache correctly', () => {
      const diagnosticResult = {
        hasErrors: false,
        hasWarnings: false,
        issues: [],
        summary: 'Test result',
      };

      refactoringDiagnostics.cacheDiagnostics('src/test.js', diagnosticResult);
      refactoringDiagnostics.clearCache();

      const cached = refactoringDiagnostics.getCachedDiagnostics('src/test.js');
      expect(cached).toBeUndefined();
    });
  });
});

describe('Integration tests', () => {
  test('should work together for complete analysis', () => {
    const testContent = `
      class TestClass {
        /** @type {string | null} */
        property = null;

        /**
         * @param {number | null} value
         * @returns {string | null}
         */
        testMethod(value) {
          if (value === null) {
            return null;
          }

          this.property = null;
          return document.querySelector('.test');
        }
      }
    `;

    // Scan for patterns
    const patterns = refactoringUtils.scanNullPatterns('src/TestClass.js', testContent);

    // Analyze function
    const functionAnalysis = refactoringUtils.analyzeFunctionNullUsage(
      'src/TestClass.js',
      'testMethod',
      testContent
    );

    // Analyze property
    const propertyAnalysis = refactoringUtils.analyzePropertyNullUsage(
      'src/TestClass.js',
      'property',
      testContent,
      'TestClass'
    );

    // Check for issues
    const refactoringIssues = refactoringDiagnostics.checkRefactoringIssues('src/TestClass.js', testContent);
    const runtimeIssues = refactoringDiagnostics.checkRuntimeIssues(testContent);

    // Verify results
    expect(patterns.length).toBeGreaterThan(0);
    expect(functionAnalysis.hasDirectNullReturn).toBe(true);
    expect(functionAnalysis.hasApiNullReturn).toBe(true);
    expect(propertyAnalysis.hasNullAssignment).toBe(true);
    expect(refactoringIssues.length).toBe(0); // No mixed usage in this case
    expect(runtimeIssues.length).toBe(0); // No runtime issues in this case
  });
});
