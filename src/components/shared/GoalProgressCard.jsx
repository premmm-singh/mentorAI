import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Target } from 'lucide-react';
import { Link } from 'react-router-dom';

const TARGET_SESSIONS_PER_GOAL = 10; // treat 10 sessions as "100%"

function GoalBar({ goal, index, allStudy, allDSA }) {
  // Count sessions linked to this goal (by index key or text match)
  const goalKey = `goal-${index}`;
  const matchedSessions = [...allStudy, ...allDSA].filter(
    s => s.linked_goal_id === goalKey || s.linked_goal_text === goal.goal
  );
  const count = matchedSessions.length;
  const pct = Math.min(100, Math.round((count / TARGET_SESSIONS_PER_GOAL) * 100));

  const priorityColor = {
    high: 'bg-destructive',
    medium: 'bg-chart-3',
    low: 'bg-accent',
  }[goal.priority] || 'bg-primary';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-foreground truncate max-w-[75%]">{goal.goal}</p>
        <span className="text-xs text-muted-foreground shrink-0 ml-2">{count}/{TARGET_SESSIONS_PER_GOAL} sessions</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${priorityColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span className="capitalize">{goal.priority} priority</span>
        <span>{pct}%</span>
      </div>
    </div>
  );
}

export default function GoalProgressCard() {
  const { data: profiles = [] } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => base44.entities.UserProfile.list('-created_date', 1),
  });

  const { data: allStudy = [] } = useQuery({
    queryKey: ['all-study-sessions'],
    queryFn: () => base44.entities.StudySession.list('-created_date', 200),
  });

  const { data: allDSA = [] } = useQuery({
    queryKey: ['all-dsa-sessions'],
    queryFn: () => base44.entities.DSASession.list('-created_date', 200),
  });

  const profile = profiles[0];
  const goals = profile?.study_goals?.filter(g => g.status !== 'completed') ?? [];

  if (goals.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Target className="w-4 h-4 text-primary" /> Goal Progress
        </h3>
        <Link to="/assistant" className="text-xs text-primary hover:underline">View all</Link>
      </div>
      <Card className="p-4 space-y-4">
        {goals.map((goal, i) => (
          <GoalBar
            key={i}
            index={i}
            goal={goal}
            allStudy={allStudy}
            allDSA={allDSA}
          />
        ))}
      </Card>
    </div>
  );
}