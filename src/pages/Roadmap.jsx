import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Map, Sparkles, CheckCircle2, Circle, RotateCcw, Target, Calendar } from 'lucide-react';
import LoadingDots from '@/components/shared/LoadingDots';
import { format } from 'date-fns';

const TIMELINES = ['2 weeks', '1 month', '2 months', '3 months', '6 months'];

export default function Roadmap() {
  const [goal, setGoal] = useState('');
  const [timeline, setTimeline] = useState('1 month');
  const [loading, setLoading] = useState(false);
  const [activeRoadmap, setActiveRoadmap] = useState(null);
  const queryClient = useQueryClient();

  const { data: roadmaps = [] } = useQuery({
    queryKey: ['roadmaps'],
    queryFn: () => base44.entities.Roadmap.list('-created_date', 5),
  });

  const generateRoadmap = async () => {
    if (!goal.trim()) return;
    setLoading(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Create a detailed, actionable study roadmap for someone who wants to: "${goal}"
Timeline: ${timeline}
Generate a week-by-week plan with daily tasks. Be specific and practical.`,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          summary: { type: 'string' },
          weeks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                week: { type: 'number' },
                theme: { type: 'string' },
                tasks: { type: 'array', items: { type: 'string' } },
                milestone: { type: 'string' },
              },
            },
          },
        },
      },
    });

    const saved = await base44.entities.Roadmap.create({
      goal,
      timeline,
      title: result.title,
      summary: result.summary,
      weeks_data: JSON.stringify(result.weeks),
      completed_tasks: JSON.stringify([]),
      created_date_str: format(new Date(), 'yyyy-MM-dd'),
    });

    queryClient.invalidateQueries({ queryKey: ['roadmaps'] });
    setActiveRoadmap({ ...saved, _weeks: result.weeks, _completed: [] });
    setLoading(false);
  };

  const openRoadmap = (r) => {
    setActiveRoadmap({
      ...r,
      _weeks: JSON.parse(r.weeks_data || '[]'),
      _completed: JSON.parse(r.completed_tasks || '[]'),
    });
  };

  const toggleTask = async (weekIdx, taskIdx) => {
    const key = `${weekIdx}-${taskIdx}`;
    const completed = activeRoadmap._completed.includes(key)
      ? activeRoadmap._completed.filter(k => k !== key)
      : [...activeRoadmap._completed, key];

    const updated = { ...activeRoadmap, _completed: completed };
    setActiveRoadmap(updated);
    await base44.entities.Roadmap.update(activeRoadmap.id, { completed_tasks: JSON.stringify(completed) });
  };

  const totalTasks = activeRoadmap?._weeks?.reduce((acc, w) => acc + (w.tasks?.length || 0), 0) || 0;
  const doneTasks = activeRoadmap?._completed?.length || 0;
  const progress = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {!activeRoadmap ? (
        <>
          {/* Generator */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Map className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">AI Roadmap Generator</h3>
            </div>
            <p className="text-sm text-muted-foreground">Tell me your goal — I'll build you a day-by-day plan to crush it.</p>
            <Input
              placeholder="e.g. Crack Google SWE interview, Learn React, Master DSA..."
              value={goal}
              onChange={e => setGoal(e.target.value)}
            />
            <div className="flex gap-3 items-end">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Timeline</label>
                <Select value={timeline} onValueChange={setTimeline}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>{TIMELINES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={generateRoadmap} disabled={!goal.trim() || loading}>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Roadmap
              </Button>
            </div>
            {loading && <LoadingDots />}
          </Card>

          {/* Past roadmaps */}
          {roadmaps.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Your Roadmaps</h3>
              <div className="space-y-2">
                {roadmaps.map(r => {
                  const completed = JSON.parse(r.completed_tasks || '[]').length;
                  const total = JSON.parse(r.weeks_data || '[]').reduce((a, w) => a + (w.tasks?.length || 0), 0);
                  const pct = total ? Math.round((completed / total) * 100) : 0;
                  return (
                    <Card key={r.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => openRoadmap(r)}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm">{r.title}</p>
                        <Badge variant="outline">{r.timeline}</Badge>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{pct}% complete · {completed}/{total} tasks</p>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          {/* Header */}
          <Card className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-foreground">{activeRoadmap.title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{activeRoadmap.summary}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setActiveRoadmap(null)}>
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Back
              </Button>
            </div>
            {/* Progress */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{doneTasks}/{totalTasks} tasks</span>
                <span className="font-semibold text-primary">{progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </Card>

          {/* Weeks */}
          {activeRoadmap._weeks?.map((week, wi) => (
            <Card key={wi} className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">W{week.week}</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">{week.theme}</p>
                  {week.milestone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Target className="w-3 h-3" /> {week.milestone}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {week.tasks?.map((task, ti) => {
                  const key = `${wi}-${ti}`;
                  const done = activeRoadmap._completed.includes(key);
                  return (
                    <button
                      key={ti}
                      onClick={() => toggleTask(wi, ti)}
                      className={`w-full flex items-start gap-2 text-left text-sm p-2 rounded-lg transition-colors ${done ? 'opacity-60' : 'hover:bg-muted'}`}
                    >
                      {done
                        ? <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                        : <Circle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      }
                      <span className={done ? 'line-through text-muted-foreground' : ''}>{task}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}