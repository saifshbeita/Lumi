---
name: Bilingual ownership and evidence
description: User-defined language control, transcript preservation, and bilingual evidence-generation lessons.
---

Public pages offer Arabic/English with a remembered public choice, default Arabic. Adults have a saved account preference. Students have no language toggle after login: the adult assigns the child's language in the add/edit form. The adult-only comparison demo has its own toggle, independent of the adult's saved preference.

**Why:** The user explicitly specified who controls language throughout the website.

**How to apply:** Keep public, adult, child and demo language ownership separate. Preserve colors and spacing when making language changes. New student replies, titles and voice follow the assigned language; switching an adult's language must not change the child's language.

Old transcripts and quoted child words must never be translated. Adults see translated insight text and explanations, but the child's quotation remains exact and original in both languages. Only explicitly fictional seeded demo chats may be regenerated when repairing an incorrectly seeded English demo.

**Why:** The user requires bilingual insights without changing the evidence or rewriting children's histories.

**How to apply:** Migrate legacy observations additively, retain original columns, and limit any demo-content replacement to verified fictional accounts and seed chats.

Use one verified original excerpt for both translated evidence explanations rather than independently asking the model to reproduce the quotation twice.

**Why:** Independent bilingual evidence outputs failed exact-quote validation repeatedly. Models also inserted Arabic letter glyphs into otherwise English explanations; this is distinct from the original quotation, which legitimately keeps its script.

**How to apply:** Keep quoting separate from translation, validate the excerpt against the child's actual message, and preserve strict evidence checks. Describe foreign-script letter practice in the explanation's language instead of weakening validation after failed generations.

Internal interest metadata retains the adult's original spelling even when the child-visible example is translated. Validate that distinction without replacing a clear question's failed answer with an unrelated generic prompt.

**Why:** A bilingual interest-validation failure made an Arabic arithmetic question appear to succeed while displaying only “What would you like to ask?”

**How to apply:** Keep mode/example validation strict. Combine format and language repair within one regeneration budget; surface an explicit error if the repaired structured answer still fails.
