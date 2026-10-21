import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import FocusTimer from '@/pages/FocusTimer';
import StudyMentor from '@/pages/StudyMentor';
import DSAPractice from '@/pages/DSAPractice';
import EnglishPractice from '@/pages/EnglishPractice';
import AILearning from '@/pages/AILearning';
import ActivityTracker from '@/pages/ActivityTracker';
import MorningRoutine from '@/pages/MorningRoutine';
import DailyReview from '@/pages/DailyReview';
import AIAssistant from '@/pages/AIAssistant';
import InterviewPrep from '@/pages/InterviewPrep';
import Roadmap from '@/pages/Roadmap';
import Leaderboard from '@/pages/Leaderboard';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/timer" element={<FocusTimer />} />
        <Route path="/study" element={<StudyMentor />} />
        <Route path="/dsa" element={<DSAPractice />} />
        <Route path="/english" element={<EnglishPractice />} />
        <Route path="/ai-learning" element={<AILearning />} />
        <Route path="/activity" element={<ActivityTracker />} />
        <Route path="/morning" element={<MorningRoutine />} />
        <Route path="/review" element={<DailyReview />} />
        <Route path="/assistant" element={<AIAssistant />} />
        <Route path="/interview" element={<InterviewPrep />} />
        <Route path="/roadmap" element={<Roadmap />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App