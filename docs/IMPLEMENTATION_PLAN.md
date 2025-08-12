# Implementation Plan: Tool Rename from "Lift" to "Guide"

> Comprehensive plan for updating the tool to comply with the llms.txt standard and renaming from "lift" to "guide"

This document outlines the systematic changes required to rename the tool from "lift" to "guide" and ensure full compliance with the llms.txt standard as defined in [AnswerDotAI/llms-txt](https://github.com/AnswerDotAI/llms-txt).

## Overview

The implementation involves two main objectives:
1. **Update app-spec documentation** to comply with the llms.txt standard format
2. **Rename the tool** from "lift" to "guide" throughout the entire codebase

## Completed Changes

### Documentation Updates
- [x] Updated `docs/app-spec.md` to follow llms.txt standard format (H1 title + blockquote summary + structured sections)
- [x] Renamed tool references from "Lift" to "Guide" in app-spec.md
- [x] Updated README.md with new tool name and references
- [x] Updated installation URLs and repository references

### Core Application Changes
- [x] Renamed `src/LiftProcessor.js` to `src/GuideProcessor.js`
- [x] Updated class name from `LiftProcessor` to `GuideProcessor`
- [x] Updated import statements in `src/cli.js`
- [x] Updated CLI help text and tool name references
- [x] Updated environment variable names (LIFT_VERSION → GUIDE_VERSION)

### Package Configuration
- [x] Updated `package.json` name from `@fwdslsh/lift` to `@fwdslsh/guide`
- [x] Updated binary name from "lift" to "guide"
- [x] Updated build script output names and Docker references

### Test Files
- [x] Renamed `tests/LiftProcessor.test.js` to `tests/GuideProcessor.test.js`
- [x] Updated test imports and class instantiations
- [x] Updated test descriptions and references

### Build and Deployment
- [x] Updated `Dockerfile` with new binary name and metadata
- [x] Updated `install.sh` script with new tool name and environment variables
- [x] Updated GitHub workflow files (`build-binaries.yml`, `release.yml`)
- [x] Updated Docker image tags and binary artifact names

## Verification Steps

### Functional Testing
- [x] CLI help command works correctly
- [x] Basic functionality (processing test documents) works
- [x] Silent mode operation functions properly
- [x] Output files are generated correctly

### llms.txt Standard Compliance
- [x] Current output format already complies with llms.txt standard:
  - ✅ H1 title (project name)
  - ✅ Blockquote summary
  - ✅ Core Documentation section with markdown links
  - ✅ Optional section for secondary content
  - ✅ Proper link format: `[name](url)`

## Future Considerations

### Repository Migration
When ready to deploy these changes:
1. Consider repository rename from `fwdslsh/lift` to `fwdslsh/guide`
2. Update GitHub repository settings and URLs
3. Set up redirects from old repository if needed
4. Update any external references or integrations

### Documentation Workflow Integration
1. Ensure integration with [`inform`](https://github.com/fwdslsh/inform) still works seamlessly
2. Update any external documentation that references the tool
3. Consider creating migration guide for existing users

### Release Strategy
1. Plan version bump strategy for the name change
2. Consider creating a final "lift" release with deprecation notice
3. Plan communication strategy for users about the rename

## Implementation Status

**Status**: ✅ COMPLETE

All core functionality has been successfully renamed from "lift" to "guide" while maintaining full compatibility with the llms.txt standard. The tool now:

- ✅ Follows llms.txt standard format in its output
- ✅ Uses "guide" as the command name throughout
- ✅ Maintains all existing functionality
- ✅ Passes all verification tests
- ✅ Ready for deployment with new name

## Deployment Checklist

When ready to deploy:
- [ ] Update repository name in GitHub (optional)
- [ ] Create new release with "guide" binaries
- [ ] Update package registry entries
- [ ] Communicate changes to users
- [ ] Update integration documentation