---
name: Dependency remediation constraints
description: Reasons for the preview glob replacement and typography selector parser override.
---

Keep preview file discovery on a glob library that does not depend on `braces` unless its stack-exhaustion advisory has been fixed upstream.

**Why:** As of 2026-10-10, both the latest fast-glob and micromatch still depended on vulnerable braces 3.0.3, with no patched braces release available. Tinyglobby preserved the required nested-file discovery and private-file exclusions without that dependency.

**How to apply:** When changing preview discovery dependencies, check the full transitive dependency audit rather than assuming a latest parent release is safe.

Retain a targeted selector parser override for the typography plugin until its upstream dependency pin is safe.

**Why:** The latest typography release pinned parser 6.0.10; the flat-selector CPU exhaustion fix was available only in parser 7.1.6. The override was verified with the Lumi CSS production build.

**How to apply:** Recheck upstream typography dependencies when upgrading; remove the override only once its dependency resolves to a patched parser.
