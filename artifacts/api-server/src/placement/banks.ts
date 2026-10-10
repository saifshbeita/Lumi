import dyslexia from "../../../../placement/items/dyslexia.json";
import learning from "../../../../placement/items/learning_difficulties.json";
import autism from "../../../../placement/items/autism.json";
import type { Bank, PlacementTest } from "./types";
export const banks = { dyslexia, learning_difficulties: learning, autism } as unknown as Record<PlacementTest, Bank>;
export const testForMode = (mode: string): PlacementTest => mode === "learning" ? "learning_difficulties" : mode as PlacementTest;
export const itemsFor = (test: PlacementTest) => banks[test].sections.flatMap(s => s.items);
