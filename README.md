# Lumi

**Every mind learns differently.**

Lumi is a bilingual (Arabic/English) AI learning assistant for kids with dyslexia, autism, and learning difficulties. Each child gets an interface built for how they learn, and their teachers and parents get one dashboard that shows what each child actually needs.

Built in 24 hours at **The AI Hackathon** by Fikr Ventures × Replit, Amman, October 2026.

**Live demo:** [lumi-mena.replit.app](https://lumi-mena.replit.app)


---

## The problem

Schools teach one way. Kids don't learn one way. In Jordan, resource room teachers build custom material by hand for every student, and children with learning differences fall behind because the lesson was never built for how they learn.

## How Lumi works

### Three learning modes

Each child sees only the mode assigned to them. One AI tutor, three ways to learn.

| Mode | Approach |
|---|---|
| **Dyslexia** | Voice-first. Every answer is read aloud. Short replies, large text, wide spacing |
| **Learning difficulties** | One small step at a time, with checkpoints so nothing is skipped |
| **Autism** | Calm, literal, and predictable. Fixed Learn/Practice structure, no animations or surprises |

### One dashboard for teachers and parents

Adults create the child's account, assign their learning mode, and get a live profile of strengths, weaknesses and needs built from every session. Teachers manage a whole class, parents manage their own children. Same dashboard, different labels.

> Lumi never diagnoses. Conditions are set by the adult based on an existing assessment from a specialist.

---

## Features

- **Mode-specific AI tutor** with separate system prompts per learning mode
- **Voice in and out** for Arabic and English, with generated audio cached in object storage
- **Evidence-based student profiles:** the model analyzes recent chats and generates strengths, weaknesses and needs. Every observation must be backed by a verbatim student quote from a real chat, validated server-side before it's saved
- **Arabic placement warm-ups** per mode (ages 6 to 12) that adapt practice difficulty and response style
- **Subject picker:** math, science, Arabic, English, general
- **Full Arabic/English UI** with RTL support, plus adult-controlled language per student
- **Chat history** for students and transcript viewing for adults
- **Safety response rules** built into every mode

---

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS, Wouter, TanStack Query, i18next, Lucide |
| Backend | Node.js, Express 5, TypeScript, Zod, Pino |
| Database | PostgreSQL, Drizzle ORM |
| AI | OpenAI GPT-5.4 mini (chat and profile analysis) |
| Voice | gpt-4o-mini-transcribe (speech-to-text), gpt-4o-mini-tts (text-to-speech) |
| Platform | Replit (pnpm workspace) |

---


## Team

- **Saif Shbeita:** Developer & Team Lead
- **Hala Shbeita**
- **Yousef Smreen**

---

*Lumi was built as a hackathon project. If you're a teacher, specialist, parent or builder interested in taking it further, reach out on [LinkedIn](https://linkedin.com/in/saif-shbeita).*
