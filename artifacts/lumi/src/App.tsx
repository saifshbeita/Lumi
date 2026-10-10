import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import Auth from '@/pages/auth';
import Dashboard from '@/pages/adult/dashboard';
import StudentProfilePage from '@/pages/adult/student-profile';
import DemoPage from '@/pages/adult/demo/demo';
import ChatTranscriptPage from '@/pages/adult/chat-transcript';
import StudentLogin from '@/pages/student/login';
import DyslexiaHome from '@/pages/student/dyslexia';
import LearningHome from '@/pages/student/learning';
import AutismHome from '@/pages/student/autism';
import DyslexiaChat from '@/pages/student/dyslexia/chat';
import LearningChat from '@/pages/student/learning/chat';
import AutismChat from '@/pages/student/autism/chat';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/auth" component={Auth} />
        <Route path="/adult" component={Dashboard} />
        <Route path="/demo" component={DemoPage} />
        <Route path="/adult/students/:id" component={StudentProfilePage} />
        <Route path="/students/:id/chats/:chatId" component={ChatTranscriptPage} />
        <Route path="/student/login" component={StudentLogin} />
        <Route path="/student/dyslexia/chat/:id" component={DyslexiaChat} />
        <Route path="/student/learning/chat/:id" component={LearningChat} />
        <Route path="/student/autism/chat/:id" component={AutismChat} />
        <Route path="/student/dyslexia" component={DyslexiaHome} />
        <Route path="/student/learning" component={LearningHome} />
        <Route path="/student/autism" component={AutismHome} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
