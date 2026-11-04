// ⚠️ File tự sinh bởi scripts/gen-plugins.ts — không sửa tay.
import type { DemoSeed } from "./types";
import { demo as accounting } from "./accounting/seed";
import { demo as cafe } from "./cafe/seed";
import { demo as hotel } from "./hotel/seed";
import { demo as restaurant } from "./restaurant/seed";
import { demo as spa } from "./spa/seed";

export const DEMO_SEEDS: { industry: string; demo: DemoSeed }[] = [
  { industry: "accounting", demo: accounting },
  { industry: "cafe", demo: cafe },
  { industry: "hotel", demo: hotel },
  { industry: "restaurant", demo: restaurant },
  { industry: "spa", demo: spa },
];
