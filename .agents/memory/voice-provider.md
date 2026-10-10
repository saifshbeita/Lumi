---
name: Voice provider boundary
description: Why Lumi voice uses direct OpenAI while text chat stays on the managed integration.
---

Keep the existing managed text-chat provider separate from the direct OpenAI voice provider.

**Why:** The managed integration supported transcription and audio-chat models but not the dedicated speech endpoint required by the user's requested STT → existing text chat → exact-text TTS flow. The user explicitly chose their own OpenAI key as the fallback.

**How to apply:** Do not substitute a speech-to-speech model that generates a second answer instead of reading the saved reply. Re-check managed speech support before proposing any provider consolidation.
