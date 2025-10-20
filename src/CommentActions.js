import cd from './cd';
import commentManager from './commentManager';

/**
 * @typedef {import('./CommentButton').default} CommentButton
 */

/**
 * Base class for managing comment action buttons and functionality.
 * This class handles the creation and management of action buttons like reply, edit, thank, etc.
 */
class CommentActions {
  /**
   * Create a CommentActions instance.
   *
   * @param {import('./Comment').default} comment The comment this actions instance belongs to.
   */
  constructor(comment) {
    /**
     * The comment this actions instance belongs to.
     *
     * @type {import('./Comment').default}
     */
    this.comment = comment;

    /**
     * Reply button.
     *
     * @type {CommentButton | undefined}
     */
    this.replyButton = undefined;

    /**
     * Edit button.
     *
     * @type {CommentButton | undefined}
     */
    this.editButton = undefined;

    /**
     * Thank button.
     *
     * @type {CommentButton | undefined}
     */
    this.thankButton = undefined;

    /**
     * Copy link button.
     *
     * @type {CommentButton | undefined}
     */
    this.copyLinkButton = undefined;

    /**
     * "Go to parent" button.
     *
     * @type {CommentButton | undefined}
     */
    this.goToParentButton = undefined;

    /**
     * "Go to child" button.
     *
     * @type {CommentButton | undefined}
     */
    this.goToChildButton = undefined;

    /**
     * "Toggle child threads" button.
     *
     * @type {CommentButton | undefined}
     */
    this.toggleChildThreadsButton = undefined;
  }

  /**
   * Create and add all appropriate action buttons for this comment.
   */
  create() {
    this.addReplyButton();
    this.addEditButton();
    this.addThankButton();
    this.addGoToParentButton();
  }

  /**
   * Create a reply button and add it to the appropriate container.
   * This method should be overridden by subclasses for specific styling.
   */
  addReplyButton() {
    if (!this.comment.isActionable) return;

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
   * Create an edit button and add it to the appropriate container.
   * This method should be overridden by subclasses for specific styling.
   */
  addEditButton() {
    if (!this.comment.isEditable) return;

    const action = () => {
      this.comment.edit();
    };
    this.editButton = this.createEditButton(action);
    this.appendButton(this.editButton);
  }

  /**
   * Create a thank button and add it to the appropriate container.
   * This method should be overridden by subclasses for specific styling.
   */
  addThankButton() {
    if (
      !cd.user.isRegistered() ||
      !this.comment.author.isRegistered() ||
      !this.comment.date ||
      this.comment.isOwn
    )
      return;

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
   * Create a copy link button and add it to the appropriate container.
   * This method should be overridden by subclasses for specific styling.
   */
  addCopyLinkButton() {
    if (!this.comment.id) return;

    const action = (/** @type {MouseEvent | KeyboardEvent} */ event) => {
      this.comment.copyLink(event);
    };
    this.copyLinkButton = this.createCopyLinkButton(action);
    this.appendButton(this.copyLinkButton);
  }

  /**
   * Create a "Go to parent" button and add it to the appropriate container.
   * This method should be overridden by subclasses for specific styling.
   */
  addGoToParentButton() {
    if (!this.comment.getParent()) return;

    const action = () => {
      this.comment.goToParent();
    };
    this.goToParentButton = this.createGoToParentButton(action);
    this.appendButton(this.goToParentButton);
  }

  /**
   * Create a "Go to child" button and add it to the appropriate container.
   * This method should be overridden by subclasses for specific styling.
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
   * Create a "Toggle child threads" button and add it to the appropriate container.
   * This method should be overridden by subclasses for specific styling.
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
    this.appendButton(this.toggleChildThreadsButton);

    this.toggleChildThreadsButton.element.addEventListener('mouseenter', () => {
      this.comment.maybeOnboardOntoToggleChildThreads();
    });
  }

  /**
   * Set the thank button to thanked state.
   */
  setThanked() {
    if (this.thankButton) {
      this.thankButton
        .setDisabled(true)
        .setLabel(cd.s('cm-thanked'))
        .setTooltip(cd.s('cm-thanked-tooltip'));
    }
  }

  /**
   * Create a reply button. To be overridden by subclasses.
   *
   * @param {import('./Button').Action} _action The action to perform when clicked.
   * @returns {CommentButton} The created button.
   * @abstract
   */
  createReplyButton(_action) {
    throw new Error('createReplyButton must be implemented by subclasses');
  }

  /**
   * Create an edit button. To be overridden by subclasses.
   *
   * @param {import('./Button').Action} _action The action to perform when clicked.
   * @returns {CommentButton} The created button.
   * @abstract
   */
  createEditButton(_action) {
    throw new Error('createEditButton must be implemented by subclasses');
  }

  /**
   * Create a thank button. To be overridden by subclasses.
   *
   * @param {import('./Button').Action} _action The action to perform when clicked.
   * @param {boolean} _isThanked Whether the comment is already thanked.
   * @returns {CommentButton} The created button.
   * @abstract
   */
  createThankButton(_action, _isThanked) {
    throw new Error('createThankButton must be implemented by subclasses');
  }

  /**
   * Create a copy link button. To be overridden by subclasses.
   *
   * @param {import('./Button').Action} _action The action to perform when clicked.
   * @returns {CommentButton} The created button.
   * @abstract
   */
  createCopyLinkButton(_action) {
    throw new Error('createCopyLinkButton must be implemented by subclasses');
  }

  /**
   * Create a "Go to parent" button. To be overridden by subclasses.
   *
   * @param {import('./Button').Action} _action The action to perform when clicked.
   * @returns {CommentButton} The created button.
   * @abstract
   */
  createGoToParentButton(_action) {
    throw new Error('createGoToParentButton must be implemented by subclasses');
  }

  /**
   * Create a "Go to child" button. To be overridden by subclasses.
   *
   * @param {import('./Button').Action} _action The action to perform when clicked.
   * @returns {CommentButton} The created button.
   * @abstract
   */
  createGoToChildButton(_action) {
    throw new Error('createGoToChildButton must be implemented by subclasses');
  }

  /**
   * Create a "Toggle child threads" button. To be overridden by subclasses.
   *
   * @param {import('./Button').Action} _action The action to perform when clicked.
   * @returns {CommentButton} The created button.
   * @abstract
   */
  createToggleChildThreadsButton(_action) {
    throw new Error('createToggleChildThreadsButton must be implemented by subclasses');
  }

  /**
   * Append a button to the appropriate container. To be overridden by subclasses.
   *
   * @param {CommentButton} _button The button to append.
   * @abstract
   */
  appendButton(_button) {
    throw new Error('appendButton must be implemented by subclasses');
  }

  /**
   * Prepend a button to the appropriate container. To be overridden by subclasses.
   *
   * @param {CommentButton} _button The button to prepend.
   * @abstract
   */
  prependButton(_button) {
    throw new Error('prependButton must be implemented by subclasses');
  }
}

export default CommentActions;
