import CdError from './CdError';
import TextMasker from './TextMasker';
import cd from './cd';
import { escapePipesOutsideLinks } from './wikitext';
import { generateTagsRegexp } from './wikitext';

const galleryRegexp = /^\x01\d+_gallery\x02$/m;

let filePatternEnd;

/**
 * Transform one line object, indexed `i`, so that it represents a list. Recursively do the same
 * with the lines of that list.
 *
 * @param {object[]} lines
 * @param {number} i
 * @param {object} list
 * @param {boolean} [isNested=false]
 * @private
 */
function lineToList(lines, i, list, isNested = false) {
  if (isNested) {
    const previousItemIndex = i - list.items.length - 1;
    if (previousItemIndex >= 0) {
      const item = {
        type: lines[previousItemIndex].type,
        items: [lines[previousItemIndex], list],
      };
      lines.splice(previousItemIndex, list.items.length + 1, item);
    } else {
      const item = {
        type: lines[0].type,
        items: [list],
      };
      lines.splice(i - list.items.length, list.items.length, item);
    }
  } else {
    lines.splice(i - list.items.length, list.items.length, list);
  }
  linesToLists(list.items, true);
}

/**
 * Transform line objects so that they represent lists.
 *
 * @param {object[]} lines
 * @param {boolean} [isNested=false]
 * @returns {object[]}
 * @private
 */
function linesToLists(lines, isNested = false) {
  let list = { items: [] };
  for (let i = 0; i <= lines.length; i++) {
    if (i === lines.length) {
      if (list.type) {
        lineToList(lines, i, list, isNested);
      }
    } else {
      const text = lines[i].text;
      const firstChar = text[0] || '';
      const listType = listTags[firstChar];
      if (list.type && listType !== list.type) {
        const itemsCount = list.items.length;
        lineToList(lines, i, list, isNested);
        i -= itemsCount - 1;
        list = { items: [] };
      }
      if (listType) {
        list.type = listType;
        list.items.push({
          type: itemTags[firstChar],
          text: text.slice(1),
        });
      }
    }
  }
  return lines;
}

/**
 * Convert a list object to a string with HTML tags.
 *
 * @param {object[]} lines
 * @param {boolean} [isNested=false]
 * @returns {string}
 * @private
 */
function listToTags(lines, isNested = false) {
  let text = '';
  lines.forEach((line, i) => {
    if (line.text === undefined) {
      const itemsText = line.items
        .map((item) => {
          const itemText = item.text === undefined ?
            listToTags(item.items, true) :
            item.text.trim();
          return item.type ? `<${item.type}>${itemText}</${item.type}>` : itemText;
        })
        .join('');
      text += `<${line.type}>${itemsText}</${line.type}>`;
    } else {
      text += isNested ? line.text.trim() : line.text;
    }
    if (i !== lines.length - 1) {
      text += '\n';
    }
  });
  return text;
}

const listTags = {
  ':': 'dl',
  ';': 'dl',
  '*': 'ul',
  '#': 'ol',
};
const itemTags = {
  ':': 'dd',
  ';': 'dt',
  '*': 'li',
  '#': 'li',
};

/**
 * Class that processes the comment form input and prepares the wikitext to insert into the page.
 */
class CommentFormInputTransformer extends TextMasker {
  /**
   * Create a comment form input processor.
   *
   * @param {string} text
   * @param {import('./CommentForm').default} commentForm
   * @param {string} action
   */
  constructor(text, commentForm, action) {
    super(text.trim());
    this.initialText = this.text;
    this.commentForm = commentForm;
    this.target = commentForm.getTarget();
    this.action = action;

    filePatternEnd = `\\[\\[${cd.g.filePrefixPattern}.+\\]\\]$(?:)`;

    this.initIndentationData();
  }

  /**
   * Set the properties related to indentation.
   *
   * @private
   */
  initIndentationData() {
    const targetSource = this.target.source;
    switch (this.commentForm.getMode()) {
      case 'reply': {
        this.indentation = targetSource.replyIndentation;
        break;
      }
      case 'edit': {
        this.indentation = targetSource.indentation;
        break;
      }
      case 'replyInSection': {
        const lastCommentIndentation = targetSource.extractLastCommentIndentation(this.commentForm);
        this.indentation = (
          lastCommentIndentation &&
          (lastCommentIndentation[0] === '#' || cd.config.indentationCharMode === 'mimic')
        ) ?
          lastCommentIndentation[0] :
          cd.config.defaultIndentationChar;
        break;
      }
      default: {
        this.indentation = '';
      }
    }

    if (this.indentation) {
      // In the preview mode, imitate a list so that the user will see where it would break on a
      // real page. This pseudolist's margin is made invisible by CSS.
      this.restLinesIndentation = this.action === 'preview' ?
        ':' :
        this.indentation.replace(/\*/g, ':');
    }
  }

  /**
   * Check whether the comment will be indented.
   *
   * @returns {boolean}
   */
  isIndented() {
    return Boolean(this.indentation);
  }

  /**
   * The main method that actually processes the code and returns the result.
   *
   * @returns {string}
   */
  transform() {
    return this
      .processAndMaskSensitiveCode()
      .findWrappers()
      .initSignatureAndFixCode()
      .processAllCode()
      .addHeadline()
      .addSignature()
      .addOutdent()
      .addTrailingNewline()
      .addIntentationChars()
      .unmask()
      .getText();
  }

  /**
   * Process (with {@link CommentFormInputTransformer#processCode}) and mask sensitive code,
   * updating {@link CommentFormInputTransformer#text}.
   *
   * @returns {CommentFormInputTransformer}
   * @private
   */
  processAndMaskSensitiveCode() {
    return this.maskSensitiveCode((code) => this.processCode(code, true));
  }

  /**
   * Find tags in the code and do something about them.
   *
   * @returns {CommentFormInputTransformer}
   * @private
   */
  findWrappers() {
    // Find tags around potential markup.
    if (this.indentation) {
      const tagMatches = this.text.match(generateTagsRegexp(['[a-z]+'])) || [];
      const quoteMatches = this.text.match(cd.g.quoteRegexp) || [];
      const matches = tagMatches.concat(quoteMatches);
      this.areThereTagsAroundListMarkup = matches.some((match) => /\n[:*#;]/.test(match));
    }

    // If the user wrapped the comment in `<small></small>`, remove the tags to later wrap the
    // comment together with the signature into the tags and possibly ensure the correct line
    // spacing.
    this.wrapInSmall = false;
    if (!this.commentForm.headlineInput) {
      this.text = this.text.replace(/^<small>([^]*)<\/small>$/i, (s, content) => {
        // Filter out <small>text</small><small>text</small>
        if (/<\/small>/i.test(content)) {
          return s;
        }
        this.wrapInSmall = true;
        return content;
      });
    }

    return this;
  }

  /**
   * Set the `signature` property. Also fix the code according to it.
   *
   * @returns {CommentFormInputTransformer}
   * @private
   */
  initSignatureAndFixCode() {
    if (this.commentForm.omitSignatureCheckbox?.isSelected()) {
      this.signature = '';
    } else {
      this.signature = this.commentForm.getMode() === 'edit' ?
        this.target.source.signatureCode :
        cd.g.userSignature;
    }

    // Make so that the signature doesn't turn out to be at the end of the last item of the list if
    // the comment contains one.
    if (
      this.signature &&

      // The existing signature doesn't start with a newline.
      !(this.commentForm.getMode() == 'edit' && /^[ \t]*\n/.test(this.signature)) &&

      /(^|\n)[:*#;].*$/.test(this.text)
    ) {
      this.text += '\n';
    }

    return this;
  }

  /**
   * Replace list markup (`:*#;`) with respective tags.
   *
   * @param {string} code
   * @returns {string}
   * @private
   */
  listMarkupToTags(code) {
    return listToTags(linesToLists(
      code
        .split('\n')
        .map((line) => ({
          type: '',
          text: line,
        }))
    ));
  }

  /**
   * Add indentation chars to the start of the line.
   *
   * @param {string} indentation
   * @param {string} line
   * @param {boolean} [addLine=true] Add the line itself.
   * @returns {string}
   * @private
   */
  prepareLineStart(indentation, line, addLine = true) {
    const addSpace = indentation && cd.config.spaceAfterIndentationChars && !/^[:*#;]/.test(line);
    return indentation + (addSpace ? ' ' : '') + (addLine ? line : '');
  }

  /**
   * Perform operations with code in an indented comment.
   *
   * @param {string} code
   * @param {boolean} isWrapped Is the code wrapped.
   * @returns {string}
   * @private
   */
  handleIndentedComment(code, isWrapped) {
    if (!this.indentation) {
      return code;
    }

    // Remove spaces at the beginning of lines.
    code = code.replace(/^ +/gm, '');

    // Remove paragraphs if the wiki has no paragraph template.
    if (!cd.config.paragraphTemplates.length) {
      code = code.replace(/\n\n+/g, '\n');
    }

    // Replace list markup (`:*#;`) with respective tags if otherwise layout will be broken.
    if (/^[:*#;]/m.test(code) && (isWrapped || this.restLinesIndentation === '#')) {
      code = this.listMarkupToTags(code);
    }

    // Add indentation characters to lines with the list and table markup as well as lines wholly
    // occupied by the file markup. File markup is tricky because, depending on the alignment and
    // line breaks, the result can be very different. The safest way to fight that is to use
    // indentation.
    const lineStartMarkupRegexp = new RegExp(`(\\n+)([:*#;\\x03]|${filePatternEnd})`, 'gmi');
    code = code.replace(lineStartMarkupRegexp, (s, newlines, nextLine) => {
      // Many newlines will be replaced with a paragraph template below. It could help visual
      // formatting. If there is no paragraph template, there won't be multiple newlines, as they
      // will have been removed above.
      const newlinesToAdd = newlines.length > 1 ? '\n\n\n' : '\n';
      const line = this.prepareLineStart(this.restLinesIndentation, nextLine);

      return newlinesToAdd + line;
    });

    // Add newlines before and after gallery (yes, even if the comment starts with it).
    code = code
      .replace(/(^|[^\n])(\x01\d+_gallery\x02)/g, (s, before, m) => before + '\n' + m)
      .replace(/\x01\d+_gallery\x02(?=(?:$|[^\n]))/g, (s) => s + '\n');

    // Table markup is OK only with colons as indentation characters.
    if (this.restLinesIndentation.includes('#') && code.includes('\x03')) {
      throw new CdError({
        type: 'parse',
        code: 'numberedList-table',
      });
    }

    if (this.restLinesIndentation === '#') {
      if (galleryRegexp.test(code)) {
        throw new CdError({
          type: 'parse',
          code: 'numberedList',
        });
      }
    }

    // Add indentation characters to lines following the lines with the list, table, and gallery
    // markup.
    const followingLinesRegexp = /^((?:[:*#;\x03].+|\x01\d+_gallery\x02))(\n+)(?![:#])/mg;
    code = code.replace(followingLinesRegexp, (s, previousLine, newlines) => {
      // Many newlines will be replaced with a paragraph template below. If there is no paragraph
      // template, there wouldn't be multiple newlines, as they would've been removed above.
      const newlinesToAdd = newlines.length > 1 ? '\n\n' : '';

      return previousLine + '\n' + this.prepareLineStart(this.restLinesIndentation, newlinesToAdd);
    });

    const paragraphCode = cd.config.paragraphTemplates.length ?
      `$1{{${cd.config.paragraphTemplates[0]}}}\n` :

      // Should be unreachable.
      `$1<br>\n`;
    code = code.replace(/^(.*)\n\n+(?!:)/gm, paragraphCode);

    return code;
  }

  /**
   * Process newlines by adding or not adding `<br>` and keeping or not keeping the newline. `\x01`
   * and `\x02` mean the beginning and ending of sensitive code except for tables. `\x03` and `\x04`
   * mean the beginning and ending of a table. Note: This should be kept coordinated with the
   * reverse transformation code in {@link CommentSource#toInput}.
   *
   * @param {string} code
   * @param {boolean} isInTemplate
   * @returns {string} code
   */
  processNewlines(code, isInTemplate = false) {
    const entireLineRegexp = new RegExp(/^(?:\x01\d+_(block|template)\x02) *$/);
    const entireLineFromStartRegexp = /^(=+).*\1[ \t]*$|^----/;
    const fileRegexp = new RegExp('^' + filePatternEnd, 'i');

    let currentLineInTemplates = '';
    let nextLineInTemplates = '';
    if (isInTemplate) {
      currentLineInTemplates = '|=';
      nextLineInTemplates = '|\\||}}';
    }
    const paragraphTemplatePattern = mw.util.escapeRegExp(`{{${cd.config.paragraphTemplates[0]}}}`);
    const currentLineEndingRegexp = new RegExp(
      `(?:<${cd.g.pniePattern}(?: [\\w ]+?=[^<>]+?| ?\\/?)>|<\\/${cd.g.pniePattern}>|\\x04|<br[ \\n]*\\/?>|${paragraphTemplatePattern}${currentLineInTemplates}) *$(?:)`,
      'i'
    );
    const nextLineBeginningRegexp = new RegExp(
      `^(?:<\\/${cd.g.pniePattern}>|<${cd.g.pniePattern}${nextLineInTemplates})`,
      'i'
    );

    const newlinesRegexp = this.indentation ?
      /^(.+)\n(?![:#])(?=(.*))/gm :
      /^((?![:*#; ]).+)\n(?![\n:*#; \x03])(?=(.*))/gm;
    code = code.replace(newlinesRegexp, (s, currentLine, nextLine) => {
      const lineBreakOrNot = (
        entireLineRegexp.test(currentLine) ||
        entireLineRegexp.test(nextLine) ||

        (
          !this.indentation &&
          (entireLineFromStartRegexp.test(currentLine) || entireLineFromStartRegexp.test(nextLine))
        ) ||
        fileRegexp.test(currentLine) ||
        fileRegexp.test(nextLine) ||
        galleryRegexp.test(currentLine) ||
        galleryRegexp.test(nextLine) ||

        // Removing <br>s after block elements is not a perfect solution as there would be no
        // newlines when editing such a comment, but this way we would avoid empty lines in cases
        // like "</div><br>".
        currentLineEndingRegexp.test(currentLine) ||
        nextLineBeginningRegexp.test(nextLine)
      ) ?
        '' :
        '<br>';

      // Current line can match galleryRegexp only if the comment will not be indented.
      const newlineOrNot = this.indentation && !galleryRegexp.test(nextLine) ? '' : '\n';

      return currentLine + lineBreakOrNot + newlineOrNot;
    });

    return code;
  }

  /**
   * Make the core code transformations.
   *
   * @param {string} code
   * @param {boolean} isInTemplate Is the code in a template.
   * @returns {string}
   * @private
   */
  processCode(code, isInTemplate) {
    code = this.handleIndentedComment(code, isInTemplate || this.areThereTagsAroundListMarkup);
    code = this.processNewlines(code, isInTemplate);
    return code;
  }

  /**
   * Make the core code transformations with all code.
   *
   * @returns {CommentFormInputTransformer}
   * @private
   */
  processAllCode() {
    this.text = this.processCode(this.text);
    return this;
  }

  /**
   * Add the headline to the code.
   *
   * @returns {CommentFormInputTransformer}
   * @private
   */
  addHeadline() {
    const headline = this.commentForm.headlineInput?.getValue().trim();
    if (!headline || (this.commentForm.isNewSectionApi() && this.action === 'submit')) {
      return this;
    }

    let level;
    if (this.commentForm.getMode() === 'addSection') {
      level = 2;
    } else if (this.commentForm.getMode() === 'addSubsection') {
      level = this.target.level + 1;
    } else {  // 'edit'
      level = this.target.source.headingLevel;
    }
    const equalSigns = '='.repeat(level);

    if (
      this.commentForm.getMode() === 'addSection' ||

      // To have pretty diffs.
      (
        this.commentForm.getMode() === 'edit' &&
        this.commentForm.getTarget().isOpeningSection &&
        /^\n/.test(this.target.source.code)
      )
    ) {
      this.text = '\n' + this.text;
    }
    this.text = `${equalSigns} ${headline} ${equalSigns}\n${this.text}`;

    return this;
  }

  /**
   * Add the signature to the code.
   *
   * @returns {CommentFormInputTransformer}
   * @private
   */
  addSignature() {
    if (!this.commentForm.omitSignatureCheckbox?.isSelected()) {
      // Remove signature tildes from the end of the comment.
      this.text = this.text.replace(/\s*~{3,}$/, '');
    }

    if (this.action === 'preview' && this.signature) {
      this.signature = `<span class="cd-commentForm-signature">${this.signature}</span>`;
    }

    // A space in the beggining of the last line, creating <pre>, or a heading.
    if (!this.indentation && /(^|\n)[ =].*$/.test(this.text)) {
      this.text += '\n';
    }

    // Remove starting spaces if the line starts with the signature.
    if (!this.text || this.text.endsWith('\n') || this.text.endsWith(' ')) {
      this.signature = this.signature.trimLeft();
    }

    // Process the small font wrappers, add the signature.
    if (this.wrapInSmall) {
      const before = /^[:*#; ]/.test(this.text) ?
        '\n' + (this.indentation ? this.restLinesIndentation : '') :
        '';
      if (cd.config.smallDivTemplates.length && !/^[:*#;]/m.test(this.text)) {
        const escapedCodeWithSignature = escapePipesOutsideLinks(this.text.trim()) + this.signature;
        this.text = `{{${cd.config.smallDivTemplates[0]}|1=${escapedCodeWithSignature}}}`;
      } else {
        this.text = `<small>${before}${this.text}${this.signature}</small>`;
      }
    } else {
      this.text += this.signature;
    }

    return this;
  }

  /**
   * Add an outdent template to the beginning of the comment.
   *
   * @returns {CommentFormInputTransformer}
   * @private
   */
  addOutdent() {
    if (!this.target.source?.isReplyOutdented) {
      return this;
    }

    const outdentDifference = this.target.level - this.target.source.replyIndentation.length;
    this.text = (
      `{{${cd.config.outdentTemplates[0]}|${outdentDifference}}}` +
      (/^[:*#]+/.test(this.text) ? '\n' : ' ') +
      this.text
    );

    return this;
  }

  /**
   * Add a newline to the code.
   *
   * @returns {CommentFormInputTransformer}
   * @private
   */
  addTrailingNewline() {
    if (this.commentForm.getMode() !== 'edit') {
      this.text += '\n';
    }

    return this;
  }

  /**
   * Add the indentation characters to the code.
   *
   * @returns {CommentFormInputTransformer}
   * @private
   */
  addIntentationChars() {
    // If the comment starts with a list or table, replace all asterisks in the indentation
    // characters with colons to have the comment HTML generated correctly.
    if (this.indentation && this.action !== 'preview' && /^[*#;\x03]/.test(this.text)) {
      this.indentation = this.restLinesIndentation;
    }

    if (this.action !== 'preview') {
      this.text = this.prepareLineStart(this.indentation, this.text);

      if (this.mode === 'addSubsection') {
        this.text += '\n';
      }
    } else if (this.action === 'preview' && this.indentation && this.initialText) {
      this.text = this.prepareLineStart(':', this.text);
    }

    return this;
  }
}

export default CommentFormInputTransformer;
