
export interface ProfileTask {
  key: string;
  label: string;
  reward: number;
  link?: string;
}

export interface TaskStatus {
  join_group: boolean;
  join_channel: boolean;
  share: boolean;
}
