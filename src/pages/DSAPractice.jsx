import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Code2, Play, RotateCcw, Lightbulb, Target, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import AIChatBubble from '@/components/shared/AIChatBubble';
import LoadingDots from '@/components/shared/LoadingDots';
import GoalPicker from '@/components/shared/GoalPicker';
import { format } from 'date-fns';

const DSA_TOPICS = [
  'Arrays & Two Pointers', 'Linked Lists', 'Stacks & Queues', 'Binary Trees',
  'Binary Search', 'Dynamic Programming', 'Graphs & BFS/DFS', 'Hash Maps',
  'Sorting Algorithms', 'Recursion & Backtracking', 'Heaps', 'Tries',
];

export default function DSAPractice() {
  const [step, setStep] = useState('pick'); // pick, learn, solve, result
  const [search, setSearch] = useState('');
  const [concept, setConcept] = useState('');
  const [lesson, setLesson] = useState('');
  const [problem, setProblem] = useState('');
  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [linkedGoalId, setLinkedGoalId] = useState(null);
  const [linkedGoalText, setLinkedGoalText] = useState(null);
  const queryClient = useQueryClient();

  const { data: sessions = [] } = useQuery({
    queryKey: ['dsa-sessions'],
    queryFn: () => base44.entities.DSASession.list('-created_date', 10),
  });

  const startLesson = async (topic) => {
    setConcept(topic);
    setLoading(true);
    setStep('learn');
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a DSA mentor teaching "${topic}". Explain the concept clearly with:\n1. What it is and why it's important\n2. Time and space complexity\n3. A simple example\n\nKeep it concise but thorough. Use C++ syntax for examples.`,
    });
    setLesson(result);
    setLoading(false);
  };

  const generateProblem = async () => {
    setLoading(true);
    setStep('solve');
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a scenario-based coding problem related to "${concept}". The problem should:\n1. Have a real-world scenario\n2. Be solvable using ${concept}\n3. Include input/output examples\n4. Be medium difficulty\n\nFormat it clearly.`,
    });
    setProblem(result);
    setLoading(false);
  };

  const submitCode = async () => {
    if (!code.trim()) return;
    setLoading(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are evaluating a student's C++ code for a DSA problem about "${concept}".\n\nProblem: ${problem}\n\nStudent's code:\n\`\`\`cpp\n${code}\n\`\`\`\n\nEvaluate:\n1. Correctness\n2. Time complexity\n3. Space complexity\n4. Code quality\n5. Suggestions for improvement\n\nGive a score out of 10.`,
      response_json_schema: {
        type: 'object',
        properties: {
          score: { type: 'number' },
          correctness: { type: 'string' },
          time_complexity: { type: 'string' },
          space_complexity: { type: 'string' },
          suggestions: { type: 'string' },
          overall_feedback: { type: 'string' },
        },
      },
    });
    setFeedback(result);
    setStep('result');
    setLoading(false);

    await base44.entities.DSASession.create({
      concept,
      problem,
      user_code: code,
      ai_feedback: result.overall_feedback,
      score: result.score,
      session_date: format(new Date(), 'yyyy-MM-dd'),
      ...(linkedGoalId && { linked_goal_id: linkedGoalId, linked_goal_text: linkedGoalText }),
    });
    queryClient.invalidateQueries({ queryKey: ['dsa-sessions'] });
  };

  const reset = () => {
    setStep('pick');
    setConcept('');
    setLesson('');
    setProblem('');
    setCode('');
    setFeedback(null);
    setLinkedGoalId(null);
    setLinkedGoalText(null);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        {step === 'pick' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Code2 className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Pick a DSA Topic</h3>
            </div>
            <GoalPicker
              value={linkedGoalId}
              onChange={(id, text) => { setLinkedGoalId(id); setLinkedGoalText(text); }}
            />
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search topics..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {/* Topic Badges */}
            <div className="flex flex-wrap gap-2">
              {DSA_TOPICS.filter(t => t.toLowerCase().includes(search.toLowerCase())).map(t => (
                <button
                  key={t}
                  onClick={() => startLesson(t)}
                  className="px-3 py-1.5 rounded-full border border-border bg-secondary text-sm font-medium text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                >
                  {t}
                </button>
              ))}
              {/* If search doesn't match any, allow custom topic */}
              {search.trim() && !DSA_TOPICS.some(t => t.toLowerCase() === search.toLowerCase()) && (
                <button
                  onClick={() => startLesson(search.trim())}
                  className="px-3 py-1.5 rounded-full border-2 border-dashed border-primary/50 bg-primary/5 text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                >
                  + Practice "{search.trim()}"
                </button>
              )}
            </div>
          </div>
        )}

        {step === 'learn' && (
          <div className="space-y-4">
            <Badge className="bg-primary/10 text-primary">{concept}</Badge>
            {loading ? <LoadingDots /> : (
              <>
                <AIChatBubble isAI message={lesson} />
                <Button onClick={generateProblem}>
                  <Play className="w-4 h-4 mr-2" />
                  Ready! Give me a problem
                </Button>
              </>
            )}
          </div>
        )}

        {step === 'solve' && (
          <div className="space-y-4">
            <Badge className="bg-accent/10 text-accent">Problem</Badge>
            {loading ? <LoadingDots /> : (
              <>
                <AIChatBubble isAI message={problem} />
                <Textarea
                  placeholder="Write your C++ code here..."
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  rows={12}
                  className="font-mono text-sm"
                />
                <Button onClick={submitCode} disabled={!code.trim()}>
                  Submit Code
                </Button>
              </>
            )}
          </div>
        )}

        {step === 'result' && feedback && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">{feedback.score}</span>
              </div>
              <div>
                <p className="font-semibold text-foreground">Code Score</p>
                <p className="text-xs text-muted-foreground">out of 10</p>
              </div>
            </div>
            <AIChatBubble isAI message={feedback.overall_feedback} />
            <div className="grid gap-2">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Time Complexity</p>
                <p className="text-sm text-foreground">{feedback.time_complexity}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Space Complexity</p>
                <p className="text-sm text-foreground">{feedback.space_complexity}</p>
              </div>
              {feedback.suggestions && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" /> Suggestions
                  </p>
                  <p className="text-sm text-foreground">{feedback.suggestions}</p>
                </div>
              )}
            </div>
            {linkedGoalText && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Target className="w-3 h-3" />
                Linked to: <span className="font-medium text-foreground">{linkedGoalText}</span>
              </div>
            )}
            <Button onClick={reset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              New Topic
            </Button>
          </div>
        )}
        {loading && step !== 'learn' && step !== 'solve' && <LoadingDots />}
      </Card>

      {sessions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Recent DSA Sessions</h3>
          <div className="space-y-2">
            {sessions.map(s => (
              <Card key={s.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{s.concept}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-muted-foreground">{s.session_date}</p>
                    {s.linked_goal_text && (
                      <span className="text-xs text-primary flex items-center gap-1">
                        <Target className="w-2.5 h-2.5" />{s.linked_goal_text}
                      </span>
                    )}
                  </div>
                </div>
                {s.score && <Badge className="bg-primary/10 text-primary">{s.score}/10</Badge>}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}