# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Linting and Type Checking
```bash
bun lint
```
Runs ESLint with auto-fix and TypeScript compiler (no emit, type checking only).

### Testing
```bash
bun test
```
Runs the full test suite using Jest via ts-jest.

### Mutation Testing
```bash
NODE_OPTIONS=--experimental-vm-modules bun x stryker run
```
Runs Stryker mutation testing with Jest runner and TypeScript checker.

## Architecture Overview

This is a Winston-based logging library with Express middleware integration and console interception capabilities.

### Core Components

**Logger Extension (`src/index.ts`)**:
- Extends Winston Logger with custom methods: `interceptConsole()`, `restoreConsole()`, and `morganStream`
- Single-file implementation exporting `logger`, `middleware`, and `noprefix` constant
- Uses Luxon for timestamp formatting (ISO 8601 UTC)
- Custom log levels: error(0), warn(1), info(2), noprefix(2), debug(3)

**Express Middleware**:
- Built on Morgan with custom format string `mydev`
- Dynamically generates color formatters based on HTTP status codes (cached on format function)
- Custom tokens: `timestamp` (Luxon ISO), `route` (req.route.path), `user` (req.user._id)
- Logs to `logger.morganStream` which wraps Winston output

**Console Interception**:
- Replaces console methods (log, info, warn, error, dir) with Winston equivalents
- Automatically adds `source: 'console'` metadata
- Adds stack traces to console.error() calls
- Preserves original console methods for restoration

### Technical Details

**Runtime**: Bun (development) / Node.js >=16 (production)

**Module System**: ESM (`"type": "module"`)
- Main entry: `src/index.ts` (published as TypeScript, not transpiled)

**TypeScript Configuration**:
- Target: ESNext with bundler module resolution
- `noEmit: true` - no JavaScript output, type checking only
- `verbatimModuleSyntax: true` - explicit import type syntax required
- Strict mode enabled

**Testing Framework**:
- Uses Bun test syntax (`bun:test`) in test files
- Jest runner via ts-jest with ESM preset for execution
- Special module mapper: `bun:test` → `test/bun-test.ts` for compatibility
- Tests in `test/module.test.ts` cover all logger methods, console interception, and Express middleware

**Mutation Testing**:
- Stryker with Jest runner and TypeScript checker
- Targets: `src/*.ts`
- Coverage analysis: perTest
- Thresholds: high=100, low=75

## Git Flow

Uses git-flow branching model:
- `develop` - main development branch
- `master` - production releases only
- Version bumps trigger automated release process via `postversion` script

## Package Publishing

- Published to npm as `@hughescr/logger` with public access
- Entry point: `src/index.ts` (TypeScript source, not compiled)
