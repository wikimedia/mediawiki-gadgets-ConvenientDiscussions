# Implementation Plan

- [ ] 1. Create CommentLayers composition classes
  - [ ] 1.1 Implement CommentLayers base class
    - Create base layer management with create, destroy, updateStyles methods
    - Define underlay, overlay, line, marker properties and jQuery wrappers
    - _Requirements: 2.1, 2.2_

  - [ ] 1.2 Implement SpaciousCommentLayers class
    - Create spacious-specific layer positioning and styling
    - Override create and updateStyles for spacious layout
    - _Requirements: 2.3_

  - [ ] 1.3 Implement CompactCommentLayers class
    - Create compact-specific layer positioning with overlay menu support
    - Add overlayInnerWrapper, overlayGradient, overlayMenu properties
    - Implement showMenu and hideMenu methods for overlay menu management
    - _Requirements: 2.3_

- [ ] 2. Create CommentActions composition classes
  - [ ] 2.1 Implement CommentActions base class
    - Create base action management with button creation methods
    - Define addReplyButton, addEditButton, addThankButton, etc. methods
    - _Requirements: 7.1, 7.2_

  - [ ] 2.2 Implement SpaciousCommentActions class
    - Create structured action button layout for bottom positioning
    - Override action creation for spacious-specific styling
    - _Requirements: 7.3_

  - [ ] 2.3 Implement CompactCommentActions class
    - Create overlay-based action menu for hover-triggered actions
    - Override action creation for compact-specific styling
    - _Requirements: 7.3_

- [ ] 3. Create Comment subclasses
  - [ ] 3.1 Create SpaciousComment class
    - Extend Comment with spacious-specific functionality
    - Implement createLayers to use SpaciousCommentLayers
    - Add formatHeader method for author/date header management
    - Implement bindEvents as no-op method
    - Create static initPrototypes for header and SVG icon prototypes
    - _Requirements: 1.1, 1.2, 1.5_

  - [ ] 3.2 Create CompactComment class
    - Extend Comment with compact-specific functionality
    - Implement createLayers to use CompactCommentLayers
    - Add hover-specific properties: isHovered, wasMenuHidden
    - Implement bindEvents for hover event handling
    - Add highlightHovered method for hover behavior
    - Create static initPrototypes for overlay menu prototypes
    - _Requirements: 1.1, 1.3, 1.5_

- [ ] 4. Update settings system
  - [ ] 4.1 Implement settings migration
    - Rename reformatComments setting to spaciousComments
    - Add reformatComments to aliases property for backward compatibility
    - Update all references to use new setting name
    - _Requirements: 4.4, 4.5_

- [ ] 5. Update Parser integration
  - [ ] 5.1 Update BootProcess.findTargets to choose appropriate Comment class
    - Modify BootProcess.findTargets to select SpaciousComment or CompactComment
    - Update CommentClass property based on spaciousComments setting
    - _Requirements: 4.1, 4.2, 4.3_

- [ ] 6. Refactor existing Comment class to use composition
  - [ ] 6.1 Extract layers functionality to composition
    - Move all layer-related properties to layers composition
    - Update createLayers method to delegate to appropriate layers class
    - Remove direct layer property access in favor of layers.property
    - _Requirements: 2.4, 2.6_

  - [ ] 6.2 Extract actions functionality to composition
    - Move all action-related methods to actions composition
    - Update action creation to delegate to appropriate actions class
    - Remove direct action method calls in favor of actions.method()
    - _Requirements: 7.4, 7.6_

  - [ ] 6.3 Rename reformatted property to spacious
    - Update all internal references from reformatted to spacious
    - Update type definitions and JSDoc comments
    - _Requirements: 3.5, 5.4_

  - [ ] 6.4 Update Comment base class for inheritance
    - Make createLayers, bindEvents, and initPrototypes abstract methods
    - Add layers and actions composition properties
    - Update constructor to not directly set reformatted property
    - _Requirements: 1.4, 3.1, 3.2_

- [ ] 7. Update external references and type guards
  - [ ] 7.1 Update layer property access
    - Find all external references to comment.underlay, comment.overlay, etc.
    - Update to use comment.layers.underlay, comment.layers.overlay, etc.
    - Update jQuery wrapper access patterns
    - _Requirements: 5.1, 2.6_

  - [ ] 7.2 Update type guards and instanceof checks
    - Replace hasLayers() type guard with layers property check
    - Replace hasClassicUnderlay() type guard with layers property and class check
    - Update isReformatted() type guard to use spacious property
    - Update external type guard references
    - _Requirements: 3.4, 3.5, 5.3_

  - [ ] 7.3 Update action method calls
    - Find all external calls to action methods on comment instances
    - Update to use comment.actions.method() pattern where appropriate
    - _Requirements: 7.6_

- [ ] 8. Update prototype management
  - [ ] 8.1 Refactor Comment.initPrototypes method
    - Move shared prototypes (underlay, overlay) to Comment base class
    - Remove spacious/compact-specific prototypes from base method
    - _Requirements: 1.6_

  - [ ] 8.2 Implement SpaciousComment.initPrototypes
    - Move header wrapper and SVG icon prototypes to SpaciousComment
    - Ensure prototypes are created when spaciousComments setting is true
    - _Requirements: 1.6_

  - [ ] 8.3 Implement CompactComment.initPrototypes
    - Move overlay menu prototypes to CompactComment
    - Ensure prototypes are created when spaciousComments setting is false
    - _Requirements: 1.6_

- [ ] 9. Remove complex generic type system
  - [ ] 9.1 Remove unused generic types
    - Delete HTMLElementIfReformatted, HTMLElementIfNotReformattedAndHasLayers, JQueryIfReformatted, JQueryIfNotReformattedAndHasLayers types
    - Remove HasLayers and Reformatted generic parameters from Comment class
    - Clean up conditional type definitions
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 9.2 Update type definitions for subclasses
    - Add concrete types to SpaciousComment and CompactComment
    - Update JSDoc comments to reflect new class hierarchy
    - Update type definitions for external consumption
    - _Requirements: 5.4_

- [ ] 10. Testing and validation
  - [ ]* 10.1 Create unit tests for new classes
    - Write tests for CommentLayers, CommentActions, and their subclasses
    - Write tests for SpaciousComment and CompactComment functionality
    - Test prototype management and class instantiation
    - _Requirements: 8.1, 8.2_

  - [ ]* 10.2 Update existing tests
    - Update Comment class tests to work with new architecture
    - Update integration tests for Parser and settings changes
    - Fix any broken tests due to property and method changes
    - _Requirements: 8.2, 5.5_

  - [ ] 10.3 Validate backward compatibility
    - Test that existing comment functionality works identically
    - Verify settings migration works correctly
    - Ensure external references continue to work
    - Test visual appearance matches original
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 11. Performance validation and cleanup
  - [ ] 11.1 Performance validation
    - Verify comment creation performance is maintained
    - Test layer rendering with many comments
    - Validate prototype caching still works effectively
    - _Requirements: 8.4_

  - [ ] 11.2 Final cleanup and documentation
    - Update JSDoc comments to reflect new class hierarchy
    - Document the new composition pattern usage
    - Remove any temporary compatibility code
    - _Requirements: 5.4_