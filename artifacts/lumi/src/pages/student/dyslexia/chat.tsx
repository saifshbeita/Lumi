import { useParams } from 'wouter';
import { StudentGuard } from '../student-guard';

export default function DyslexiaChat() {
  const { id } = useParams<{ id: string }>();
  const n = Number(id);
  return <StudentGuard mode="dyslexia" chatId={Number.isInteger(n) && n > 0 ? n : 0} />;
}
