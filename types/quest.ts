export interface DailyQuestItem {
  code: string;
  title: string;
  current: number;
  target: number;
  rewardExp: number;
  isCompleted: boolean;
}

export interface DailyQuestsResponse {
  quests: DailyQuestItem[];
}
