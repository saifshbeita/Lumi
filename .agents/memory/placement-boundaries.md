---
name: Placement product boundaries
description: User-specified warm-up scope, source precedence, language, safety, and audio exceptions.
---

The placement extension targets ages 6–12. The user-supplied dyslexia, learning-difficulties, and autism guides take precedence over the general placement brief for items, scoring, flags, tutor rules, context templates, and adult wording.

**Why:** The user explicitly designated these guides as the source of truth, not illustrative suggestions.

**How to apply:** Preserve exact item IDs and prescribed rules. Do not substitute AI scoring, generic assessments, or inferred clinical meanings.

Warm-ups are non-diagnostic and must never be called tests or exams in the child interface. Scoring is deterministic; scores, levels, flags, right/wrong reactions, and red correctness styling are never shown to children. Apply the same guide-defined neutral feedback to every answer.

**Why:** The user wants a starting point for personalization without labeling children or making the activity feel evaluative.

**How to apply:** Keep hidden results adult-only, separate placement observations from session evidence, and preserve historical transcripts and original child quotations.

Warm-up item content and item audio stay Arabic even when interface chrome is English. Existing adult ownership of the child's interface language is not replaced by a new child toggle.

**Why:** The user explicitly chose Arabic item banks while retaining Lumi's bilingual interface.

**How to apply:** Treat item language separately from interface language and normal assigned-language chat behavior.

The placement guides explicitly require warm-up audio beyond dyslexia, optional favorite-thing voice input in the autism warm-up, and applicable learning-mode reading audio support. These are exceptions to the earlier dyslexia-only voice request, not instructions to replace existing speech providers.

**Why:** The newer feature needs audio to deliver and distinguish the guide-defined activities and supported answers.

**How to apply:** Authorize only the requested capabilities, preserve the managed-text/direct-speech provider boundary, and do not infer general conversational microphones for every mode.

Presentation limits are mode-specific: dyslexia needs its full voice explanation despite the written cap; learning-mode reading aid follows the current chunk. Check actual displayed prose, not unused fields or emoji/list/decimal formatting as extra sentences.

**Why:** The guide separates writing, voice and step-size constraints. A generic shared-output validator can reject compliant beginner replies or bypass short-memory pacing.

**How to apply:** Keep correctness-independent guide encouragement verbatim even when it praises effort. Validate only the fields used by the mode; preserve full meaning and never use truncation as a validation fallback.

Untouched legacy accounts retain no-placement chat compatibility. New enrollments, started warm-ups, redos, and mode changes must complete the current required warm-up before chatting; prior results remain adult history, not pending tutor context.

**Why:** The user requires both legacy compatibility and first-login/redo gates. A missing result alone cannot distinguish a legacy account from a required unfinished attempt.

**How to apply:** Enforce the gate on the backend independently of page redirects. Serialize the final reply check/save with adult reassignment and redo changes.

Practice must match the lesson and assessed domain rather than become an arithmetic-only loop. Keep activity authoring separate from evaluation: canonical placement scoring never uses AI, and ordinary lesson answers are evaluated against private server-held keys, not by asking the model to grade children.

**Why:** Reading and conceptual learning need relevant checks; correctness in letter recognition is not evidence for increasing math difficulty.

**How to apply:** Track evidence by domain, keep answer keys out of child responses, and never treat Next as a correct answer.
