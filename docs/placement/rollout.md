# Placement warm-ups: verification and safe rollout

The three mode guides in this directory are authoritative, copied verbatim. Item banks under `placement/items/` are server-only. Existing mode prompts are retained; placement-scoped context/presentation overrides only the necessary format limits.

## Behavior and boundaries

- Ages 6–12; adults choose the child's mode and interface language. Warm-up content, instructions, audio and guide feedback stay Arabic; navigation follows the assigned language.
- `learning` remains the app mode; its placement test is `learning_difficulties`.
- Guide-defined encouragement is identical for correct, wrong and skipped responses; it never indicates correctness. Keep the exact guide phrases.
- Levels, bands, flags and error patterns are never returned by the child warm-up API. Only owning adults can retrieve the starting point.
- A redo or mode change requires a new attempt. Old completed results remain available to adults as history, but all child chat endpoints reject pending or superseded warm-ups. Tutor context requires a completed current-mode, current-epoch result.
- New enrollments are marked required atomically; their attempt starts on first warm-up access rather than at account creation. Untouched legacy accounts still support no-placement chat until enrollment in a warm-up or a mode change requires one.
- Completion and deterministic placement-source observations are saved together. Session insight refresh replaces only session-source observations and preserves original quotations.
- Dyslexia stores the full spoken explanation separately from the constrained visible caption. Learning reading-aid speech reads the current chunk and check-in, not every future instruction at once. That reading aid and autism warm-up favorite recording are scoped exceptions, not general conversation microphone access.
- Practice answer keys stay on the server. Only evaluated choices change difficulty; Next never counts as correct. Practice state is tied to its completed placement.
- Two wrong/skipped answers stop only the guide-enabled section. Autism figurative/social sections always continue. Memory and instruction taps persist, and answered items resume without being scored again.

## Development checks

Practice follows the current reading, arithmetic, or other lesson rather than defaulting to arithmetic after initial sound/letter activities. Arithmetic answer keys are computed by the server. For reading and other lessons, the tutor authors a grounded multiple-choice activity; the server assigns opaque IDs, stores its answer key privately, and evaluates answers by ID. This authoring never scores placement answers or changes placement results. Difficulty evidence is tracked separately by domain; Next never counts as a correct answer.

Additional targeted checks:
```sh
pnpm --filter @workspace/api-server exec tsx src/scripts/verify-placement-domains.ts
pnpm --filter @workspace/api-server exec tsx src/scripts/verify-placement-lifecycle.ts
```

```sh
pnpm run typecheck:libs
pnpm --filter @workspace/api-server typecheck
pnpm --filter @workspace/lumi typecheck
pnpm --filter @workspace/api-server test:placement
pnpm --filter @workspace/api-server exec tsx src/scripts/verify-placement.ts
pnpm --filter @workspace/api-server exec tsx src/scripts/verify-placement-lifecycle.ts
pnpm --filter @workspace/api-server exec tsx src/scripts/verify-placement-personalization.ts
pnpm --filter @workspace/api-server exec tsx src/scripts/verify-placement-english.ts
```

The request/lifecycle scripts create and clean their own fictional development fixtures. The personalization check makes real managed-AI requests; it logs only verification outcomes, not child profiles. Build the web artifact with its configured `PORT` and `BASE_PATH`.

## Fictional development demos

Run `pnpm --filter @workspace/api-server seed:placement` only in development. This adds عمر, لين and يزن under the **already-existing verified** fictional pitch teacher. Reserved usernames are `warmup_omar_demo`, `warmup_leen_demo`, and `warmup_yazan_demo`; these fictional accounts use the demonstration PIN `1234`.

The command does not create/change adult passwords. It verifies exact ownership/name/mode and refuses collisions. Repeated runs retain existing placement history and pending redos. Demo reset requires the owning verified fictional adult and a server-marked demo record; it starts a fresh attempt without deleting prior results or conversations.

## Production

No production database or deployment was changed by this implementation. Do not run development `db push`, test-fixture scripts or this development-only seed against production. Do not put schema creation or demo seeding in app startup.

When publishing is explicitly approved, use the supported Publish database migration review for the additive schema changes, verify the deployed schema and routes, and perform any production demo seeding as a separately approved, collision-safe data-only operation. The development placement seed deliberately refuses production.

## Practical limits

This is an educational starting point, not a diagnosis, clinical assessment, IQ measurement or proof of learning progress. Speech playback can be blocked by browsers; the runner offers an explicit listen button and approved Arabic browser speech for upstream/network failures, never to bypass authorization or instruction replay limits. Response timing excludes provider/playback/preview/inactive time; it is metadata, never an autism level input.
