// ⚠️ File tự sinh bởi scripts/gen-plugins.ts — không sửa tay.
import type { PluginManifest } from "./types";
import { plugin as accounting } from "./accounting/manifest";
import { plugin as cafe } from "./cafe/manifest";
import { plugin as hotel } from "./hotel/manifest";
import { plugin as restaurant } from "./restaurant/manifest";
import { plugin as spa } from "./spa/manifest";
import { plugin as travel } from "./travel/manifest";

export const PLUGINS: PluginManifest[] = [accounting, cafe, hotel, restaurant, spa, travel];
