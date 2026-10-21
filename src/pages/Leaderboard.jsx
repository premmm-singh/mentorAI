import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Flame, Code2, BookOpen, Crown, Medal } from 'lucide-react';

export default function Leaderboard() {
  const { data: allStudy = [] } = useQuery({
    queryKey: ['leaderboard-study'],
    queryFn: () => base44.entities.StudySession.list('-created_date', 200),
  });

  const { data: allDSA = [] } = useQuery({
    queryKey: ['leaderboard-dsa'],
    queryFn: () => base44.entities.DSASession.list('-created_date', 200),
  });

  const { data: allInterview = [] } = useQuery({
    queryKey: ['leaderboard-interview'],
    queryFn: () => base44.entities.InterviewSession.list('-created_date', 200),
  });

  // Aggregate per user
  const userMap = {};
  const add = (email, field, val) => {
    if (!email) return;
    if (!userMap[email]) userMap[email] = { email, study: 0, dsa: 0, interviews: 0, totalScore: 0, sessions: 0 };
    userMap[email][field] += val;
  };

  allStudy.forEach(s => { add(s.created_by, 'study', 1); add(s.created_by, 'totalScore', s.score || 0); add(s.created_by, 'sessions', 1); });
  allDSA.forEach(s => { add(s.created_by, 'dsa', 1); add(s.created_by, 'totalScore', s.score || 0); add(s.created_by, 'sessions', 1); });
  allInterview.forEach(s => { add(s.created_by, 'interviews', 1); add(s.created_by, 'sessions', 1); });

  const ranked = Object.values(userMap)
    .map(u => ({ ...u, avgScore: u.sessions ? (u.totalScore / u.sessions).toFixed(1) : 0 }))
    .sort((a, b) => b.sessions - a.sessions);

  const rankIcons = [
    <Crown className="w-5 h-5 text-yellow-500" />,
    <Medal className="w-5 h-5 text-gray-400" />,
    <Medal className="w-5 h-5 text-amber-600" />,
  ];

  const getInitials = (email) => email ? email.split('@')[0].slice(0, 2).toUpperCase() : '??';
  const getName = (email) => email ? email.split('@')[0].replace(/[._]/g, ' ') : 'Unknown';

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-5 h-5 text-chart-3" />
          <h3 className="font-semibold">Leaderboard</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-5">Rankings based on total sessions completed.</p>

        {ranked.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No data yet — start studying to appear here!</p>
        ) : (
          <div className="space-y-3">
            {ranked.map((user, i) => (
              <div
                key={user.email}
                className={`flex items-center gap-3 p-3 rounded-xl ${i === 0 ? 'bg-yellow-500/5 border border-yellow-500/20' : 'bg-muted/40'}`}
              >
                <div className="w-8 text-center shrink-0">
                  {rankIcons[i] || <span className="text-sm font-bold text-muted-foreground">#{i + 1}</span>}
                </div>
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{getInitials(user.email)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm capitalize truncate">{getName(user.email)}</p>
                  <div className="flex gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <BookOpen className="w-3 h-3" />{user.study}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <Code2 className="w-3 h-3" />{user.dsa}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <Trophy className="w-3 h-3" />{user.interviews}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-foreground">{user.sessions}</p>
                  <p className="text-xs text-muted-foreground">sessions</p>
                </div>
                <Badge className="bg-primary/10 text-primary shrink-0">{user.avgScore}/10</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Stats breakdown */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <BookOpen className="w-6 h-6 text-accent mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{allStudy.length}</p>
          <p className="text-xs text-muted-foreground">Study Sessions</p>
        </Card>
        <Card className="p-4 text-center">
          <Code2 className="w-6 h-6 text-chart-3 mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{allDSA.length}</p>
          <p className="text-xs text-muted-foreground">DSA Sessions</p>
        </Card>
        <Card className="p-4 text-center">
          <Trophy className="w-6 h-6 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{allInterview.length}</p>
          <p className="text-xs text-muted-foreground">Interviews</p>
        </Card>
      </div>
    </div>
  );
}