import { Banknote, BriefcaseBusiness, Clock3, Store, Zap } from "lucide-react";
import type { Source, SourceType } from "../types";

export const sourceIcons = {
  "Shift Work": Clock3,
  "Casual Work": Store,
  "Gig Work": Zap,
  Freelancing: BriefcaseBusiness,
  Other: Banknote,
} satisfies Record<SourceType, typeof Banknote>;

export const initialSources: Source[] = [
  {
    id: 1,
    type: "Gig Work",
    name: "Uber",
    income: 1280,
    detail: "Monthly income · active since Apr 2026",
    color: "violet",
  },
  {
    id: 2,
    type: "Casual Work",
    name: "ABC Retail",
    income: 920,
    detail: "12 recorded shifts · active since Jun 2026",
    color: "blue",
  },
  {
    id: 3,
    type: "Freelancing",
    name: "Web development",
    income: 640,
    detail: "2 active clients · active since Aug 2026",
    color: "amber",
  },
];

export const periods = [
  "Last week",
  "Last month",
  "Previous month",
  "Last 3 months",
  "Last 6 months",
  "2026",
  "Custom range",
];

export const latestRecords = [
  ["Uber", "+$320", "Sep 24", "violet"],
  ["ABC Retail", "+$184", "Sep 21", "blue"],
  ["Web development", "+$640", "Sep 18", "amber"],
] as const;
