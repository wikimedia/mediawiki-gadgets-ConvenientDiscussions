import CdError from './shared/CdError';
import cd from './shared/cd';
import { parseTimestamp } from './shared/utils-timestamp';
import { maskDistractingCode } from './shared/utils-wikitext';
import { findFirstTimestamp } from './utils-window';

/**
 * Class that keeps the methods and data related to the page's source code.
 */
export default class PageSource {
  /**
   * Page's source code.
   *
   * @type {string}
   */
  code;

  /**
   * Whether new topics go on top on this page. Filled upon running
   * {@link PageSource#guessNewTopicPlacement}.
   *
   * @type {boolean|undefined}
   */
  areNewTopicsOnTop;

  /**
   * The start index of the first section, if new topics are on top on this page. Filled upon
   * running {@link PageSource#guessNewTopicPlacement}.
   *
   * @type {number|undefined}
   */
  firstSectionStartIndex;

  /**
   * Create a comment's source object.
   *
   * @param {import('./Page').default} page Page.
   */
  constructor(page) {
    this.page = page;
  }

  /**
   * Set the page's source code.
   *
   * @param {string} code
   */
  setCode(code) {
    this.code = code;
  }

  /**
   * Modify the page code string in accordance with an action. The `'addSection'` action is
   * presumed.
   *
   * @param {object} options
   * @param {string} [options.commentCode] Comment code, including trailing newlines and the
   *   signature. It is required (set to optional for polymorphism with CommentSource and
   *   SectionSource).
   * @param {import('./CommentForm').default} options.commentForm Comment form that has the code.
   * @returns {{
   *   contextCode: string;
   *   commentCode?: string;
   * }}
   */
  modifyContext({ commentCode, commentForm }) {
    if (this.code === undefined) {
      throw new CdError({
        type: 'internal',
        message: 'Can\'t modify the context: context (page) code is not set.',
      });
    }

    let contextCode;
    if (commentForm.isNewTopicOnTop()) {
      const firstSectionStartIndex = maskDistractingCode(this.code)
        .search(/^(=+).*\1[ \t\x01\x02]*$/m);
      contextCode = (
        (
          firstSectionStartIndex === -1 ?
            (this.code ? this.code + '\n' : '') :
            this.code.slice(0, firstSectionStartIndex)
        ) +
        commentCode +
        '\n' +
        this.code.slice(firstSectionStartIndex)
      );
    } else {
      contextCode = (
        (commentForm.isNewSectionApi() ? '' : (this.code + '\n').trimStart()) +
        commentCode
      );
    }

    return { contextCode, commentCode };
  }

  /**
   * Enrich the page instance with the properties regarding whether new topics go on top on this
   * page (based on various factors) and, if new topics are on top, the start index of the first
   * section.
   *
   * @returns {{
   *   areNewTopicsOnTop: boolean;
   *   firstSectionStartIndex: number | undefined;
   * }}
   * @throws {CdError}
   * @private
   */
  guessNewTopicPlacement() {
    if (this.code === undefined) {
      throw new CdError({
        message: 'Can\'t analyze the placement of new topics: page code is not set.',
      });
    }

    let areNewTopicsOnTop = cd.config.areNewTopicsOnTop?.(this.page.name, this.code) || null;

    const adjustedCode = maskDistractingCode(this.code);
    const sectionHeadingRegexp = PageSource.getTopicHeadingRegexp();

    if (areNewTopicsOnTop === null) {
      // Detect the topic order: newest first or newest last.
      let previousDate;
      let difference = 0;
      let sectionHeadingMatch;
      while ((sectionHeadingMatch = sectionHeadingRegexp.exec(adjustedCode))) {
        const timestamp = findFirstTimestamp(this.code.slice(sectionHeadingMatch.index));
        const { date } = timestamp && parseTimestamp(timestamp) || {};
        if (date) {
          if (previousDate) {
            difference += date > previousDate ? -1 : 1;
          }
          previousDate = date;
        }
      }
      areNewTopicsOnTop = difference === 0 && mw.config.get('wgServerName') === 'ru.wikipedia.org' ?
        this.page.namespaceId % 2 === 0 :
        difference > 0;
    }

    return {
      areNewTopicsOnTop,

      // We only need the first section's index when new topics are on top.
      firstSectionStartIndex: areNewTopicsOnTop
        ? sectionHeadingRegexp.exec(adjustedCode)?.index
        : undefined,
    };
  }

  /**
   * Determine an offset in the code to insert a new/moved section into. If `referenceDate` is
   * specified, will take chronological order into account.
   *
   * @param {Date} [referenceDate=new Date()]
   * @returns {number}
   */
  findProperPlaceForSection(referenceDate = new Date()) {
    if (this.code === undefined) {
      throw new CdError({
        message: 'Can\'t find the proper place for a section: page code is not set.',
      });
    }

    const { areNewTopicsOnTop, firstSectionStartIndex } = this.guessNewTopicPlacement();

    if (!referenceDate) {
      return areNewTopicsOnTop ? firstSectionStartIndex || 0 : this.code.length;
    }

    // eslint-disable-next-line no-one-time-vars/no-one-time-vars
    const adjustedCode = maskDistractingCode(this.code);
    // eslint-disable-next-line no-one-time-vars/no-one-time-vars
    const sectionHeadingRegexp = PageSource.getTopicHeadingRegexp();
    let sectionHeadingMatch;
    const sections = [];
    while ((sectionHeadingMatch = sectionHeadingRegexp.exec(adjustedCode))) {
      const timestamp = findFirstTimestamp(this.code.slice(sectionHeadingMatch.index));
      const { date } = timestamp && parseTimestamp(timestamp) || {};
      sections.push({
        date,
        index: sectionHeadingMatch.index,
      });
    }

    return (
      // Proper place index
      sections.find(
        ({ date }) =>
          (areNewTopicsOnTop && date && date < referenceDate) ||
          (!areNewTopicsOnTop && date && date > referenceDate)
      )?.index ||

      this.code.length
    );
  }

  /**
   * Get the regexp for traversing topic headings.
   *
   * @returns {RegExp}
   */
  static getTopicHeadingRegexp() {
    return /^==[^=].*?==[ \t\x01\x02]*\n/gm;
  }
}
