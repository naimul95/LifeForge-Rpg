export type SearchResult = {
  id: string;
  type: "Subject" | "Topic" | "Material" | "Note" | "Goal" | "Habit" | "Mission";
  title: string;
  detail: string;
  destination: string;
};