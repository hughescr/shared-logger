[![Mutation testing badge](https://img.shields.io/endpoint?url=https%3A%2F%2Fbadge-api.stryker-mutator.io%2Fgithub.com%2Fhughescr%2Fshared-logger%2Fdevelop)](https://dashboard.stryker-mutator.io/reports/github.com/hughescr/shared-logger/develop)

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

## Contributing

Interested in contributing? See [CONTRIBUTING.md](https://github.com/hughescr/shared-logger/blob/main/CONTRIBUTING.md) for development setup, testing guidelines, and our git-flow branching model.

## License

This project is licensed under the Apache License 2.0 - see [LICENSE.md](LICENSE.md) for details.
