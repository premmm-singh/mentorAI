import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Sun, Dumbbell, Wind, BookOpen, Save, CheckCircle2 } from 'lucide-react';
import AIChatBubble from '@/components/shared/AIChatBubble';
import LoadingDots from '@/components/shared/LoadingDots';
import MorningAlarm from '@/components/shared/MorningAlarm';
import { format } from 'date-fns';

const MOODS = [
  { value: 'energetic', label: '⚡ Energetic' },
  { value: 'good', label: '😊 Good' },
  { value: 'neutral', label: '😐 Neutral' },
  { value: 'tired', label: '😴 Tired' },
  { value: 'groggy', label: '🥱 Groggy' },
];

export default function MorningRoutine() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const queryClient = useQueryClient();

  const { data: routines = [] } = useQuery({
    queryKey: ['morning-routines'],
    queryFn: () => base44.entities.MorningRoutine.list('-created_date', 7),
  });

  const todayRoutine = routines.find(r => r.routine_date === today);

  const [wakeUp, setWakeUp] = useState(todayRoutine?.wake_up_time || '04:00');
  const [mood, setMood] = useState(todayRoutine?.mood || '');
  const [exercise, setExercise] = useState(todayRoutine?.exercise_done || false);
  const [meditation, setMeditation] = useState(todayRoutine?.meditation_done || false);
  const [reading, setReading] = useState(todayRoutine?.reading_done || false);
  const [aiGuide, setAiGuide] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(!!todayRoutine);

  const getGuidance = async () => {
    if (!mood) return;
    setLoading(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `The user just woke up at ${wakeUp || 'an unknown time'} and feels "${mood}". Create a brief, motivating morning routine plan including:\n1. Exercise suggestion (5-15 min)\n2. Meditation/breathing exercise\n3. Reading recommendation\n4. One affirmation for the day\n\nBe encouraging and adapt to their mood. Keep it short and actionable.`,
    });
    setAiGuide(result);
    setLoading(false);
  };

  const saveRoutine = async () => {
    const data = {
      routine_date: today,
      wake_up_time: wakeUp,
      mood,
      exercise_done: exercise,
      meditation_done: meditation,
      reading_done: reading,
    };

    if (todayRoutine) {
      await base44.entities.MorningRoutine.update(todayRoutine.id, data);
    } else {
      await base44.entities.MorningRoutine.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ['morning-routines'] });
    setSaved(true);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Sun className="w-5 h-5 text-chart-3" />
          <h3 className="font-semibold text-foreground">Morning Check-in</h3>
          {saved && <Badge className="bg-accent/10 text-accent ml-auto"><CheckCircle2 className="w-3 h-3 mr-1" /> Saved</Badge>}
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Wake-up Time</label>
          <Input type="time" value={wakeUp} onChange={e => setWakeUp(e.target.value)} className="w-40" />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">How do you feel?</label>
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

        {mood && !aiGuide && (
          <Button onClick={getGuidance} disabled={loading}>
            Get AI Morning Guidance
          </Button>
        )}
        {loading && <LoadingDots />}
        {aiGuide && <AIChatBubble isAI message={aiGuide} />}

        <div className="space-y-3 pt-2">
          <h4 className="text-sm font-semibold text-foreground">Checklist</h4>
          <div className="flex items-center gap-3">
            <Checkbox checked={exercise} onCheckedChange={setExercise} id="exercise" />
            <label htmlFor="exercise" className="text-sm flex items-center gap-2 cursor-pointer">
              <Dumbbell className="w-4 h-4 text-accent" /> Exercise
            </label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox checked={meditation} onCheckedChange={setMeditation} id="meditation" />
            <label htmlFor="meditation" className="text-sm flex items-center gap-2 cursor-pointer">
              <Wind className="w-4 h-4 text-primary" /> Meditation
            </label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox checked={reading} onCheckedChange={setReading} id="reading" />
            <label htmlFor="reading" className="text-sm flex items-center gap-2 cursor-pointer">
              <BookOpen className="w-4 h-4 text-chart-3" /> Reading
            </label>
          </div>
        </div>

        <div className="pt-1 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">🔔 Voice Alarm — speaks a friendly reminder at your wake-up time</p>
          <MorningAlarm
            wakeUpTime={wakeUp}
            tasks={{ exercise, meditation, reading }}
          />
        </div>

        <Button onClick={saveRoutine}>
          <Save className="w-4 h-4 mr-2" />
          {todayRoutine ? 'Update' : 'Save'} Routine
        </Button>
      </Card>

      {/* History */}
      {routines.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">This Week</h3>
          <div className="grid grid-cols-7 gap-1">
            {routines.slice(0, 7).map(r => (
              <Card key={r.id} className="p-2 text-center">
                <p className="text-[10px] text-muted-foreground">{format(new Date(r.routine_date), 'EEE')}</p>
                <div className="flex justify-center gap-0.5 mt-1">
                  <div className={`w-2 h-2 rounded-full ${r.exercise_done ? 'bg-accent' : 'bg-border'}`} />
                  <div className={`w-2 h-2 rounded-full ${r.meditation_done ? 'bg-primary' : 'bg-border'}`} />
                  <div className={`w-2 h-2 rounded-full ${r.reading_done ? 'bg-chart-3' : 'bg-border'}`} />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}