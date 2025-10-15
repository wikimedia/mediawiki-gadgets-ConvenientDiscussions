# Design Document

## Overview

This design outlines the refactoring of the monolithic Comment class into a focused, maintainable architecture using inheritance and composition patterns. The refactoring will split comment functionality based on formatting styles (spacious vs compact) and extract cross-cutting concerns like layers and actions into separate classes.

## Architecture

### Class Hierarchy

```
CommentSkeleton (shared/CommentSkeleton.js)
    ↓ extends
Comment (Comment.js) - Base window-context class
    ↓ extends
    ├── SpaciousComment (SpaciousComment.js) - Spacious formatting
    └── CompactComment (CompactComment.js) - Compact formatting
```

### Composition Classes

```
CommentLayers (CommentLayers.js) - Base layers management
    ├── SpaciousCommentLayers (SpaciousCommentLayers.js) - Spacious-specific layers
    └── CompactCommentLayers (CompactCommentLayers.js) - Compact-specific layers

CommentActions (CommentActions.js) - Base actions management
    ├── SpaciousCommentActions (SpaciousCommentActions.js) - Spacious-specific actions
    └── CompactCommentActions (CompactCommentActions.js) - Compact-specific actions
```

## Prototype Management Strategy

### Current Implementation

The Comment class uses a static `prototypes` property (PrototypeRegistry) to cache DOM elements for performance. Elements are created once and cloned when needed, avoiding expensive DOM creation operations.

### Refactored Implementation

Each comment subclass will manage its own prototypes through static `initPrototypes()` methods:

**SpaciousComment.initPrototypes():**

- Header wrapper element (`headerWrapperElement`)
- SVG icons for navigation buttons (`goToParentButtonSvg`, `goToChildButtonSvg`, etc.)
- User info card button (shared via `Comment.createUserInfoCardButton()`)

**CompactComment.initPrototypes():**

- Overlay inner wrapper (`overlayInnerWrapper`)
- Overlay gradient element
- Overlay content container

**Shared Prototypes (Comment base class):**

- Underlay element (`underlay`)
- Overlay element (`overlay`)
- Overlay line and marker elements

### Migration Strategy

1. Move shared prototype creation to Comment base class
2. Move spacious-specific prototypes to SpaciousComment
3. Move compact-specific prototypes to CompactComment
4. Update prototype access to use appropriate class

## Components and Interfaces

### Comment (Base Class)

**Purpose:** Provides common functionality for all comment types in the window context.

**Key Responsibilities:**

- Common DOM manipulation
- Basic event handling
- Shared utility methods
- Property initialization
- Integration with CommentSkeleton functionality

**Key Methods:**

```javascript
// Abstract/polymorphic methods (to be overridden)
abstract createLayers()
abstract updateLayersStyles()
abstract addAttributes()
abstract bindEvents() // Bind comment-specific events (may be no-op for spacious)
static abstract initPrototypes() // Initialize DOM prototypes for performance

// Common methods (inherited by subclasses)
getParent()
getChildren()
scrollTo()
configureLayers()
configureActions()
static createUserInfoCardButton() // Shared prototype creation
```

**Key Properties:**

```javascript
layers?: CommentLayers
actions?: CommentActions
spacious: boolean // Renamed from 'reformatted'
```

### SpaciousComment

**Purpose:** Handles spacious comment formatting with author/date headers and structured layout.

**Key Responsibilities:**

- Spacious-specific DOM structure
- Author/date header management
- Structured action button layout
- Spacious-specific styling

**Key Methods:**

```javascript
createLayers() // Creates SpaciousCommentLayers
updateLayersStyles() // Spacious-specific styling
addAttributes() // Spacious-specific attributes
formatHeader() // Author/date header formatting
bindEvents() // No-op for spacious comments (no hover behavior)
static initPrototypes() // Creates spacious-specific prototypes (header, SVG icons)
```

**Key Properties:**

```javascript
headerElement: HTMLElement
authorElement: HTMLElement
dateElement: HTMLElement
```

### CompactComment

**Purpose:** Handles compact MediaWiki talk page formatting with traditional layout.

**Key Responsibilities:**

- Compact-specific DOM structure
- Traditional MediaWiki formatting
- Overlay menu–based action integration
- Compact-specific styling

**Key Methods:**

```javascript
createLayers() // Creates CompactCommentLayers
updateLayersStyles() // Compact-specific styling
addAttributes() // Compact-specific attributes
bindEvents() // Bind hover events for menu display
highlightHovered() // Handle hover highlighting
static initPrototypes() // Creates compact-specific prototypes (overlay menu elements)
```

**Key Properties:**
```javascript
isHovered: boolean // Track hover state for menu display
wasMenuHidden: boolean // Track if menu was manually hidden
```

### CommentLayers (Base Class)

**Purpose:** Manages visual layers (underlay/overlay) for comment highlighting and UI elements.

**Key Responsibilities:**

- Layer creation and destruction
- Layer positioning and sizing
- Layer style management
- Event handling for layer interactions

**Key Methods:**

```javascript
create() // Create underlay and overlay elements
destroy() // Clean up layers
updateStyles() // Update layer positioning and styling
```

**Key Properties:**

```javascript
underlay: HTMLElement
overlay: HTMLElement
line: HTMLElement
marker: HTMLElement
$underlay: JQuery
$overlay: JQuery
$marker: JQuery
```

### SpaciousCommentLayers

**Purpose:** Specialized layer management for spacious comments.

**Key Responsibilities:**

- Spacious-specific layer positioning
- Header-aware layer calculations
- Spacious-specific overlay content

**Key Methods:**

```javascript
create() // Override with spacious-specific layer creation
updateStyles() // Spacious-specific positioning
```

### CompactCommentLayers

**Purpose:** Specialized layer management for compact comments.

**Key Responsibilities:**

- Compact-specific layer positioning
- Traditional overlay menu management
- Hover-based layer interactions

**Key Methods:**

```javascript
create() // Override with compact-specific layer creation
updateStyles() // Compact-specific positioning
addMenu() // Add overlay menu for compact comments
showMenu() // Show the overlay menu
hideMenu() // Hide the overlay menu
```

**Key Properties:**

```javascript
overlayInnerWrapper: HTMLElement
overlayGradient: HTMLElement
overlayMenu: HTMLElement
$overlayMenu: JQuery
$overlayGradient: JQuery
```

### CommentActions (Base Class)

**Purpose:** Manages comment action buttons and functionality.

**Key Responsibilities:**

- Action button creation
- Action event handling
- Action state management
- Permission checking

**Key Methods:**

```javascript
create() // Create action buttons
addReplyButton()
addEditButton()
addThankButton()
addCopyLinkButton()
addGoToParentButton()
addToggleChildThreadsButton()
```

### SpaciousCommentActions

**Purpose:** Specialized action management for spacious comments.

**Key Responsibilities:**

- Structured action button layout
- Bottom-positioned action bar
- Spacious-specific action styling

### CompactCommentActions

**Purpose:** Specialized action management for compact comments.

**Key Responsibilities:**

- Overlay-based action menu
- Hover-triggered actions
- Compact-specific action styling

## Data Models

### Layer Configuration

```javascript
interface LayerConfig {
  showOnHover: boolean;
  showMenu: boolean;
  highlightStyle: 'underlay' | 'border' | 'both';
  menuPosition: 'overlay' | 'bottom';
}
```

### Action Configuration

```javascript
interface ActionConfig {
  enableReply: boolean;
  enableEdit: boolean;
  enableThank: boolean;
  enableCopyLink: boolean;
  enableGoToParent: boolean;
  enableToggleThreads: boolean;
  layout: 'overlay' | 'bottom' | 'inline';
}
```

## Error Handling

### Layer Creation Errors

- **Issue:** Layer elements fail to create or position correctly
- **Handling:** Graceful degradation without layers, log error for debugging
- **Recovery:** Retry layer creation on next interaction

### Action Button Errors

- **Issue:** Action buttons fail to create or bind events
- **Handling:** Skip failed actions, continue with available actions
- **Recovery:** Attempt to recreate actions on user interaction

### Class Instantiation Errors

- **Issue:** Wrong comment class instantiated based on settings
- **Handling:** Fall back to base Comment class functionality
- **Recovery:** Allow user to toggle comment style to retry

## Testing Strategy

### Unit Tests

**Comment Base Class:**

- Test common functionality inheritance
- Test abstract method enforcement
- Test composition property management

**SpaciousComment/CompactComment:**

- Test formatting-specific methods
- Test layer creation delegation
- Test action creation delegation
- Test style application

**CommentLayers Classes:**

- Test layer element creation
- Test positioning calculations
- Test style updates
- Test event handling

**CommentActions Classes:**

- Test button creation
- Test event binding
- Test permission checking
- Test action execution

### Integration Tests

**Parser Integration:**

- Test correct class instantiation based on settings
- Test settings migration (reformatComments → spaciousComments)
- Test CommentClass property updates

**Layer Integration:**

- Test layer creation on comment highlighting
- Test layer positioning with different comment types
- Test layer cleanup on comment destruction

**Action Integration:**

- Test action button functionality
- Test action delegation to appropriate handlers
- Test action state synchronization

### Browser Tests

**Visual Regression:**

- Test comment appearance matches original
- Test layer positioning accuracy
- Test action button placement

**Interaction Tests:**

- Test hover behaviors
- Test click actions
- Test keyboard navigation

**Performance Tests:**

- Test comment creation speed
- Test layer rendering performance
- Test memory usage with many comments

## Migration Strategy

### Phase 1: Base Infrastructure

1. Create Comment base class with composition properties
2. Create CommentLayers and CommentActions base classes
3. Update type definitions to remove generic parameters
4. Refactor prototype management to use static methods per class

### Phase 2: Subclass Implementation

1. Create SpaciousComment and CompactComment classes
2. Create specialized layer and action classes
3. Implement polymorphic methods

### Phase 3: Parser Integration

1. Update Parser to choose appropriate comment class
2. Update settings system for spaciousComments
3. Add backward compatibility for reformatComments

### Phase 4: External Reference Updates

1. Update all external references to layer properties
2. Update type guards and instanceof checks
3. Update test files and documentation

### Phase 5: Cleanup

1. Remove unused generic types
2. Remove old type guard implementations
3. Clean up temporary compatibility code

## Backward Compatibility

### Settings Migration

- `reformatComments` setting will be aliased to `spaciousComments`
- Existing user preferences will be automatically migrated
- Old setting name will continue to work via aliases

### API Compatibility

- All existing public methods will remain available
- Layer properties will be accessible via `comment.layers.property`
- Action methods will be accessible via `comment.actions.method()`
- The `reformatted` property will be renamed to `spacious` for clarity

### Type Compatibility

- External code using Comment instances will continue to work
- Type guards will be updated to maintain compatibility
- Generic type parameters will be removed gradually
