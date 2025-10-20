/**
 * @jest-environment jsdom
 */

// Mock dependencies
jest.mock('../src/Comment', () => {
  const mockComment = class MockComment {
    static prototypes = {
      get: jest.fn((key) => {
        // Use a factory function to avoid accessing document in module factory
        const createElement = () => ({ cloneNode: () => ({}) });

        const mockElements = {
          underlay: createElement(),
          overlay: (() => {
            const overlay = createElement();
            const line = createElement();
            const marker = createElement();
            if (overlay.append) {
              overlay.append(line, marker);
            }

            return overlay;
          })(),
        };

        return mockElements[key]?.cloneNode ? mockElements[key].cloneNode(true) : mockElements[key];
      }),
      add: jest.fn(),
    };

    static initPrototypes() {
      // Mock parent initPrototypes
    }

    static createUserInfoCardButton() {
      return { className: 'cd-comment-userInfoCardButton' };
    }

    constructor() {
      this.timestampElement = {
        textContent: '12:34, 1 January 2024',
        title: 'Full timestamp',
        tagName: 'TIME',
      };
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
    html: jest.fn((content) => [{ tagName: 'svg' }]),
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

  describe('initPrototypes', () => {
    beforeEach(() => {
      // Reset the prototypes mock
      SpaciousComment.prototypes = {
        get: jest.fn(),
        add: jest.fn(),
      };
    });

    it('should call CommentLayers initPrototypes', () => {
      const CommentLayers = require('../src/CommentLayers').default;
      const layersInitSpy = jest.spyOn(CommentLayers, 'initPrototypes');

      SpaciousComment.initPrototypes();

      expect(layersInitSpy).toHaveBeenCalled();
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
        (call) => call[0] === 'headerWrapperElement'
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
        (call) => call[0] === 'headerWrapperElement'
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
        (call) => call[0] === 'headerWrapperElement'
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
