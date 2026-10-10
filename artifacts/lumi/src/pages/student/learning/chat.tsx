import { useParams } from 'wouter';
import { StudentGuard } from '../student-guard';

export default function LearningChat() {
  const { id } = useParams<{ id: string }>();
  const n = Number(id);
  return <StudentGuard mode="learning" chatId={Number.isInteger(n) && n > 0 ? n : 0} />;
}
