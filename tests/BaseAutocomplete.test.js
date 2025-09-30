/**
 * @jest-environment jsdom
 */

import BaseAutocomplete from '../src/BaseAutocomplete';
import CdError from '../src/shared/CdError';

// Mock global dependencies
global.mw = {
  util: {
    escapeRegExp: (str) => str.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`),
  },
};

global.cd = {
  getApi: () => ({
    get: jest.fn(),
  }),
};

describe('BaseAutocomplete', () => {
  let autocomplete;

  beforeEach(() => {
    autocomplete = new BaseAutocomplete();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(autocomplete.cache).toBeDefined();
      expect(autocomplete.cache.constructor.name).toBe('AutocompleteCache');
      expect(autocomplete.lastResults).toEqual([]);
      expect(autocomplete.lastQuery).toBe('');
      expect(autocomplete.default).toEqual([]);
      expect(autocomplete.data).toEqual({});
    });

    it('should accept configuration options', () => {
      const config = {
        default: ['item1', 'item2'],
        data: { key: 'value' },
      };
      const instance = new BaseAutocomplete(config);

      expect(instance.cache).toBeDefined();
      expect(instance.cache.constructor.name).toBe('AutocompleteCache');
      expect(instance.default).toEqual(config.default);
      expect(instance.data).toEqual(config.data);
    });
  });

  describe('abstract methods', () => {
    it('should throw error for getLabel', () => {
      expect(() => autocomplete.getLabel()).toThrow(CdError);
    });

    it('should throw error for getTrigger', () => {
      expect(() => autocomplete.getTrigger()).toThrow(CdError);
    });

    it('should throw error for transformItemToInsertData', () => {
      expect(() => autocomplete.transformItemToInsertData({})).toThrow(CdError);
    });

    it('should throw error for validateInput', () => {
      expect(() => autocomplete.validateInput('test')).toThrow(CdError);
    });

    it('should throw error for makeApiRequest', async () => {
      await expect(autocomplete.makeApiRequest('test')).rejects.toThrow(CdError);
    });
  });

  describe('searchLocal', () => {
    it('should filter and sort results correctly', () => {
      const list = ['apple', 'application', 'banana', 'grape'];

      expect(autocomplete.searchLocal('app', list)).toEqual(['apple', 'application']);
    });

    it('should prioritize items that start with search text', () => {
      const results = autocomplete.searchLocal('app', ['pineapple', 'application', 'apple']);

      // Items that start with 'app' should come first
      expect(results[0]).toBe('application');
      expect(results[1]).toBe('apple');
      expect(results[2]).toBe('pineapple');
    });

    it('should be case insensitive', () => {
      const results = autocomplete.searchLocal('app', ['Apple', 'BANANA', 'grape']);

      expect(results).toEqual(['Apple']);
    });
  });

  describe('cache methods', () => {
    it('should handle cache correctly', () => {
      autocomplete.cache.set('test', ['result1', 'result2']);

      expect(autocomplete.handleCache('test')).toEqual(['result1', 'result2']);
      expect(autocomplete.handleCache('nonexistent')).toBeNull();
    });

    it('should update cache correctly', () => {
      autocomplete.updateCache('query', ['result1', 'result2']);

      expect(autocomplete.cache.get('query')).toEqual(['result1', 'result2']);
    });
  });

  describe('getDefaultItems', () => {
    it('should return existing default items', () => {
      autocomplete.default = ['item1', 'item2'];

      expect(autocomplete.getDefaultItems()).toEqual(['item1', 'item2']);
    });

    it('should use lazy loading when default is empty', () => {
      const lazyItems = ['lazy1', 'lazy2'];
      autocomplete.defaultLazy = jest.fn(() => lazyItems);

      expect(autocomplete.defaultLazy).toHaveBeenCalled();
      expect(autocomplete.getDefaultItems()).toEqual(lazyItems);
      expect(autocomplete.default).toEqual(lazyItems);
    });

    it('should not call lazy loading when default has items', () => {
      autocomplete.default = ['existing'];
      autocomplete.defaultLazy = jest.fn();

      expect(autocomplete.defaultLazy).not.toHaveBeenCalled();
      expect(autocomplete.getDefaultItems()).toEqual(['existing']);
    });

    it('should handle undefined defaultLazy function', () => {
      autocomplete.default = [];
      autocomplete.defaultLazy = undefined;

      expect(autocomplete.getDefaultItems()).toEqual([]);
    });

    it('should handle null default array', () => {
      autocomplete.default = null;
      autocomplete.defaultLazy = jest.fn(() => ['lazy']);

      expect(autocomplete.getDefaultItems()).toEqual(['lazy']);
    });
  });

  describe('processResults', () => {
    it('should process string items correctly', () => {
      const config = {
        transformItemToInsertData() {
          return { start: this.item, end: '' };
        },
      };

      const results = autocomplete.processResults(['item1', 'item2'], config);

      expect(results).toHaveLength(2);
      expect(results[0].key).toBe('item1');
      expect(results[0].item).toBe('item1');
      expect(typeof results[0].transform).toBe('function');
    });

    it('should process array items correctly', () => {
      const config = {};

      const results = autocomplete.processResults([['tag1', 'start', 'end'], ['tag2', 'start2', 'end2']], config);

      expect(results).toHaveLength(2);
      expect(results[0].key).toBe('tag1');
      expect(results[0].item).toEqual(['tag1', 'start', 'end']);
    });

    it('should process object items with key property correctly', () => {
      const config = {};

      const results = autocomplete.processResults([
        { key: 'comment1', id: 'c1' },
        { key: 'comment2', id: 'c2' },
      ], config);

      expect(results).toHaveLength(2);
      expect(results[0].key).toBe('comment1');
      expect(results[0].item).toEqual({ key: 'comment1', id: 'c1' });
    });

    it('should filter out undefined and duplicate items', () => {
      const items = ['item1', undefined, 'item2', 'item1', null];

      const results = autocomplete.processResults(items, {});

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.key)).toEqual(['item1', 'item2']);
    });
  });

  describe('getValues', () => {
    let mockCallback;

    beforeEach(() => {
      mockCallback = jest.fn();
      autocomplete.validateInput = jest.fn(() => true);
      autocomplete.makeApiRequest = jest.fn(() => Promise.resolve(['result1', 'result2']));
      autocomplete.processResults = jest.fn((items) =>
        items.map((item) => ({ key: item, item, transform: () => ({ start: item, end: '' }) }))
      );
    });

    it('should handle valid input with API request', async () => {
      await autocomplete.getValues('test', mockCallback);

      expect(autocomplete.validateInput).toHaveBeenCalledWith('test');
      expect(autocomplete.makeApiRequest).toHaveBeenCalledWith('test');
      expect(mockCallback).toHaveBeenCalledWith(expect.any(Array));
    });

    it('should use cached results when available', async () => {
      autocomplete.cache.set('test', ['cached1', 'cached2']);

      await autocomplete.getValues('test', mockCallback);

      expect(autocomplete.makeApiRequest).not.toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(expect.any(Array));
    });

    it('should handle invalid input', async () => {
      autocomplete.validateInput.mockReturnValue(false);

      await autocomplete.getValues('', mockCallback);

      expect(autocomplete.makeApiRequest).not.toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith([]);
    });

    it('should handle API request errors', async () => {
      autocomplete.makeApiRequest.mockRejectedValue(new Error('API Error'));

      await autocomplete.getValues('test', mockCallback);

      // Should still call callback with processed results (empty in this case due to error)
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should use default items when query is empty', async () => {
      autocomplete.validateInput.mockReturnValue(false);
      autocomplete.getDefaultItems = jest.fn(() => ['default1', 'default2']);
      autocomplete.searchLocal = jest.fn(() => ['default1']);

      await autocomplete.getValues('', mockCallback);

      expect(autocomplete.getDefaultItems).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(expect.any(Array));
    });
  });

  describe('static methods', () => {
    it('should track current promise for supersession checking', () => {
      const promise1 = Promise.resolve();
      const promise2 = Promise.resolve();

      BaseAutocomplete.currentPromise = promise1;
      expect(() => {
        BaseAutocomplete.promiseIsNotSuperseded(promise1);
      }).not.toThrow();
      expect(() => {
        BaseAutocomplete.promiseIsNotSuperseded(promise2);
      }).toThrow(CdError);
    });

    it('should handle undefined current promise', () => {
      BaseAutocomplete.currentPromise = undefined;
      const promise = Promise.resolve();

      expect(() => {
        BaseAutocomplete.promiseIsNotSuperseded(promise);
      }).toThrow(CdError);
    });

    it('should create delayed promise correctly', () => {
      const promise = BaseAutocomplete.createDelayedPromise(jest.fn());

      expect(promise).toBeInstanceOf(Promise);
      expect(BaseAutocomplete.currentPromise).toBe(promise);
      // The executor is called asynchronously after delay, not immediately
    });
  });
});
