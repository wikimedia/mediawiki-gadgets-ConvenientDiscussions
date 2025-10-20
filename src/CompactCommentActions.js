import CommentActions from './CommentActions';
import CommentButton from './CommentButton';
import cd from './cd';
import commentManager from './commentManager';

/**
 * Actions management for compact comments with overlay-based styling.
 * Compact comments display action buttons in an overlay menu that appears on hover.
 */
class CompactCommentActions extends CommentActions {
  /**
   * Check if the comment has classic underlay (not reformatted and has layers).
   *
   * @returns {boolean}
   */
  hasClassicUnderlay() {
    // A comment has classic underlay if it's not reformatted and has layers with underlay
    // We can determine if it's reformatted by checking for the presence of headerElement
    return !this.comment.headerElement && Boolean(this.comment.layers?.underlay);
  }

  /**
   * Create and add all appropriate action buttons for compact comments.
   * The order is specific for compact comments.
   *
   * @override
   */
  create() {
    this.addGoToParentButton();
    this.addCopyLinkButton();
    this.addThankButton();
    this.addEditButton();
    this.addReplyButton();
    this.addToggleChildThreadsButton();
  }

  /**
   * Create a reply button for compact comments.
   *
   * @override
   * @param {import('./Button').Action} action The action to perform when clicked.
   * @returns {CommentButton} The created button.
   */
  createReplyButton(action) {
    return new CommentButton({
      element: this.comment.createReplyButton().$element[0],
      action,
      widgetConstructor: this.comment.createReplyButton,
    });
  }

  /**
   * Create an edit button for compact comments.
   *
   * @override
   * @param {import('./Button').Action} action The action to perform when clicked.
   * @returns {CommentButton} The created button.
   */
  createEditButton(action) {
    return new CommentButton({
      element: this.comment.createEditButton().$element[0],
      action,
      widgetConstructor: this.comment.createEditButton,
    });
  }

  /**
   * Create a thank button for compact comments.
   *
   * @override
   * @param {import('./Button').Action} action The action to perform when clicked.
   * @param {boolean} _isThanked Whether the comment is already thanked.
   * @returns {CommentButton} The created button.
   */
  createThankButton(action, _isThanked) {
    return new CommentButton({
      element: this.comment.createThankButton().$element[0],
      action,
      widgetConstructor: this.comment.createThankButton,
    });
  }

  /**
   * Create a copy link button for compact comments.
   *
   * @override
   * @param {import('./Button').Action} action The action to perform when clicked.
   * @returns {CommentButton} The created button.
   */
  createCopyLinkButton(action) {
    const element = this.comment.createCopyLinkButton().$element[0];

    return new CommentButton({
      element,
      buttonElement: /** @type {HTMLElement} */ (element.firstChild),
      action,
      widgetConstructor: this.comment.createCopyLinkButton,
      href: this.comment.dtId && '#' + this.comment.dtId,
    });
  }

  /**
   * Create a "Go to parent" button for compact comments.
   *
   * @override
   * @param {import('./Button').Action} action The action to perform when clicked.
   * @returns {CommentButton} The created button.
   */
  createGoToParentButton(action) {
    const buttonElement = this.comment.createGoToParentButton().$element[0];

    return new CommentButton({
      buttonElement,
      action,
      widgetConstructor: this.comment.createGoToParentButton,
    });
  }

  /**
   * Create a "Go to child" button for compact comments.
   *
   * @override
   * @param {import('./Button').Action} action The action to perform when clicked.
   * @returns {CommentButton} The created button.
   */
  createGoToChildButton(action) {
    const element = this.comment.createGoToChildButton().$element[0];

    return new CommentButton({
      element,
      action,
      widgetConstructor: this.comment.createGoToChildButton,
    });
  }

  /**
   * Create a "Toggle child threads" button for compact comments.
   *
   * @override
   * @param {import('./Button').Action} action The action to perform when clicked.
   * @returns {CommentButton} The created button.
   */
  createToggleChildThreadsButton(action) {
    const element = this.comment.createToggleChildThreadsButton().$element[0];

    return new CommentButton({
      element,
      iconElement: /** @type {HTMLElement} */ (element.querySelector('.oo-ui-iconElement-icon')),
      action,
      widgetConstructor: this.comment.createToggleChildThreadsButton,
    });
  }

  /**
   * Get the overlay menu container for compact comments.
   *
   * @override
   * @returns {JQuery | undefined} The overlay menu jQuery object, or undefined if not available.
   * @protected
   */
  getOverlayMenu() {
    const layers = this.comment.layers;
    if (layers && 'overlayMenu' in layers) {
      return /** @type {import('./CompactCommentLayers').default} */ (layers).$overlayMenu;
    }
  }

  /**
   * Append a button to the compact comment overlay menu.
   *
   * @override
   * @param {CommentButton} button The button to append.
   */
  appendButton(button) {
    const overlayMenu = this.getOverlayMenu();
    if (!overlayMenu) return;
    overlayMenu.append(button.element);
  }

  /**
   * Prepend a button to the compact comment overlay menu.
   *
   * @override
   * @param {CommentButton} button The button to prepend.
   */
  prependButton(button) {
    const overlayMenu = this.getOverlayMenu();
    if (!overlayMenu) return;
    overlayMenu.prepend(button.element);
  }

  /**
   * Override to handle specific positioning for toggle child threads button.
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

    // Insert after go to parent/child buttons if they exist
    const targetButton = this.goToParentButton || this.goToChildButton;
    const overlayMenu = this.getOverlayMenu();
    if (targetButton && overlayMenu) {
      overlayMenu[0].insertBefore(
        this.toggleChildThreadsButton.element,
        targetButton.element.nextSibling || null
      );
    } else {
      this.prependButton(this.toggleChildThreadsButton);
    }

    this.toggleChildThreadsButton.element.addEventListener('mouseenter', () => {
      this.comment.maybeOnboardOntoToggleChildThreads();
    });
  }

  /**
   * Override to handle specific positioning for go to child button.
   *
   * @override
   */
  maybeAddGoToChildButton() {
    if (!this.comment.targetChild) return;

    this.comment.configureLayers();
    if (this.goToChildButton?.isConnected()) return;

    const action = () => {
      /** @type {import('./Comment').default} */ (this.comment.targetChild).scrollTo({ pushState: true });
    };
    this.goToChildButton = this.createGoToChildButton(action);
    this.prependButton(this.goToChildButton);
  }

  /**
   * Override addReplyButton to check for hasClassicUnderlay condition.
   *
   * @override
   */
  addReplyButton() {
    if (!this.comment.isActionable || !this.hasClassicUnderlay()) return;

    const action = () => {
      if (this.comment.replyForm) {
        this.comment.replyForm.cancel();
      } else {
        this.comment.reply();
      }
    };
    this.replyButton = this.createReplyButton(action);
    this.appendButton(this.replyButton);

    // Check if reply should be disabled due to outdented comments
    if (
      commentManager.getByIndex(this.comment.index + 1)?.isOutdented &&
      (
        !this.comment.section ||
        // Probably shouldn't add a comment to a numbered list
        this.comment.elements[0].matches('ol *')
      )
    ) {
      this.replyButton.setDisabled(true);
      this.replyButton.setTooltip(cd.s('cm-reply-outdented-tooltip'));
    }
  }

  /**
   * Override addEditButton to check for hasClassicUnderlay condition.
   *
   * @override
   */
  addEditButton() {
    if (!this.comment.isEditable || !this.hasClassicUnderlay()) return;

    const action = () => {
      this.comment.edit();
    };
    this.editButton = this.createEditButton(action);
    this.appendButton(this.editButton);
  }

  /**
   * Override addThankButton to check for hasClassicUnderlay condition.
   *
   * @override
   */
  addThankButton() {
    if (!cd.user.isRegistered() || !this.comment.author.isRegistered() ||
      !this.comment.date || this.comment.isOwn || !this.hasClassicUnderlay()) return;

    const isThanked = Object.entries(commentManager.getThanksStorage().getData()).some(
      // TODO: Remove `|| this.comment.dtId === thank.id || this.comment.id === thank.id` part
      // after migration is complete on January 1, 2026
      ([id, thank]) =>
        this.comment.dtId === id || this.comment.id === id ||
        this.comment.dtId === thank?.id || this.comment.id === thank?.id
    );

    const action = () => {
      this.comment.thank();
    };
    this.thankButton = this.createThankButton(action, isThanked);
    this.appendButton(this.thankButton);

    if (isThanked) {
      this.setThanked();
    }
  }

  /**
   * Override addGoToParentButton to check for hasClassicUnderlay condition.
   *
   * @override
   */
  addGoToParentButton() {
    if (!this.comment.getParent() || !this.hasClassicUnderlay()) return;

    const action = () => {
      this.comment.goToParent();
    };
    this.goToParentButton = this.createGoToParentButton(action);
    this.appendButton(this.goToParentButton);
  }

  /**
   * Override addCopyLinkButton to check for hasClassicUnderlay condition.
   *
   * @override
   */
  addCopyLinkButton() {
    if (!this.comment.id || !this.hasClassicUnderlay()) return;

    const action = (/** @type {MouseEvent | KeyboardEvent} */ event) => {
      this.comment.copyLink(event);
    };
    this.copyLinkButton = this.createCopyLinkButton(action);
    this.appendButton(this.copyLinkButton);
  }
}

export default CompactCommentActions;
