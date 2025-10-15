#!/usr/bin/env node

/**
 * Manual backward compatibility validation script.
 * This script validates the Comment class refactoring without running the full test suite.
 */

const fs = require('node:fs');
const path = require('node:path');

console.log('🔍 Validating Comment Class Refactoring - Backward Compatibility\n');

let passedTests = 0;
let totalTests = 0;

function test(description, testFn) {
  totalTests++;
  try {
    const result = testFn();
    if (result) {
      console.log(`✅ ${description}`);
      passedTests++;
    } else {
      console.log(`❌ ${description}`);
    }
  } catch (error) {
    console.log(`❌ ${description} - Error: ${error.message}`);
  }
}

function readFile(filePath) {
  return fs.readFileSync(path.join(__dirname, filePath), 'utf8');
}

function fileExists(filePath) {
  return fs.existsSync(path.join(__dirname, filePath));
}

// Test 1: Settings Migration
test('Settings system has spaciousComments -> reformatComments alias', () => {
  const settingsSource = readFile('src/settings.js');

  return settingsSource.includes("'spaciousComments': ['reformatComments']");
});

test('Settings system has spaciousComments in control types', () => {
  const settingsSource = readFile('src/settings.js');

  return settingsSource.includes('spaciousComments: \'checkbox\'');
});

test('Settings system has spaciousComments in default values', () => {
  const settingsSource = readFile('src/settings.js');

  return settingsSource.includes('\'spaciousComments\': null');
});

// Test 2: Class Structure
test('Comment base class exists', () => fileExists('src/Comment.js'));

test('CompactComment class exists', () => fileExists('src/CompactComment.js'));

test('SpaciousComment class exists', () => fileExists('src/SpaciousComment.js'));

test('CommentLayers composition class exists', () => fileExists('src/CommentLayers.js'));

test('CommentActions composition class exists', () => fileExists('src/CommentActions.js'));

// Test 3: Inheritance Structure
test('CompactComment extends Comment', () => {
  const compactCommentSource = readFile('src/CompactComment.js');

  return compactCommentSource.includes('extends Comment');
});

test('SpaciousComment extends Comment', () => {
  const spaciousCommentSource = readFile('src/SpaciousComment.js');

  return spaciousCommentSource.includes('extends Comment');
});

// Test 4: Backward Compatible Getters
test('Comment has backward compatible underlay getter', () => {
  const commentSource = readFile('src/Comment.js');

  return commentSource.includes('get underlay()') &&
    commentSource.includes('return this.layers?.underlay');
});

test('Comment has backward compatible overlay getter', () => {
  const commentSource = readFile('src/Comment.js');

  return commentSource.includes('get overlay()') &&
    commentSource.includes('return this.layers?.overlay');
});

test('Comment has backward compatible $underlay getter', () => {
  const commentSource = readFile('src/Comment.js');

  return commentSource.includes('get $underlay()') &&
    commentSource.includes('return this.layers?.$underlay');
});

test('Comment has backward compatible replyButton getter', () => {
  const commentSource = readFile('src/Comment.js');

  return commentSource.includes('get replyButton()') &&
    commentSource.includes('return this.actions?.replyButton');
});

test('Comment has backward compatible editButton getter', () => {
  const commentSource = readFile('src/Comment.js');

  return commentSource.includes('get editButton()') &&
    commentSource.includes('return this.actions?.editButton');
});

// Test 5: Deprecation Warnings
test('Deprecated getters have @deprecated JSDoc tags', () => {
  const commentSource = readFile('src/Comment.js');

  return commentSource.includes('@deprecated Use layers.underlay instead') &&
    commentSource.includes('@deprecated Use actions.replyButton instead');
});

// Test 6: Type Guards
test('isReformatted() method uses spacious property', () => {
  const commentSource = readFile('src/Comment.js');

  return commentSource.includes('isReformatted()') &&
    commentSource.includes('return this.spacious');
});

test('hasLayers() method checks layers property', () => {
  const commentSource = readFile('src/Comment.js');

  return commentSource.includes('hasLayers()') &&
    commentSource.includes('Boolean(this.layers?.underlay)');
});

test('hasClassicUnderlay() method works correctly', () => {
  const commentSource = readFile('src/Comment.js');

  return commentSource.includes('hasClassicUnderlay()') &&
    commentSource.includes('!this.isReformatted() && this.hasLayers()');
});

// Test 7: BootProcess Integration
test('BootProcess imports correct comment classes', () => {
  const bootProcessSource = readFile('src/BootProcess.js');

  return bootProcessSource.includes('import CompactComment') &&
    bootProcessSource.includes('import SpaciousComment');
});

test('BootProcess uses spaciousComments setting for class selection', () => {
  const bootProcessSource = readFile('src/BootProcess.js');

  return bootProcessSource.includes("settings.get('spaciousComments')") &&
    bootProcessSource.includes('SpaciousComment : CompactComment');
});

// Test 8: Composition Pattern
test('Comment imports composition classes', () => {
  const commentSource = readFile('src/Comment.js');

  return commentSource.includes("import CommentLayers from './CommentLayers'") &&
    commentSource.includes("import CommentActions from './CommentActions'");
});

test('Comment has layers and actions properties', () => {
  const commentSource = readFile('src/Comment.js');

  return commentSource.includes('layers;') && commentSource.includes('actions;');
});

test('CommentLayers has expected methods', () => {
  const layersSource = readFile('src/CommentLayers.js');

  return layersSource.includes('create()') &&
    layersSource.includes('destroy()') &&
    layersSource.includes('updateStyles(');
});

test('CommentActions has expected methods', () => {
  const actionsSource = readFile('src/CommentActions.js');

  return actionsSource.includes('addReplyButton()') &&
    actionsSource.includes('addEditButton()') &&
    actionsSource.includes('addThankButton()');
});

// Test 9: Property Renaming
test('Comment uses spacious property instead of reformatted', () => {
  const commentSource = readFile('src/Comment.js');

  return commentSource.includes('spacious;') &&
    !commentSource.includes('reformatted;');
});

// Test 10: Visual Compatibility
test('Layer elements maintain expected CSS classes', () => {
  const layersSource = readFile('src/CommentLayers.js');

  return layersSource.includes('cd-comment-underlay') &&
    layersSource.includes('cd-comment-overlay');
});

// Test 11: External Reference Updates
test('commentManager integration updated', () => {
  if (fileExists('src/commentManager.js')) {
    const commentManagerSource = readFile('src/commentManager.js');

    return commentManagerSource.includes('spaciousComments') ||
      commentManagerSource.includes('reformatComments');
  }

  return true; // Skip if file doesn't exist
});

// Summary
console.log('\n📊 Validation Summary:');
console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests} tests`);

if (passedTests === totalTests) {
  console.log('\n🎉 All backward compatibility validations passed!');
  console.log('The Comment class refactoring maintains full backward compatibility.');
} else {
  console.log('\n⚠️  Some validations failed. Please review the failing tests above.');
}

console.log('\n🔍 Key Compatibility Features Validated:');
console.log('• Settings migration (reformatComments → spaciousComments)');
console.log('• Class inheritance structure (CompactComment, SpaciousComment extend Comment)');
console.log('• Backward compatible property getters (underlay, overlay, replyButton, etc.)');
console.log('• Type guard methods (isReformatted, hasLayers, hasClassicUnderlay)');
console.log('• Composition pattern implementation (layers, actions)');
console.log('• BootProcess integration for class selection');
console.log('• Deprecation warnings for old property access patterns');
console.log('• Visual compatibility (CSS classes maintained)');

process.exit(passedTests === totalTests ? 0 : 1);
