[![Maintainability](https://api.codeclimate.com/v1/badges/52b72f2f616b288326dc/maintainability)](https://codeclimate.com/github/hughescr/shared-logger/maintainability) [![Test Coverage](https://api.codeclimate.com/v1/badges/52b72f2f616b288326dc/test_coverage)](https://codeclimate.com/github/hughescr/shared-logger/test_coverage)

Shared logger infrastructure
----------------------------

I had a need for an easy-to-use logger across my various NodeJS projects.  This is it.  If you like it, feel free also to use it.  When I make releases, I push them to npm @hughescr/logger and that is probably the best/safest way to consume this package.  The `develop` branch and other github stuff might break compatibility at any time.  `master` is for releases and is what will be on npm at any given point in time, tagged with release numbers.

## Installation

Install the package via npm:

```bash
npm install @hughescr/logger
```

Or with bun:

```bash
bun add @hughescr/logger
```

## Basic usage

```ts
import { logger } from '@hughescr/logger';

logger.info('starting up');
```

### Express middleware

```ts
import express from 'express';
import { middleware } from '@hughescr/logger';

const app = express();
app.use(middleware);
```

## Intercepting console

```ts
import { logger } from '@hughescr/logger';

logger.interceptConsole();
console.log('captured');
logger.restoreConsole();
```

## Development

Run linting, type checking and tests with bun:

```bash
bun lint
bun x tsc
bun test
```

Run mutation testing with bun:

```bash
bun mutate
```

Mutation tests are expected to reach 100% coverage to ensure that
the suite can detect unintended code changes.
