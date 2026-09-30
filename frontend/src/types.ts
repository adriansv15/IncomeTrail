export type SourceType =
  "Shift Work" | "Casual Work" | "Gig Work" | "Freelancing" | "Other";

export type Source = {
  id: number;
  type: SourceType;
  name: string;
  income: number;
  detail: string;
  color: string;
  archived?: boolean;
};
