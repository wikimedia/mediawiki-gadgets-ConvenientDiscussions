/**
 * Main module.
 *
 * @module app
 */

import CONFIG_URLS from '../../config/urls.json';
import Comment from './Comment';
import I18N_LIST from '../../data/i18nList.json';
import LANGUAGE_FALLBACKS from '../../data/languageFallbacks.json';
import cd from './cd';
import controller from './controller';
import debug from './debug';
import defaultConfig from '../../config/default';
import g from './staticGlobals';
import pageRegistry from './pageRegistry';
import { addCommentLinksToSpecialSearch } from './addCommentLinks';
import {
  buildEditSummary,
  mergeRegexps,
  skin$,
  underlinesToSpaces,
  unique,
  wrap,
  wrapDiffBody,
} from './util';

let config;
if (IS_SINGLE) {
  try {
    config = require(`../../config/${CONFIG_FILE_NAME}`).default;
  } catch {
    // Empty
  }

  const replaceEntities = require('../../misc/util').replaceEntitiesInI18n;

  cd.i18n = {};
  cd.i18n.en = require('../../i18n/en.json');
  Object.keys(cd.i18n.en).forEach((name) => {
    cd.i18n.en[name] = replaceEntities(cd.i18n.en[name]);
  });
  if (LANG_CODE !== 'en') {
    cd.i18n[LANG_CODE] = require(`../../i18n/${LANG_CODE}.json`);
    const langObj = cd.i18n[LANG_CODE];
    Object.keys(cd.i18n[LANG_CODE])
      .filter((name) => typeof langObj[name] === 'string')
      .forEach((name) => {
        langObj[name] = replaceEntities(langObj[name]);
      });
    langObj.dayjsLocale = require(`dayjs/locale/${LANG_CODE}`);
    langObj.dateFnsLocale = require(`date-fns/locale`)[LANG_CODE];
  }
}

/**
 * Get a language string.
 *
 * @param {string} name String name.
 * @param {...*} [params] String parameters (substituted strings, also
 *   {@link module:userRegistry~User User} objects for use in `{{gender:}}`). The last parameter can
 *   be an object that can have a boolean property `plain` (should the message be returned in a
 *   plain, not substituted, form) or `parse` (should the message be returned in a parsed form). In
 *   the `parse` form, wikilinks are replaced with HTML tags, the code is sanitized. Use this for
 *   strings that have their raw HTML inserted into the page.
 * @returns {?string}
 * @memberof convenientDiscussions
 */
function s(name, ...params) {
  if (!name) {
    return null;
  }
  const fullName = `convenient-discussions-${name}`;
  let options = {};
  let lastParam = params[params.length - 1];
  if (
    typeof lastParam === 'object' &&

    // `mw.user`-like object to provide to {{gender:}}
    !lastParam.options
  ) {
    options = lastParam;
    params.splice(params.length - 1);
  }
  if (!cd.g.IS_QQX_MODE && typeof mw.messages.get(fullName) === 'string') {
    const message = mw.message(fullName, ...params);
    if (options.plain) {
      return message.plain();
    } else if (options.parse) {
      return message.parse();
    } else {
      return message.text();
    }
  } else {
    const paramsString = params.length ? `: ${params.join(', ')}` : '';
    return `(${fullName}${paramsString})`;
  }
}

/**
 * Get a language string in the "parse" format. Wikilinks are replaced with HTML tags, the code is
 * sanitized. Use this for strings that have their raw HTML inserted into the page.
 *
 * @param {string} name String name.
 * @param {...*} [params] String parameters (substituted strings, also
 *   {@link module:userRegistry~User User} objects for use in `{{gender:}}`).
 * @returns {?string}
 * @memberof convenientDiscussions
 */
function sParse(name, ...params) {
  return s(name, ...params, { parse: true });
}

/**
 * Get a language string in the "plain" format, with no substitutions.
 *
 * @param {string} name String name.
 * @returns {?string}
 * @memberof convenientDiscussions
 */
function sPlain(name) {
  return s(name, { plain: true });
}

/**
 * A foolproof method to access MediaWiki messages intended to be used instead of `mw.msg` to
 * eliminate any possibility of an XSS injection. By a programmer's mistake some `mw.msg` value
 * could be inserted into a page in a raw HTML form. To prevent this, this function should be used,
 * so if the message contains an injection (for example, brought from Translatewiki or inserted by a
 * user who doesn't have the `editsitejs` right but does have the `editinterface` right), the
 * function would sanitize the value.
 *
 * @param {string} name String name.
 * @param {...*} [params] String parameters (substituted strings, also
 *   {@link module:userRegistry~User User} objects for use in {{gender:}}). The last parameter can
 *   be an object that can have a string property `language`. If `language` is `'content'`, the
 *   returned message will be in the content langage (not the interface language).
 * @returns {string}
 * @memberof convenientDiscussions
 */
function mws(name, ...params) {
  let options;
  let lastParam = params[params.length - 1];
  if (typeof lastParam === 'object') {
    options = lastParam;
    params.splice(params.length - 1);
  }
  if (options && options.language === 'content') {
    name = '(content)' + name;
  }
  return mw.message(name, ...params).parse();
}

/**
 * Add the script's strings to `mw.messages`.
 *
 * @private
 */
function setStrings() {
  // Strings that should be displayed in the site language, not the user language.
  const contentStrings = [
    'es-',
    'cf-autocomplete-commentlinktext',
    'move-',
  ];

  if (!IS_SINGLE) {
    require('../../dist/convenientDiscussions-i18n/en.js');
  }
  const strings = {};
  Object.keys(cd.i18n.en).forEach((name) => {
    const relevantLang = contentStrings.some((contentStringName) => (
      name === contentStringName ||
      (contentStringName.endsWith('-') && name.startsWith(contentStringName))
    )) ?
      cd.g.CONTENT_LANGUAGE :
      cd.g.USER_LANGUAGE;
    strings[name] = cd.i18n[relevantLang]?.[name] || cd.i18n.en[name];
  });

  Object.keys(strings).forEach((name) => {
    mw.messages.set(`convenient-discussions-${name}`, strings[name]);
  });
}

/**
 * Set some global object properties.
 */
function setGlobals() {
  // Avoid setting the global object properties if go() runs the second time (see addFooterLink()).
  if (cd.g.SETTINGS_OPTION_NAME) return;

  /**
   * Script configuration. The default configuration is in {@link module:defaultConfig}.
   *
   * @name config
   * @type {object}
   * @memberof convenientDiscussions
   */
  cd.config = Object.assign(defaultConfig, cd.config);

  setStrings();

  // For historical reasons, ru.wikipedia.org has 'cd'.
  const localOptionsPrefix = location.hostname === 'ru.wikipedia.org' ?
    'cd' :
    'convenientDiscussions';
  cd.g.SETTINGS_OPTION_NAME = 'userjs-convenientDiscussions-settings';
  cd.g.LOCAL_SETTINGS_OPTION_NAME = `userjs-${localOptionsPrefix}-localSettings`;
  cd.g.VISITS_OPTION_NAME = `userjs-${localOptionsPrefix}-visits`;

  // For historical reasons, ru.wikipedia.org has 'watchedTopics'.
  const subscriptionsOptionNameEnding = location.hostname === 'ru.wikipedia.org' ?
    'watchedTopics' :
    'watchedSections';
  cd.g.SUBSCRIPTIONS_OPTION_NAME = (
    `userjs-${localOptionsPrefix}-${subscriptionsOptionNameEnding}`
  );

  const server = mw.config.get('wgServer');
  cd.g.SERVER = server.startsWith('//') ? location.protocol + server : server;

  // Worker's location object doesn't have the host name set.
  cd.g.HOSTNAME = location.hostname;

  cd.g.PAGE_NAME = underlinesToSpaces(mw.config.get('wgPageName'));
  cd.g.PAGE_TITLE = underlinesToSpaces(mw.config.get('wgTitle'));
  cd.g.NAMESPACE_NUMBER = mw.config.get('wgNamespaceNumber');

  // "<unregistered>" is a workaround for anonymous users (there are such!).
  cd.g.USER_NAME = mw.config.get('wgUserName') || '<unregistered>';

  const bodyClassList = document.body.classList;

  cd.g.PAGE_WHITELIST_REGEXP = mergeRegexps(cd.config.pageWhitelist);
  cd.g.PAGE_BLACKLIST_REGEXP = mergeRegexps(cd.config.pageBlacklist);
  cd.g.CONTENT_DIR = bodyClassList.contains('sitedir-rtl') ? 'rtl' : 'ltr';
  cd.g.SKIN = mw.config.get('skin');
  cd.g.IS_QQX_MODE = /[?&]uselang=qqx(?=&|$)/.test(location.search);

  // Quite a rough check for mobile browsers, a mix of what is advised at
  // https://stackoverflow.com/a/24600597 (sends to
  // https://developer.mozilla.org/en-US/docs/Browser_detection_using_the_user_agent) and
  // https://stackoverflow.com/a/14301832.
  cd.g.IS_MOBILE = (
    /Mobi|Android/i.test(navigator.userAgent) ||
    typeof window.orientation !== 'undefined'
  );

  cd.g.IS_DT_REPLY_TOOL_ENABLED = bodyClassList.contains('ext-discussiontools-replytool-enabled');
  cd.g.IS_DT_NEW_TOPIC_TOOL_ENABLED = bodyClassList
    .contains('ext-discussiontools-newtopictool-enabled');
  cd.g.IS_DT_TOPIC_SUBSCRIPTION_ENABLED = bodyClassList
    .contains('ext-discussiontools-topicsubscription-enabled');
}

/**
 * Add a footer link to enable/disable CD on this page once.
 *
 * @private
 */
function addFooterLink() {
  const enable = !controller.isTalkPage();
  const url = new URL(location.href);
  url.searchParams.set('cdtalkpage', enable ? '1' : '0');
  const $li = $('<li>').attr('id', 'footer-places-togglecd');
  const $a = $('<a>')
    .attr('href', url.toString())
    .addClass('noprint')
    .text(cd.s(enable ? 'footer-runcd' : 'footer-dontruncd'))
    .appendTo($li);
  if (enable) {
    $a.on('click', (e) => {
      if (!e.ctrlKey && !e.shiftKey && !e.metaKey) {
        e.preventDefault();
        history.pushState(history.state, '', url.toString());
        $li.remove();
        go();
      }
    });
  }
  skin$({
    monobook: '#f-list',
    modern: '#footer-info',
    default: '#footer-places',
  }).append($li);
}

/**
 * Change the destination of the "Add topic" button.
 */
function tweakAddTopicButton() {
  const $addTopicLink = $('#ca-addsection a');
  const href = $addTopicLink.prop('href');
  if (href) {
    const url = new URL(href);
    url.searchParams.delete('action');
    url.searchParams.delete('section');
    url.searchParams.set('cdaddtopic', 1);
    $addTopicLink.attr('href', url);
  }
}

/**
 * Function executed after the config and localization strings are ready.
 *
 * @fires preprocessed
 * @private
 */
async function go() {
  cd.debug.startTimer('start');

  setGlobals();
  controller.setup();

  // Process the page as a talk page
  if (mw.config.get('wgIsArticle')) {
    if (controller.isTalkPage()) {
      controller.loadToTalkPage();
    }
    addFooterLink();
  }

  if (
    controller.isArticlePageTalkPage() &&
    (mw.config.get('wgAction') !== 'view' || cd.g.IS_DT_NEW_TOPIC_TOOL_ENABLED)
  ) {
    tweakAddTopicButton();
  }

  // Process the page as a log page
  if (
    controller.isWatchlistPage() ||
    controller.isContributionsPage() ||
    controller.isHistoryPage() ||
    (controller.isDiffPage() && controller.isArticlePageTalkPage()) ||
    controller.isTalkPage()
  ) {
    controller.loadCommentLinks();
  }

  if (mw.config.get('wgCanonicalSpecialPageName') === 'Search') {
    addCommentLinksToSpecialSearch();
  }

  if (!controller.isBooting()) {
    cd.debug.stopTimer('start');
  }

  /**
   * The page has been preprocessed (not parsed yet, but its type has been checked and some
   * important mechanisms have been initialized).
   *
   * @event preprocessed
   * @param {object} cd {@link convenientDiscussions} object.
   */
  mw.hook('convenientDiscussions.preprocessed').fire(cd);
}

/**
 * Set language properties of the global object, taking fallback languages into account.
 *
 * @returns {boolean} Are fallbacks employed.
 * @private
 */
function setLanguages() {
  const getFallbackLanguage = (lang) => (
    (LANGUAGE_FALLBACKS[lang] || []).find((fallback) => I18N_LIST.includes(fallback)) ||
    'en'
  );
  const languageOrFallback = (lang) => I18N_LIST.includes(lang) ? lang : getFallbackLanguage(lang);

  cd.g.USER_LANGUAGE = languageOrFallback(mw.config.get('wgUserLanguage'));

  // Should we use a fallback for the content language? Maybe, but in case of MediaWiki messages
  // used for signature parsing we will have to use the real content language (see
  // siteData.loadSiteData). As a result, we use cd.g.CONTENT_LANGUAGE only for the script's own
  // messages, not the native MediaWiki messages.
  cd.g.CONTENT_LANGUAGE = languageOrFallback(mw.config.get('wgContentLanguage'));

  return !(
    cd.g.USER_LANGUAGE === mw.config.get('wgUserLanguage') &&
    cd.g.CONTENT_LANGUAGE === mw.config.get('wgContentLanguage')
  );
}

/**
 * Load and execute the configuration script if available.
 *
 * @returns {Promise}
 * @private
 */
function getConfig() {
  return new Promise((resolve, reject) => {
    let key = location.hostname;
    if (IS_TEST) {
      key += '-test';
    }
    const configUrl = CONFIG_URLS[key] || CONFIG_URLS[location.hostname];
    if (configUrl) {
      const rejectWithMsg = (e) => {
        reject(['Convenient Discussions can\'t run: couldn\'t load the configuration.', e]);
      };

      const [, gadgetName] = configUrl.match(/modules=ext.gadget.([^?&]+)/) || [];
      if (gadgetName && mw.user.options.get(`gadget-${gadgetName}`)) {
        // A gadget is enabled on the wiki, and it should be loaded and executed without any
        // additional requests; we just wait until it happens.
        mw.loader.using(`ext.gadget.${gadgetName}`).then(() => {
          resolve();
        });
        return;
      }
      mw.loader.getScript(configUrl).then(
        () => {
          resolve();
        },
        rejectWithMsg
      );
    } else {
      resolve();
    }
  });
}

/**
 * Load and add localization strings to the `cd.i18n` object. Use fallback languages if default
 * languages are unavailable.
 *
 * @returns {Promise}
 * @private
 */
function getStrings() {
  const requests = [cd.g.USER_LANGUAGE, cd.g.CONTENT_LANGUAGE]
    .filter(unique)
    .filter((lang) => lang !== 'en' && !cd.i18n?.[lang])
    .map((lang) => {
      const url = `https://commons.wikimedia.org/w/index.php?title=User:Jack_who_built_the_house/convenientDiscussions-i18n/${lang}.js&action=raw&ctype=text/javascript`;
      return mw.loader.getScript(url);
    });

  // We assume it's OK to fall back to English if the translation is unavailable for any reason.
  return Promise.all(requests).catch(() => {});
}

/**
 * Populate the {@link convenientDiscussions.api} object.
 */
function setupApi() {
  /**
   * Script's publicly available API. Here there are some utilities that we believe should be
   * accessible for external use.
   *
   * If you need some internal method to be available publicly, contact the script's maintainer (or
   * just make a relevant pull request).
   *
   * @namespace api
   * @memberof convenientDiscussions
   */
  cd.api = {};

  /**
   * @name pageRegistry
   * @type {object}
   * @see pageRegistry
   * @memberof convenientDiscussions.api
   */
  cd.api.pageRegistry = pageRegistry;

  /**
   * @see module:timestamp.generateCommentId
   * @function generateCommentId
   * @memberof convenientDiscussions.api
   */
  cd.api.generateCommentId = Comment.generateId;

  /**
   * @see module:timestamp.parseCommentId
   * @function parseCommentId
   * @memberof convenientDiscussions.api
   */
  cd.api.parseCommentId = Comment.parseId;

  /**
   * @see module:util.buildEditSummary
   * @function buildEditSummary
   * @memberof convenientDiscussions.api
   */
  cd.api.buildEditSummary = buildEditSummary;

  /**
   * @see module:util.isPageOverlayOn
   * @function isPageOverlayOn
   * @memberof convenientDiscussions.api
   */
  cd.api.isPageOverlayOn = controller.isPageOverlayOn;

  /**
   * @see module:util.wrap
   * @function wrap
   * @memberof convenientDiscussions.api
   */
  cd.api.wrap = wrap;

  /**
   * @see module:util.wrapDiffBody
   * @function wrapDiffBody
   * @memberof convenientDiscussions.api
   */
  cd.api.wrapDiffBody = wrapDiffBody;

  // TODO: Delete after all addons are updated.
  cd.util = cd.api;
  cd.api.Page = pageRegistry.Page;
  cd.api.generateCommentAnchor = cd.api.generateCommentId;
}

/**
 * The main script function.
 *
 * @fires launched
 * @private
 */
async function app() {
  if (cd.isRunning) {
    console.warn('One instance of Convenient Discussions is already running.');
    return;
  }

  /**
   * Is the script running.
   *
   * @name isRunning
   * @type {boolean}
   * @memberof convenientDiscussions
   */
  cd.isRunning = true;

  if (
    /(^|\.)m\./.test(location.hostname) ||
    mw.config.get('wgPageContentModel') !== 'wikitext' ||
    mw.config.get('wgIsMainPage')
  ) {
    return;
  }

  if (IS_SINGLE) {
    cd.config = config;
  }

  cd.debug = debug;
  cd.g = g;
  cd.s = s;
  cd.sParse = sParse;
  cd.sPlain = sPlain;
  cd.mws = mws;

  // Kind of temporary storage of objects of some script's features. Could be removed at any moment.
  cd.tests = {};

  setupApi();

  cd.debug.init();
  cd.debug.startTimer('total time');
  cd.debug.startTimer('loading config and strings');

  /**
   * The script has launched.
   *
   * @event launched
   * @param {object} cd {@link convenientDiscussions} object.
   */
  mw.hook('convenientDiscussions.launched').fire(cd);

  const areLanguageFallbacksEmployed = setLanguages();
  const getStringsPromise = areLanguageFallbacksEmployed ?
    getStrings() :

    // cd.getStringsPromise may be set in the configuration file.
    !cd.i18n && (cd.getStringsPromise || getStrings());

  try {
    await Promise.all([!cd.config && getConfig(), getStringsPromise]);
  } catch (e) {
    console.error(e);
    return;
  }

  cd.debug.stopTimer('loading config and strings');

  $(go);
}

app();
