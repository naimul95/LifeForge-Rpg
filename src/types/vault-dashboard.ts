export type VaultMaterialKind = "note" | "pdf" | "image" | "handwritten_note" | "document" | "video" | "website";

export interface VaultMaterialDto {
  id: string;
  title: string;
  description: string;
  kind: VaultMaterialKind;
  url: string | null;
  content: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface VaultTopicDto {
  id: string;
  subjectId: string;
  name: string;
  description: string;
  progress: number;
  remaining: number;
  studyMinutes: number;
  sessionCount: number;
  averageSessionMinutes: number;
  estimatedMinutes: number;
  lastStudied: string | null;
  roadmap: Array<{
    id: string;
    title: string;
    description: string;
    completed: boolean;
  }>;
  roadmapProgress: number;
  materials: VaultMaterialDto[];
}

export interface VaultSubjectDto {
  id: string;
  name: string;
  description: string;
  color: string;
  pinned: boolean;
  progress: number;
  studyMinutes: number;
  sessionCount: number;
  averageSessionMinutes: number;
  lastStudied: string | null;
  topics: VaultTopicDto[];
}
