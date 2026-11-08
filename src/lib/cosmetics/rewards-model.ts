export type StudyRewards = {
  today: string; timezone: string; server_now: string; next_midnight_at: string; study_seconds: number;
  quests: { minutes: number; required_seconds: number; coins: number; awarded: boolean }[];
  tracks: { track_id: string; name: string; archived: boolean; study_seconds: number; milestones: number; seconds_to_next: number }[];
  track_count: number; page: number; pages: number;
};
