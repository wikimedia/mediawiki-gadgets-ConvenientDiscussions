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
      expect(autocomplete.cache).toEqual({});
      expect(autocomplete.lastResults).toEqual([]);
      expect(autocomplete.lastQuery).toBe('');
      expect(autocomplete.default).toEqual([]);
      expect(autocomplete.data).toEqual({});
    });

    it('should accept configuration options', () => {
      const config = {
        cache: { test: ['result'] },
        default: ['item1', 'item2'],
        data: { key: 'value' },
      };
      const instance = new BaseAutocomplete(config);

      expect(instance.cache).toEqual(config.cache);
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
      const results = autocomplete.searchLocal('app', list);

      expect(results).toEqual(['apple', 'application']);
    });

    it('should prioritize items that start with search text', () => {
      const list = ['pineapple', 'application', 'apple'];
      const results = autocomplete.searchLocal('app', list);

      // Items that start with 'app' should come first
      expect(results[0]).toBe('application');
      expect(results[1]).toBe('apple');
      expect(results[2]).toBe('pineapple');
    });

    it('should be case insensitive', () => {
      const list = ['Apple', 'BANANA', 'grape'];
      const results = autocomplete.searchLocal('app', list);

      expect(results).toEqual(['Apple']);
    });
  });

  describe('cache methods', () => {
    it('should handle cache correctly', () => {
      autocomplete.cache = { test: ['result1', 'result2'] };

      expect(autocomplete.handleCache('test')).toEqual(['result1', 'result2']);
      expect(autocomplete.handleCache('nonexistent')).toBeNull();
    });

    it('should update cache correctly', () => {
      autocomplete.updateCache('query', ['result1', 'result2']);

      expect(autocomplete.cache.query).toEqual(['result1', 'result2']);
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

      const result = autocomplete.getDefaultItems();

      expect(autocomplete.defaultLazy).toHaveBeenCalled();
      expect(result).toEqual(lazyItems);
      expect(autocomplete.default).toEqual(lazyItems);
    });

    it('should not call lazy loading when default has items', () => {
      autocomplete.default = ['existing'];
      autocomplete.defaultLazy = jest.fn();

      const result = autocomplete.getDefaultItems();

      expect(autocomplete.defaultLazy).not.toHaveBeenCalled();
      expect(result).toEqual(['existing']);
    });
  });

  describe('processResults', () => {
    it('should process string items correctly', () => {
      const items = ['item1', 'item2'];
      const config = {
        transformItemToInsertData: function() {
          return { start: this.item, end: '' };
        },
      };

      const results = autocomplete.processResults(items, config);

      expect(results).toHaveLength(2);
      expect(results[0].key).toBe('item1');
      expect(results[0].item).toBe('item1');
      expect(typeof results[0].transform).toBe('function');
    });

    it('should process array items correctly', () => {
      const items = [['tag1', 'start', 'end'], ['tag2', 'start2', 'end2']];
      const config = {};

      const results = autocomplete.processResults(items, config);

      expect(results).toHaveLength(2);
      expect(results[0].key).toBe('tag1');
      expect(results[0].item).toEqual(['tag1', 'start', 'end']);
    });

    it('should process object items with key property correctly', () => {
      const items = [
        { key: 'comment1', id: 'c1' },
        { key: 'comment2', id: 'c2' },
      ];
      const config = {};

      const results = autocomplete.processResults(items, config);

      expect(results).toHaveLength(2);
      expect(results[0].key).toBe('comment1');
      expect(results[0].item).toEqual({ key: 'comment1', id: 'c1' });
    });

    it('should filter out undefined and duplicate items', () => {
      const items = ['item1', undefined, 'item2', 'item1', null];
      const config = {};

      const results = autocomplete.processResults(items, config);

      expect(results).toHaveLength(2);
      expect(results.map(r => r.key)).toEqual(['item1', 'item2']);
    });
  });

  describe('static methods', () => {
    it('should track current promise for supersession checking', () => {
      const promise1 = Promise.resolve();
      const promise2 = Promise.resolve();

      BaseAutocomplete.currentPromise = promise1;
      expect(() => BaseAutocomplete.promiseIsNotSuperseded(promise1)).not.toThrow();
      expect(() => BaseAutocomplete.promiseIsNotSuperseded(promise2)).toThrow(CdError);
    });
  });
});