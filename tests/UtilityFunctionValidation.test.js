/**
 * @jest-environment jsdom
 */

/**
 * Validation tests for utility functions that were refactored from returning null to undefined.
 * These tests verify that the functions now return undefined instead of null and that their
 * behavior remains consistent after the refactoring.
 */

// Mock dependencies
jest.mock('../src/cd', () => ({
  g: {
    popularInlineElements: ['SPAN', 'A', 'B', 'I', 'EM', 'STRONG'],
    popularNotInlineElements: ['DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'],
    contentTimezone: 'UTC',
    contentDigits: null,
    uiDigits: null,
    contentTimestampMatchingGroups: ['Y', 'F', 'j', 'H', 'i'],
    uiTimestampMatchingGroups: ['Y', 'F', 'j', 'H', 'i'],
    parseTimestampContentRegexp: /(\d{4})\s+(\w+)\s+(\d{1,2}),?\s+(\d{2}):(\d{2})/,
    parseTimestampUiRegexp: /(\d{4})\s+(\w+)\s+(\d{1,2}),?\s+(\d{2}):(\d{2})/,
    articlePathRegexp: /^\/wiki\/(.*)$/,
    startsWithScriptTitleRegexp: /^\?title=([^&]*)/,
    serverName: 'en.wikipedia.org',
    msInMin: 60_000,
    letterPattern: 'a-zA-Z',
    noSignatureClasses: ['cd-signature'],
    quoteRegexp: /^(.*?)(<blockquote[^>]*>)(.*?)(<\/blockquote>)(.*)$/gm,
    signCode: '~~~~',
    contentTimestampRegexp: /\d{2}:\d{2}, \d{1,2} \w+ \d{4} \(UTC\)/,
  },
  config: {
    transformSummary: null,
    noSignatureTemplates: [],
    commentAntipatterns: [],
  },
  mws: jest.fn((key) => `mocked-${key}`),
}));

// Mock global dependencies
global.mw = {
  util: {
    escapeRegExp: (str) => str.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`),
  },
  msg: jest.fn((key) => `mocked-${key}`),
};

global.Node = {
  ELEMENT_NODE: 1,
  TEXT_NODE: 3,
  DOCUMENT_POSITION_FOLLOWING: 4,
  DOCUMENT_POSITION_PRECEDING: 2,
};

global.CSS = {
  escape: (str) => str.replace(/[^\w-]/g, String.raw`\$&`),
};

// Import the functions to test
import {
  isInline,
  mergeRegexps,
  getLastArrayElementOrSelf,
  getHeadingLevel,
  genericGetOldestOrNewestByDateProp
} from '../src/shared/utils-general';
import {
  getHigherNodeAndOffsetInSelection,
  getRangeContents,
  isExistentAnchor,
  getLinkedAnchor
} from '../src/utils-window';

describe('Utility Function Validation - utils-general.js', () => {
  describe('isInline', () => {
    it('should return undefined for non-element nodes instead of null', () => {
      const textNode = { nodeType: 3 }; // TEXT_NODE
      const result = isInline(textNode);
      expect(result).toBeUndefined();
      expect(result).not.toBe(null);
    });

    it('should return undefined for null/undefined input instead of null', () => {
      expect(isInline(null)).toBeUndefined();
      expect(isInline(undefined)).toBeUndefined();
    });
  });

  describe('mergeRegexps', () => {
    it('should return undefined for empty array instead of null', () => {
      const result = mergeRegexps([]);
      expect(result).toBeUndefined();
      expect(result).not.toBe(null);
    });

    it('should return undefined for null input instead of null', () => {
      const result = mergeRegexps(null);
      expect(result).toBeUndefined();
      expect(result).not.toBe(null);
    });

    it('should maintain consistent behavior for valid input', () => {
      const regexps = [/test/, /example/];
      const result = mergeRegexps(regexps);
      expect(result).toBeInstanceOf(RegExp);
      expect(result.source).toBe('(test|example)');
    });
  });

  describe('getLastArrayElementOrSelf', () => {
    it('should return undefined for empty array instead of null', () => {
      const result = getLastArrayElementOrSelf([]);
      expect(result).toBeUndefined();
      expect(result).not.toBe(null);
    });

    it('should maintain consistent behavior for non-empty arrays', () => {
      const result = getLastArrayElementOrSelf(['first', 'second', 'last']);
      expect(result).toBe('last');
    });

    it('should maintain consistent behavior for non-array values', () => {
      const result = getLastArrayElementOrSelf('single-value');
      expect(result).toBe('single-value');
    });
  });

  describe('getHeadingLevel', () => {
    it('should return undefined for invalid heading nodes instead of null', () => {
      const invalidNode = { tagName: 'DIV', className: '' };
      const result = getHeadingLevel(invalidNode);
      expect(result).toBeUndefined();
      expect(result).not.toBe(null);
    });

    it('should maintain consistent behavior for valid heading nodes', () => {
      const h2Node = { tagName: 'H2', className: '' };
      const result = getHeadingLevel(h2Node);
      expect(result).toBe(2);
    });

    it('should work with mw-heading class names', () => {
      const headingNode = { tagName: 'DIV', className: 'mw-heading3' };
      const result = getHeadingLevel(headingNode);
      expect(result).toBe(3);
    });
  });

  describe('genericGetOldestOrNewestByDateProp', () => {
    it('should return undefined for empty array instead of null', () => {
      const result = genericGetOldestOrNewestByDateProp([], 'oldest', false);
      expect(result).toBeUndefined();
      expect(result).not.toBe(null);
    });

    it('should maintain consistent behavior for valid input', () => {
      const items = [
        { date: new Date('2023-01-01'), value: 'first' },
        { date: new Date('2023-01-03'), value: 'third' },
        { date: new Date('2023-01-02'), value: 'second' },
      ];

      const oldest = genericGetOldestOrNewestByDateProp(items, 'oldest', false);
      expect(oldest.value).toBe('first');

      const newest = genericGetOldestOrNewestByDateProp(items, 'newest', false);
      expect(newest.value).toBe('third');
    });
  });
});

describe('Utility Function Validation - utils-window.js', () => {
  describe('getHigherNodeAndOffsetInSelection', () => {
    it('should return undefined when selection has no anchor node instead of null', () => {
      const selection = { anchorNode: null };
      const result = getHigherNodeAndOffsetInSelection(selection);
      expect(result).toBeUndefined();
      expect(result).not.toBe(null);
    });

    it('should maintain consistent behavior for valid selections', () => {
      const anchorNode = { compareDocumentPosition: () => Node.DOCUMENT_POSITION_FOLLOWING };
      const focusNode = { compareDocumentPosition: () => Node.DOCUMENT_POSITION_PRECEDING };
      const selection = {
        anchorNode,
        focusNode,
        anchorOffset: 5,
        focusOffset: 10,
      };

      const result = getHigherNodeAndOffsetInSelection(selection);
      expect(result).toEqual({
        higherNode: anchorNode,
        higherOffset: 5,
      });
    });
  });

  describe('getRangeContents', () => {
    beforeEach(() => {
      // Mock DOM methods
      global.document = {
        createElement: jest.fn(() => ({
          compareDocumentPosition: jest.fn(),
          contains: jest.fn(),
          parentElement: null,
        })),
      };
    });

    it('should return undefined for invalid range (end before start) instead of null', () => {
      const start = {
        compareDocumentPosition: () => Node.DOCUMENT_POSITION_PRECEDING,
      };
      const end = {};
      const rootElement = {};

      const result = getRangeContents(start, end, rootElement);
      expect(result).toBeUndefined();
      expect(result).not.toBe(null);
    });

    it('should return undefined when end is null instead of null', () => {
      const start = {};
      const end = null;
      const rootElement = {};

      const result = getRangeContents(start, end, rootElement);
      expect(result).toBeUndefined();
      expect(result).not.toBe(null);
    });
  });

  describe('isExistentAnchor', () => {
    beforeEach(() => {
      // Mock jQuery
      global.$ = jest.fn(() => ({ length: 0 }));
    });

    it('should return undefined for empty anchor instead of null', () => {
      const result = isExistentAnchor('');
      expect(result).toBeUndefined();
      expect(result).not.toBe(null);
    });

    it('should return undefined for null anchor instead of null', () => {
      const result = isExistentAnchor(null);
      expect(result).toBeUndefined();
      expect(result).not.toBe(null);
    });

    it('should maintain consistent behavior for valid anchors', () => {
      global.$ = jest.fn(() => ({ length: 1 }));
      const result = isExistentAnchor('valid-anchor');
      expect(result).toBe(true);
    });
  });

  describe('getLinkedAnchor', () => {
    it('should return undefined for elements without href instead of null', () => {
      const element = {
        getAttribute: () => null,
      };
      const result = getLinkedAnchor(element);
      expect(result).toBeUndefined();
      expect(result).not.toBe(null);
    });

    it('should return undefined for non-anchor hrefs instead of null', () => {
      const element = {
        getAttribute: () => 'http://example.com',
      };
      const result = getLinkedAnchor(element);
      expect(result).toBeUndefined();
      expect(result).not.toBe(null);
    });

    it('should maintain consistent behavior for anchor hrefs', () => {
      const element = {
        getAttribute: () => '#section-name',
      };
      const result = getLinkedAnchor(element);
      expect(result).toBe('section-name');
    });
  });
});

describe('Function Behavior Consistency', () => {
  it('should verify that all tested functions consistently return undefined instead of null', () => {
    // Test a representative sample of functions with invalid inputs
    const testCases = [
      () => isInline(null),
      () => mergeRegexps([]),
      () => getLastArrayElementOrSelf([]),
      () => getHeadingLevel({ tagName: 'DIV', className: '' }),
      () => getHigherNodeAndOffsetInSelection({ anchorNode: null }),
      () => getRangeContents({}, null, {}),
      () => isExistentAnchor(''),
      () => getLinkedAnchor({ getAttribute: () => null }),
    ];

    testCases.forEach((testCase, index) => {
      const result = testCase();
      expect(result).toBeUndefined();
      expect(result).not.toBe(null);
    });
  });

  it('should verify that functions maintain their original behavior for valid inputs', () => {
    // Test that functions still work correctly with valid inputs
    expect(mergeRegexps([/test/])).toBeInstanceOf(RegExp);
    expect(getLastArrayElementOrSelf(['item'])).toBe('item');
    expect(getHeadingLevel({ tagName: 'H1', className: '' })).toBe(1);
    expect(getLinkedAnchor({ getAttribute: () => '#test' })).toBe('test');
  });
});
