# Publishing and seeding the Lumi pitch demo

The seed creates only reserved, explicitly fictional pitch accounts. It never
deletes data, resets passwords, or edits unrelated accounts. Existing reserved
identifiers with unexpected ownership cause an error instead of being reused.
Each chat is inserted atomically; reruns skip completed chats, cached audio, and
existing insights. An interrupted run can be retried.

## Steps for the published site

1. In Publishing, confirm that `DEMO_PASSWORD`, the AI credentials, and private
   object-storage settings are available to the production deployment.
   `DEMO_PASSWORD` must be at least eight characters and must differ from the old
   development password.
2. Click **Publish/Republish**. Accept the additive database schema changes
   (`students.language` and `login_attempts`). **Do not choose overwrite production
   data.** Publishing applies the schema; the seed does not create or alter tables.
3. In the Database tool, choose **Production → Settings** and copy its connection
   string directly into a new secret named `PRODUCTION_SEED_DATABASE_URL`. Do not
   paste that value into chat, source code, or a shell command.
4. In the workspace Shell, run this exact command:

   ```sh
   test -n "$PRODUCTION_SEED_DATABASE_URL" &&
   DATABASE_URL="$PRODUCTION_SEED_DATABASE_URL" NODE_ENV=production \
     pnpm --filter @workspace/api-server run seed:demo
   ```

   The temporary `DATABASE_URL` assignment applies only to this command. Normal
   workspace development continues using the development database. Expect several
   minutes for real replies, cached speech, and evidence-checked insights.
5. Success prints `Demo ready` for all four usernames below and exits with code 0.
   If a provider or evidence-validation error interrupts it, rerun the same command.
   Do not remove existing data to retry.
6. Remove `PRODUCTION_SEED_DATABASE_URL` from Secrets when finished. Open
   **https://lumi-mena.replit.app** and use the accounts below.

The workspace's ordinary `seed` command remains development-only. Neither server
startup nor the deployment build automatically runs the production data seed.
Running `seed:demo` without the temporary database assignment populates development,
not production.

## Fictional accounts

| Account | Login | Password / PIN |
|---|---|---|
| Teacher | `pitch-teacher@lumi.demo` | Your `DEMO_PASSWORD` |
| Parent | `pitch-parent@lumi.demo` | Your `DEMO_PASSWORD` |
| نور التجريبية — Arabic, dyslexia, teacher | `pitch-noor` | `4826` |
| Alex Demo — English, small steps, teacher | `pitch-alex` | `5937` |
| سامي التجريبي — Arabic, calm/literal, teacher | `pitch-sami` | `6842` |
| ريم التجريبية — Arabic, dyslexia, parent | `pitch-reem` | `7953` |

Each child has four fictional chats with eight messages each, two interests,
real generated mode-specific replies, and evidence-backed profile insights.
Dyslexia AI messages have private cached audio. These accounts are for public
demonstrations only: never enter real child information into them.

The old `teacher@lumi.demo` and `parent@lumi.demo` development logins are rejected
in production. Existing unrelated accounts are unchanged.

## Login protection

- Five wrong student PINs lock that username for 15 minutes; attempt six and even a
  correct PIN during the lock are rejected. Messages use the child's language.
- Ten wrong adult passwords lock that email for 15 minutes.
- Separate per-IP limits cover repeated requests and attempts across usernames.
- Username counters are database-backed and serialized across server instances.

## Verification boundaries

Development testing does not establish that the published version has been
updated. Publish, run the production seed, and verify production login before
using the public URL in a pitch. The seed uses real AI and speech calls and
therefore incurs the usual provider usage.
