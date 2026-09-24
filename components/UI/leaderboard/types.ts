export type LeaderboardPeriod = "week" | "all-time";

export type LeaderboardEntry = {
  id: string;
  firstName: string;
  lastName: string;
  city?: string | null;
  school?: string | null;
  score: number;
};

/** Entries are ranked by the data provider, never by the presentation layer. */
export type LeaderboardBoard = {
  id: string;
  label: string;
  description: string;
  scoreLabel: string;
  periods: Record<LeaderboardPeriod, readonly LeaderboardEntry[]>;
};

export type LeaderboardProps = {
  variant: "games" | "aruz";
  boards: readonly LeaderboardBoard[];
  /** Demo status must be explicit at the integration point. */
  isDemo: boolean;
};
