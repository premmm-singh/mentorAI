import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Send, Lightbulb, CheckCircle2, HelpCircle, Target, Search } from 'lucide-react';
import AIChatBubble from '@/components/shared/AIChatBubble';
import LoadingDots from '@/components/shared/LoadingDots';
import GoalPicker from '@/components/shared/GoalPicker';
import { format } from 'date-fns';

export default function StudyMentor() {
  const [topic, setTopic] = useState('');
  const [topicSearch, setTopicSearch] = useState('');
  const [explanation, setExplanation] = useState('');
  const [doubt, setDoubt] = useState('');
  const [aiResponse, setAiResponse] = useState(null);
  const [doubtResponse, setDoubtResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('topic'); // topic, explain, doubt, result
  const [linkedGoalId, setLinkedGoalId] = useState(null);
  const [linkedGoalText, setLinkedGoalText] = useState(null);
  const queryClient = useQueryClient();

  const { data: sessions = [] } = useQuery({
    queryKey: ['study-sessions'],
    queryFn: () => base44.entities.StudySession.list('-created_date', 10),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => base44.entities.UserProfile.list('-created_date', 1),
  });
  const userField = profiles[0]?.onboarding_field || '';

  const startSession = () => {
    if (!topic.trim()) return;
    setMode('explain');
  };

  const submitExplanation = async () => {
    if (!explanation.trim()) return;
    setLoading(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a study mentor. The student is studying "${topic}". They explained the topic as follows:\n\n"${explanation}"\n\nEvaluate their understanding. Provide:\n1. A score out of 10\n2. What they got right\n3. What they missed or got wrong\n4. A better explanation of the topic\n\nBe encouraging but honest.`,
      response_json_schema: {
        type: 'object',
        properties: {
          score: { type: 'number' },
          feedback: { type: 'string' },
          correct_points: { type: 'string' },
          missed_points: { type: 'string' },
          better_explanation: { type: 'string' },
        },
      },
    });

    setAiResponse(result);
    setMode('result');
    setLoading(false);

    await base44.entities.StudySession.create({
      topic,
      explanation,
      ai_feedback: result.feedback,
      score: result.score,
      session_date: format(new Date(), 'yyyy-MM-dd'),
      ...(linkedGoalId && { linked_goal_id: linkedGoalId, linked_goal_text: linkedGoalText }),
    });
    queryClient.invalidateQueries({ queryKey: ['study-sessions'] });
  };

  const askDoubt = async () => {
    if (!doubt.trim()) return;
    setLoading(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `The student is studying "${topic}" and says: "${doubt}"\n\nExplain the concept in very simple terms. Use analogies and real-world examples. Then ask the student to explain it back in their own words.`,
    });
    setDoubtResponse(result);
    setLoading(false);
  };

  const reset = () => {
    setTopic('');
    setExplanation('');
    setDoubt('');
    setAiResponse(null);
    setDoubtResponse(null);
    setLinkedGoalId(null);
    setLinkedGoalText(null);
    setMode('topic');
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        {mode === 'topic' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">What are you studying?</h3>
            </div>
            {/* Search/topic input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search or type any topic..."
                value={topicSearch}
                onChange={e => { setTopicSearch(e.target.value); setTopic(e.target.value); }}
                onKeyDown={e => e.key === 'Enter' && startSession()}
                className="pl-9"
              />
            </div>
            {/* Suggested topic badges */}
            {(() => {
              const FIELD_SUGGESTIONS = {
                software_engineering: ['Binary Search Trees', 'Dynamic Programming', 'System Design', 'OS Concepts', 'DBMS Normalization', 'OOP Principles', 'Computer Networks', 'Recursion', 'Graph Theory', 'Design Patterns', 'Bit Manipulation', 'Tries'],
                data_science_ml: ['Machine Learning Basics', 'Neural Networks', 'Pandas & NumPy', 'Statistics', 'Linear Algebra', 'Probability', 'Decision Trees', 'Gradient Descent', 'Feature Engineering', 'Model Evaluation'],
                web_development: ['React Hooks', 'CSS Flexbox', 'REST APIs', 'JavaScript Promises', 'HTML Semantics', 'Node.js Basics', 'SQL Basics', 'Authentication', 'TypeScript', 'Next.js'],
                competitive_programming: ['Sorting Algorithms', 'Segment Trees', 'Graph Theory', 'Greedy Algorithms', 'Bit Manipulation', 'Recursion', 'Dynamic Programming', 'Number Theory', 'Binary Search', 'Two Pointers'],
                general_studies: ['Critical Thinking', 'Time Management', 'Memory Techniques', 'Exam Strategy', 'Note Taking', 'Pomodoro Technique', 'Mind Mapping', 'Speed Reading'],
                english_communication: ['Grammar Rules', 'Vocabulary Building', 'Essay Writing', 'Sentence Structure', 'Tenses', 'Idioms & Phrases', 'Communication Skills', 'Reading Comprehension'],
                product_design: ['UX Principles', 'Design Thinking', 'User Research', 'Wireframing', 'Color Theory', 'Typography', 'Prototyping', 'Product Strategy'],
              };
              const SUGGESTIONS = FIELD_SUGGESTIONS[userField] || [
                'Binary Search Trees', 'React Hooks', 'Recursion', 'Dynamic Programming',
                'OS Concepts', 'DBMS Normalization', 'OOP Principles', 'Computer Networks',
                'Sorting Algorithms', 'System Design', 'Machine Learning Basics', 'Calculus',
                'Linear Algebra', 'Probability', 'Graph Theory', 'Greedy Algorithms',
                'Bit Manipulation', 'Tries', 'Segment Trees', 'Design Patterns',
              ];
              const filtered = topicSearch.trim()
                ? SUGGESTIONS.filter(s => s.toLowerCase().includes(topicSearch.toLowerCase()))
                : SUGGESTIONS.slice(0, 10);
              return (
                <div className="flex flex-wrap gap-2">
                  {filtered.map(s => (
                    <button
                      key={s}
                      onClick={() => { setTopic(s); setTopicSearch(s); }}
                      className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
                        topic === s
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                  {topicSearch.trim() && !SUGGESTIONS.some(s => s.toLowerCase() === topicSearch.toLowerCase()) && (
                    <button
                      onClick={() => { setTopic(topicSearch.trim()); }}
                      className="px-3 py-1.5 rounded-full border-2 border-dashed border-primary/50 bg-primary/5 text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                    >
                      + Study "{topicSearch.trim()}"
                    </button>
                  )}
                </div>
              );
            })()}
            <GoalPicker
              value={linkedGoalId}
              onChange={(id, text) => { setLinkedGoalId(id); setLinkedGoalText(text); }}
            />
            <Button onClick={startSession} disabled={!topic.trim()}>
              Start Study Session
            </Button>
          </div>
        )}

        {mode === 'explain' && (
          <div className="space-y-4">
            <AIChatBubble
              isAI
              message={`Great! You're studying "${topic}". Now explain what you understand about this topic in your own words. Don't worry about being perfect — I'll help you improve!`}
            />
            <Textarea
              placeholder="Explain the topic in your own words..."
              value={explanation}
              onChange={e => setExplanation(e.target.value)}
              rows={6}
            />
            <div className="flex gap-2 flex-wrap">
              <Button onClick={submitExplanation} disabled={!explanation.trim() || loading}>
                <Send className="w-4 h-4 mr-2" />
                Submit Explanation
              </Button>
              <Button variant="outline" onClick={() => setMode('doubt')}>
                <HelpCircle className="w-4 h-4 mr-2" />
                I have a doubt
              </Button>
            </div>
            {loading && <LoadingDots />}
          </div>
        )}

        {mode === 'doubt' && (
          <div className="space-y-4">
            <AIChatBubble isAI message="What part don't you understand? Tell me and I'll explain it simply." />
            <Textarea
              placeholder="I don't understand..."
              value={doubt}
              onChange={e => setDoubt(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button onClick={askDoubt} disabled={!doubt.trim() || loading}>
                <Send className="w-4 h-4 mr-2" />
                Ask
              </Button>
              <Button variant="outline" onClick={() => setMode('explain')}>
                Back to Explain
              </Button>
            </div>
            {loading && <LoadingDots />}
            {doubtResponse && (
              <AIChatBubble isAI message={doubtResponse} />
            )}
          </div>
        )}

        {mode === 'result' && aiResponse && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">{aiResponse.score}</span>
              </div>
              <div>
                <p className="font-semibold text-foreground">Your Score</p>
                <p className="text-xs text-muted-foreground">out of 10</p>
              </div>
            </div>
            <AIChatBubble isAI message={aiResponse.feedback} />
            {aiResponse.correct_points && (
              <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                <p className="text-xs font-semibold text-accent mb-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> What you got right
                </p>
                <p className="text-sm text-foreground">{aiResponse.correct_points}</p>
              </div>
            )}
            {aiResponse.missed_points && (
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <p className="text-xs font-semibold text-destructive mb-1 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" /> What you missed
                </p>
                <p className="text-sm text-foreground">{aiResponse.missed_points}</p>
              </div>
            )}
            {aiResponse.better_explanation && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs font-semibold text-primary mb-1">Better Explanation</p>
                <p className="text-sm text-foreground">{aiResponse.better_explanation}</p>
              </div>
            )}
            {linkedGoalText && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Target className="w-3 h-3" />
                Linked to: <span className="font-medium text-foreground">{linkedGoalText}</span>
              </div>
            )}
            <Button onClick={reset}>Start New Session</Button>
          </div>
        )}
      </Card>

      {/* Recent Sessions */}
      {sessions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Recent Sessions</h3>
          <div className="space-y-2">
            {sessions.map(s => (
              <Card key={s.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{s.topic}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-muted-foreground">{s.session_date}</p>
                    {s.linked_goal_text && (
                      <span className="text-xs text-primary flex items-center gap-1">
                        <Target className="w-2.5 h-2.5" />{s.linked_goal_text}
                      </span>
                    )}
                  </div>
                </div>
                {s.score && (
                  <Badge className="bg-primary/10 text-primary">{s.score}/10</Badge>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}