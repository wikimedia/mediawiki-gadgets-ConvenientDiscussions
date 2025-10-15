/**
 * @file Utility functions for null-to-undefined refactoring analysis and validation
 */

/**
 * @typedef {Object} FunctionAnalysis
 * @property {string} name Function name
 * @property {string} filePath File path
 * @property {'null' | 'undefined' | 'mixed' | 'other'} returnType Return type classification
 * @property {boolean} hasDirectNullReturn Whether function has direct `return null;` statements
 * @property {boolean} hasApiNullReturn Whether function returns null from native/MW APIs
 * @property {Array<{filePath: string, functionName: string, usageType: 'return' | 'comparison' | 'assignment'}>} callers Function callers
 */

/**
 * @typedef {Object} PropertyAnalysis
 * @property {string} name Property name
 * @property {string} filePath File path
 * @property {string} [className] Class name if property belongs to a class
 * @property {string} currentType Current JSDoc type
 * @property {boolean} hasNullAssignment Whether property is assigned null
 * @property {Array<{filePath: string, lineNumber: number, usageType: 'comparison' | 'assignment' | 'access'}>} usageSites Usage sites
 */

/**
 * @typedef {Object} FileProcessingState
 * @property {string} filePath File path
 * @property {string[]} functionsProcessed List of processed function names
 * @property {string[]} propertiesProcessed List of processed property names
 * @property {number} comparisonsUpdated Number of null comparisons updated
 * @property {boolean} hasErrors Whether file has processing errors
 * @property {string[]} dependentFiles List of files that depend on this file
 */

/**
 * @typedef {Object} NullUsagePattern
 * @property {'return' | 'assignment' | 'comparison' | 'parameter'} type Pattern type
 * @property {string} filePath File path
 * @property {number} lineNumber Line number
 * @property {string} context Code context around the pattern
 * @property {string} functionName Function name (if applicable)
 * @property {string} propertyName Property name (if applicable)
 */

/**
 * Refactoring utilities for null-to-undefined conversion
 */
class RefactoringUtils {
  constructor() {
    /** @type {Map<string, FileProcessingState>} */
    this.fileStates = new Map();

    /** @type {Map<string, FunctionAnalysis>} */
    this.functionAnalyses = new Map();

    /** @type {Map<string, PropertyAnalysis>} */
    this.propertyAnalyses = new Map();

    /** @type {NullUsagePattern[]} */
    this.nullPatterns = [];

    /** @type {string[]} */
    this.exemptFiles = [
      'src/settings.js',
      'src/tribute/',
    ];
  }

  /**
   * Check if a file should be exempted from refactoring
   *
   * @param {string} filePath File path to check
   * @returns {boolean} Whether file is exempt
   */
  isFileExempt(filePath) {
    return this.exemptFiles.some((exempt) => filePath.includes(exempt));
  }

  /**
   * Initialize processing state for a file
   *
   * @param {string} filePath File path
   * @returns {FileProcessingState} Initialized state
   */
  initializeFileState(filePath) {
    const state = {
      filePath,
      functionsProcessed: [],
      propertiesProcessed: [],
      comparisonsUpdated: 0,
      hasErrors: false,
      dependentFiles: [],
    };

    this.fileStates.set(filePath, state);

    return state;
  }

  /**
   * Get processing state for a file
   *
   * @param {string} filePath File path
   * @returns {FileProcessingState | undefined} File state
   */
  getFileState(filePath) {
    return this.fileStates.get(filePath);
  }

  /**
   * Update processing state for a file
   *
   * @param {string} filePath File path
   * @param {Partial<FileProcessingState>} updates State updates
   */
  updateFileState(filePath, updates) {
    const state = this.fileStates.get(filePath);
    if (state) {
      Object.assign(state, updates);
    }
  }

  /**
   * Scan file content for null usage patterns
   *
   * @param {string} filePath File path
   * @param {string} content File content
   * @returns {NullUsagePattern[]} Found null patterns
   */
  scanNullPatterns(filePath, content) {
    if (this.isFileExempt(filePath)) {
      return [];
    }

    const patterns = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();

      // Skip comments and strings
      if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*')) {
        return;
      }

      // Direct null returns
      if (/return\s+null\s*;/.test(line)) {
        patterns.push({
          type: 'return',
          filePath,
          lineNumber,
          context: line.trim(),
          functionName: this.extractFunctionName(lines, index),
          propertyName: '',
        });
      }

      // Null assignments
      if (/=\s*null\s*[;,]/.test(line) && !/===|!==|==|!=/.test(line)) {
        patterns.push({
          type: 'assignment',
          filePath,
          lineNumber,
          context: line.trim(),
          functionName: this.extractFunctionName(lines, index),
          propertyName: this.extractPropertyName(line),
        });
      }

      // Null comparisons
      if (/(===|!==|==|!=)\s*null/.test(line) || /null\s*(===|!==|==|!=)/.test(line)) {
        patterns.push({
          type: 'comparison',
          filePath,
          lineNumber,
          context: line.trim(),
          functionName: this.extractFunctionName(lines, index),
          propertyName: '',
        });
      }

      // Parameter types with null (but not both null and undefined)
      if (/@param\s*\{[^}]*\|\s*null[^}]*\}/.test(line) && !/@param\s*\{[^}]*null[^}]*\|\s*undefined[^}]*\}/.test(line) && !/@param\s*\{[^}]*undefined[^}]*\|\s*null[^}]*\}/.test(line)) {
        patterns.push({
          type: 'parameter',
          filePath,
          lineNumber,
          context: line.trim(),
          functionName: this.extractFunctionName(lines, index),
          propertyName: '',
        });
      }
    });

    this.nullPatterns.push(...patterns);

    return patterns;
  }

  /**
   * Extract function name from surrounding context
   *
   * @param {string[]} lines All file lines
   * @param {number} currentIndex Current line index
   * @returns {string} Function name or empty string
   */
  extractFunctionName(lines, currentIndex) {
    // Look backwards for function declaration
    for (let i = currentIndex; i >= Math.max(0, currentIndex - 10); i--) {
      const line = lines[i].trim();

      // Function declaration
      const funcDeclMatch = line.match(/^function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/);
      if (funcDeclMatch) {
        return funcDeclMatch[1];
      }

      // Method definition (class methods) - look for method name followed by opening paren
      const methodMatch = line.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{/);
      if (methodMatch && !['if', 'for', 'while', 'switch', 'catch'].some((keyword) => line.includes(keyword))) {
        return methodMatch[1];
      }

      // Function expression assignment
      const funcExprMatch = line.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*function/);
      if (funcExprMatch) {
        return funcExprMatch[1];
      }

      // Arrow function assignment
      const arrowMatch = line.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\([^)]*\)\s*=>/);
      if (arrowMatch) {
        return arrowMatch[1];
      }
    }

    return '';
  }

  /**
   * Extract property name from assignment line
   *
   * @param {string} line Code line
   * @returns {string} Property name or empty string
   */
  extractPropertyName(line) {
    // this.property = null
    const thisMatch = line.match(/this\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*null/);
    if (thisMatch) {
      return thisMatch[1];
    }

    // variable = null
    const varMatch = line.match(/([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*null/);
    if (varMatch) {
      return varMatch[1];
    }

    return '';
  }

  /**
   * Analyze function for null usage patterns
   *
   * @param {string} filePath File path
   * @param {string} functionName Function name
   * @param {string} functionContent Function content
   * @returns {FunctionAnalysis} Function analysis
   */
  analyzeFunctionNullUsage(filePath, functionName, functionContent) {
    const analysis = {
      name: functionName,
      filePath,
      returnType: 'other',
      hasDirectNullReturn: /return\s+null\s*;/.test(functionContent),
      hasApiNullReturn: /return\s+[^;]*\.(?:querySelector|getElementById|getAttribute|match)\([^)]*\)\s*;/.test(functionContent),
      callers: [],
    };

    // Determine return type
    if (analysis.hasDirectNullReturn && analysis.hasApiNullReturn) {
      analysis.returnType = 'mixed';
    } else if (analysis.hasDirectNullReturn) {
      analysis.returnType = 'null';
    } else if (/return\s+(?:undefined|void\s+0)\s*;/.test(functionContent)) {
      analysis.returnType = 'undefined';
    }

    this.functionAnalyses.set(`${filePath}:${functionName}`, analysis);

    return analysis;
  }

  /**
   * Analyze property for null usage patterns
   *
   * @param {string} filePath File path
   * @param {string} propertyName Property name
   * @param {string} [className] Class name
   * @param {string} content File content
   * @returns {PropertyAnalysis} Property analysis
   */
  analyzePropertyNullUsage(filePath, propertyName, content, className) {
    const analysis = {
      name: propertyName,
      filePath,
      className,
      currentType: '',
      hasNullAssignment: false,
      usageSites: [],
    };

    // Check for null assignments
    const nullAssignmentRegex = new RegExp(`(?:this\\.)?${propertyName}\\s*=\\s*null`, 'g');
    analysis.hasNullAssignment = nullAssignmentRegex.test(content);

    // Extract JSDoc type - look for @type above property or inline
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes(propertyName)) {
        // Check previous lines for @type comment
        for (let j = Math.max(0, i - 3); j < i; j++) {
          const prevLine = lines[j];
          const typeMatch = prevLine.match(/@type\s*\{([^}]*)\}/);
          if (typeMatch) {
            analysis.currentType = typeMatch[1];
            break;
          }
        }
        // Check same line for inline type
        const inlineTypeMatch = line.match(/\/\*\*\s*@type\s*\{([^}]*)\}\s*\*\//);
        if (inlineTypeMatch) {
          analysis.currentType = inlineTypeMatch[1];
        }
        break;
      }
    }

    // Find usage sites
    lines.forEach((line, index) => {
      if (line.includes(propertyName)) {
        const lineNumber = index + 1;
        let usageType = 'access';

        if (line.includes(`${propertyName} =`) || line.includes(`${propertyName}=`)) {
          usageType = 'assignment';
        } else if (line.includes(`=== null`) || line.includes(`!== null`)) {
          usageType = 'comparison';
        }

        analysis.usageSites.push({
          filePath,
          lineNumber,
          usageType,
        });
      }
    });

    this.propertyAnalyses.set(`${filePath}:${propertyName}`, analysis);

    return analysis;
  }

  /**
   * Get all null patterns found during scanning
   *
   * @returns {NullUsagePattern[]} All null patterns
   */
  getAllNullPatterns() {
    return [...this.nullPatterns];
  }

  /**
   * Get null patterns by type
   *
   * @param {'return' | 'assignment' | 'comparison' | 'parameter'} type Pattern type
   * @returns {NullUsagePattern[]} Filtered patterns
   */
  getNullPatternsByType(type) {
    return this.nullPatterns.filter((pattern) => pattern.type === type);
  }

  /**
   * Get null patterns by file
   *
   * @param {string} filePath File path
   * @returns {NullUsagePattern[]} Patterns in file
   */
  getNullPatternsByFile(filePath) {
    return this.nullPatterns.filter((pattern) => pattern.filePath === filePath);
  }

  /**
   * Generate refactoring summary report
   *
   * @returns {string} Summary report
   */
  generateSummaryReport() {
    const totalPatterns = this.nullPatterns.length;
    const patternsByType = {
      return: this.getNullPatternsByType('return').length,
      assignment: this.getNullPatternsByType('assignment').length,
      comparison: this.getNullPatternsByType('comparison').length,
      parameter: this.getNullPatternsByType('parameter').length,
    };

    const processedFiles = Array.from(this.fileStates.keys()).length;
    const filesWithErrors = Array.from(this.fileStates.values()).filter((state) => state.hasErrors).length;

    return `
Null-to-Undefined Refactoring Summary
=====================================

Total null patterns found: ${totalPatterns}
- Return statements: ${patternsByType.return}
- Assignments: ${patternsByType.assignment}
- Comparisons: ${patternsByType.comparison}
- Parameter types: ${patternsByType.parameter}

Files processed: ${processedFiles}
Files with errors: ${filesWithErrors}

Function analyses: ${this.functionAnalyses.size}
Property analyses: ${this.propertyAnalyses.size}
    `.trim();
  }

  /**
   * Clear all analysis data
   */
  reset() {
    this.fileStates.clear();
    this.functionAnalyses.clear();
    this.propertyAnalyses.clear();
    this.nullPatterns.length = 0;
  }
}

// Export singleton instance
const refactoringUtils = new RefactoringUtils();

export default refactoringUtils;
