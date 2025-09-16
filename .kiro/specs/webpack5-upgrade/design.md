# Design Document

## Overview

This design outlines the systematic upgrade of the Convenient Discussions project from Webpack 4 to Webpack 5, conversion of CommonJS modules to ES modules, and dependency updates. The upgrade will be performed in phases to minimize risk and ensure compatibility.

## Architecture

### Phase 1: Webpack 5 Migration

- Upgrade webpack from v4.46.0 to latest v5.x
- Update webpack-cli and webpack-dev-server to compatible versions
- Replace or update incompatible plugins:
  - `webpack-build-notifier` - check compatibility or find replacement
  - `banner-webpack-plugin` - check compatibility or find replacement
  - `terser-webpack-plugin` - update to v5.x compatible version
  - `worker-loader` - update or replace with Webpack 5 asset modules

### Phase 2: Configuration Updates

- Update webpack.config.js for Webpack 5 compatibility:
  - Replace deprecated `contentBase` with `static` in devServer
  - Update `public` and `disableHostCheck` options
  - Adjust optimization settings for Webpack 5
  - Update worker loading configuration
- Update babel.config.js to use ES modules
- Update jest.config.js to use ES modules

### Phase 3: Script Conversion to ES Modules

- Convert root-level scripts:
  - buildConfigs.js
  - buildI18n.js
  - deploy.js
- Convert misc/ folder scripts:
  - misc/utils.js
  - misc/fetchTimezoneAbbrs.js
- Update test files to use ES modules where appropriate
- Add "type": "module" to package.json

### Phase 4: Dependency Updates

- Update all devDependencies to latest versions
- Update runtime dependencies to latest versions
- Handle breaking changes in updated packages
- Test compatibility after each major update

## Components and Interfaces

### Webpack Configuration

- **Input**: Source files from src/, config files, i18n files
- **Output**: Bundled JavaScript files in dist/
- **Interface**: webpack.config.js exports function that returns configuration object

### Build Scripts

- **buildConfigs.js**: Processes config files and generates distribution configs
- **buildI18n.js**: Processes internationalization files and generates i18n bundles
- **deploy.js**: Handles deployment to MediaWiki instances

### Module System

- **Current**: Mixed CommonJS (build scripts) and ES modules (src/)
- **Target**: ES modules throughout, with selective CommonJS for specific use cases

## Data Models

### Package.json Updates

```json
{
  "type": "module",
  "engines": {
    "node": ">=16.0.0"
  }
}
```

### Webpack 5 Configuration Structure

- Mode-based configuration (development/production)
- Asset modules for worker files
- Updated devServer configuration
- Modern optimization settings

## Error Handling

### Migration Risks

1. **Plugin Incompatibility**: Some Webpack 4 plugins may not work with Webpack 5
   - **Mitigation**: Research alternatives, update to compatible versions, or implement workarounds

2. **Breaking Changes in Dependencies**: Updated packages may have breaking changes
   - **Mitigation**: Incremental updates, testing after each update, rollback capability

3. **ES Module Conversion Issues**: Some Node.js modules may not support ES imports
   - **Mitigation**: Use dynamic imports where necessary, maintain CommonJS for problematic dependencies

4. **Build Output Changes**: Webpack 5 may generate different output
   - **Mitigation**: Verify output functionality, adjust configuration as needed

### Rollback Strategy

- Maintain git branches for each phase
- Document all changes for easy reversal
- Test thoroughly before proceeding to next phase

## Testing Strategy

### Automated Testing

- Run existing Jest tests after each phase
- Verify build output integrity
- Test development server functionality
- Validate production builds

### Manual Testing

- Test all npm scripts
- Verify webpack dev server works correctly
- Check that built files function in browser
- Validate deployment process

### Compatibility Testing

- Test on different Node.js versions
- Verify cross-platform compatibility (Windows/Linux/macOS)
- Check browser compatibility of generated bundles

## Implementation Phases

### Phase 1: Webpack Core Upgrade

1. Update webpack, webpack-cli, webpack-dev-server
2. Update webpack.config.js for basic Webpack 5 compatibility
3. Test basic build functionality

### Phase 2: Plugin Migration

1. Update compatible plugins
2. Replace incompatible plugins
3. Test all build modes (dev, prod, test, single)

### Phase 3: ES Module Conversion

1. Add "type": "module" to package.json
2. Convert configuration files
3. Convert build scripts
4. Convert utility scripts
5. Update imports/exports throughout

### Phase 4: Dependency Updates

1. Update Babel and related plugins
2. Update CSS/Less processing tools
3. Update testing dependencies
4. Update utility dependencies
5. Update runtime dependencies

### Phase 5: Final Testing and Optimization

1. Comprehensive testing of all functionality
2. Performance comparison with previous version
3. Documentation updates
4. Final validation
