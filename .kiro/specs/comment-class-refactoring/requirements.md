# Requirements Document

## Introduction

The Comment class in Convenient Discussions has grown to over 5000 lines and violates the single responsibility principle. It handles comment parsing, DOM manipulation, UI behavior, network requests, visual layers, and more. This refactoring will break down the monolithic Comment class into focused, maintainable components using inheritance and composition patterns.

## Requirements

### Requirement 1: Class Hierarchy Restructuring

**User Story:** As a developer, I want the Comment class to be split into specialized subclasses based on formatting style, so that I can maintain and extend comment functionality more easily.

#### Acceptance Criteria

1. WHEN the system initializes THEN it SHALL create either a SpaciousComment or CompactComment instance based on user settings
2. WHEN a SpaciousComment is created THEN it SHALL handle spacious comment formatting with author/date headers and action buttons
3. WHEN a CompactComment is created THEN it SHALL handle compact MediaWiki talk page formatting
4. WHEN either comment type is created THEN it SHALL inherit common functionality from the Comment class
5. WHEN polymorphic methods are called THEN the system SHALL use the appropriate implementation for each comment type
6. WHEN type guards are used internally THEN they SHALL be replaced with property-based checks or polymorphic method calls

### Requirement 2: Layers Composition Pattern

**User Story:** As a developer, I want comment layers (underlay/overlay) to be managed by a separate class, so that layer functionality is isolated and easier to maintain.

#### Acceptance Criteria

1. WHEN a comment needs layers THEN it SHALL create a CommentLayers instance in its layers property
2. WHEN layers are created THEN they SHALL be managed entirely by the CommentLayers class
3. WHEN different comment types need different layer behavior THEN specialized layer classes SHALL be used
4. WHEN layer-related properties are accessed THEN they SHALL be accessed through the layers property
5. WHEN layers are not needed THEN the layers property SHALL be undefined
6. WHEN external code references layer properties THEN it SHALL be updated to use the new layers composition

### Requirement 3: Type System Modernization

**User Story:** As a developer, I want the complex generic type system to be simplified, so that the code is easier to understand and maintain.

#### Acceptance Criteria

1. WHEN generic parameters are removed THEN conditional types SHALL be replaced with concrete types in appropriate classes
2. WHEN HTMLElementIfReformatted types are used THEN they SHALL be replaced with HTMLElement in SpaciousComment
3. WHEN HTMLElementIfNotReformattedAndHasLayers types are used THEN they SHALL be replaced with HTMLElement in CompactComment layer classes
4. WHEN type guards check for layers THEN they SHALL check for the existence of the layers property
5. WHEN external type guards are used THEN they SHALL be updated to reflect the new class hierarchy

### Requirement 4: Parser Integration and Settings Update

**User Story:** As a developer, I want the Parser to create the appropriate Comment subclass, so that the correct comment type is instantiated based on user preferences.

#### Acceptance Criteria

1. WHEN the Parser creates comments THEN it SHALL choose SpaciousComment or CompactComment based on settings
2. WHEN the CommentClass property is set THEN it SHALL reference the appropriate comment constructor
3. WHEN comment instances are created THEN they SHALL be of the correct subclass type
4. WHEN the spaciousComments setting is used THEN it SHALL replace the old reformatComments setting
5. WHEN the old reformatComments setting is encountered THEN it SHALL be mapped via the aliases property in settings

### Requirement 5: External Reference Updates

**User Story:** As a developer, I want all external references to Comment properties and methods to work correctly after refactoring, so that existing functionality is preserved.

#### Acceptance Criteria

1. WHEN external code accesses layer properties THEN it SHALL work through the new layers composition
2. WHEN external code creates Comment instances THEN it SHALL work with the new class hierarchy
3. WHEN external code uses type guards THEN they SHALL work with the updated implementations
4. WHEN hooks and events are fired THEN they SHALL continue to work with the refactored classes
5. WHEN tests run THEN they SHALL pass with the new class structure

### Requirement 6: Backward Compatibility

**User Story:** As a user, I want all existing comment functionality to work exactly as before, so that the refactoring doesn't break my workflow.

#### Acceptance Criteria

1. WHEN comments are displayed THEN they SHALL look and behave identically to before refactoring
2. WHEN users interact with comments THEN all actions SHALL work as expected
3. WHEN comments are highlighted THEN the visual appearance SHALL be unchanged
4. WHEN comment menus are displayed THEN they SHALL function identically
5. WHEN comment layers are created THEN they SHALL have the same visual properties

### Requirement 7: CommentActions Extraction

**User Story:** As a developer, I want comment action functionality (reply, edit, thank, etc.) to be extracted to a separate class, so that action-related code is isolated and easier to maintain.

#### Acceptance Criteria

1. WHEN a comment needs actions THEN it SHALL create a CommentActions instance to manage button functionality
2. WHEN action buttons are created THEN they SHALL be handled by the CommentActions class
3. WHEN different comment types need different actions THEN specialized action classes SHALL be used if needed
4. WHEN action-related methods are called THEN they SHALL be delegated to the CommentActions instance
5. WHEN actions are not needed THEN the actions property SHALL be undefined
6. WHEN external code triggers actions THEN it SHALL work through the new actions composition

### Requirement 8: Testing Coverage

**User Story:** As a developer, I want comprehensive tests for the refactored classes, so that I can be confident the refactoring works correctly.

#### Acceptance Criteria

1. WHEN unit tests run THEN they SHALL cover all new classes and methods
2. WHEN integration tests run THEN they SHALL verify class interactions work correctly
3. WHEN browser tests run THEN they SHALL confirm UI functionality works as expected
4. WHEN performance tests run THEN they SHALL verify no regression in speed
5. WHEN all tests complete THEN they SHALL pass without errors
