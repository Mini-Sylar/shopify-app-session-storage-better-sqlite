# shopify-app-session-storage-better-sqlite

A drop‑in SQLite session storage implementation for Shopify apps.

Designed primarily to power the [shopify-app-vue-template](https://github.com/Mini-Sylar/shopify-app-vue-template)
during local development, this package implements the same interface used by
`@shopify/shopify-app-session-storage` but persists sessions to a lightweight
SQLite file. It's useful when you want minimal dependencies and don't need a
remote database in the early stages of building a Shopify app.

> ⚠️ **For production use or more complex requirements** consider one of the
> officially supported stores such as the [Drizzle](https://www.npmjs.com/package/@shopify/shopify-app-session-storage-drizzle) or
> [Prisma](https://www.npmjs.com/package/@shopify/shopify-app-session-storage-prisma) adapters; they work well with hosted
> databases and scale more easily. This package is mainly for local demos,
> prototypes, or when you deliberately choose a self‑contained file‑based
> store.

## Usage

```ts
import { SQLiteSessionStorage } from "shopify-app-session-storage-better-sqlite";

const storage = new SQLiteSessionStorage({
  databasePath: "./sessions.sqlite", // or ':memory:' for in‑memory
});

// pass `storage` to whatever initializes your Shopify API client
```

Refer to the upstream [`@shopify/shopify-app-session-storage`](https://github.com/Shopify/shopify-app-session-storage)
readme for the full API – this module implements the same methods and behaviours.

## Development

```bash
# install deps
pnpm install

# run unit tests (Vitest)
pnpm test

# build the package
pnpm run build
```

Tests live under `tests/` and use the `*.test.ts` suffix. They exercise the
storage class against a battery of session‑management scenarios and are
already passing.

> Because the implementation now exists, running `pnpm test` should give you
> a clean green output.

## Publishing

Releases are driven by [semantic-release](https://semantic-release.gitbook.io/),
triggered by GitHub Actions. Pushing a `vX.Y.Z` tag to **main** will build,
update the changelog, create a GitHub release, and publish to npm. The
workflow is defined in `.github/workflows/release.yml`.

---

Feel free to use this store locally and swap to a different adapter later as
your needs change. Happy building!
