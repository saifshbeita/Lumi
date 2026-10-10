export type PlacementTest = "dyslexia" | "learning_difficulties" | "autism";
export type Option = { id: string; label_ar?: string; emoji?: string; correct?: boolean; tag?: string; size?: number };
export type Item = {
  id: string; type: "choice" | "sequence_memory" | "ordered_taps" | "multi_pick" | "preference" | "size_pick" | "free_text_optional";
  prompt_ar: string; tts_ar?: string; shown?: string; passage?: string; passage_audio?: boolean;
  hidden_passage?: boolean; example?: string; options: Option[]; sequence?: string[]; save?: string;
  domain?: string; section: string; audio: "auto" | "optional" | "off"; stop_rule: boolean;
};
export type Bank = { test: PlacementTest; version: number; sections: { id: string; title_ar: string; items: Item[] }[] };
export type Answer = { item_id: string; picked: string[]; correct: boolean; points: number; supported: boolean; skipped: boolean; response_ms: number; replays: number; audio_used?: number };
export type Result = {
  test: PlacementTest; version: number; completed_at: string; levels: Record<string, number>; band: "starter" | "builder" | "explorer";
  flags: string[]; interests: string[]; preferences: Record<string, string | number | boolean>;
  signals: Record<string, number>; step?: number; error_patterns?: string[]; favorite_thing?: string;
};
