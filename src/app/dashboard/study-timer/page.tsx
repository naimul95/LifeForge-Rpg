import { getStudyTimerData } from "@/actions/study-timer.actions";
import { PersistentStudyTimer } from "@/components/features/study-timer/persistent-study-timer";

export default async function StudyTimerPage({ searchParams }: { searchParams: Promise<{ subject?: string; topic?: string }> }) {
  const params = await searchParams;
  return <PersistentStudyTimer initialData={await getStudyTimerData()} initialSubjectId={params.subject} initialTopicId={params.topic} />;
}
