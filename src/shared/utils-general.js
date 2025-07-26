/**
 * General utilities. Some of the utilities are parts of the
 * {@link convenientDiscussions.api convenientDiscussions.api} object.
 *
 * @module utilsGeneral
 */

import html_entity_decode from 'locutus/php/strings/html_entity_decode';

import CdError from './CdError';
import cd from './cd';

/**
 * Combine the section headline, summary text, and, optionally, summary postfix to create an edit
 * summary.
 *
 * @param {object} options
 * @param {string} options.text Summary text. Can be clipped if there is not enough space.
 * @param {string} [options.optionalText] Optional text added to the end of the summary if there is
 *   enough space. Ignored if there is not.
 * @param {string} [options.section] Section name.
 * @param {boolean} [options.addPostfix=true] Whether to add `cd.g.summaryPostfix` to the summary.
 * @returns {string}
 */
export function buildEditSummary({ text, optionalText, section, addPostfix = true }) {
  let fullText = (section ? `/* ${section} */ ` : '') + text.trim();

  let wasOptionalTextAdded;
  if (optionalText) {
    let projectedText = fullText + optionalText;

    if (cd.config.transformSummary) {
      projectedText = cd.config.transformSummary(projectedText);
    }

    if (projectedText.length <= cd.g.summaryLengthLimit) {
      fullText = projectedText;
      wasOptionalTextAdded = true;
    }
  }

  if (!wasOptionalTextAdded) {
    if (cd.config.transformSummary) {
      fullText = cd.config.transformSummary(fullText);
    }

    if (fullText.length > cd.g.summaryLengthLimit) {
      fullText = fullText.slice(0, cd.g.summaryLengthLimit - 1) + '…';
    }
  }

  if (addPostfix) {
    fullText += cd.g.summaryPostfix;
  }

  return fullText;
}

/**
 * Callback for
 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter Array#filter}
 * to remove duplicated elements from an array.
 *
 * @param {*} el
 * @param {number} i
 * @param {Array.<*>} arr
 * @returns {boolean}
 */
export function unique(el, i, arr) {
  return arr.indexOf(el) === i;
}

/**
 * Check if a node is an element with `display: inline` or `display: inline-block` in the default
 * browser styles. Optionally, it can treat text nodes as such.
 *
 * @param {NodeLike} node
 * @param {boolean} [considerTextNodesAsInline=false]
 * @returns {?boolean}
 */
export function isInline(node, considerTextNodesAsInline = false) {
  if (considerTextNodesAsInline && isText(node)) {
    return true;
  }

  if (!isElement(node)) {
    return null;
  }

  if (
    cd.g.popularInlineElements.includes(node.tagName) ||

    // `<meta property="mw:PageProp/toc">` is currently present in place of the TOC in Vector 2022.
    (node.tagName === 'META' && node.getAttribute('property') === 'mw:PageProp/toc')
  ) {
    return true;
  } else if (cd.g.popularNotInlineElements.includes(node.tagName)) {
    return false;
  }

  // Unknown element
  return null;
}

/**
 * Make a list of page title patterns from a query string.
 *
 * @param {string} string
 * @returns {string[]}
 */
export function generatePageNamePattern(string) {
  return string
    .split(/\s*(?:,|\n)\s*/)
    .filter((s) => s)
    .map((s) => {
      // Escape all regexp special characters except * and ?. * is converted to .*, ? to ..
      s = s.replace(/[.\\+^${}()|[\]]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');

      // The special syntax [[pagename]] is interpreted as an exact match.
      const exactMatchRegexp = /^\[\[(.*?)(?:#.*?)?\]\]$/;
      const exactMatch = s.match(exactMatchRegexp);
      if (exactMatch) {
        return `^${exactMatch[1]}$`;
      }

      return `^${s}$`;
    });
}

/**
 * Check whether a page name and a namespace number likely correspond to a talk page.
 *
 * @param {string} pageName
 * @param {number} namespaceNumber
 * @returns {boolean}
 */
export function isProbablyTalkPage(pageName, namespaceNumber) {
  return (
    namespaceNumber % 2 === 1 ||

    // File description pages are treated as talk pages
    namespaceNumber === 6 ||

    // Drafts in the main namespace in Russian Wikipedia
    /^Википедия:Подготовка статей\/.+?(?:\/.+)?$/.test(pageName) ||

    // Same for English Wikipedia
    /^Draft:.+?(?:\/.+)?$/.test(pageName)
  );
}

/**
 * Check whether an edit summary is of a comment addition/edit.
 *
 * @param {string} summary
 * @returns {boolean}
 */
export function isCommentEdit(summary) {
  return (
    /\/\* .+ \*\/ (?:[^*]|$)/.test(summary) &&
    !/\bretired\b|\barchiv/i.test(summary)
  );
}

/**
 * Check whether an edit summary is of a revert.
 *
 * @param {string} summary
 * @returns {boolean}
 */
export function isUndo(summary) {
  return /\b(?:отм|откат|undo|revert)/i.test(summary);
}

/**
 * Check whether a value is not `undefined`.
 *
 * @param {*} el
 * @returns {boolean}
 */
export function defined(el) {
  return typeof el !== 'undefined';
}

/**
 * Check whether a value is neither `undefined` nor `null`.
 *
 * @param {*} el
 * @returns {boolean}
 */
export function definedAndNotNull(el) {
  return el !== undefined && el !== null;
}

/**
 * Reorder an array, making the element at the specified index first. Used for displaying the most
 * relevant revisions in the update checker.
 *
 * @param {*[]} arr
 * @param {number} startIndex
 * @param {boolean} [reverse=false]
 * @returns {*[]}
 */
export function reorderArray(arr, startIndex, reverse = false) {
  return arr
    .slice(startIndex)
    .concat(reverse ? arr.slice(0, startIndex).reverse() : arr.slice(0, startIndex));
}

/**
 * Replace underlines with spaces in a string.
 *
 * @param {string} string
 * @returns {string}
 */
export function underlinesToSpaces(string) {
  return string.replace(/_/g, ' ');
}

/**
 * Replace spaces with underlines in a string.
 *
 * @param {string} string
 * @returns {string}
 */
export function spacesToUnderlines(string) {
  return string.replace(/ /g, '_');
}

/**
 * Remove double spaces in a string.
 *
 * @param {string} string
 * @returns {string}
 */
export function removeDoubleSpaces(string) {
  // Don't use more generic regexp like / {2,}/g so that indentation in wikitext is kept intact.
  return string.replace(/([^ ]) {2,}([^ ])/g, '$1 $2');
}

/**
 * Get the character at a given position, counting from 0. If a negative number is provided, get
 * the character at the position counting backwards from the last character in the string.
 *
 * @param {string} string
 * @param {number} offset
 * @param {boolean} [backwards=false]
 * @returns {string|undefined}
 */
export function charAt(string, offset, backwards = false) {
  if (backwards) {
    offset = string.length - 1 - offset;
  }
  return string[offset];
}

/**
 * Convert a character to uppercase according to PHP's rules (more reliable than native
 * `.toUpperCase()`).
 *
 * @param {string} char
 * @returns {string}
 */
export function phpCharToUpper(char) {
  const codes = [char.charCodeAt(0)];
  if (codes[0] >= 0xD800 && codes[0] <= 0xDBFF) {
    codes.push(char.charCodeAt(1));
  }
  return String.fromCharCode(...codes).toUpperCase();
}

/**
 * Uppercase the first character of a string. Includes a proper treatment of Unicode.
 *
 * @param {string} string
 * @returns {string}
 */
export function ucFirst(string) {
  return phpCharToUpper(string[0]) + string.slice(1);
}

/**
 * Get messages in the content language from all messages.
 *
 * @param {object} messages
 * @returns {object}
 */
export function getContentLanguageMessages(messages) {
  return typeof messages?.content === 'object' ? messages.content : messages || {};
}

/**
 * Merge an array of regular expressions.
 *
 * @param {RegExp[]} arr
 * @returns {string}
 */
export function mergeRegexps(arr) {
  return arr
    .map((regexp) => regexp.source)
    .join('|');
}

/**
 * Get a promise's internal state.
 *
 * @param {Promise} promise
 * @returns {Promise<'pending'|'fulfilled'|'rejected'>}
 */
export async function getNativePromiseState(promise) {
  const t = {};
  return await Promise.race([
    promise.then(
      () => 'fulfilled',
      () => 'rejected'
    ),
    t,
  ]) === t ? 'pending' : await Promise.race([
    promise.then(
      () => 'fulfilled',
      () => 'rejected'
    ),
  ]);
}

/**
 * Check whether a value is convertible to a primitive value.
 *
 * @param {*} val
 * @returns {boolean}
 * @private
 */
function isConvertibleToPrimitiveValue(val) {
  return (
    val === null ||
    typeof val === 'number' ||
    typeof val === 'boolean' ||
    typeof val === 'string' ||
    typeof val === 'undefined' ||
    val instanceof Date
  );
}

/**
 * Convert a value to a primitive value.
 *
 * @param {*} val
 * @returns {*}
 * @private
 */
function toPrimitive(val) {
  return val instanceof Date ? val.getTime() : val;
}

/**
 * Check whether objects are equal.
 *
 * @param {object} object1
 * @param {object} object2
 * @returns {boolean}
 */
export function areObjectsEqual(object1, object2) {
  if (object1 === object2) {
    return true;
  }

  if (
    !object1 ||
    !object2 ||
    typeof object1 !== 'object' ||
    typeof object2 !== 'object'
  ) {
    return false;
  }

  const keys1 = Object.keys(object1);
  const keys2 = Object.keys(object2);
  if (keys1.length !== keys2.length) {
    return false;
  }

  return keys1.every((key) => {
    const val1 = /** @type {object} */ (object1)[key];
    const val2 = /** @type {object} */ (object2)[key];

    if (isConvertibleToPrimitiveValue(val1) && isConvertibleToPrimitiveValue(val2)) {
      return toPrimitive(val1) === toPrimitive(val2);
    }
    return areObjectsEqual(val1, val2);
  });
}

/**
 * Remove directional marks (LTR and RTL marks) from text.
 *
 * @param {string} text
 * @param {boolean} [replaceWithSpace=false]
 * @returns {string}
 */
export function removeDirMarks(text, replaceWithSpace = false) {
  const replacement = replaceWithSpace ? ' ' : '';
  return text.replace(/\u200e|\u200f/g, replacement);
}

/**
 * Keep only values safe for transferring to a worker or for HTML attributes.
 *
 * @param {object} obj
 * @param {string[]} [allowedFuncNames]
 * @returns {object}
 */
export function keepWorkerSafeValues(obj, allowedFuncNames = []) {
  const recursivelyCopySafeValues = (obj, allowedFuncNames) => {
    if (Array.isArray(obj)) {
      return obj.map((val) => recursivelyCopySafeValues(val, allowedFuncNames));
    } else if (typeof obj === 'object' && obj !== null) {
      const result = {};
      Object.keys(obj).forEach((key) => {
        const val = obj[key];
        result[key] = recursivelyCopySafeValues(val, allowedFuncNames);
      });
      return result;
    } else if (typeof obj === 'function' && allowedFuncNames.includes(obj.name)) {
      return obj.toString();
    } else if (
      obj === null ||
      obj === undefined ||
      typeof obj === 'number' ||
      typeof obj === 'boolean' ||
      typeof obj === 'string'
    ) {
      return obj;
    } else {
      return null;
    }
  };

  return recursivelyCopySafeValues(obj, allowedFuncNames);
}

/**
 * Calculate the overlap of two arrays.
 *
 * @param {any[]} arr1
 * @param {any[]} arr2
 * @returns {number}
 * @private
 */
function calculateArrayOverlap(arr1, arr2) {
  const shorterArr = arr1.length > arr2.length ? arr2 : arr1;
  const longerArr = arr1.length > arr2.length ? arr1 : arr2;

  let overlap = 0;
  for (let i = 0, l = shorterArr.length; i < l; i++) {
    if (longerArr.includes(shorterArr[i])) {
      overlap++;
    }
  }

  // Get a number between 0 and 1
  return overlap / shorterArr.length;
}

/**
 * Calculate the overlap of words in two strings.
 *
 * @param {string} s1
 * @param {string} s2
 * @param {boolean} [caseInsensitive=false]
 * @returns {number}
 */
export function calculateWordOverlap(s1, s2, caseInsensitive = false) {
  const strToArr = (s) => (
    caseInsensitive ? s.toLowerCase() : s
  )
    .split(/\s+/)
    .filter((word) => word.length >= 3);

  return calculateArrayOverlap(strToArr(s1), strToArr(s2));
}

/**
 * Add an element to an array if it's not already there.
 *
 * @param {Array} arr
 * @param {*} el
 * @returns {boolean} Was the element added.
 */
export function addToArrayIfAbsent(arr, el) {
  if (!arr.includes(el)) {
    arr.push(el);
    return true;
  }
  return false;
}

/**
 * Remove an element from an array if it's there.
 *
 * @param {Array} arr
 * @param {*} el
 * @returns {boolean} Was the element removed.
 */
export function removeFromArrayIfPresent(arr, el) {
  const index = arr.indexOf(el);
  if (index !== -1) {
    arr.splice(index, 1);
    return true;
  }
  return false;
}

/**
 * Get the common gender of users to use the right grammatical gender of words in special
 * constructions.
 *
 * @param {Array} users Users objects with author name (and possible gender) properties.
 * @returns {string|undefined} `'male'`, `'female'`, or `undefined` for mixed, neutral or unknown
 *   gender.
 */
export function getCommonGender(users) {
  // Without "female", "male" would be returned for the "unknown + male" case.
  const definedGenders = users
    .map((user) => user.gender)
    .filter((gender) => ['female', 'male'].includes(gender));

  if (!definedGenders.length) {
    return undefined;
  }

  const onlyOneGender = definedGenders.every((gender) => gender === definedGenders[0]);
  return onlyOneGender ? definedGenders[0] : undefined;
}

/**
 * Zero-pad a number.
 *
 * @param {number} number
 * @param {number} [length=2]
 * @returns {string}
 */
export function zeroPad(number, length = 2) {
  return number.toString().padStart(length, '0');
}

/**
 * Get the last element of an array or, if a non-array is provided, return the value as is.
 *
 * @param {*} value
 * @returns {*}
 */
export function getLastArrayElementOrSelf(value) {
  return Array.isArray(value) ? value[value.length - 1] : value;
}

/**
 * Ensure that a value is in an array.
 *
 * @param {*} value
 * @returns {Array}
 */
export function ensureArray(value) {
  return Array.isArray(value) ? value : [value];
}

/**
 * Check whether a node is a heading node.
 *
 * @param {NodeLike} node
 * @param {boolean} [onlyHElements=false] Whether to only look for h1–h6 elements, not for elements
 *   with the mw-heading class (Vector 2022).
 * @returns {boolean}
 */
export function isHeadingNode(node, onlyHElements = false) {
  return isElement(node) && (
    /^H[1-6]$/.test(node.tagName) ||
    (!onlyHElements && node.classList.contains('mw-heading'))
  );
}

/**
 * Get a heading level (1–6) for a node.
 *
 * @param {NodeLike} node
 * @returns {?number}
 */
export function getHeadingLevel(node) {
  if (isElement(node)) {
    if (/^H([1-6])$/.test(node.tagName)) {
      return Number(RegExp.$1);
    } else if (node.classList.contains('mw-heading')) {
      const child = /** @type {ElementLike} */ (node).querySelector?.('h1, h2, h3, h4, h5, h6');
      if (child) {
        return Number(child.tagName[1]);
      }
    }
  }

  return null;
}

/**
 * Check whether a node is a text node.
 *
 * @param {any} node
 * @returns {node is TextLike}
 */
export function isText(node) {
  // Text nodes in the DOM have node type 3, CDATASection – 4, Comment – 8. Handlers' internal
  // structure might be different, e.g. we manually add a data property to text nodes, so we check
  // nodeType only when possible.
  if (!node) {
    return false;
  }

  // htmlparser2's text node has a "nodeType" property equal to Node.TEXT_NODE (3), and its type
  // property is "text".
  if (typeof Node !== 'undefined') {
    return node.nodeType === Node.TEXT_NODE;
  } else if (isDomHandlerNode(node)) {
    return node.type === 'text';
  } else {
    // Document's childNodes can contain non-object values on Android Browser
    return (
      typeof node === 'string' ||
      (typeof node === 'object' && node !== null && typeof node.data === 'string')
    );
  }
}

/**
 * Check whether a node is an element node.
 *
 * @param {any} node
 * @returns {node is ElementLike}
 */
export function isElement(node) {
  return isNode(node) && (typeof Element !== 'undefined' ? node instanceof Element : node.tagName);
}

/**
 * Check whether a value is a node.
 *
 * @param {any} node
 * @returns {node is NodeLike}
 */
export function isNode(node) {
  return Boolean(
    node && typeof node === 'object' && 'nodeType' in node
  );
}

/**
 * Check whether a node is from DomHandler (htmlparser2) context.
 *
 * @param {any} node
 * @returns {boolean}
 */
export function isDomHandlerNode(node) {
  return Boolean(node && 'type' in node && !('nodeType' in node));
}

/**
 * Check whether an element is from DomHandler (htmlparser2) context.
 *
 * @param {any} node
 * @returns {boolean}
 */
export function isDomHandlerElement(node) {
  return Boolean(node && node.type === 'tag' && !('nodeType' in node));
}

/**
 * Check whether a node is a meta tag, a style tag, a script tag, or a template styles tag.
 *
 * @param {NodeLike} node
 * @returns {boolean}
 */
export function isMetadataNode(node) {
  return (
    isElement(node) && (
      ['META', 'STYLE', 'SCRIPT', 'LINK'].includes(node.tagName) ||
      (node.tagName === 'SPAN' && node.getAttribute('class')?.includes('mw-tempate-style'))
    )
  );
}

/**
 * Convert HTML entities in a string to their corresponding characters.
 *
 * @param {string} string
 * @returns {string}
 */
export function decodeHtmlEntities(string) {
  try {
    return html_entity_decode(string.replace(/&nbsp;/g, ' '));
  } catch (e) {
    console.warn('Could not decode HTML entities in', string);
    throw new CdError();
  }
}

/**
 * Get a timestamp for the current day.
 *
 * @returns {string}
 */
export function getDayTimestamp() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = zeroPad(now.getUTCMonth() + 1);
  const day = zeroPad(now.getUTCDate());
  return `${year}${month}${day}`;
}

/**
 * Return a timestamp in a format with fixed positions. Used in localStorage keys and comment IDs.
 *
 * @param {Date} date
 * @param {boolean} [seconds=false]
 * @returns {string}
 */
export function generateFixedPosTimestamp(date, seconds) {
  date = new Date(date);
  const year = date.getUTCFullYear();
  const month = zeroPad(date.getUTCMonth() + 1);
  const day = zeroPad(date.getUTCDate());
  const hour = zeroPad(date.getUTCHours());
  const minute = zeroPad(date.getUTCMinutes());
  const secondsStr = seconds ? zeroPad(date.getUTCSeconds()) : '';
  return `${year}${month}${day}${hour}${minute}${secondsStr}`;
}

/**
 * Get the number of regexp matches in a string.
 *
 * @param {string} string
 * @param {RegExp} regexp
 * @returns {number}
 */
export function countOccurrences(string, regexp) {
  const matches = string.match(regexp);
  return matches ? matches.length : 0;
}

/**
 * Sleep an asynchronous function for some time.
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Get a database name for a wiki hostname.
 *
 * @param {string} hostname
 * @returns {?string}
 */
export function getDbnameForHostname(hostname) {
  // Helper function to clear a domain fragment of common prefixes and suffixes
  const clearPart = (part) => {
    if (part === 'org' || part === 'com') return part;
    return part
      .replace(/^(www|m|mobile|wap|web|ar|ca|de|el|en|es|fr|he|it|ja|ko|nl|pl|pt|ru|zh)$/, '')
      .replace(/\.?wikipedia\.org$/, '')
      .replace(/\.?wik(tionary|ibooks|iversity|imedia|iquote|isource|ivoyage|inews)\.org$/, '')
      .replace(/\.org$/, '')
      .replace(/\.com$/, '');
  };

  // Unroll the process for common hostnames
  const commonHostnames = {
    'wikimedia.org': 'commonswiki',
    'commons.wikimedia.org': 'commonswiki',
    'meta.wikimedia.org': 'metawiki',
    'www.mediawiki.org': 'mediawikiwiki',
    'mediawiki.org': 'mediawikiwiki',
    'ru.wikipedia.org': 'ruwiki',
    'en.wikipedia.org': 'enwiki',
    'de.wikipedia.org': 'dewiki',
    'fr.wikipedia.org': 'frwiki',
    'ja.wikipedia.org': 'jawiki',
    'wikidata.org': 'wikidatawiki',
    'www.wikidata.org': 'wikidatawiki',
  };

  if (hostname in commonHostnames) {
    return commonHostnames[hostname];
  }

  const parts = hostname.split('.');
  if (parts.length < 2) return null;

  // Handle complex wiki hostnames
  if (hostname.endsWith('wikipedia.org') || hostname.endsWith('.org')) {
    const domain = hostname.replace(/^(www|m)\./, '');

    let wikiSuffix;
    if (domain.includes('wiki') && !domain.startsWith('wiki')) {
      wikiSuffix = '';
    } else if (domain.includes('wiktionary')) {
      wikiSuffix = 'wiktionary';
    } else if (domain.includes('wikibooks')) {
      wikiSuffix = 'wikibooks';
    } else if (domain.includes('wikiversity')) {
      wikiSuffix = 'wikiversity';
    } else if (domain.includes('wikimedia')) {
      wikiSuffix = 'wikimedia';
    } else if (domain.includes('wikiquote')) {
      wikiSuffix = 'wikiquote';
    } else if (domain.includes('wikisource')) {
      wikiSuffix = 'wikisource';
    } else if (domain.includes('wikivoyage')) {
      wikiSuffix = 'wikivoyage';
    } else if (domain.includes('wikinews')) {
      wikiSuffix = 'wikinews';
    } else {
      wikiSuffix = 'wiki';
    }

    const prefix = domain.split('.')[0];

    if (prefix === 'www') return null;

    return prefix + wikiSuffix;
  }

  return null;
}

/**
 * Parse a wiki URL into components.
 *
 * @param {string} url
 * @returns {?{
 *   pageName: string;
 *   hostname: string;
 *   fragment: string|null;
 *   fullPrefixedText: string;
 *   path: string;
 *   params: object;
 *   search: string;
 *   protocol: string;
 * }}
 */
export function parseWikiUrl(url) {
  const match = url.match(
    /^(?:(https?:)\/\/)?([^/?#]+)([^?#]*)((?:\?[^#]*)?)((?:#.*)?)$/
  );

  if (match) {
    const hostname = match[2];
    const path = match[3];
    const search = match[4];
    const fragment = match[5] ? decodeURIComponent(match[5].slice(1)) : null;

    const pathMatch = path.match(/\/(?:wiki|[^/]+\/index\.php)\/(.+)$/);
    if (!pathMatch) return null;

    const pageName = decodeURIComponent(pathMatch[1]);
    const params = Object.fromEntries(new URLSearchParams(search));

    return {
      pageName,
      hostname,
      fragment,
      fullPrefixedText: pageName,
      path,
      params,
      search,
      protocol: match[1] || window.location.protocol,
    };
  }

  return null;
}

/**
 * Parse a canonical URL to get the page name.
 *
 * @param {string} url
 * @returns {?string}
 */
export function canonicalUrlToPageName(url) {
  const parsed = parseWikiUrl(url);
  return parsed ? parsed.pageName : null;
}

/**
 * Get a boolean value for a query parameter.
 *
 * @param {string|string[]|undefined} param
 * @returns {boolean}
 */
export function getQueryParamBooleanValue(param) {
  if (typeof param === 'string') {
    return (
      param === '1' ||
      param === 'true' ||
      param === 'yes' ||
      param === 'y' ||
      param === 'on'
    );
  } else if (Array.isArray(param)) {
    return param.some((item) => getQueryParamBooleanValue(item));
  }

  return false;
}

/**
 * Merge maps.
 *
 * @param {Map[]} maps
 * @returns {Map}
 */
export function mergeMaps(maps) {
  const result = new Map();

  maps.forEach((map) => {
    if (map instanceof Map) {
      map.forEach((value, key) => {
        result.set(key, value);
      });
    }
  });

  return result;
}

/**
 * @typedef {TruthyItem<T, P>[]} TruthyItemArray
 * @template T, P
 */

/**
 * @typedef {object} TruthyItem
 * @property {P} date
 * @template T, P
 */

/**
 * Generic function to find the oldest or newest item in a list of items with a date property.
 *
 * @template T, A
 * @param {T[]} items
 * @param {'oldest'|'newest'} which
 * @param {A} allowDateless
 * @returns {?(T & (A extends false ? { date: Date } : {}))}
 */
export function genericGetOldestOrNewestByDateProp(items, which, allowDateless) {
  const isOldest = which === 'oldest';
  const comparator = (a, b) => {
    if (a.date && b.date) {
      return isOldest ? a.date.getTime() - b.date.getTime() : b.date.getTime() - a.date.getTime();
    } else {
      return a.date ? -1 : b.date ? 1 : 0;
    }
  };

  const sorted = [...items].sort(comparator);

  if (sorted.length) {
    if (!allowDateless && !sorted[0].date) {
      return null;
    }

    return sorted[0];
  } else {
    return null;
  }
}

/**
 * Type-safe Object.keys().
 *
 * @param {T} obj
 * @returns {(keyof T)[]}
 * @template T
 */
export function typedKeysOf(obj) {
  return Object.keys(obj);
}

/**
 * Calculate a day from the past.
 *
 * @param {number} number
 * @returns {Date}
 */
export function subtractDaysFromNow(number) {
  const date = new Date();
  date.setDate(date.getDate() - number);

  return date;
}