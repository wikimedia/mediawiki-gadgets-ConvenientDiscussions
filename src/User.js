import cd from './shared/cd.js';

/**
 * A MediaWiki user. Is structurally similar to
 * {@link https://doc.wikimedia.org/mediawiki-core/master/js/mw.user.html mw.user} so that it is
 * possible to pass it to
 * {@link https://doc.wikimedia.org/mediawiki-core/master/js/mw.html#.msg mw.msg()} and have
 * `{{gender:}}` replaced.
 *
 * To create an instance, use {@link module:userRegistry.get}.
 */
export default class User {
  options = new mw.Map();

  /** @type {boolean} */
  registered;

  /**
   * Create a user object.
   *
   * @param {string} name
   * @param {object} options
   */
  constructor(name, options = {}) {
    this.name = name;
    this.muted = false;
    Object.keys(options).forEach((name) => {
      this.options.set(name, options[name]);
    });
  }

  /**
   * Is the user registered (not an IP user).
   * {@link https://www.mediawiki.org/wiki/Help:Temporary_accounts Temporary accounts} are
   * considered registered users.
   *
   * @returns {boolean}
   */
  isRegistered() {
    if (this.name === '<unregistered>') {
      return false;
    }

    this.registered ??= !mw.util.isIPAddress(this.name);

    return this.registered;
  }

  /**
   * Get the user name.
   *
   * @returns {string}
   */
  getName() {
    return this.name;
  }

  /**
   * Set a gender for the user.
   *
   * @param {'male'|'female'|'unknown'} value
   */
  setGender(value) {
    this.options.set('gender', value);
  }

  /**
   * User's gender (must be obtained using {@link module:utilsApi.loadUserGenders}).
   *
   * @returns {'male'|'female'|'unknown'}
   */
  getGender() {
    return this.options.get('gender');
  }

  /**
   * Set the user's rights.
   *
   * @param {string[]} rights
   */
  setRights(rights) {
    this.rights = rights;
  }

  /**
   * Get the user's rights (must be obtained using {@link module:utilsApi.getUserInfo}).
   *
   * @returns {?(string[])}
   */
  getRights() {
    return this.rights?.slice() || null;
  }

  /**
   * Get the preferred namespace alias, based on:
   * 1. the `genderNeutralUserNamespaceAlias` CD config value (first choice);
   * 2. the `userNamespacesByGender` CD config value, if the gender is known (second choice);
   * 3. the `wgFormattedNamespaces` MediaWiki config value (third choice).
   *
   * @returns {string}
   */
  getNamespaceAlias() {
    return (
      cd.config.genderNeutralUserNamespaceAlias ||
      cd.config.userNamespacesByGender?.[this.getGender()] ||
      mw.config.get('wgFormattedNamespaces')[2]
    );
  }

  /**
   * Get the user's global ID according to the database if it was set before.
   *
   * @returns {?number}
   */
  getGlobalId() {
    return this.globalId || null;
  }

  /**
   * Set the user's global ID according to the database.
   *
   * @param {number} value
   */
  setGlobalId(value) {
    this.globalId = Number(value);
  }

  /**
   * Check if the user is muted.
   *
   * @returns {boolean}
   */
  isMuted() {
    return this.muted;
  }

  /**
   * Set if the user is muted.
   *
   * @param {boolean} value
   */
  setMuted(value) {
    this.muted = Boolean(value);
  }
}
