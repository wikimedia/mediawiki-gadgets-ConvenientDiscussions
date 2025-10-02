---
inclusion: always
---
# Instructions

## About the project

This is a JavaScript project with type checking supplied by TypeScript through types defined in JSDoc. However, it also has some type definitions in .d.ts files.

## General rules

* Don't modify code I didn't ask you to modify unless strictly necessary to perform the task at hand. When in doubt, request me to provide answers, code, or documentation necessary for an adequate response.
* Don't mess with code style of existing code.
* Make sure to keep the original comments (including JSDoc comments and type hints like `/** @type {<type>} */`) to the code unless the relevant code is removed or I explicitly asked for the comments to be changed or removed. Don't remove JSDoc comments with `@overload` tag.
* Avoid using one-time variables, unless they are used in template literals. E.g., instead of writing

  ```js
  const htmlToCompare = this.getElementHtmlToCompare(element);
  this.updateCompareProperties(element, htmlToCompare);
  ```

  write this:

  ```js
  this.updateCompareProperties(element, this.getElementHtmlToCompare(element));
  ```

## JavaScript & TypeScript code style

* When using a method in a callback, turn it into an arrow function to avoid the need to bind them to `this` using `.bind()`.
* Don't introduce new `null` values. Use `undefined` instead, but don't assign any values to variables that don't have a value yet so that they stay `undefined`.
* Introduce class properties using class field syntax rather than inside the constructor.
* Use optional chaining (`?.`) and nullish coalescing (`??`) operators, as well as logical OR assignment (`||=`) and other assignment operators.
* Use trailing commas in objects and arrays.
* Add an empty line before `return` statements at the end of blocks (function, `if` statement, etc.) unless it's the only statement in that block.
* Use 2 spaces for indentation.
* Use single quotes for strings.
* Code comments should have one empty line before them.
* When using inline code comments, place 2 spaces before them.

## JSDoc code style

* Refrain from fixing type errors by changing types to `any`. Better leave the problem unresolved than resort to `any`.
* Don't use `Function` as a type. Indicate the function signature or use `AnyFunction` to indicate a generic function (`(...args: any) => any`).
* Don't use the `object` type when you know a more precise type is known. If that type is now defined, define it with `@typedef` and use it.
* Instead of defining JSDoc types in each file independently, aim to reuse types by importing them with `import('path').Type` from one file deemed the most appropriate to hold it.
* Don't put "-" between the property name and its description.
* Use `Type[]`, not `Array<Type>`.
* Prefer the index signature syntax (e.g. `{ [key: string]: any }`) to `Record` type (e.g. `Record<string, any>`).
* Add an empty line before the first JSDoc tag when it follows a description, e.g.:

  ```js
  /**
  * Get the archive prefix for the page.
  *
  * @param {boolean} [onlyExplicit=false]
  * @returns {string | undefined}
  */
  ```

* Use spaces around logical operators, e.g. write `@type {RadioSelectControl | TextInputControl}`, not `@type {RadioSelectControl|TextInputControl}`.
