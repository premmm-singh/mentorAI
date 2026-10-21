import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target } from 'lucide-react';

export default function GoalPicker({ value, onChange }) {
  const { data: profiles = [] } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => base44.entities.UserProfile.list('-created_date', 1),
  });

  const profile = profiles[0];
  const goals = profile?.study_goals?.filter(g => g.status !== 'completed') ?? [];

  if (goals.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Target className="w-4 h-4 text-muted-foreground shrink-0" />
      <Select value={value || 'none'} onValueChange={v => onChange(v === 'none' ? null : v, goals.find((_, i) => `goal-${i}` === v)?.goal)}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Link to a goal (optional)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none" className="text-xs text-muted-foreground">No goal linked</SelectItem>
          {goals.map((g, i) => (
            <SelectItem key={i} value={`goal-${i}`} className="text-xs">
              {g.goal}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}