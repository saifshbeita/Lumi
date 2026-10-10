# Lumi demo accounts

These accounts are for the development preview only. The seed command refuses to run in production. Do not use demo credentials for real children.

| Adult role | Email | Password |
|---|---|---|
| Teacher | teacher@lumi.demo | LumiDemo2026! |
| Parent | parent@lumi.demo | LumiDemo2026! |

| Student | Username | PIN | Assigned mode | Adult |
|---|---|---|---|---|
| آدم | adam | 1234 | dyslexia | Teacher |
| ليان | layan | 2345 | learning | Teacher |
| عمر | omar | 3456 | autism | Parent |

Re-run the idempotent seed with `pnpm --filter @workspace/api-server run seed`. It will not overwrite existing accounts.
