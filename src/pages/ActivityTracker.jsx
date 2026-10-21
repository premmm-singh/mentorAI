import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Activity, Plus, Clock, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const CATEGORIES = ['study', 'exercise', 'work', 'break', 'entertainment', 'meditation', 'reading', 'coding', 'other'];

const categoryColors = {
  study: 'bg-primary/10 text-primary',
  exercise: 'bg-accent/10 text-accent',
  work: 'bg-chart-5/10 text-chart-5',
  break: 'bg-chart-3/10 text-chart-3',
  entertainment: 'bg-chart-4/10 text-chart-4',
  meditation: 'bg-accent/10 text-accent',
  reading: 'bg-primary/10 text-primary',
  coding: 'bg-chart-5/10 text-chart-5',
  other: 'bg-muted text-muted-foreground',
};

export default function ActivityTracker() {
  const [activity, setActivity] = useState('');
  const [category, setCategory] = useState('other');
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: () => base44.entities.ActivityLog.list('-created_date', 50),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ActivityLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      setActivity('');
      setCategory('other');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ActivityLog.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activity-logs'] }),
  });

  const logActivity = () => {
    if (!activity.trim()) return;
    createMutation.mutate({
      activity,
      category,
      logged_at: new Date().toISOString(),
    });
  };

  // Group logs by date
  const grouped = logs.reduce((acc, log) => {
    const date = log.created_date ? format(new Date(log.created_date), 'yyyy-MM-dd') : 'Unknown';
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Log Form */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">What are you doing?</h3>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="e.g., Reading a book, Coding..."
            value={activity}
            onChange={e => setActivity(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && logActivity()}
            className="flex-1"
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => (
                <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={logActivity} size="icon" disabled={!activity.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* Timeline */}
      {Object.entries(grouped).map(([date, items]) => (
        <div key={date}>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">
            {date === format(new Date(), 'yyyy-MM-dd') ? 'Today' : format(new Date(date), 'EEEE, MMM d')}
          </h4>
          <Card className="divide-y divide-border">
            {items.map(log => (
              <div key={log.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{log.activity}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`text-[10px] ${categoryColors[log.category] || categoryColors.other}`}>
                      {log.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {log.created_date ? format(new Date(log.created_date), 'h:mm a') : ''}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost" size="icon"
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => deleteMutation.mutate(log.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </Card>
        </div>
      ))}

      {logs.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No activities logged yet. Start tracking your day!
        </div>
      )}
    </div>
  );
}