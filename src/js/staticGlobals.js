/**
 * To-be-properties of the {@link convenientDiscussions.g} object. These are those of them that are
 * known from the beginning and can be safely imported in a web worker (which doesn't have access to
 * the window scope). We assume that there is no point to make these properties subject to change by
 * site administrators although that may be disputable. Some of them are extensible in the
 * configuration file (such as `UNHIGHLIGHTABLE_ELEMENT_CLASSES`).
 *
 * @module staticGlobals
 */

/**
 * Collection of properties accessible from anywhere in the script that are not grouped in any other
 * way (incomplete list). "g" is for "global". Static (i.e., known from the beginning) ones are
 * declared in {@link module:staticGlobals}.
 *
 * @namespace g
 * @memberof convenientDiscussions
 */
export default {
  /**
   * A replacement for
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Unicode_Property_Escapes unicode property escapes}
   * while they are not supported in major browsers. {@link https://github.com/slevithan/xregexp}
   * can be used also.
   *
   * @type {string}
   * @memberof convenientDiscussions.g
   */
  LETTER_PATTERN: 'A-Za-z\\u00aa\\u00b5\\u00ba\\u00c0-\\u00d6\\u00d8-\\u00f6\\u00f8-\\u02c1\\u02c6-\\u02d1\\u02e0-\\u02e4\\u02ec\\u02ee\\u0370-\\u0374\\u0376\\u0377\\u037a-\\u037d\\u037f\\u0386\\u0388-\\u038a\\u038c\\u038e-\\u03a1\\u03a3-\\u03f5\\u03f7-\\u0481\\u048a-\\u052f\\u0531-\\u0556\\u0559\\u0561-\\u0587\\u05d0-\\u05ea\\u05f0-\\u05f2\\u0620-\\u064a\\u066e\\u066f\\u0671-\\u06d3\\u06d5\\u06e5\\u06e6\\u06ee\\u06ef\\u06fa-\\u06fc\\u06ff\\u0710\\u0712-\\u072f\\u074d-\\u07a5\\u07b1\\u07ca-\\u07ea\\u07f4\\u07f5\\u07fa\\u0800-\\u0815\\u081a\\u0824\\u0828\\u0840-\\u0858\\u08a0-\\u08b4\\u0904-\\u0939\\u093d\\u0950\\u0958-\\u0961\\u0971-\\u0980\\u0985-\\u098c\\u098f\\u0990\\u0993-\\u09a8\\u09aa-\\u09b0\\u09b2\\u09b6-\\u09b9\\u09bd\\u09ce\\u09dc\\u09dd\\u09df-\\u09e1\\u09f0\\u09f1\\u0a05-\\u0a0a\\u0a0f\\u0a10\\u0a13-\\u0a28\\u0a2a-\\u0a30\\u0a32\\u0a33\\u0a35\\u0a36\\u0a38\\u0a39\\u0a59-\\u0a5c\\u0a5e\\u0a72-\\u0a74\\u0a85-\\u0a8d\\u0a8f-\\u0a91\\u0a93-\\u0aa8\\u0aaa-\\u0ab0\\u0ab2\\u0ab3\\u0ab5-\\u0ab9\\u0abd\\u0ad0\\u0ae0\\u0ae1\\u0af9\\u0b05-\\u0b0c\\u0b0f\\u0b10\\u0b13-\\u0b28\\u0b2a-\\u0b30\\u0b32\\u0b33\\u0b35-\\u0b39\\u0b3d\\u0b5c\\u0b5d\\u0b5f-\\u0b61\\u0b71\\u0b83\\u0b85-\\u0b8a\\u0b8e-\\u0b90\\u0b92-\\u0b95\\u0b99\\u0b9a\\u0b9c\\u0b9e\\u0b9f\\u0ba3\\u0ba4\\u0ba8-\\u0baa\\u0bae-\\u0bb9\\u0bd0\\u0c05-\\u0c0c\\u0c0e-\\u0c10\\u0c12-\\u0c28\\u0c2a-\\u0c39\\u0c3d\\u0c58-\\u0c5a\\u0c60\\u0c61\\u0c85-\\u0c8c\\u0c8e-\\u0c90\\u0c92-\\u0ca8\\u0caa-\\u0cb3\\u0cb5-\\u0cb9\\u0cbd\\u0cde\\u0ce0\\u0ce1\\u0cf1\\u0cf2\\u0d05-\\u0d0c\\u0d0e-\\u0d10\\u0d12-\\u0d3a\\u0d3d\\u0d4e\\u0d5f-\\u0d61\\u0d7a-\\u0d7f\\u0d85-\\u0d96\\u0d9a-\\u0db1\\u0db3-\\u0dbb\\u0dbd\\u0dc0-\\u0dc6\\u0e01-\\u0e30\\u0e32\\u0e33\\u0e40-\\u0e46\\u0e81\\u0e82\\u0e84\\u0e87\\u0e88\\u0e8a\\u0e8d\\u0e94-\\u0e97\\u0e99-\\u0e9f\\u0ea1-\\u0ea3\\u0ea5\\u0ea7\\u0eaa\\u0eab\\u0ead-\\u0eb0\\u0eb2\\u0eb3\\u0ebd\\u0ec0-\\u0ec4\\u0ec6\\u0edc-\\u0edf\\u0f00\\u0f40-\\u0f47\\u0f49-\\u0f6c\\u0f88-\\u0f8c\\u1000-\\u102a\\u103f\\u1050-\\u1055\\u105a-\\u105d\\u1061\\u1065\\u1066\\u106e-\\u1070\\u1075-\\u1081\\u108e\\u10a0-\\u10c5\\u10c7\\u10cd\\u10d0-\\u10fa\\u10fc-\\u1248\\u124a-\\u124d\\u1250-\\u1256\\u1258\\u125a-\\u125d\\u1260-\\u1288\\u128a-\\u128d\\u1290-\\u12b0\\u12b2-\\u12b5\\u12b8-\\u12be\\u12c0\\u12c2-\\u12c5\\u12c8-\\u12d6\\u12d8-\\u1310\\u1312-\\u1315\\u1318-\\u135a\\u1380-\\u138f\\u13a0-\\u13f5\\u13f8-\\u13fd\\u1401-\\u166c\\u166f-\\u167f\\u1681-\\u169a\\u16a0-\\u16ea\\u16f1-\\u16f8\\u1700-\\u170c\\u170e-\\u1711\\u1720-\\u1731\\u1740-\\u1751\\u1760-\\u176c\\u176e-\\u1770\\u1780-\\u17b3\\u17d7\\u17dc\\u1820-\\u1877\\u1880-\\u18a8\\u18aa\\u18b0-\\u18f5\\u1900-\\u191e\\u1950-\\u196d\\u1970-\\u1974\\u1980-\\u19ab\\u19b0-\\u19c9\\u1a00-\\u1a16\\u1a20-\\u1a54\\u1aa7\\u1b05-\\u1b33\\u1b45-\\u1b4b\\u1b83-\\u1ba0\\u1bae\\u1baf\\u1bba-\\u1be5\\u1c00-\\u1c23\\u1c4d-\\u1c4f\\u1c5a-\\u1c7d\\u1ce9-\\u1cec\\u1cee-\\u1cf1\\u1cf5\\u1cf6\\u1d00-\\u1dbf\\u1e00-\\u1f15\\u1f18-\\u1f1d\\u1f20-\\u1f45\\u1f48-\\u1f4d\\u1f50-\\u1f57\\u1f59\\u1f5b\\u1f5d\\u1f5f-\\u1f7d\\u1f80-\\u1fb4\\u1fb6-\\u1fbc\\u1fbe\\u1fc2-\\u1fc4\\u1fc6-\\u1fcc\\u1fd0-\\u1fd3\\u1fd6-\\u1fdb\\u1fe0-\\u1fec\\u1ff2-\\u1ff4\\u1ff6-\\u1ffc\\u2071\\u207f\\u2090-\\u209c\\u2102\\u2107\\u210a-\\u2113\\u2115\\u2119-\\u211d\\u2124\\u2126\\u2128\\u212a-\\u212d\\u212f-\\u2139\\u213c-\\u213f\\u2145-\\u2149\\u214e\\u2183\\u2184\\u2c00-\\u2c2e\\u2c30-\\u2c5e\\u2c60-\\u2ce4\\u2ceb-\\u2cee\\u2cf2\\u2cf3\\u2d00-\\u2d25\\u2d27\\u2d2d\\u2d30-\\u2d67\\u2d6f\\u2d80-\\u2d96\\u2da0-\\u2da6\\u2da8-\\u2dae\\u2db0-\\u2db6\\u2db8-\\u2dbe\\u2dc0-\\u2dc6\\u2dc8-\\u2dce\\u2dd0-\\u2dd6\\u2dd8-\\u2dde\\u2e2f\\u3005\\u3006\\u3031-\\u3035\\u303b\\u303c\\u3041-\\u3096\\u309d-\\u309f\\u30a1-\\u30fa\\u30fc-\\u30ff\\u3105-\\u312d\\u3131-\\u318e\\u31a0-\\u31ba\\u31f0-\\u31ff\\u3400-\\u4db5\\u4e00-\\u9fd5\\ua000-\\ua48c\\ua4d0-\\ua4fd\\ua500-\\ua60c\\ua610-\\ua61f\\ua62a\\ua62b\\ua640-\\ua66e\\ua67f-\\ua69d\\ua6a0-\\ua6e5\\ua717-\\ua71f\\ua722-\\ua788\\ua78b-\\ua7ad\\ua7b0-\\ua7b7\\ua7f7-\\ua801\\ua803-\\ua805\\ua807-\\ua80a\\ua80c-\\ua822\\ua840-\\ua873\\ua882-\\ua8b3\\ua8f2-\\ua8f7\\ua8fb\\ua8fd\\ua90a-\\ua925\\ua930-\\ua946\\ua960-\\ua97c\\ua984-\\ua9b2\\ua9cf\\ua9e0-\\ua9e4\\ua9e6-\\ua9ef\\ua9fa-\\ua9fe\\uaa00-\\uaa28\\uaa40-\\uaa42\\uaa44-\\uaa4b\\uaa60-\\uaa76\\uaa7a\\uaa7e-\\uaaaf\\uaab1\\uaab5\\uaab6\\uaab9-\\uaabd\\uaac0\\uaac2\\uaadb-\\uaadd\\uaae0-\\uaaea\\uaaf2-\\uaaf4\\uab01-\\uab06\\uab09-\\uab0e\\uab11-\\uab16\\uab20-\\uab26\\uab28-\\uab2e\\uab30-\\uab5a\\uab5c-\\uab65\\uab70-\\uabe2\\uac00-\\ud7a3\\ud7b0-\\ud7c6\\ud7cb-\\ud7fb\\uf900-\\ufa6d\\ufa70-\\ufad9\\ufb00-\\ufb06\\ufb13-\\ufb17\\ufb1d\\ufb1f-\\ufb28\\ufb2a-\\ufb36\\ufb38-\\ufb3c\\ufb3e\\ufb40\\ufb41\\ufb43\\ufb44\\ufb46-\\ufbb1\\ufbd3-\\ufd3d\\ufd50-\\ufd8f\\ufd92-\\ufdc7\\ufdf0-\\ufdfb\\ufe70-\\ufe74\\ufe76-\\ufefc\\uff21-\\uff3a\\uff41-\\uff5a\\uff66-\\uffbe\\uffc2-\\uffc7\\uffca-\\uffcf\\uffd2-\\uffd7\\uffda-\\uffdc',

  /**
   * Background color for hovered comments.
   *
   * @type {string}
   * @memberof convenientDiscussions.g
   */
  COMMENT_HOVERED_BACKGROUND_COLOR: '#f8f9fa',

  /**
   * Marker color for target comments.
   *
   * @type {string}
   * @memberof convenientDiscussions.g
   */
  COMMENT_TARGET_MARKER_COLOR: '#fc3',

  /**
   * Background color for target comments.
   *
   * @type {string}
   * @memberof convenientDiscussions.g
   */
  COMMENT_TARGET_BACKGROUND_COLOR: '#fef6e7',

  /**
   * Background color for target comments when they are hovered.
   *
   * @type {string}
   * @memberof convenientDiscussions.g
   */
  COMMENT_TARGET_HOVERED_BACKGROUND_COLOR: '#fef2db',

  /**
   * Marker color for new comments.
   *
   * @type {string}
   * @memberof convenientDiscussions.g
   */
  COMMENT_NEW_MARKER_COLOR: '#00af89',

  /**
   * Background color used for _flashing_ new comments when they are updated and just new comments
   * if enabled in the settings.
   *
   * @type {string}
   * @memberof convenientDiscussions.g
   */
  COMMENT_NEW_BACKGROUND_COLOR: '#f0ffe5',

  /**
   * New comments color when they are hovered.
   *
   * @type {string}
   * @memberof convenientDiscussions.g
   */
  COMMENT_NEW_HOVERED_BACKGROUND_COLOR: '#e8ffd8',

  /**
   * Marker color for own comments.
   *
   * @type {string}
   * @memberof convenientDiscussions.g
   */
  COMMENT_OWN_MARKER_COLOR: '#9f33cc',

  /**
   * Background color for own comments if enabled in the settings.
   *
   * @type {string}
   * @memberof convenientDiscussions.g
   */
  COMMENT_OWN_BACKGROUND_COLOR: '#faf3fc',

  /**
   * Background color for own comments when they are hovered if enabled in the settings.
   *
   * @type {string}
   * @memberof convenientDiscussions.g
   */
  COMMENT_OWN_HOVERED_BACKGROUND_COLOR: '#f7edfb',

  /**
   * Marker color for deleted comments.
   *
   * @type {string}
   * @memberof convenientDiscussions.g
   */
  COMMENT_DELETED_MARKER_COLOR: '#d33',

  /**
   * Background color for deleted comments.
   *
   * @type {string}
   * @memberof convenientDiscussions.g
   */
  COMMENT_DELETED_BACKGROUND_COLOR: '#fee7e6',

  /**
   * Background color for deleted comments when they are hovered.
   *
   * @type {string}
   * @memberof convenientDiscussions.g
   */
  COMMENT_DELETED_HOVERED_BACKGROUND_COLOR: '#fddbd9',

  /**
   * Left and right margins of the comment layers used as a fallback (when a comment is placed
   * somewhere where we don't know how to position the layers).
   *
   * @type {number}
   * @memberof convenientDiscussions.g
   */
  COMMENT_FALLBACK_SIDE_MARGIN: 10,

  /**
   * Left and right margins of thread lines.
   *
   * @type {number}
   * @memberof convenientDiscussions.g
   */
  THREAD_LINE_SIDE_MARGIN: 2,

  /**
   * How long a comment should be considered new and have a corresponding background on newly loaded
   * pages. In minutes.
   *
   * @type {number}
   * @memberof convenientDiscussions.g
   */
  HIGHLIGHT_NEW_COMMENTS_INTERVAL: 15,

  /**
   * Number of seconds between checks for new comments when the tab is not hidden.
   *
   * @type {number}
   * @memberof convenientDiscussions.g
   */
  UPDATE_CHECK_INTERVAL: 15,

  /**
   * Number of seconds between new comments checks when the tab is hidden.
   *
   * @type {number}
   * @memberof convenientDiscussions.g
   */
  BACKGROUND_UPDATE_CHECK_INTERVAL: 60,

  /**
   * Number of seconds in a day.
   *
   * @type {number}
   * @memberof convenientDiscussions.g
   */
  SECONDS_IN_DAY: 60 * 60 * 24,

  /**
   * Number of milliseconds in a minute.
   *
   * @type {number}
   * @memberof convenientDiscussions.g
   */
  MILLISECONDS_IN_MINUTE: 1000 * 60,

  /**
   * Popular elements that don't have the `display: inline` property in the default browser styles.
   *
   * @type {string[]}
   * @memberof convenientDiscussions.g
   */
  POPULAR_NOT_INLINE_ELEMENTS: [
    'BLOCKQUOTE', 'DD', 'DIV', 'DL', 'DT', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR',
    'INPUT', 'LI', 'LINK', 'OL', 'P', 'PRE', 'STYLE', 'TABLE', 'TBODY', 'TR', 'TH', 'TD', 'UL'
  ],

  /**
   * Popular elements that do have the `display: inline` property in the default browser styles.
   *
   * @type {string[]}
   * @memberof convenientDiscussions.g
   */
  POPULAR_INLINE_ELEMENTS: [
    'A', 'ABBR', 'B', 'BIG', 'BR', 'CENTER', 'CITE', 'CODE', 'DEL', 'EM', 'FONT', 'I', 'IMG', 'INS',
    'KBD', 'Q', 'S', 'SAMP', 'SMALL', 'SPAN', 'STRIKE', 'STRONG', 'SUB', 'SUP', 'TT', 'U', 'VAR'
  ],

  /**
   * Names of elements that shouldn't be the first or last highlightable element. These elements are
   * wrapped into `'div'` containers. It allows for comment headers to be displayed correctly when
   * `conveneintDiscussions.settings.reformatComments` is turned on.
   *
   * @type {Array}
   * @memberof convenientDiscussions.g
   */
  BAD_HIGHLIGHTABLE_ELEMENTS: ['BLOCKQUOTE', 'DL', 'FORM', 'HR', 'OL', 'PRE', 'TABLE', 'UL'],

  /**
   * Classes of elements that shouldn't be highlighted. Only MediaWiki-assigned classes go here.
   * Wiki-specific classes go in the configuration.
   *
   * @type {string[]}
   * @memberof convenientDiscussions.g
   */
  UNHIGHLIGHTABLE_ELEMENT_CLASSES: [
    'mw-empty-elt',
    'tleft',
    'tright',
    'floatleft',
    'floatright',
  ],

  /**
   * Regexps for strings that should be cut out of comment beginnings (not considered parts of the
   * comment).
   *
   * @type {RegExp[]}
   * @memberof convenientDiscussions.g
   */
  BAD_COMMENT_BEGINNINGS: [
    /^<!--[^]*?--> *\n+/,
    /^(?:----+|<hr>) *\n+/i,
    /^\{\|.*?\|\} *\n+(?=[*:#])/,
  ],

  /**
   * Selectors of floating elements. This is needed to display the comment's underlay and overlay
   * correctly.
   *
   * @type {string[]}
   * @memberof convenientDiscussions.g
   */
  FLOATING_ELEMENT_SELECTORS: [
    '.cd-floating',
    '.tright',
    '.floatright',
    '.tleft',
    '.floatleft',
    '*[style*="float:right"]',
    '*[style*="float: right"]',
    '*[style*="float:left"]',
    '*[style*="float: left"]',
  ],

  /**
   * Auxiliary property to keep the sign code: `'\~\~\~\~'`. If written as plain text, it gets
   * transformed into the revision author's signature when saved. Note that the minifier translates
   * `'~\~\\~'` and `'\~\~' + '\~'` into `'\~\~\~'`.
   *
   * @type {string}
   * @memberof convenientDiscussions.g
   */
  SIGN_CODE: '~~'.concat('~~'),
};
