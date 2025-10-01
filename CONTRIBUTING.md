# Contributing to @hughescr/logger

Thank you for your interest in contributing to this project! This document provides guidelines for developers working on the codebase.

## Development Setup

This project uses [Bun](https://bun.sh) as the primary runtime and package manager. Make sure you have Bun installed before starting development.

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/hughescr/shared-logger.git
cd shared-logger
bun install
```

## Development Workflow

### Code Quality

Run linting and type checking:

```bash
bun lint
```

This command runs:
- ESLint with auto-fix enabled
- TypeScript compiler for type checking (no emit)

### Testing

Run the test suite:

```bash
bun test
```

The project uses Jest with ts-jest for testing. Tests are located in the `test/` directory.

### Mutation Testing

This project maintains 100% mutation test coverage to ensure the test suite can detect unintended code changes.

Run mutation tests:

```bash
bun mutate
```

Or with explicit Node options:

```bash
NODE_OPTIONS=--experimental-vm-modules bun x stryker run
```

**Important:** All pull requests must maintain 100% mutation coverage. The mutation testing thresholds are:
- High: 100%
- Low: 75%

## Branching Model

This project uses [git-flow](https://nvie.com/posts/a-successful-git-branching-model/):

- `develop` - Main development branch. All feature branches should be based on and merged back to `develop`.
- `master` - Production releases only. Tagged with version numbers and published to npm.
- `feature/*` - Feature branches for new functionality
- `release/*` - Release preparation branches
- `hotfix/*` - Emergency fixes for production

### Creating a New Feature

1. Create a feature branch from `develop`:
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/my-new-feature
   ```

2. Make your changes and commit them

3. Push and create a pull request to `develop`

### Releasing a New Version

Releases are automated via the `postversion` script in `package.json`:

```bash
npm version patch  # or minor, or major
```

This will:
1. Update version in `package.json`
2. Commit the version bump
3. Create a release branch
4. Finish the release and merge to `master`
5. Merge `master` back to `develop`

## Code Style

- Follow the ESLint configuration provided
- Use TypeScript strict mode
- Write tests for all new functionality
- Maintain 100% mutation test coverage

## TypeScript Configuration

The project uses:
- ESNext target
- Bundler module resolution
- `noEmit: true` - TypeScript is used for type checking only
- `verbatimModuleSyntax: true` - Explicit import type syntax required

## Pull Request Guidelines

1. Ensure all tests pass (`bun test`)
2. Ensure linting passes (`bun lint`)
3. Ensure mutation coverage remains at 100% (`bun mutate`)
4. Update documentation if needed
5. Provide a clear description of changes in the PR

## Questions or Issues?

If you have questions or run into issues, please:
- Check existing [issues](https://github.com/hughescr/shared-logger/issues)
- Create a new issue with a detailed description
- Reach out to the maintainer: Craig Hughes (craig.npm@rungie.com)
