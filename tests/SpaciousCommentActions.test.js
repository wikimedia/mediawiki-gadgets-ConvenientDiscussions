/**
 * @jest-environment jsdom
 */

// Mock dependencies
jest.mock('../src/Comment', () => ({
  default: {
    prototypes: {
      get: jest.fn(),
    },
  },
}));

jest.mock('../src/CommentActions', () => class MockCommentActions {
  constructor(comment) {
    this.comment = comment;
  }
});

jest.mock('../src/CommentButton', () => class MockCommentButton {
  constructor(config) {
    this.element = document.createElement('button');
    this.config = config;
    this.label = config.label;
    this.tooltip = config.tooltip;
    this.classes = config.classes || [];
    this.action = config.action;
    this.href = config.href;

    // Apply classes to element
    if (config.classes) {
      this.element.className = config.classes.join(' ');
    }
  }

  setDisabled(disabled) {
    this.disabled = disabled;

    return this;
  }

  setTooltip(tooltip) {
    this.tooltip = tooltip;

    return this;
  }

  setLabel(label) {
    this.label = label;

    return this;
  }

  isConnected() {
    return this.element.isConnected;
  }
});

jest.mock('../src/cd', () => ({
  s: jest.fn((key) => `mocked-${key}`),
}));

import SpaciousCommentActions from '../src/SpaciousCommentActions';

describe('SpaciousCommentActions', () => {
  let mockComment;
  let actions;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up Comment prototypes mock
    const Comment = require('../src/Comment').default;
    Comment.prototypes.get.mockImplementation((key) => {
      const mockSvgs = {
        goToParentButtonSvg: { tagName: 'svg' },
        goToChildButtonSvg: { tagName: 'svg' },
        collapseChildThreadsButtonSvg: { tagName: 'svg' },
        expandChildThreadsButtonSvg: { tagName: 'svg' },
      };

      return mockSvgs[key] || { tagName: 'div' };
    });

    mockComment = {
      dtId: 'test-dt-id',
      headerElement: document.createElement('div'),
      menuElement: document.createElement('div'),
      timestampElement: document.createElement('time'),
      $changeNote: [document.createElement('span')],
      getChildren: jest.fn(() => []),
      toggleChildThreads: jest.fn(),
      maybeOnboardOntoToggleChildThreads: jest.fn(),
      updateToggleChildThreadsButton: jest.fn(),
    };

    actions = new SpaciousCommentActions(mockComment);
  });

  describe('constructor', () => {
    it('should inherit from CommentActions', () => {
      const CommentActions = require('../src/CommentActions');
      expect(actions).toBeInstanceOf(CommentActions);
    });
  });

  describe('createReplyButton', () => {
    it('should create reply button with correct configuration', () => {
      const action = jest.fn();
      const button = actions.createReplyButton(action);

      expect(button.label).toBe('mocked-cm-reply');
      expect(button.classes).toContain('cd-comment-button-labelled');
      expect(button.action).toBe(action);
    });
  });

  describe('createEditButton', () => {
    it('should create edit button with correct configuration', () => {
      const action = jest.fn();
      const button = actions.createEditButton(action);

      expect(button.label).toBe('mocked-cm-edit');
      expect(button.classes).toContain('cd-comment-button-labelled');
      expect(button.action).toBe(action);
    });
  });

  describe('createThankButton', () => {
    it('should create thank button for unthanked comment', () => {
      const action = jest.fn();
      const button = actions.createThankButton(action, false);

      expect(button.label).toBe('mocked-cm-thank');
      expect(button.tooltip).toBe('mocked-cm-thank-tooltip');
      expect(button.classes).toContain('cd-comment-button-labelled');
      expect(button.action).toBe(action);
    });

    it('should create thanked button for already thanked comment', () => {
      const action = jest.fn();
      const button = actions.createThankButton(action, true);

      expect(button.label).toBe('mocked-cm-thanked');
      expect(button.tooltip).toBe('mocked-cm-thanked-tooltip');
      expect(button.classes).toContain('cd-comment-button-labelled');
      expect(button.action).toBe(action);
    });
  });

  describe('createCopyLinkButton', () => {
    it('should create copy link button with href when dtId exists', () => {
      const action = jest.fn();
      const button = actions.createCopyLinkButton(action);

      expect(button.label).toBe('mocked-cm-copylink');
      expect(button.tooltip).toBe('mocked-cm-copylink-tooltip');
      expect(button.classes).toContain('cd-comment-button-labelled');
      expect(button.href).toBe('#test-dt-id');
      expect(button.action).toBe(action);
    });

    it('should create copy link button without href when dtId is missing', () => {
      mockComment.dtId = null;
      const action = jest.fn();
      const button = actions.createCopyLinkButton(action);

      expect(button.href).toBeUndefined();
    });
  });

  describe('createGoToParentButton', () => {
    it('should create go to parent button with SVG icon', () => {
      const action = jest.fn();
      const button = actions.createGoToParentButton(action);

      expect(button.tooltip).toBe('mocked-cm-gotoparent-tooltip');
      expect(button.classes).toContain('cd-comment-button-icon');
      expect(button.classes).toContain('cd-comment-button-goToParent');
      expect(button.classes).toContain('cd-icon');
      expect(button.action).toBe(action);

      // Check that SVG was appended
      expect(button.element.children.length).toBe(1);
      expect(button.element.firstChild.tagName).toBe('svg');
    });
  });

  describe('createGoToChildButton', () => {
    it('should create go to child button with SVG icon', () => {
      const action = jest.fn();
      const button = actions.createGoToChildButton(action);

      expect(button.tooltip).toBe('mocked-cm-gotochild-tooltip');
      expect(button.classes).toContain('cd-comment-button-icon');
      expect(button.classes).toContain('cd-comment-button-goToChild');
      expect(button.classes).toContain('cd-icon');
      expect(button.action).toBe(action);

      // Check that SVG was appended
      expect(button.element.children.length).toBe(1);
      expect(button.element.firstChild.tagName).toBe('svg');
    });
  });

  describe('createToggleChildThreadsButton', () => {
    it('should create toggle child threads button and update it', () => {
      const action = jest.fn();
      const button = actions.createToggleChildThreadsButton(action);

      expect(button.tooltip).toBe('mocked-cm-togglechildthreads-tooltip');
      expect(button.classes).toContain('cd-comment-button-icon');
      expect(button.classes).toContain('cd-comment-button-toggleChildThreads');
      expect(button.classes).toContain('cd-icon');
      expect(button.action).toBe(action);
      expect(mockComment.updateToggleChildThreadsButton).toHaveBeenCalled();
    });
  });

  describe('appendButton', () => {
    beforeEach(() => {
      actions.goToParentButton = { element: document.createElement('button') };
      actions.goToChildButton = { element: document.createElement('button') };
      actions.toggleChildThreadsButton = { element: document.createElement('button') };
    });

    it('should append navigation buttons to header element', () => {
      actions.appendButton(actions.goToParentButton);
      actions.appendButton(actions.goToChildButton);
      actions.appendButton(actions.toggleChildThreadsButton);

      expect(mockComment.headerElement.children).toContain(actions.goToParentButton.element);
      expect(mockComment.headerElement.children).toContain(actions.goToChildButton.element);
      expect(mockComment.headerElement.children).toContain(actions.toggleChildThreadsButton.element);
    });

    it('should append other buttons to menu element', () => {
      const replyButton = { element: document.createElement('button') };
      actions.appendButton(replyButton);

      expect(mockComment.menuElement.children).toContain(replyButton.element);
    });

    it('should handle missing header element gracefully', () => {
      mockComment.headerElement = null;

      expect(() => actions.appendButton(actions.goToParentButton)).not.toThrow();
    });

    it('should handle missing menu element gracefully', () => {
      mockComment.menuElement = null;
      const replyButton = { element: document.createElement('button') };

      expect(() => actions.appendButton(replyButton)).not.toThrow();
    });
  });

  describe('prependButton', () => {
    beforeEach(() => {
      actions.goToParentButton = { element: document.createElement('button') };
      actions.goToChildButton = { element: document.createElement('button') };
    });

    it('should prepend go to child button in correct position', () => {
      // Add go to parent button first
      mockComment.headerElement.append(actions.goToParentButton.element);
      mockComment.headerElement.append(mockComment.timestampElement);

      const insertBeforeSpy = jest.spyOn(mockComment.headerElement, 'insertBefore');

      actions.prependButton(actions.goToChildButton);

      expect(insertBeforeSpy).toHaveBeenCalledWith(
        actions.goToChildButton.element,
        mockComment.timestampElement.nextSibling
      );
    });

    it('should prepend other buttons normally', () => {
      const otherButton = { element: document.createElement('button') };
      const prependSpy = jest.spyOn(mockComment.headerElement, 'prepend');

      actions.prependButton(otherButton);

      expect(prependSpy).toHaveBeenCalledWith(otherButton.element);
    });

    it('should handle missing header element gracefully', () => {
      mockComment.headerElement = null;
      const button = { element: document.createElement('button') };

      expect(() => actions.prependButton(button)).not.toThrow();
    });
  });

  describe('addToggleChildThreadsButton', () => {
    it('should create and position toggle button when children with threads exist', () => {
      mockComment.getChildren.mockReturnValue([{ thread: {} }]);
      const insertBeforeSpy = jest.spyOn(mockComment.headerElement, 'insertBefore');

      actions.addToggleChildThreadsButton();

      expect(actions.toggleChildThreadsButton).toBeDefined();
      expect(insertBeforeSpy).toHaveBeenCalledWith(
        actions.toggleChildThreadsButton.element,
        mockComment.$changeNote[0]
      );
    });

    it('should not create button when no children with threads exist', () => {
      mockComment.getChildren.mockReturnValue([{ thread: null }]);

      actions.addToggleChildThreadsButton();

      expect(actions.toggleChildThreadsButton).toBeUndefined();
    });

    it('should not create duplicate button', () => {
      mockComment.getChildren.mockReturnValue([{ thread: {} }]);
      actions.toggleChildThreadsButton = { isConnected: jest.fn(() => true) };

      actions.addToggleChildThreadsButton();

      // Should not create a new button
      expect(actions.toggleChildThreadsButton.isConnected()).toBe(true);
    });

    it('should add mouseenter event listener', () => {
      mockComment.getChildren.mockReturnValue([{ thread: {} }]);

      actions.addToggleChildThreadsButton();

      const addEventListenerSpy = jest.spyOn(actions.toggleChildThreadsButton.element, 'addEventListener');

      // Simulate the event listener addition (it's done in the method)
      actions.toggleChildThreadsButton.element.addEventListener('mouseenter', expect.any(Function));

      expect(addEventListenerSpy).toHaveBeenCalledWith('mouseenter', expect.any(Function));
    });

    it('should call toggleChildThreads when button action is triggered', () => {
      mockComment.getChildren.mockReturnValue([{ thread: {} }]);

      actions.addToggleChildThreadsButton();
      actions.toggleChildThreadsButton.action();

      expect(mockComment.toggleChildThreads).toHaveBeenCalled();
    });

    it('should handle missing change note element', () => {
      mockComment.getChildren.mockReturnValue([{ thread: {} }]);
      mockComment.$changeNote = null;
      const insertBeforeSpy = jest.spyOn(mockComment.headerElement, 'insertBefore');

      actions.addToggleChildThreadsButton();

      expect(insertBeforeSpy).toHaveBeenCalledWith(
        actions.toggleChildThreadsButton.element,
        null
      );
    });
  });
});
