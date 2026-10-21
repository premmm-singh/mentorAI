import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Timer, RotateCcw } from 'lucide-react';
import LoadingDots from '@/components/shared/LoadingDots';
import { format } from 'date-fns';

const TOTAL_QUESTIONS = 5;
const TIME_PER_Q = 15; // seconds

export default function VocabQuiz({ onDone }) {
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [results, setResults] = useState([]);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  useEffect(() => {
    if (loading || done || selected !== null) return;
    setTimeLeft(TIME_PER_Q);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleAnswer(null); // time up = wrong
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [current, loading, done, selected]);

  const loadQuestions = async () => {
    setLoading(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate ${TOTAL_QUESTIONS} vocabulary multiple-choice questions for an intermediate English learner.
Each question: a word and 4 answer choices (one correct definition, three plausible wrong ones).
Return JSON only.`,
      response_json_schema: {
        type: 'object',
        properties: {
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                word: { type: 'string' },
                correct: { type: 'string' },
                options: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    });
    setQuestions(result.questions || []);
    setLoading(false);
  };

  const handleAnswer = (opt) => {
    clearInterval(timerRef.current);
    setSelected(opt);
    const q = questions[current];
    const correct = opt === q.correct;
    setResults(prev => [...prev, { word: q.word, chosen: opt, correct: q.correct, isCorrect: correct }]);

    setTimeout(() => {
      if (current + 1 >= questions.length) {
        finishQuiz([...results, { isCorrect: correct }]);
      } else {
        setCurrent(c => c + 1);
        setSelected(null);
      }
    }, 1000);
  };

  const finishQuiz = async (finalResults) => {
    setDone(true);
    const score = Math.round((finalResults.filter(r => r.isCorrect).length / TOTAL_QUESTIONS) * 10);
    await base44.entities.EnglishSession.create({
      session_type: 'vocabulary',
      ai_question: `Vocab Quiz (${TOTAL_QUESTIONS} questions)`,
      user_response: finalResults.map(r => r.chosen || 'timeout').join(', '),
      ai_correction: finalResults.map(r => `${r.word}: ${r.isCorrect ? '✓' : `✗ correct: ${r.correct}`}`).join(' | '),
      score,
      session_date: format(new Date(), 'yyyy-MM-dd'),
    });
    onDone && onDone(score);
  };

  if (loading) return <div className="py-8"><LoadingDots /></div>;

  const q = questions[current];

  if (done) {
    const correct = results.filter(r => r.isCorrect).length;
    return (
      <div className="space-y-4 text-center py-4">
        <div className="text-5xl font-bold text-primary">{correct}/{TOTAL_QUESTIONS}</div>
        <p className="text-muted-foreground">Vocab quiz complete!</p>
        <div className="space-y-2 text-left">
          {results.map((r, i) => (
            <div key={i} className={`flex items-center gap-2 text-sm p-2 rounded-lg ${r.isCorrect ? 'bg-accent/10' : 'bg-destructive/10'}`}>
              {r.isCorrect ? <CheckCircle2 className="w-4 h-4 text-accent shrink-0" /> : <XCircle className="w-4 h-4 text-destructive shrink-0" />}
              <span className="font-medium">{r.word}</span>
              {!r.isCorrect && <span className="text-muted-foreground">→ {r.correct}</span>}
            </div>
          ))}
        </div>
        <Button onClick={() => { setDone(false); setCurrent(0); setResults([]); setSelected(null); loadQuestions(); }}>
          <RotateCcw className="w-4 h-4 mr-2" /> Play Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="outline">{current + 1}/{TOTAL_QUESTIONS}</Badge>
        <div className={`flex items-center gap-1 text-sm font-mono font-bold ${timeLeft <= 5 ? 'text-destructive' : 'text-muted-foreground'}`}>
          <Timer className="w-4 h-4" /> {timeLeft}s
        </div>
      </div>
      {/* Timer bar */}
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${timeLeft <= 5 ? 'bg-destructive' : 'bg-primary'}`}
          style={{ width: `${(timeLeft / TIME_PER_Q) * 100}%` }}
        />
      </div>
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground mb-1">What does this word mean?</p>
        <p className="text-2xl font-bold text-foreground">{q.word}</p>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {q.options.map((opt, i) => {
          let variant = 'outline';
          let extra = '';
          if (selected !== null) {
            if (opt === q.correct) extra = 'border-accent bg-accent/10 text-accent';
            else if (opt === selected && opt !== q.correct) extra = 'border-destructive bg-destructive/10 text-destructive';
          }
          return (
            <button
              key={i}
              disabled={selected !== null}
              onClick={() => handleAnswer(opt)}
              className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${extra || 'border-border hover:border-primary hover:bg-primary/5'} disabled:cursor-default`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}