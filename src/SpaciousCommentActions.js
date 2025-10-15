import Comment from './Comment';
import CommentActions from './CommentActions';
import CommentButton from './CommentButton';
import cd from './cd';

/**
 * Actions management for spacious comments with menu-based styling.
 * Spacious comments display action buttons in a structured menu layout.
 */
class SpaciousCommentActions extends CommentActions {
  /**
   * Create a reply button for spacious comments.
   *
   * @override
   * @param {import('./Button').Action} action The action to perform when clicked.
   * @returns {CommentButton} The created button.
   */
  createReplyButton(action) {
    return new CommentButton({
      label: cd.s('cm-reply'),
      classes: ['cd-comment-button-labelled'],
      // flags: ['progressive'],
      action,
    });
  }

  /**
   * Create an edit button for spacious comments.
   *
   * @override
   * @param {import('./Button').Action} action The action to perform when clicked.
   * @returns {CommentButton} The created button.
   */
  createEditButton(action) {
    return new CommentButton({
      label: cd.s('cm-edit'),
      classes: ['cd-comment-button-labelled'],
      action,
    });
  }

  /**
   * Create a thank button for spacious comments.
   *
   * @override
   * @param {import('./Button').Action} action The action to perform when clicked.
   * @param {boolean} isThanked Whether the comment is already thanked.
   * @returns {CommentButton} The created button.
   */
  createThankButton(action, isThanked) {
    return new CommentButton({
      label: cd.s(isThanked ? 'cm-thanked' : 'cm-thank'),
      tooltip: cd.s(isThanked ? 'cm-thanked-tooltip' : 'cm-thank-tooltip'),
      classes: ['cd-comment-button-labelled'],
      action,
    });
  }

  /**
   * Create a copy link button for spacious comments.
   *
   * @override
   * @param {import('./Button').Action} action The action to perform when clicked.
   * @returns {CommentButton} The created button.
   */
  createCopyLinkButton(action) {
    return new CommentButton({
      label: cd.s('cm-copylink'),
      tooltip: cd.s('cm-copylink-tooltip'),
      classes: ['cd-comment-button-labelled'],
      action,
      href: this.comment.dtId && '#' + this.comment.dtId,
    });
  }

  /**
   * Create a "Go to parent" button for spacious comments.
   *
   * @override
   * @param {import('./Button').Action} action The action to perform when clicked.
   * @returns {CommentButton} The created button.
   */
  createGoToParentButton(action) {
    const button = new CommentButton({
      tooltip: cd.s('cm-gotoparent-tooltip'),
      classes: ['cd-comment-button-icon', 'cd-comment-button-goToParent', 'cd-icon'],
      action,
    });

    button.element.append(Comment.prototypes.get('goToParentButtonSvg'));

    return button;
  }

  /**
   * Create a "Go to child" button for spacious comments.
   *
   * @override
   * @param {import('./Button').Action} action The action to perform when clicked.
   * @returns {CommentButton} The created button.
   */
  createGoToChildButton(action) {
    const button = new CommentButton({
      tooltip: cd.s('cm-gotochild-tooltip'),
      classes: ['cd-comment-button-icon', 'cd-comment-button-goToChild', 'cd-icon'],
      action,
    });

    button.element.append(Comment.prototypes.get('goToChildButtonSvg'));

    return button;
  }

  /**
   * Create a "Toggle child threads" button for spacious comments.
   *
   * @override
   * @param {import('./Button').Action} action The action to perform when clicked.
   * @returns {CommentButton} The created button.
   */
  createToggleChildThreadsButton(action) {
    const button = new CommentButton({
      tooltip: cd.s('cm-togglechildthreads-tooltip'),
      classes: ['cd-comment-button-icon', 'cd-comment-button-toggleChildThreads', 'cd-icon'],
      action,
    });

    this.comment.updateToggleChildThreadsButton();

    return button;
  }

  /**
   * Append a button to the spacious comment menu.
   *
   * @override
   * @param {CommentButton} button The button to append.
   */
  appendButton(button) {
    if (button === this.goToParentButton || button === this.goToChildButton ||
      button === this.toggleChildThreadsButton) {
      // These buttons go in the header
      this.comment.headerElement?.append(button.element);
    } else {
      // Other buttons go in the menu
      this.comment.menuElement?.append(button.element);
    }
  }

  /**
   * Prepend a button to the spacious comment header.
   *
   * @override
   * @param {CommentButton} button The button to prepend.
   */
  prependButton(button) {
    if (button === this.goToChildButton) {
      // Insert go to child button in the correct position in header
      this.comment.headerElement?.insertBefore(
        button.element,
        (this.goToParentButton?.element || this.comment.timestampElement).nextSibling
      );
    } else {
      this.comment.headerElement?.prepend(button.element);
    }
  }

  /**
   * Override to add toggle child threads button to header instead of menu.
   *
   * @override
   */
  addToggleChildThreadsButton() {
    if (
      !this.comment.getChildren().some((child) => child.thread) ||
      this.toggleChildThreadsButton?.isConnected()
    ) {
      return;
    }

    const action = () => {
      this.comment.toggleChildThreads();
    };
    this.toggleChildThreadsButton = this.createToggleChildThreadsButton(action);

    // Insert in header before change note
    this.comment.headerElement?.insertBefore(
      this.toggleChildThreadsButton.element,
      this.comment.$changeNote?.[0] || null
    );

    this.toggleChildThreadsButton.element.addEventListener('mouseenter', () => {
      this.comment.maybeOnboardOntoToggleChildThreads();
    });
  }
}

export default SpaciousCommentActions;
