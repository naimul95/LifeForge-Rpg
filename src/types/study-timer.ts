export type TimerStatus = "idle" | "running" | "paused" | "completed";

export interface TimerSubject {
  id: string;
  name: string;
  topics: Array<{ id: string; name: string }>;
}

export interface TimerStateDto {
  status: TimerStatus;
  presetSeconds: number;
  customSeconds: number | null;
  elapsedSeconds: number;
  accumulatedSeconds: number;
  subjectId: string | null;
  topicId: string | null;
  startedAt: string | null;
  lastResumedAt: string | null;
  completionKey: string;
}

export interface StudyTimerData {
  state: TimerStateDto;
  subjects: TimerSubject[];
}
