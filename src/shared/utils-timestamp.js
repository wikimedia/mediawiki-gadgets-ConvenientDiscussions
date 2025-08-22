/**
 * Comment timestamp processing utilities. Timestamp formats are set in {@link module:siteData}.
 * Functions related to wikitext parsing go in {@link module:wikitext}.
 *
 * Terminology used here (and in other modules):
 * - "date" is a `Date` object,
 * - "timestamp" is a string date as it is present on wiki pages (`23:29, 10 May 2019 (UTC)`).
 *
 * @module utilsTimestamp
 */

// Note: cd.settings is used in this module instead of imported "settings" to prevent adding that
// module to the worker build (and a lot of others together with it).

import { formatDistanceToNowStrict } from 'date-fns';
import { getTimezoneOffset } from 'date-fns-tz';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

import cd from './cd';
import { getContentLanguageMessages, removeDirMarks, zeroPad } from './utils-general';

let utcString;

export const dateTokenToMessageNames = {
  xg: [
    'january-gen', 'february-gen', 'march-gen', 'april-gen', 'may-gen', 'june-gen', 'july-gen',
    'august-gen', 'september-gen', 'october-gen', 'november-gen', 'december-gen'
  ],
  D: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
  l: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
  F: [
    'january', 'february', 'march', 'april', 'may_long', 'june', 'july', 'august', 'september',
    'october', 'november', 'december'
  ],
  M: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
};

/**
 * Some numbers for several units used in calculations needed to update relative
 * {@link LiveTimestamp timestamps}. 1 means 1 minute.
 *
 * @typedef {object} RelativeTimeThreshold
 * @property {number} range The top of the number range for the unit (e.g. 60 for minutes)
 * @property {number} start The start of the number range for the unit (e.g. 1 for minutes; don't
 *   need 0 because that would be taken care of by the previous loop iteration as minute 60 [= the
 *   first minute of the next hour])
 * @property {number} step How often the relative timestamp should update (e.g. 1 for minutes)
 */

/**
 * @type {RelativeTimeThreshold[]}
 */
export const relativeTimeThresholds = [
  // Seconds
  {
    range: 1,
    start: 0,
    step: 1,
  },

  // Minutes
  {
    range: 60,
    start: 1,
    step: 1,
  },

  // Hours
  {
    range: 60 * 24,
    start: 60,
    step: 60,
  },

  // Days
  {
    range: 60 * 24 * 31,
    start: 60 * 24,
    step: 60 * 24,
  },

  // We don't update months and years. Additional `setTimeout`s are costly, and an algorithm for
  // them is also too complex.
];

/**
 * _For internal use._ Prepare `dayjs` object for further use (add plugins and a locale).
 */
export function initDayjs() {
  if (/** @type {typeof dayjs.utc | undefined} */ (dayjs.utc)) return;

  const locale = cd.i18n[cd.g.userLanguage]?.dayjsLocale;
  if (locale) {
    dayjs.locale(locale);
  }

  dayjs.extend(utc);
  dayjs.extend(timezone);
}

/**
 * Parse a timestamp, accepting a regexp match and returning a date.
 *
 * @param {string[]} match Regexp match data.
 * @param {string|number} [timezone] Timezone standard name or offset in minutes. If set, it is
 *   implied that the timestamp is in the user (interface) language, not in the content language.
 * @returns {Date}
 * @author Bartosz Dziewoński <matma.rex@gmail.com>
 * @author Jack who built the house
 * @license MIT
 */
export function getDateFromTimestampMatch(match, timezone) {
  let isContentLanguage = false;
  if (timezone === undefined) {
    isContentLanguage = true;
    timezone = cd.g.contentTimezone || 'UTC';
  }

  const digits = isContentLanguage ? cd.g.contentDigits : cd.g.uiDigits;
  const matchingGroups = isContentLanguage ?
    cd.g.contentTimestampMatchingGroups :
    cd.g.uiTimestampMatchingGroups;

  const untransformDigits = (/** @type {string} */ text) => {
    if (!digits) {
      return text;
    }

    return text.replace(
      new RegExp('[' + digits + ']', 'g'),
      (m) => String(digits.indexOf(m))
    );
  };

  let year = 0;
  let monthIdx = 0;
  let day = 0;
  let hours = 0;
  let minutes = 0;

  for (const [i, code] of matchingGroups.entries()) {
    const text = match[i + 3];

    switch (code) {
      case 'xg':
      case 'F':
      case 'M': {
        // The worker context doesn't have mw.msg(), but isContentLanguage should be always `true`
        // there.
        monthIdx = (
          // Messages
          isContentLanguage ?
            getContentLanguageMessages(dateTokenToMessageNames[code]) :
            dateTokenToMessageNames[code].map((token) => mw.msg(token))
        ).indexOf(text);
        break;
      }
      case 'd':
      case 'j':
        day = Number(untransformDigits(text));
        break;
      case 'D':
      case 'l':
        // Day of the week - unused
        break;
      case 'n':
        monthIdx = Number(untransformDigits(text)) - 1;
        break;
      case 'Y':
        year = Number(untransformDigits(text));
        break;
      case 'xkY':
        // Thai year
        year = Number(untransformDigits(text)) - 543;
        break;
      case 'G':
      case 'H':
        hours = Number(untransformDigits(text));
        break;
      case 'i':
        minutes = Number(untransformDigits(text));
        break;
      default:
        throw 'Not implemented';
    }
  }

  const unixTime = Date.UTC(year, monthIdx, day, hours, minutes);
  return new Date(
    unixTime -

    // Timezone offset
    (
      typeof timezone === 'number'
        ? timezone * cd.g.msInMin
        : timezone === 'UTC'
        ? 0

        // Using date-fns-tz's getTimezoneOffset() is way faster than day.js's methods.
        : getTimezoneOffset(timezone, unixTime)
    )
  );
}

/**
 * @typedef {object} ParseTimestampReturn
 * @property {Date} date
 * @property {RegExpMatchArray} match
 */

/**
 * Parse a timestamp and return a date and a match object.
 *
 * @param {string} timestamp
 * @param {string|number} [timezone] Standard timezone name or offset in minutes. If set, it is
 *   implied that the timestamp is in the user (interface) language, not in the content language.
 * @returns {?ParseTimestampReturn}
 */
export function parseTimestamp(timestamp, timezone) {
  // Remove left-to-right and right-to-left marks that are sometimes copied from edit history to the
  // timestamp (for example, https://meta.wikimedia.org/w/index.php?diff=20418518). Replace with a
  // space to keep offsets.
  const match = removeDirMarks(timestamp, true).match(
    timezone === undefined ? cd.g.parseTimestampContentRegexp : cd.g.parseTimestampUiRegexp
  );
  if (!match) {
    return null;
  }

  return {
    date: getDateFromTimestampMatch(match, timezone),
    match,
  };
}

/**
 * Generate a timezone postfix of a timestamp for an offset.
 *
 * @param {number} offset Offset in minutes.
 * @returns {string}
 * @private
 */
function generateTimezonePostfix(offset) {
  utcString ||= cd.mws('timezone-utc');
  let postfix = ` (${utcString}`;

  if (offset !== 0) {
    // `offset` is not necessarily an integer
    postfix += (offset > 0 ? '+' : '-') + Math.abs(offset / 60);
  }
  postfix += ')';

  return postfix;
}

/**
 * Convert a date to a string in the format set in the settings.
 *
 * @param {Date} date
 * @param {boolean} [addTimezone=false]
 * @returns {string}
 */
export function formatDate(date, addTimezone = false) {
  let timestamp;
  const timestampFormat = /** @type {import('./cd').ConvenientDiscussions} */ (cd).settings.get(
    'timestampFormat'
  );
  if (timestampFormat === 'default') {
    timestamp = formatDateNative(date, addTimezone);
  } else if (timestampFormat === 'improved') {
    timestamp = formatDateImproved(date, addTimezone);
  } else {  // if (timestampFormat === 'relative')
    timestamp = formatDateRelative(date);
  }

  return timestamp;
}

/**
 * Convert a date to a string in the default timestamp format.
 *
 * @param {Date} date
 * @param {boolean} [addTimezone=false] Add the timezone postfix (for example, "(UTC+2)").
 * @param {string} [timezone] Use the specified time zone no matter user settings.
 * @returns {string}
 */
export function formatDateNative(date, addTimezone = false, timezone) {
  let timezoneOffset;
  let year;
  let monthIdx;
  let day;
  let hours;
  let minutes;
  let dayOfWeek;
  if (cd.settings.get('useUiTime') && !['UTC', 0, null].includes(cd.g.uiTimezone) && !timezone) {
    if (cd.g.areUiAndLocalTimezoneSame) {
      timezoneOffset = -date.getTimezoneOffset();
    } else {
      timezoneOffset = typeof cd.g.uiTimezone === 'number' ?
        cd.g.uiTimezone :

        // Using date-fns-tz's getTimezoneOffset is way faster than using day.js's methods.
        getTimezoneOffset(/** @type {string} */ (cd.g.uiTimezone), date.getTime()) / cd.g.msInMin;
    }
    date = new Date(date.getTime() + timezoneOffset * cd.g.msInMin);
  } else if (!timezone || timezone === 'UTC') {
    timezoneOffset = 0;
  } else {
    const dayjsDate = dayjs(date).tz(timezone);
    timezoneOffset = dayjsDate.utcOffset();
    year = dayjsDate.year();
    monthIdx = dayjsDate.month();
    day = dayjsDate.date();
    hours = dayjsDate.hour();
    minutes = dayjsDate.minute();
    dayOfWeek = dayjsDate.day();
  }
  year ??= date.getUTCFullYear();
  monthIdx ??= date.getUTCMonth();
  day ??= date.getUTCDate();
  hours ??= date.getUTCHours();
  minutes ??= date.getUTCMinutes();
  dayOfWeek ??= date.getUTCDay();

  let string = '';
  const format = cd.g.uiDateFormat;
  for (let p = 0; p < format.length; p++) {
    let code = format[p];
    if ((code === 'x' && p < format.length - 1) || (code === 'xk' && p < format.length - 1)) {
      code += format[++p];
    }

    switch (code) {
      case 'xx':
        string += 'x';
        break;
      case 'xg':
      case 'F':
      case 'M':
        string += dateTokenToMessageNames[code].map((token) => mw.msg(token))[monthIdx];
        break;
      case 'd':
        string += zeroPad(day, 2);
        break;
      case 'D':
      case 'l': {
        string += dateTokenToMessageNames[code].map((token) => mw.msg(token))[dayOfWeek];
        break;
      }
      case 'j':
        string += day;
        break;
      case 'n':
        string += monthIdx + 1;
        break;
      case 'Y':
        string += year;
        break;
      case 'xkY':
        string += year + 543;
        break;
      case 'G':
        string += hours;
        break;
      case 'H':
        string += zeroPad(hours, 2);
        break;
      case 'i':
        string += zeroPad(minutes, 2);
        break;
      case '\\':
        // Backslash escaping
        if (p < format.length - 1) {
          string += format[++p];
        } else {
          string += '\\';
        }
        break;
      case '"':
        // Quoted literal
        if (p < format.length - 1) {
          const endQuote = format.indexOf('"', p + 1)
          if (endQuote === -1) {
            // No terminating quote, assume literal "
            string += '"';
          } else {
            string += format.substr(p + 1, endQuote - p - 1);
            p = endQuote;
          }
        } else {
          // Quote at end of string, assume literal "
          string += '"';
        }
        break;
      default:
        string += format[p];
    }
  }

  if (addTimezone) {
    string += generateTimezonePostfix(timezoneOffset);
  }

  return string;
}

/**
 * Format a date in the "improved" format.
 *
 * @param {Date} date
 * @param {boolean} addTimezone
 * @returns {string}
 */
export function formatDateImproved(date, addTimezone = false) {
  let now = new Date();
  let dayjsDate = dayjs(date);
  let timezoneOffset;
  if (cd.settings.get('useUiTime') && !['UTC', 0, null].includes(cd.g.uiTimezone)) {
    if (cd.g.areUiAndLocalTimezoneSame) {
      timezoneOffset = -date.getTimezoneOffset();
    } else {
      timezoneOffset = typeof cd.g.uiTimezone === 'number' ?
        cd.g.uiTimezone :

        // Using date-fns-tz's getTimezoneOffset is way faster than using day.js's methods.
        getTimezoneOffset(/** @type {string} */ (cd.g.uiTimezone), now.getTime()) / cd.g.msInMin;

      dayjsDate = dayjsDate.utcOffset(timezoneOffset);
    }
    now = new Date(now.getTime() + timezoneOffset * cd.g.msInMin);
  } else {
    timezoneOffset = 0;
    dayjsDate = dayjsDate.utc();
  }

  const day = dayjsDate.date();
  const monthIdx = dayjsDate.month();
  const year = dayjsDate.year();

  // eslint-disable-next-line no-one-time-vars/no-one-time-vars
  const nowDay = now.getUTCDate();
  // eslint-disable-next-line no-one-time-vars/no-one-time-vars
  const nowMonthIdx = now.getUTCMonth();
  const nowYear = now.getUTCFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  // eslint-disable-next-line no-one-time-vars/no-one-time-vars
  const yesterdayDay = yesterday.getUTCDate();
  // eslint-disable-next-line no-one-time-vars/no-one-time-vars
  const yesterdayMonthIdx = yesterday.getUTCMonth();
  // eslint-disable-next-line no-one-time-vars/no-one-time-vars
  const yesterdayYear = yesterday.getUTCFullYear();

  let formattedDate;
  if (day === nowDay && monthIdx === nowMonthIdx && year === nowYear) {
    formattedDate = dayjsDate.format(cd.s('comment-timestamp-today'));
  } else if (day === yesterdayDay && monthIdx === yesterdayMonthIdx && year === yesterdayYear) {
    formattedDate = dayjsDate.format(cd.s('comment-timestamp-yesterday'));
  } else if (year === nowYear) {
    formattedDate = dayjsDate.format(cd.s('comment-timestamp-currentyear'));
  } else {
    formattedDate = dayjsDate.format(cd.s('comment-timestamp-other'));
  }

  if (addTimezone) {
    formattedDate += generateTimezonePostfix(timezoneOffset);
  }

  return formattedDate;
}

/**
 * Format a date in the "relative" format.
 *
 * @param {Date} date
 * @returns {string}
 */
export function formatDateRelative(date) {
  const now = Date.now();
  const ms = date.getTime();
  if (ms < now && ms > now - cd.g.msInMin) {
    return cd.s('comment-timestamp-lessthanminute');
  }

  // We have relative dates rounded down (1 hour 59 minutes rounded to 1 hour, not 2 hours), as is
  // the standard across the web, judging by Facebook, YouTube, Twitter, and also Google's guideline
  // on date formats: https://material.io/design/communication/data-formats.html. We also use
  // date-fns here as its locales always have strings with numbers ("1 day ago", not "a day ago"),
  // which, IMHO, are more likely to be perceived as "something in between 24 hours and 48 hours",
  // not "something around 24 hours" (jwbth).
  return formatDistanceToNowStrict(date, {
    addSuffix: true,
    roundingMethod: 'floor',
    locale: cd.i18n[cd.g.userLanguage].dateFnsLocale,
  });
}
