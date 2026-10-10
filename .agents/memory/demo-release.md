---
name: Demo release boundaries
description: Production demo data safety and bilingual voice measurement requirements.
---
Production pitch data must use explicitly fictional children, separate reserved demo accounts, and the securely supplied demo password, never the development password. Seeds must be additive, resumable, idempotent, and must not overwrite existing unrelated data.

**Why:** The user explicitly requested safe live-site seeding and preservation of all other data.

**How to apply:** Keep production data seeding an explicit action, separate from ordinary startup. Publish handles production schema changes; do not add runtime DDL. Verify both the production schema and demo account presence before claiming the live site is ready.

The user requires Arabic and English support, immediate text visibility, cached dyslexia speech, and a stop-to-playback goal below 4.5 seconds.

**Why:** The pitch needs both languages, and prior browser measurements showed that averages can hide individual slow runs.

**How to apply:** Measure actual browser `playing`, not response headers or the first byte. Report individual runs/ranges and label reproduced buffered baselines as reproductions, not historical measurements. Upstream variability means one passing average is not proof every response meets the target.

Evidence-validation failures during demo insight generation must not be bypassed.

**Why:** A real seed generation failed exact-quote validation; inserting unchecked output would misrepresent children's histories.

**How to apply:** Retry a bounded number of real generations and keep the evidence checks. A failed run must remain safely resumable rather than inventing insights.
