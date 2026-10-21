import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Send, Calendar, TrendingUp } from 'lucide-react';
import AIChatBubble from '@/components/shared/AIChatBubble';
import LoadingDots from '@/components/shared/LoadingDots';
import { format } from 'date-fns';

const MOODS = [
  { value: 'great', label: '🔥 Great' },
  { value: 'good', label: '👍 Good' },
  { value: 'okay', label: '🤷 Okay' },
  { value: 'tired', label: '😩 Tired' },
  { value: 'stressed', label: '😰 Stressed' },
];

export default function DailyReview() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const queryClient = useQueryClient();
  const [completed, setCompleted] = useState('');
  const [mood, setMood] = useState('');
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);

  const { data: reviews = [] } = useQuery({
    queryKey: ['daily-reviews'],
    queryFn: () => base44.entities.DailyReview.list('-created_date', 14),
  });

  const { data: todayActivities = [] } = useQuery({
    queryKey: ['today-activities'],
    queryFn: () => base44.entities.ActivityLog.list('-created_date', 20),
  });

  const { data: todayStudy = [] } = useQuery({
    queryKey: ['today-study-review'],
    queryFn: () => base44.entities.StudySession.filter({ session_date: today }),
  });

  const submitReview = async () => {
    if (!completed.trim() || !mood) return;
    setLoading(true);

    const activitiesSummary = todayActivities
      .filter(a => a.created_date && format(new Date(a.created_date), 'yyyy-MM-dd') === today)
      .map(a => `${a.activity} (${a.category})`)
      .join(', ');

    const studySummary = todayStudy.map(s => `${s.topic}: ${s.score}/10`).join(', ');

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a life mentor doing a daily review. The user's day:\n\nCompleted: ${completed}\nMood: ${mood}\nActivities logged: ${activitiesSummary || 'None'}\nStudy sessions: ${studySummary || 'None'}\n\nProvide:\n1. Productivity score (1-10)\n2. What they did well\n3. What they could improve\n4. A plan for tomorrow with specific tasks and times\n5. One motivational thought\n\nBe supportive but push them to be better.`,
      response_json_schema: {
        type: 'object',
        properties: {
          productivity_score: { type: 'number' },
          did_well: { type: 'string' },
          improve: { type: 'string' },
          tomorrow_plan: { type: 'string' },
          motivation: { type: 'string' },
        },
      },
    });

    setReview(result);
    setLoading(false);

    await base44.entities.DailyReview.create({
      review_date: today,
      completed_tasks: completed,
      ai_feedback: result.did_well + '\n\n' + result.improve,
      next_day_plan: result.tomorrow_plan,
      productivity_score: result.productivity_score,
      mood,
    });
    queryClient.invalidateQueries({ queryKey: ['daily-reviews'] });
  };

  return (
    <div className="space-y-6">
      {!review ? (
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">End of Day Review</h3>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">How was your day?</label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map(m => (
                <Button
                  key={m.value}
                  variant={mood === m.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMood(m.value)}
                >
                  {m.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">What did you complete today?</label>
            <Textarea
              placeholder="List everything you accomplished today..."
              value={completed}
              onChange={e => setCompleted(e.target.value)}
              rows={5}
            />
          </div>

          <Button onClick={submitReview} disabled={!completed.trim() || !mood || loading}>
            <Send className="w-4 h-4 mr-2" />
            Get AI Review
          </Button>
          {loading && <LoadingDots />}
        </Card>
      ) : (
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">{review.productivity_score}</span>
            </div>
            <div>
              <p className="font-semibold text-foreground">Today's Score</p>
              <p className="text-xs text-muted-foreground">Productivity Rating</p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
            <p className="text-xs font-semibold text-accent mb-1">What You Did Well</p>
            <p className="text-sm text-foreground">{review.did_well}</p>
          </div>

          <div className="p-3 rounded-lg bg-chart-3/5 border border-chart-3/20">
            <p className="text-xs font-semibold text-chart-3 mb-1">Areas to Improve</p>
            <p className="text-sm text-foreground">{review.improve}</p>
          </div>

          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Tomorrow's Plan
            </p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{review.tomorrow_plan}</p>
          </div>

          <AIChatBubble isAI message={review.motivation} />

          <Button variant="outline" onClick={() => setReview(null)}>
            Submit Another Review
          </Button>
        </Card>
      )}

      {/* History */}
      {reviews.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Recent Reviews</h3>
          <div className="space-y-2">
            {reviews.map(r => (
              <Card key={r.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{r.review_date}</p>
                  <p className="text-xs text-muted-foreground capitalize">{r.mood}</p>
                </div>
                {r.productivity_score && (
                  <Badge className="bg-primary/10 text-primary flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {r.productivity_score}/10
                  </Badge>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}