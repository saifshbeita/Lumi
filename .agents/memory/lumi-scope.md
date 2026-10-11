---
name: Lumi product boundaries
description: Standing product and accessibility requirements from the Lumi brief.
---

Lumi supports children with learning differences and never diagnoses. Adults assign the student's mode. Parents must confirm a specialist assessment before a child account can be created.

**Why:** The user explicitly defined adult-led setup and non-diagnostic boundaries.

**How to apply:** Preserve adult ownership and mode authorization on both client and server. Do not add diagnosis or automatic condition detection.

The user expanded the original placeholder scope to real student chat with three assigned learning experiences, then requested real voice for dyslexia mode only. The voice request must not change other modes, the adult side, or the design system. The brand uses the supplied mascot, flat borders, no shadows, and no animations. Student interfaces now support adult-assigned Arabic or English; see bilingual-ownership.md.

**Why:** These are explicit scope and accessibility rules from the user.

**How to apply:** Keep voice restricted to dyslexia students on both client and server. Preserve the supplied mascot and motion-free accessibility constraints; do not display condition labels to children.

The adult-profile expansion is limited to session-based learning observations and owned read-only transcripts, including authorized replay of dyslexia audio. It must preserve student modes, existing voice behavior, authentication flows, and the design system.

Adult insights must stay observational: no diagnoses, condition labels, or guesses about health or family. Sparse evidence should produce fewer insights, not invented weaknesses or needs.

**Why:** The user explicitly set these boundaries for making adult profiles reflect children's sessions.

**How to apply:** Treat a student's assigned mode and Lumi's answers as context, not proof of the child's abilities. Keep evidence traceable to the child's actual messages.

The pitch demo is an adult-only, temporary comparison of the real student modes, not a separate mockup. It must not save questions, replies, audio, or insights to student records. Interests are optional learning-example topics; autism examples must use them literally and concretely when supplied.

**Why:** The user requested a projector demonstration without contaminating children's histories, and explicitly protected existing authentication, voice internals, insights logic, and design tokens.

**How to apply:** Reuse the student presentation components and generation prompts. Scope demo-only recording access to the adult session; keep existing student voice authorization unchanged. Verify projector fit inside each column, not just absence of page scrolling.

Adult entry-screen role is navigation intent, not a credential. Authenticate the email and password; use the account's stored role for authorization.

**Why:** A correct teacher password was rejected when the parent entry screen supplied its role. Removing that mismatch must never change the account's actual permissions.

**How to apply:** Keep role selection separate from credential verification; do not apply this adult-login rule to student login.
