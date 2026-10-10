# Lumi bilingual production update

## Before running

1. Publish/Republish these changes. Review the additive database changes: `adults.language` (default Arabic) and `profile_insights.text_ar`, `text_en`, `evidence_ar`, `evidence_en`. Existing insight columns remain. Accept the additive schema migration; do **not** overwrite production data with development data.
2. Keep the existing production `DEMO_PASSWORD`, AI provider settings and private App Storage settings. Never paste secrets into chat or source code.
3. In the Database pane, select **Production → Settings** and copy its connection string directly into a temporary workspace secret named `PRODUCTION_SEED_DATABASE_URL`.

## Exact command (workspace Shell)

```sh
test -n "$PRODUCTION_SEED_DATABASE_URL" &&
DATABASE_URL="$PRODUCTION_SEED_DATABASE_URL" NODE_ENV=production \
  pnpm --filter @workspace/api-server run demo:bilingual
```

This overrides `DATABASE_URL` for this command only. It does not change the workspace's development database setting. The command performs data updates only, never schema DDL. It uses real AI requests and can take several minutes. Wait for exit code 0 and:

`Bilingual update complete. All insights have both languages; ordinary transcripts were not translated.`

Then remove the temporary `PRODUCTION_SEED_DATABASE_URL` secret.

## What the command updates

- Copies each legacy insight's original text/evidence into the matching language fields, keeping the original columns.
- Uses the existing fictional pitch accounts, or safely creates them if absent. Refuses reserved-name/ownership/password collisions rather than overwriting another account.
- Sets `pitch-alex` to English. Only the explicitly named fictional seed chats are regenerated in English if they contain Arabic. Ordinary chats are never translated or replaced.
- Regenerates all four fictional demo students' insights with Arabic and English text/explanations in one generation call per child. Exact original student quotations are preserved in both languages.
- Backfills missing translations for all other existing observations without regenerating or deleting those observations. Source quotes, legacy columns and transcripts remain unchanged.
- Newly seeded demos produce bilingual insights from now on. Repeated runs do not duplicate accounts or chats; demo insights are refreshed again.

The command can be rerun after an interruption. It stops with a nonzero exit code if validation or AI requests fail; previously validated insights are retained. A partial run may already have completed earlier children. Do not substitute the development connection string.

## Verify on the published app

- Entry, adult auth and student login have AR | EN, and remember the public choice.
- Sign in as `pitch-teacher@lumi.demo` or `pitch-parent@lumi.demo` with your existing `DEMO_PASSWORD`. Adult language is saved on the account.
- Toggle an adult profile: insight text and evidence explanations switch immediately without regeneration. The quoted child's words stay in their original language.
- `pitch-alex` / PIN `5937`: English learning UI, replies and new titles.
- `pitch-noor` / PIN `4826`: Arabic dyslexia UI and voice.
- `pitch-sami` / PIN `6842`: Arabic organized learning UI.
- `pitch-reem` / PIN `7953`: Arabic dyslexia UI and voice.
- `/demo` has its own toggle for all three columns. It does not change the adult's saved preference or write student records.

Student pages never expose a language toggle after sign-in. The adult sets **Child's language** in the add/edit form; changing it affects future replies and titles, not old transcripts.
