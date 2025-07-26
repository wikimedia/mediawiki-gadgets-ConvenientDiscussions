/**
 * Wikitext parsing and processing utilities.
 *
 * @module utilsWikitext
 */

import cd from './cd';
import { decodeHtmlEntities, generatePageNamePattern, removeDirMarks } from './utils-general';

/**
 * Generate a regular expression that searches for specified tags in the text (opening, closing, and
 * content between them).
 *
 * @param {string[]} tags
 * @returns {RegExp}
 */
export function generateTagsRegexp(tags) {
  const tagsJoined = tags.join('|');
  return new RegExp(`(<(${tagsJoined})(?: [\\w ]+(?:=[^<>]+?)?| *)>)([^]*?)(</\\2>)`, 'ig');
}

/**
 * Replace HTML comments (`<!-- -->`), `<nowiki>`, `<syntaxhighlight>`, `<source>`, and `<pre>` tags
 * content, left-to-right and right-to-left marks, and also newlines inside some tags (`<br\n>`) in
 * the code with spaces.
 *
 * This is used to ignore comment contents (there could be section code examples for novices there
 * that could confuse search results) but get right positions and code in the result.
 *
 * @param {string} code
 * @returns {string}
 */
export function maskDistractingCode(code) {
  return code
    .replace(
      generateTagsRegexp(['nowiki', 'syntaxhighlight', 'source', 'pre']),
      (s, before, tagName, content, after) => before + ' '.repeat(content.length) + after
    )
    .replace(/<!--([^]*?)-->/g, (s, content) => '\x01' + ' '.repeat(content.length + 5) + '\x02')
    .replace(/[\u200e\u200f]/g, () => ' ')
    .replace(
      /(<\/?(?:br|p)\b.*)(\n+)(>)/g,
      (s, before, newline, after) => before + ' '.repeat(newline.length) + after
    );
}

/**
 * Find the first timestamp related to a comment in the code.
 *
 * @param {string} code
 * @returns {?string}
 */
export function findFirstTimestamp(code) {
  return extractSignatures(code)[0]?.timestamp || null;
}

/**
 * Remove certain kinds of wiki markup from code, such as formatting, links, tags, and comments.
 * Also replace multiple spaces with one and trim the input. The product of this function is usually
 * not for display (for example, it just removes template names making the resulting code look
 * silly), but for comparing purposes.
 *
 * @param {string} code
 * @returns {string}
 */
export function removeWikiMarkup(code) {
  // Ideally, only text from images in the `thumb` format should be captured, because in the
  // standard format the text is not displayed. See img_thumbnail in
  // https://ru.wikipedia.org/w/api.php?action=query&meta=siteinfo&siprop=magicwords&formatversion=2.
  // Unfortunately, that would add like 100ms to the server's response time. So, we use it if it is
  // present in the config file.
  // eslint-disable-next-line no-one-time-vars/no-one-time-vars
  const fileEmbedRegexp = new RegExp(
    `\\[\\[${cd.g.filePrefixPattern}[^\\]]+?(?:\\|[^\\]]+?\\| *((?:\\[\\[[^\\]]+?\\]\\]|[^|\\]])+))? *\\]\\]`,
    'ig'
  );

  return code
    // Remove comments
    .replace(/<!--[^]*?-->/g, '')

    // Remove text hidden by the script (for example, in wikitext.maskDistractingCode)
    .replace(/\x01 *\x02/g, '')

    // Pipe trick
    .replace(cd.g.pipeTrickRegexp, '$1$2$3')

    // Extract displayed text from file embeddings
    .replace(fileEmbedRegexp, (s, m) => cd.g.isThumbRegexp.test(s) ? m : '')

    // Extract displayed text from [[wikilinks]]
    .replace(/\[\[:?(?:[^|[\]<>\n]+\|)?(.+?)\]\]/g, '$1')

    // For optimization purposes, remove template names
    .replace(/\{\{:?(?:[^|{}<>\n]+)(?:\|(.+?))?\}\}/g, '$1')

    // Extract displayed text from [links]
    .replace(/\[https?:\/\/[^[\]<>"\n ]+ *([^\]]*)\]/g, '$1')

    // Magic links
    .replace(/RFC ?(\d+)/g, '')
    .replace(/PMID ?(\d+)/g, '')
    .replace(/ISBN ((?:\d[ -]?)+)/g, '')

    // Remove some other things
    .replace(/^[*#:]+\s*/gm, '')

    .replace(/'/g, '')
    .replace(
      // Thanks to
      // https://github.com/wikimedia/mediawiki-extensions-CodeMirror/blob/29ea753296/resources/mode/mediawiki/mediawiki.js#L481
      /<\/?(?:nowiki|pre|source|syntaxhighlight|poem|ref|imagemap|categorytree|hiero|charinsert|timeline|gallery|includeonly|noinclude|onlyinclude)\b[^>]*?>/g,
      ''
    )
    .replace(/'{2,}/g, '')
    .replace(/''/g, '')
    .replace(/^(?:=+)(.*?)(?:=+)/gm, '$1')

    .replace(/ {2,}/g, ' ')
    .trim();
}

/**
 * Normalize code (replace tabs with spaces and normalize newlines).
 *
 * @param {string} text
 * @returns {string}
 */
export function normalizeCode(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, '    ');
}

/**
 * Encode the part of a wikilink after the pipe.
 *
 * @param {string} link
 * @returns {string}
 */
export function encodeWikilink(link) {
  const containsExternalLink = /\[(https?:\/\/[^[\]<>"\s]+) ([^\]]*?)\]/.test(link);
  if (containsExternalLink) {
    link = link.replace(/\[(https?:\/\/[^[\]<>"\s]+) ([^\]]*?)\]/g, '[¯¯$1¯¯ $2]');
  }

  // Fill WikiEditor's features
  link = link
    // File with a custom title / thumbnail / features
    .replace(
      /\[\[(ファイル|파일|檔案|档案|文件|פייל|ملف|پرونده|फाइल|Файл|Datei|File|Fitxer|Fichier|Arxivu|Dosiero|Datoteka|Plik|Fasciculus|Soubor|Fail|Image)(:[^[\]]*?)(?:\|([^[\]|]*?))*?\]\]/gi,
      (s, namespace, title, rest) => `[[${namespace}:${title}|${encodeWikilink(rest)}]]`
    )

    // Categories with a custom sort key
    .replace(
      /\[\[(?:((?:.+?):))?(분류|分類|분류|الصنف|التصنيف|קטגוריה|טעגאריע|श्रेणी|বিষয়শ্রেণী|Categoria|Categoría|Catégorie|Категория|Categoria|Categorie|Kategorie|Kategoria|Category)(:(?:.+?))?(?:\|(.+?))?\]\]/gi,
      (s, interwiki, namespace, title, rest) => {
        const left = [
          interwiki,
          namespace,
          ':',
          title,
        ].filter((e) => e).join('');
        return `[[${left}|${encodeWikilink(rest)}]]`;
      }
    )

    // Simple links with a custom name
    .replace(/\[\[((?:[^|[\]]+?:)?[^|[\]]+?)(?:\|(.+?))?\]\]/g, (s, title, rest) => {
      if (rest) {
        rest = rest
          .replace(/\[\[/g, '⦃')
          .replace(/\]\]/g, '⦄');
        return `[[${title}|${rest}]]`;
      } else {
        return s;
      }
    });

  if (containsExternalLink) {
    link = link.replace(/\[¯¯(https?:\/\/[^[\]<>"\s]+)¯¯ ([^\]]*?)\]/g, '[$1 $2]');
  }

  return link;
}

/**
 * Extract user signatures (name, timestamp, and position) from the comment text.
 *
 * @param {string} code
 * @returns {object[]}
 */
export function extractSignatures(code) {
  // We get more accurate results when the input is cleaned from HTML comments etc.
  const adjustedCode = maskDistractingCode(code);
  let cleanCode = code;

  const signatures = [];
  // Both unsigned templates and regular signatures to find
  extractRegularSignatures(adjustedCode, code, signatures);
  extractUnsigneds(adjustedCode, code, signatures);

  signatures.sort((a, b) => a.position - b.position);

  return signatures;
}

/**
 * Extract regular signatures (ending with `~~~~`).
 *
 * @param {string} adjustedCode
 * @param {string} code
 * @param {object[]} signatures
 * @private
 */
function extractRegularSignatures(adjustedCode, code, signatures) {
  if (!cd.g.signatureRegexp) return;

  adjustedCode.replace(cd.g.signatureRegexp, (s, userName, timestamp, offset) => {
    if (cd.g.signatureEndingRegexp?.test(s)) {
      const signature = {
        name: decodeHtmlEntities(removeDirMarks(userName, true)),
        timestamp,
        position: offset,
      };

      if (cd.g.locale === 'ru') {
        const trustworthy = userName.match(/^(.*?) ?\(обс\.?\)$/);
        if (trustworthy) {
          signature.name = trustworthy[1];
        }
      }

      signatures.push(signature);
    }

    return '';
  });

  // Get the exact spans for highlighting (this way we can bypass the Wiki's additional processing
  // such as removal of HTML comments from the signatures when we search in the raw wikitext)
  for (const signature of signatures) {
    // JS doesn't have a method to get a match with surrounding context without a lot of additional
    // code, so we just check a bunch of possible spans based on the position of timestamp.
    // scanCharsForNameAndTimestamp is determined experimentally.
    const scanCharsForNameAndTimestamp = cd.g.locale === 'ru' ? 400 : 300;
    const extractSubstr = (pos) => {
      const start = Math.max(0, pos - scanCharsForNameAndTimestamp);
      return code.substr(start, pos - start + 20);
    };

    // Now we are trying to restore the timestamp from the raw wikitext. The regexp matching is
    // needed to include the timestamp in the signature.
    const chunk1 = extractSubstr(signature.position + signature.name.length);

    let match;
    try {
      match = chunk1.match(new RegExp(signature.timestamp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    } catch (e) {
      match = null;
    }

    if (match) {
      const offset = match.index;
      if (offset !== null) {
        signature.name += chunk1.substring(0, offset);
        signature.rawPosition = signature.position - scanCharsForNameAndTimestamp + offset;
      }
    } else {
      const chunk2 = extractSubstr(signature.position);
      // This may produce false positives if someone has removed part of the signature, but there
      // is no other way to link timestamp to name without a very specific per-wiki regexp.
      try {
        match = chunk2.match(cd.g.signatureEndingRegexp);
      } catch (e) {
        match = null;
      }
      if (match && match.index !== null) {
        signature.rawPosition =
          signature.position - scanCharsForNameAndTimestamp + match.index + match[0].length;
      }
    }
  }
}

/**
 * Extract signatures generated by unsigned templates.
 *
 * @param {string} adjustedCode
 * @param {string} code
 * @param {object[]} signatures
 * @private
 */
function extractUnsigneds(adjustedCode, code, signatures) {
  if (!cd.g.unsignedRegexp) return;

  /*
    {{Нет подписи|МедиаВики сообщение|17:40, 3 сентября 2018 (UTC)}}
    {{Unsigned|owner=JShell|timestamp=17:53, 15 September 2017 (UTC)}}
    {{unsigned|Jonesey95|11:24, 16 August 2013}}
    {{User:Mr. Stradivarius/undated}}
    {{undated}}
  */
  let match;
  try {
    match = adjustedCode.match(cd.g.unsignedRegexp);
  } catch (e) {
    match = null;
  }
  if (!match) return;

  const unsignedMatches = Array.from(match);

  code.replace(cd.g.unsignedRegexp, (s, name, timestampText, offset) => {
    // Take names from raw wikitext as the signatures (templates) are quite complex. This is a bit
    // risky because of false positives.
    name = (
      s.match(/template_editor *= *([^|}}]+)/) ||
      s.match(/\| *1 *= *([^|}}]+)/) ||
      s.match(/\|(.*?)(?:={2,}|\||}}$)/) ||
      []
    )[1];
    name = name && name.trim();

    timestampText ||= (s.match(/timestamp *= *([^|}}]+)/) || [])[1];
    timestampText = timestampText?.trim();

    // These templates are sometimes used in HTML comments which function as "removal dates" for
    // templates.
    const offsetIsInHtmlComment = adjustedCode.indexOf('\x01', offset - 5) > -1 &&
      adjustedCode.indexOf('\x02', offset + s.length) > -1;

    if (!offsetIsInHtmlComment && name) {
      const isUndated = !timestampText || /^undated/i.test(s);

      if (!isUndated) {
        const parsedTimestamp = parseTimestamp(timestampText);
        if (parsedTimestamp) {
          const signature = {
            name: decodeHtmlEntities(removeDirMarks(name, true)),
            timestamp: timestampText,
            position: offset,
            rawPosition: offset + s.length,
          };

          signatures.push(signature);
        }
      }
    }

    return '';
  });
}

/**
 * End the string with two newlines if the original string has less than two trailing newlines.
 *
 * @param {string} code
 * @returns {string}
 */
export function endWithTwoNewlines(code) {
  return code.replace(/\n*$/, '\n\n');
}

/**
 * Convert `<br>` and `<br/>` tags to newlines.
 *
 * @param {string} code
 * @param {string} [replacement='\n']
 * @returns {string}
 */
export function brsToNewlines(code, replacement = '\n') {
  return code
    .replace(
      /<br ?\/?>/gi,
      replacement
    )
    .replace(
      /{{(nl|newline)(?:| ?\d*) ?}}/gi,
      (s, template, count) => {
        count = Number(count);

        if (count) {
          return replacement.repeat(count);
        } else {
          return replacement;
        }
      }
    );
}

/**
 * Replace `|` outside of links with `/` to avoid breaking of templates.
 *
 * @param {string} code
 * @param {TextMasker} [maskedTexts]
 * @returns {string}
 */
export function escapePipesOutsideLinks(code, maskedTexts) {
  // Value to insert instead of a pipe
  const pipe = '/';
  if (!code.includes('|')) {
    return code;
  }

  let preparedCode;
  if (maskedTexts instanceof TextMasker) {
    preparedCode = maskedTexts.process(code);
  } else {
    preparedCode = code;
  }

  // We should not replace:
  // 1. Pipes in links: [[Page|title]] and [https://... text]
  // 2. Pipes in piped parameter names: {{template |a=3}}
  preparedCode = preparedCode.replace(/\[\[[^[\]|]+\|([^[\]\|]+)\]\]/g, (s) => ' '.repeat(s.length));
  preparedCode = preparedCode.replace(/\[[^[\]|]+ ([^[\]\|]+)\]/g, (s) => ' '.repeat(s.length));
  preparedCode = preparedCode.replace(/\| *[\w ]+ *=/g, (s) => ' '.repeat(s.length));

  // Replace all remaining pipes
  const result = code.split('');
  let offset = 0;
  for (let i = 0; i < result.length; i++) {
    if (i + offset >= preparedCode.length) break;
    if (result[i] === '|' && preparedCode[i + offset] === '|') {
      result[i] = pipe;
    } else if (
      result[i] !== ' ' && result[i] !== '\n' && preparedCode[i + offset] === ' '
    ) {
      offset++;
      i--;
    }
  }

  return result.join('');
}

/**
 * Extract numerals (consisting of digits from the specified set) from a string and convert them to
 * a number.
 *
 * @param {string} s
 * @param {string} [digits='0123456789']
 * @returns {?number}
 */
export function extractNumeralAndConvertToNumber(s, digits = '0123456789') {
  const digitsArray = [...digits];
  if (!s) return null;

  // Convert input into equivalent with Latin digits.
  let latinDigits = '';
  for (const char of s) {
    const index = digitsArray.indexOf(char);
    if (index !== -1) {
      latinDigits += index;
    }
  }
  return latinDigits ? Number(latinDigits) : null;
}