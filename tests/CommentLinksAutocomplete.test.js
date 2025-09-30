import CommentLinksAutocomplete from '../src/CommentLinksAutocomplete';

// Mock dependencies
jest.mock('../src/cd', () => ({
  s: jest.fn((key, ...args) => {
    const messages = {
      'cf-autocomplete-commentlinks-label': 'Comment links',
      'cf-autocomplete-commentlinks-text': `$1, $2`,
      'ellipsis': '…',
    };
    let message = messages[key] || key;
    args.forEach((arg, index) => {
      message = message.replace(`$${index + 1}`, arg);
    });

    return message;
  }),
  mws: jest.fn((key) => ({
    'word-separator': ' ',
    'comma-separator': ', ',
    'colon-separator': ': ',
  }[key] || key)),
}));

jest.mock('../src/sectionRegistry', () => ({
  getAll: jest.fn(() => [
    {
      id: 'Test_Section_1',
      headline: 'Test Section 1',
    },
    {
      id: 'Another_Section',
      headline: 'Another Section',
    },
  ]),
}));

jest.mock('../src/shared/utils-general', () => ({
  defined: jest.fn((item) => item !== undefined && item !== null),
  removeDoubleSpaces: jest.fn((text) => text.replace(/\s+/g, ' ')),
  underlinesToSpaces: jest.fn((text) => text.replace(/_/g, ' ')),
  unique: jest.fn((item, index, array) => array.indexOf(item) === index),
}));

// Mock mw global
global.mw = {
  util: {
    escapeRegExp: jest.fn((text) => text.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)),
  },
};

describe('CommentLinksAutocomplete', () => {
  let autocomplete;
  let mockComments;

  beforeEach(() => {
    mockComments = [
      {
        getUrlFragment: () => 'c-User1-20240101120000',
        author: {
          getName: () => 'User1',
        },
        timestamp: '12:00, 1 January 2024',
        getText: () => 'This is a test comment with some content',
      },
      {
        getUrlFragment: () => 'c-User2-20240101130000',
        author: {
          getName: () => 'User2',
        },
        timestamp: '13:00, 1 January 2024',
        getText: () => 'This is a very long comment that should be truncated because it exceeds the maximum length allowed for snippets in the autocomplete',
      },
      {
        getUrlFragment: () => null, // This comment should be filtered out
        author: {
          getName: () => 'User3',
        },
        timestamp: '14:00, 1 January 2024',
        getText: () => 'This comment has no URL fragment',
      },
    ];

    autocomplete = new CommentLinksAutocomplete({
      data: { comments: mockComments },
    });
  });

  describe('getLabel', () => {
    it('should return the correct label', () => {
      expect(autocomplete.getLabel()).toBe('Comment links');
    });
  });

  describe('getTrigger', () => {
    it('should return the correct trigger', () => {
      expect(autocomplete.getTrigger()).toBe('[[#');
    });
  });

  describe('validateInput', () => {
    it('should always return false since comment links do not use API requests', () => {
      expect(autocomplete.validateInput('test')).toBe(false);
      expect(autocomplete.validateInput('')).toBe(false);
      expect(autocomplete.validateInput('any text')).toBe(false);
    });
  });

  describe('makeApiRequest', () => {
    it('should return empty array since no API requests are made', async () => {
      const result = await autocomplete.makeApiRequest('test');
      expect(result).toEqual([]);
    });
  });

  describe('transformItemToInsertData', () => {
    it('should transform comment item correctly', () => {
      const commentItem = {
        key: 'User1, 12:00, 1 January 2024: This is a test comment',
        urlFragment: 'c-User1-20240101120000',
        authorName: 'User1',
        timestamp: '12:00, 1 January 2024',
      };

      expect(autocomplete.transformItemToInsertData(commentItem)).toEqual({
        start: '[[#c-User1-20240101120000|',
        end: ']]',
        content: 'User1, 12:00, 1 January 2024',
      });
    });

    it('should transform section item correctly', () => {
      const result = autocomplete.transformItemToInsertData({
        key: 'Test Section 1',
        urlFragment: 'Test Section 1',
        headline: 'Test Section 1',
      });

      expect(result).toEqual({
        start: '[[#Test Section 1|',
        end: ']]',
        content: 'Test Section 1',
      });
    });
  });

  describe('generateCommentLinksData', () => {
    it('should generate comment and section data correctly', () => {
      const data = autocomplete.generateCommentLinksData();

      // Should have 2 comments (third is filtered out due to no URL fragment) + 2 sections
      expect(data).toHaveLength(4);

      // Check comment items
      expect(data[0]).toEqual({
        key: 'User1, 12:00, 1 January 2024: This is a test comment with some content',
        urlFragment: 'c-User1-20240101120000',
        authorName: 'User1',
        timestamp: '12:00, 1 January 2024',
      });

      // Check that long comment is truncated
      expect(data[1].key).toContain('User2, 13:00, 1 January 2024: This is a very long comment that should be truncated');
      expect(data[1].key).toContain('…');

      // Check section items
      expect(data[2]).toEqual({
        key: 'Test Section 1',
        urlFragment: 'Test Section 1',
        headline: 'Test Section 1',
      });

      expect(data[3]).toEqual({
        key: 'Another Section',
        urlFragment: 'Another Section',
        headline: 'Another Section',
      });
    });

    it('should handle comments without timestamps', () => {
      autocomplete.data.comments = [
        {
          getUrlFragment: () => 'c-User1-20240101120000',
          author: {
            getName: () => 'User1',
          },
          timestamp: null,
          getText: () => 'Comment without timestamp',
        },
      ];

      expect(autocomplete.generateCommentLinksData()[0].key).toBe('User1: Comment without timestamp');
    });

    it('should handle empty comments array', () => {
      autocomplete.data.comments = [];
      const data = autocomplete.generateCommentLinksData();

      // Should only have section items
      expect(data).toHaveLength(2);
      expect(data[0].headline).toBe('Test Section 1');
      expect(data[1].headline).toBe('Another Section');
    });

    it('should handle missing comments data', () => {
      autocomplete.data = {};
      const data = autocomplete.generateCommentLinksData();

      // Should only have section items
      expect(data).toHaveLength(2);
      expect(data[0].headline).toBe('Test Section 1');
      expect(data[1].headline).toBe('Another Section');
    });
  });

  describe('getValues', () => {
    it('should return empty array for invalid input', async () => {
      const callback = jest.fn();

      await autocomplete.getValues('test#invalid', callback);

      expect(callback).toHaveBeenCalledWith([]);
    });

    it('should filter and return matching results', async () => {
      const callback = jest.fn();

      // Mock the default items
      autocomplete.default = [
        {
          key: 'User1, 12:00, 1 January 2024: This is a test comment',
          urlFragment: 'c-User1-20240101120000',
          authorName: 'User1',
          timestamp: '12:00, 1 January 2024',
        },
        {
          key: 'Test Section 1',
          urlFragment: 'Test Section 1',
          headline: 'Test Section 1',
        },
      ];

      await autocomplete.getValues('User1', callback);

      expect(callback).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'User1, 12:00, 1 January 2024: This is a test comment',
            item: expect.objectContaining({
              authorName: 'User1',
            }),
          }),
        ])
      );
    });
  });

  describe('filterCommentLinks', () => {
    it('should return all items when no search text', () => {
      const items = [
        { key: 'Item 1' },
        { key: 'Item 2' },
      ];

      expect(autocomplete.filterCommentLinks('', items)).toEqual(items);
    });

    it('should filter items based on search text', () => {
      const result = autocomplete.filterCommentLinks('User1', [
        { key: 'User1 comment' },
        { key: 'User2 comment' },
        { key: 'Section about User1' },
      ]);

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('User1 comment');
      expect(result[1].key).toBe('Section about User1');
    });

    it('should limit results to 10 items', () => {
      const result = autocomplete.filterCommentLinks('Item', Array.from({ length: 15 }, (_, i) => ({ key: `Item ${i}` })));

      expect(result).toHaveLength(10);
    });
  });
});
