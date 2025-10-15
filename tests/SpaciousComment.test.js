/**
 * @jest-environment jsdom
 */

// Mock dependencies
jest.mock('../src/Comment', () => {
  const mockComment = class MockComment {
    static prototypes = {
      get: jest.fn((key) => {
        const mockElements = {
          underlay: document.createElement('div'),
          overlay: (() => {
            const overlay = document.createElement('div');
            const line = document.createElement('div');
            const marker = document.createElement('div');
            overlay.append(line, marker);
            return overlay;
          })(),
        };
        return mockElements[key]?.cloneNode(true);
      }),
      add: jest.fn(),
    };

    static initPrototypes() {
      // Mock parent initPrototypes
    }

    static createUserInfoCardButton() {
      const button = document.createElement('button');
      button.className = 'cd-comment-userInfoCardButton';
      return button;
    }

    constructor() {
      this.timestampElement = document.createElement('time');
      this.timestampElement.textContent = '12:34, 1 January 2024';
      this.timestampElement.title = 'Full timestamp';
      this.author = {
        name: 'TestUser',
        getNamespaceAlias: () => 'User',
      };
    }
  };

  return { default: mockComment };
});

jest.mock('../src/cd', () => ({
  s: jest.fn((key) => `mocked-${key}`),
  mws: jest.fn((key) => `mocked-${key}`),
  sParse: jest.fn((key) => `parsed-${key}`),
}));

jest.mock('../src/settings', () => ({
  get: jest.fn((key) => key === 'showContribsLink'),
}));

jest.mock('../src/utils-window', () => ({
  createSvg: jest.fn((width, height, viewBoxWidth, viewBoxHeight) => ({
    html: jest.fn((content) => [document.createElement('svg')]),
  })),
}));

// Mock global mw
global.mw = {
  util: {
    getUrl: jest.fn((title) => `/wiki/${title}`),
  },
};

// Mock jQuery
global.$ = jest.fn((element) => ({
  element,
}));

import SpaciousComment from '../src/SpaciousComment';

describe('SpaciousComment', () => {
  let comment;

  beforeEach(() => {
    jest.clearAllMocks();
    comment = new SpaciousComment();
  });

  describe('constructor', () => {
    it('should inherit from Comment', () => {
      const Comment = require('../src/Comment').default;
      expect(comment).toBeInstanceOf(Comment);
    });

    it('should initialize with undefined header elements', () => {
      expect(comment.headerElement).toBeUndefined();
      expect(comment.authorElement).toBeUndefined();
      expect(comment.dateElement).toBeUndefined();
      expect(comment.$header).toBeUndefined();
      expect(comment.$menu).toBeUndefined();
    });
  });

  describe('formatHeader', () => {
    beforeEach(() => {
      // Mock the prototype to return a header element with required structure
      const Comment = require('../src/Comment').default;
      Comment.prototypes.get.mockImplementation((key) => {
        if (key === 'headerWrapperElement') {
          const headerWrapper = document.createElement('div');
          headerWrapper.className = 'cd-comment-header-wrapper';

          const header = document.createElement('div');
          header.className = 'cd-comment-header';

          const authorElement = document.createElement('a');
          authorElement.className = 'cd-comment-author';

          const dateElement = document.createElement('time');
          dateElement.className = 'cd-comment-timestamp';

          header.append(authorElement, dateElement);
          headerWrapper.append(header);

          return headerWrapper;
        }
        return document.createElement('div');
      });
    });

    it('should create header element from prototype on first call', () => {
      const Comment = require('../src/Comment').default;

      comment.formatHeader();

      expect(Comment.prototypes.get).toHaveBeenCalledWith('headerWrapperElement');
      expect(comment.headerElement).toBeInstanceOf(HTMLElement);
      expect(comment.$header).toBeDefined();
    });

    it('should find and set author and date elements', () => {
      comment.formatHeader();

      expect(comment.authorElement).toBeInstanceOf(HTMLElement);
      expect(comment.dateElement).toBeInstanceOf(HTMLElement);
      expect(comment.authorElement.className).toBe('cd-comment-author');
      expect(comment.dateElement.className).toBe('cd-comment-timestamp');
    });

    it('should update author information', () => {
      comment.formatHeader();

      expect(comment.authorElement.textContent).toBe('TestUser');
      expect(comment.authorElement.href).toBe('/wiki/User:TestUser');
    });

    it('should update timestamp information', () => {
      comment.formatHeader();

      expect(comment.dateElement.textContent).toBe('12:34, 1 January 2024');
      expect(comment.dateElement.title).toBe('Full timestamp');
    });

    it('should not recreate header element on subsequent calls', () => {
      const Comment = require('../src/Comment').default;

      comment.formatHeader();
      const firstHeaderElement = comment.headerElement;

      Comment.prototypes.get.mockClear();
      comment.formatHeader();

      expect(Comment.prototypes.get).not.toHaveBeenCalled();
      expect(comment.headerElement).toBe(firstHeaderElement);
    });

    it('should handle missing author element gracefully', () => {
      const Comment = require('../src/Comment').default;
      Comment.prototypes.get.mockReturnValue(document.createElement('div'));

      expect(() => comment.formatHeader()).not.toThrow();
      expect(comment.authorElement).toBeUndefined();
    });

    it('should handle missing date element gracefully', () => {
      const Comment = require('../src/Comment').default;
      Comment.prototypes.get.mockReturnValue(document.createElement('div'));

      expect(() => comment.formatHeader()).not.toThrow();
      expect(comment.dateElement).toBeUndefined();
    });
  });

  describe('initPrototypes', () => {
    beforeEach(() => {
      // Reset the prototypes mock
      SpaciousComment.prototypes = {
        get: jest.fn(),
        add: jest.fn(),
      };
    });

    it('should call parent initPrototypes', () => {
      const Comment = require('../src/Comment').default;
      const parentInitSpy = jest.spyOn(Comment, 'initPrototypes');

      SpaciousComment.initPrototypes();

      expect(parentInitSpy).toHaveBeenCalled();
    });

    it('should create header wrapper element prototype', () => {
      SpaciousComment.initPrototypes();

      expect(SpaciousComment.prototypes.add).toHaveBeenCalledWith(
        'headerWrapperElement',
        expect.any(HTMLElement)
      );
    });

    it('should create SVG icon prototypes', () => {
      SpaciousComment.initPrototypes();

      expect(SpaciousComment.prototypes.add).toHaveBeenCalledWith(
        'goToParentButtonSvg',
        expect.any(HTMLElement)
      );
      expect(SpaciousComment.prototypes.add).toHaveBeenCalledWith(
        'goToChildButtonSvg',
        expect.any(HTMLElement)
      );
      expect(SpaciousComment.prototypes.add).toHaveBeenCalledWith(
        'collapseChildThreadsButtonSvg',
        expect.any(HTMLElement)
      );
      expect(SpaciousComment.prototypes.add).toHaveBeenCalledWith(
        'expandChildThreadsButtonSvg',
        expect.any(HTMLElement)
      );
    });

    it('should create header with proper structure', () => {
      SpaciousComment.initPrototypes();

      const headerWrapperCall = SpaciousComment.prototypes.add.mock.calls.find(
        call => call[0] === 'headerWrapperElement'
      );
      const headerWrapper = headerWrapperCall[1];

      expect(headerWrapper.className).toBe('cd-comment-header-wrapper');

      const header = headerWrapper.querySelector('.cd-comment-header');
      expect(header).toBeInstanceOf(HTMLElement);

      const authorWrapper = header.querySelector('.cd-comment-author-wrapper');
      expect(authorWrapper).toBeInstanceOf(HTMLElement);

      const authorLink = header.querySelector('.cd-comment-author');
      expect(authorLink).toBeInstanceOf(HTMLElement);
      expect(authorLink.tagName).toBe('A');
    });

    it('should include user info card button in header', () => {
      const Comment = require('../src/Comment').default;
      const createUserInfoSpy = jest.spyOn(Comment, 'createUserInfoCardButton');

      SpaciousComment.initPrototypes();

      expect(createUserInfoSpy).toHaveBeenCalled();
    });

    it('should include contribs link when setting is enabled', () => {
      const settings = require('../src/settings');
      settings.get.mockReturnValue(true);

      SpaciousComment.initPrototypes();

      const headerWrapperCall = SpaciousComment.prototypes.add.mock.calls.find(
        call => call[0] === 'headerWrapperElement'
      );
      const headerWrapper = headerWrapperCall[1];

      const authorLinksWrapper = headerWrapper.querySelector('.cd-comment-author-links');
      expect(authorLinksWrapper).toBeInstanceOf(HTMLElement);
      expect(authorLinksWrapper.textContent).toContain('mocked-comment-author-contribs');
    });

    it('should not include contribs link when setting is disabled', () => {
      const settings = require('../src/settings');
      settings.get.mockReturnValue(false);

      SpaciousComment.initPrototypes();

      const headerWrapperCall = SpaciousComment.prototypes.add.mock.calls.find(
        call => call[0] === 'headerWrapperElement'
      );
      const headerWrapper = headerWrapperCall[1];

      const authorLinksWrapper = headerWrapper.querySelector('.cd-comment-author-links');
      expect(authorLinksWrapper.textContent).not.toContain('mocked-comment-author-contribs');
    });

    it('should create SVG icons with correct dimensions', () => {
      const { createSvg } = require('../src/utils-window');

      SpaciousComment.initPrototypes();

      expect(createSvg).toHaveBeenCalledWith(16, 16, 20, 20);
      expect(createSvg).toHaveBeenCalledTimes(4); // 4 different SVG icons
    });
  });
});