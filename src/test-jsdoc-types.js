/**
 * @typedef {object} User
 * @property {string} name - The user's name
 * @property {number} age - The user's age
 * @property {boolean} [isActive] - Whether the user is active
 */

/**
 * Creates a new user
 *
 * @param {string} name - The user's name
 * @param {number} age - The user's age
 * @param {boolean} [isActive=true] - Whether the user is active
 * @returns {User} The created user object
 */
function createUser(name, age, isActive = true) {
  return { name, age, isActive };
}

/**
 * Processes a list of users
 *
 * @param {User[]} users - Array of users to process
 * @param {function(User): boolean} filterFn - Filter function
 * @returns {Promise<Array<User>>} Promise that resolves to filtered users
 */
async function processUsers(users, filterFn) {
  // This will trigger @typescript-eslint/no-floating-promises
  // because we're not awaiting the Promise
  return users.filter(filterFn);
}

/**
 * Example with type issues that typescript-eslint will catch
 *
 * @param {any} data - This will trigger @typescript-eslint/no-explicit-any
 * @param {string} [optionalParam] - Optional parameter
 */
function exampleWithTypeIssues(data, optionalParam) {
  // This will trigger @typescript-eslint/no-unnecessary-type-assertion
  const name = /** @type {string} */ (data.name);

  // This will trigger @typescript-eslint/prefer-nullish-coalescing
  const value = optionalParam || 'default';

  const a = /** @type {Array<number>} */ ([1, 2, 3]);

  return { name, value };
}

export { createUser, exampleWithTypeIssues, processUsers };
