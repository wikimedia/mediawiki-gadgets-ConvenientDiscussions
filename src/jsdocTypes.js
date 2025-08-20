/**
 * @typedef {import('types-mediawiki/mw/Api').ApiResponse | ApiRejectResponse} ApiAnyResponse
 */

/**
 * @template {Constructor} Mixin
 * @typedef {{
 *   new (...args: any[]): InstanceType<Mixin>;
 *   prototype: InstanceType<Mixin>;
 * }} MixinType
 */
