import { useParams } from 'wouter';
import { StudentGuard } from '../student-guard';

export default function AutismChat() {
  const { id } = useParams<{ id: string }>();
  const n = Number(id);
  return <StudentGuard mode="autism" chatId={Number.isInteger(n) && n > 0 ? n : 0} />;
}
