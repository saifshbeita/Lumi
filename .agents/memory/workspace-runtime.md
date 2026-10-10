---
name: Workspace runtime boundaries
description: Non-obvious TypeScript and seed execution constraints in this pnpm environment.
---

Generated fetch clients that merge Headers require DOM.Iterable in the shared client's TypeScript libraries.

**Why:** Orval's header-merging output uses Headers.entries, which is not declared by DOM alone.

**How to apply:** Preserve DOM.Iterable when updating the generator or shared TypeScript configuration.

Multipart OpenAPI bodies must use named component schemas, and shared generated binary types need Blob/File declarations.

**Why:** Inline multipart schemas can make Orval export a Zod value and a TypeScript type under the same operation-derived name. Generated binary schemas also reference browser types even when imported by Node.

**How to apply:** Give upload bodies entity-based component names, regenerate rather than hand-editing output, and preserve the DOM library for shared binary schemas.

Run development seeds through a TypeScript-aware runtime rather than externalizing workspace source packages into a standalone ESM bundle.

**Why:** Workspace package exports point at TypeScript source, whose extensionless directory imports fail under plain Node ESM; bundling only the workspace package also moves dependency resolution outside its owning package.

**How to apply:** Use the package's seed command and keep seeding development-only.

Server-only files also need protection in development web previews, not just exclusion from the production client bundle.

**Why:** Vite's pnpm workspace file access can permit direct filesystem URLs to server files; an answer bank can otherwise be reachable even when no frontend imports it.

**How to apply:** When adding or changing web previews, deny private banks, guide/instruction sources and backend generators across every preview service while preserving the default environment/key-file denies.
