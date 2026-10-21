import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatCard from '@/components/shared/StatCard';
import GoalProgressCard from '@/components/shared/GoalProgressCard';
import {
  Timer, BookOpen, Code2, Languages, Brain, Activity,
  Sun, ClipboardCheck, MessageCircle, ChevronRight,
  Flame, Target, TrendingUp, Award, Briefcase, Map, Trophy
} from 'lucide-react';
import { format } from 'date-fns';

const quickActions = [
  { path: '/timer', label: 'Start Focus', icon: Timer, color: 'bg-primary/10 text-primary' },
  { path: '/study', label: 'Study Session', icon: BookOpen, color: 'bg-accent/10 text-accent' },
  { path: '/dsa', label: 'DSA Practice', icon: Code2, color: 'bg-chart-3/10 text-chart-3' },
  { path: '/english', label: 'English', icon: Languages, color: 'bg-chart-4/10 text-chart-4' },
  { path: '/ai-learning', label: 'AI Learning', icon: Brain, color: 'bg-chart-5/10 text-chart-5' },
  { path: '/morning', label: 'Morning', icon: Sun, color: 'bg-chart-3/10 text-chart-3' },
  { path: '/activity', label: 'Log Activity', icon: Activity, color: 'bg-primary/10 text-primary' },
  { path: '/review', label: 'Daily Review', icon: ClipboardCheck, color: 'bg-accent/10 text-accent' },
  { path: '/assistant', label: 'AI Chat', icon: MessageCircle, color: 'bg-chart-4/10 text-chart-4' },
];

export default function Dashboard() {
  const [onboardingDone, setOnboardingDone] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: profiles = [], isSuccess: profilesLoaded } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => base44.entities.UserProfile.list('-created_date', 1),
  });

  const showOnboarding = profilesLoaded && profiles.length === 0 && !onboardingDone;

  const { data: studySessions = [] } = useQuery({
    queryKey: ['study-today'],
    queryFn: () => base44.entities.StudySession.filter({ session_date: today }),
  });

  const { data: dsaSessions = [] } = useQuery({
    queryKey: ['dsa-today'],
    queryFn: () => base44.entities.DSASession.filter({ session_date: today }),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities-today'],
    queryFn: () => base44.entities.ActivityLog.list('-created_date', 10),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews-recent'],
    queryFn: () => base44.entities.DailyReview.list('-created_date', 7),
  });

  const avgScore = [...studySessions, ...dsaSessions]
    .filter(s => s.score)
    .reduce((acc, s, _, arr) => acc + s.score / arr.length, 0);

  const profile = profiles[0];
  const displayName = profile?.display_name;

  return (
    <div className="space-y-6">
      {showOnboarding && (
        <OnboardingModal onComplete={(data) => setOnboardingDone(true)} />
      )}
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {displayName ? `Welcome back, ${displayName} 👋` : 'Welcome back'}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')} — Let's make today count.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={BookOpen} label="Study Sessions" value={studySessions.length} color="primary" subtitle="today" />
        <StatCard icon={Code2} label="DSA Sessions" value={dsaSessions.length} color="accent" subtitle="today" />
        <StatCard icon={Activity} label="Activities Logged" value={activities.length} color="chart3" subtitle="recent" />
        <StatCard icon={Award} label="Avg Score" value={avgScore ? avgScore.toFixed(1) : '—'} color="chart4" subtitle="today" />
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
          {quickActions.map(action => (
            <Link key={action.path} to={action.path}>
              <Card className="p-3 flex flex-col items-center gap-2 hover:shadow-md transition-shadow cursor-pointer group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.color} group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground text-center">{action.label}</span>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Instant Start Shortcuts */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Start Now</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/study">
            <Card className="p-4 flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer group border-2 hover:border-accent/50">
              <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <BookOpen className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">New Study Session</p>
                <p className="text-xs text-muted-foreground">Pick a topic & start learning</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
            </Card>
          </Link>
          <Link to="/dsa">
            <Card className="p-4 flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer group border-2 hover:border-chart-3/50">
              <div className="w-11 h-11 rounded-xl bg-chart-3/10 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <Code2 className="w-5 h-5 text-chart-3" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">DSA Practice</p>
                <p className="text-xs text-muted-foreground">Solve a coding problem now</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
            </Card>
          </Link>
          <Link to="/interview">
            <Card className="p-4 flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer group border-2 hover:border-primary/40">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <Briefcase className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Mock Interview</p>
                <p className="text-xs text-muted-foreground">AI plays the interviewer</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
            </Card>
          </Link>
          <Link to="/roadmap">
            <Card className="p-4 flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer group border-2 hover:border-chart-4/40">
              <div className="w-11 h-11 rounded-xl bg-chart-4/10 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <Map className="w-5 h-5 text-chart-4" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">AI Roadmap</p>
                <p className="text-xs text-muted-foreground">Day-by-day plan for your goal</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
            </Card>
          </Link>
        </div>
      </div>

      {/* Goal Progress */}
      <GoalProgressCard />

      {/* Recent Activity */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Recent Activity</h3>
        <Card className="divide-y divide-border">
          {activities.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No activities logged yet. Start tracking your day!
            </div>
          )}
          {activities.slice(0, 5).map(a => (
            <div key={a.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{a.activity}</p>
                <p className="text-xs text-muted-foreground capitalize">{a.category || 'other'}</p>
              </div>
              <span className="text-xs text-muted-foreground">
                {a.created_date ? format(new Date(a.created_date), 'h:mm a') : ''}
              </span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}