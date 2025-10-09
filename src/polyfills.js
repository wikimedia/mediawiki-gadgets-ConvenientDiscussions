/**
 * Polyfills for ES2022+ features that we want to use but need to support older browsers.
 * This file should be imported at the beginning of the main entry point.
 */

// Array.prototype.at polyfill (ES2022)
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (!Array.prototype.at) {
  Array.prototype.at = function at(index) {
    // Convert negative indices to positive
    const len = this.length;
    const relativeIndex = index < 0 ? len + Number(index) : index;

    // Return undefined if index is out of bounds
    if (relativeIndex < 0 || relativeIndex >= len) {
      return undefined;
    }

    return this[relativeIndex];
  };
}

// Array.prototype.findLastIndex polyfill (ES2023)
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (!Array.prototype.findLastIndex) {
  Array.prototype.findLastIndex = function findLastIndex(callback, thisArg) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, eqeqeq
    if (this == null) {
      throw new TypeError('Array.prototype.findLastIndex called on null or undefined');
    }

    if (typeof callback !== 'function') {
      throw new TypeError('callback must be a function');
    }

    const obj = new Object(this);
    const len = Number.parseInt(obj.length, 10) || 0;

    for (let i = len - 1; i >= 0; i--) {
      if (i in obj) {
        const element = obj[i];
        if (callback.call(thisArg, element, i, obj)) {
          return i;
        }
      }
    }

    return -1;
  };
}

// Array.prototype.findLast polyfill (ES2023)
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (!Array.prototype.findLast) {
  Array.prototype.findLast = function findLast(callback, thisArg) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, eqeqeq
    if (this == null) {
      throw new TypeError('Array.prototype.findLast called on null or undefined');
    }

    if (typeof callback !== 'function') {
      throw new TypeError('callback must be a function');
    }

    const obj = new Object(this);
    const len = Number.parseInt(obj.length, 10) || 0;

    for (let i = len - 1; i >= 0; i--) {
      if (i in obj) {
        const element = obj[i];
        if (callback.call(thisArg, element, i, obj)) {
          return element;
        }
      }
    }

    return undefined;
  };
}
