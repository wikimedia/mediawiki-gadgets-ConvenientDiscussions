// @ts-check

/**
 * Browser test utilities for Comment class testing
 */

/**
 * Wait for Convenient Discussions to be fully loaded
 * @param {import('@playwright/test').Page} page
 */
async function waitForConvenientDiscussions(page) {
  await page.waitForFunction(() => {
    return window.cd &&
           window.cd.comments &&
           window.cd.comments.length > 0 &&
           window.cd.settings &&
           window.cd.g.CURRENT_PAGE;
  }, { timeout: 10000 });
}

/**
 * Get a comment by index with proper typing
 * @param {import('@playwright/test').Page} page
 * @param {number} index
 * @returns {Promise<import('@playwright/test').Locator>}
 */
async function getCommentByIndex(page, index = 0) {
  await waitForConvenientDiscussions(page);
  return page.locator('.cd-comment').nth(index);
}

/**
 * Get a spacious comment
 * @param {import('@playwright/test').Page} page
 * @param {number} index
 * @returns {Promise<import('@playwright/test').Locator>}
 */
async function getSpaciousComment(page, index = 0) {
  await waitForConvenientDiscussions(page);
  return page.locator('.cd-comment.cd-comment-reformatted').nth(index);
}

/**
 * Get a compact comment
 * @param {import('@playwright/test').Page} page
 * @param {number} index
 * @returns {Promise<import('@playwright/test').Locator>}
 */
async function getCompactComment(page, index = 0) {
  await waitForConvenientDiscussions(page);
  return page.locator('.cd-comment:not(.cd-comment-reformatted)').nth(index);
}

/**
 * Toggle spacious comments setting
 * @param {import('@playwright/test').Page} page
 * @param {boolean} enabled
 */
async function toggleSpaciousComments(page, enabled) {
  await page.evaluate((enabled) => {
    window.cd.settings.set('spaciousComments', enabled);
  }, enabled);

  // Wait for setting to take effect
  await page.waitForTimeout(100);
}

/**
 * Create a test comment for testing purposes
 * @param {import('@playwright/test').Page} page
 * @param {string} content
 * @param {boolean} spacious
 */
async function createTestComment(page, content = 'Test comment content', spacious = false) {
  await page.evaluate(({ content, spacious }) => {
    // This would need to be implemented based on your test setup
    // For now, this is a placeholder
    console.log('Creating test comment:', content, spacious);
  }, { content, spacious });
}

/**
 * Check if comment has layers
 * @param {import('@playwright/test').Locator} comment
 * @returns {Promise<boolean>}
 */
async function commentHasLayers(comment) {
  const underlay = comment.locator('.cd-comment-underlay');
  const overlay = comment.locator('.cd-comment-overlay');

  return (await underlay.count()) > 0 && (await overlay.count()) > 0;
}

/**
 * Trigger comment highlighting
 * @param {import('@playwright/test').Locator} comment
 */
async function highlightComment(comment) {
  await comment.click();

  // Wait for layers to be created
  await comment.locator('.cd-comment-underlay').waitFor({ state: 'visible' });
  await comment.locator('.cd-comment-overlay').waitFor({ state: 'visible' });
}

/**
 * Check comment positioning
 * @param {import('@playwright/test').Locator} comment
 * @returns {Promise<{comment: any, underlay: any, overlay: any}>}
 */
async function getCommentPositioning(comment) {
  const commentBox = await comment.boundingBox();
  const underlayBox = await comment.locator('.cd-comment-underlay').boundingBox();
  const overlayBox = await comment.locator('.cd-comment-overlay').boundingBox();

  return {
    comment: commentBox,
    underlay: underlayBox,
    overlay: overlayBox
  };
}

module.exports = {
  waitForConvenientDiscussions,
  getCommentByIndex,
  getSpaciousComment,
  getCompactComment,
  toggleSpaciousComments,
  createTestComment,
  commentHasLayers,
  highlightComment,
  getCommentPositioning
};