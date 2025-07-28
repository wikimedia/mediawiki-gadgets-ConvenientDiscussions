import dayjs from 'dayjs';

import settings from './settings';
import cd from './shared/cd';
import { removeFromArrayIfPresent } from './shared/utils-general';
import { formatDate, relativeTimeThresholds } from './shared/utils-timestamp';
import { EventEmitter, mixInObject } from './utils-oojs';

/**
 * @typedef {'default'|'improved'|'relative'} TimestampFormat
 */

/**
 * @typedef {object} EventMap
 * @property {[]} updateImproved
 */

/**
 * An element that contains an automatically updated timestamp with relative (dependent on the
 * current date and time somehow) date and time.
 */
class LiveTimestamp extends mixInObject(
  // eslint-disable-next-line jsdoc/require-jsdoc
  class {},
  /** @type {typeof EventEmitter<EventMap>} */ (EventEmitter)
) {
  /**
   * Create a live timestamp.
   *
   * @param {Element} element Element that has the timestamp.
   * @param {Date} date Timestamp's date.
   * @param {boolean} addTimezone Whether to add a timezone to the timestamp.
   */
  constructor(element, date, addTimezone) {
    super();

    /**
     * Element that has the timestamp.
     *
     * @type {Element}
     * @private
     */
    this.element = element;

    /**
     * Timestamp's date.
     *
     * @type {Date}
     * @private
     */
    this.date = date;

    /**
     * Whether to add timezone to the timestamp.
     *
     * @type {boolean}
     * @private
     */
    this.addTimezone = addTimezone;

    this.format = settings.get('timestampFormat');
  }

  /**
   * Initialize the timestamp (set the necessary timeouts for the timestamp to be updated when
   * needed).
   */
  init() {
    if (this.format === 'improved') {
      if (!LiveTimestamp.improvedTimestampsInited) {
        // Timestamps of the "improved" format are updated all together, at the boundaries of days.
        // So, we only need to initiate the timeouts once.
        LiveTimestamp.initImproved();
      }
      if (this.date.getTime() > LiveTimestamp.yesterdayStart) {
        LiveTimestamp.improvedTimestamps.push(this);
      }
    } else if (this.format === 'relative') {
      this.setUpdateTimeout();
    }
  }

  /**
   * Set a delay (timeout) until the next timestamp update.
   *
   * @param {boolean} update Whether to update the timestamp now.
   * @private
   */
  setUpdateTimeout(update = false) {
    if (update) {
      this.update();
    }

    const differenceMs = Date.now() - this.date.getTime();
    const threshold = relativeTimeThresholds.find(
      (threshold) => differenceMs < threshold.range * cd.g.msInMin
    );
    if (threshold) {
      // Find the relevant time boundary at which the timestamp should be updated.
      for (
        let boundary =
          (
            threshold.start +

            (
              // The number of steps to take to get to the time boundary preceding the current time,
              // e.g. 1 hour for 1 hour and 25 minutes
              Math.floor(differenceMs / cd.g.msInMin / threshold.step) *

              threshold.step
            )
          );
        boundary <= threshold.range;
        boundary += threshold.step
      ) {
        const boundaryMs = boundary * cd.g.msInMin;
        if (differenceMs < boundaryMs) {
          removeFromArrayIfPresent(LiveTimestamp.updateTimeouts, this.updateTimeout);
          this.updateTimeout = setTimeout(() => {
            this.setUpdateTimeout(true);
          }, boundaryMs - differenceMs);
          LiveTimestamp.updateTimeouts.push(this.updateTimeout);
          break;
        }
      }
    }
  }

  /**
   * _For internal use._ Update the timestamp.
   */
  update() {
    this.element.textContent = formatDate(this.date, this.addTimezone);
  }

  /** @type {number[]} */
  static updateTimeouts = [];

  static improvedTimestampsInited = false;

  /** @type {LiveTimestamp[]} */
  static improvedTimestamps = [];

   /** @type {number} */
  static yesterdayStart;

  /**
   * _For internal use._ Initialize improved timestamps (when the timestamp format is set to
   * "improved").
   */
  static initImproved() {
    let date = dayjs();
    if (settings.get('useUiTime') && !['UTC', 0, null].includes(cd.g.uiTimezone)) {
      date = typeof cd.g.uiTimezone === 'number' ?
        date.utcOffset(cd.g.uiTimezone) :
        date.tz(/** @type {string} */ (cd.g.uiTimezone));
    } else {
      date = date.utc();
    }
    date = date.startOf('day');
    this.yesterdayStart = date.subtract(1, 'day').valueOf();

    this.updateTimeouts.push(
      setTimeout(
        this.updateImproved,

        // Tomorrow start delay
        date.add(1, 'day').valueOf() - Date.now()
      ),
      setTimeout(
        this.updateImproved,

        // Day after tomorrow start delay
        date.add(2, 'day').valueOf() - Date.now()
      )
    );

    this.improvedTimestampsInited = true;
  }

  /**
   * _For internal use._ Update the timestamps (when the timestamp format is set to "improved").
   */
  static updateImproved = () => {
    this.improvedTimestamps.forEach((timestamp) => {
      timestamp.update();
    });
    this.emit('updateImproved');
  };

  /**
   * Reset the list of live timestamps on the page (this is run at every page load).
   */
  static reset() {
    this.updateTimeouts.forEach(clearTimeout);
    this.updateTimeouts = [];
    this.improvedTimestampsInited = false;
    this.improvedTimestamps = [];
  }
}

export default LiveTimestamp;
