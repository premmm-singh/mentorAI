import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, RotateCcw, Shuffle } from 'lucide-react';
import LoadingDots from '@/components/shared/LoadingDots';
import { format } from 'date-fns';

const TOTAL = 4;

export default function SentenceDrill({ onDone }) {
  const [sentences, setSentences] = useState([]);
  const [current, setCurrent] = useState(0);
  const [wordBank, setWordBank] = useState([]);
  const [built, setBuilt] = useState([]);
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);

  useEffect(() => { loadSentences(); }, []);

  useEffect(() => {
    if (sentences.length && sentences[current]) {
      const words = sentences[current].words;
      setWordBank([...words].sort(() => Math.random() - 0.5));
      setBuilt([]);
      setChecked(false);
    }
  }, [current, sentences]);

  const loadSentences = async () => {
    setLoading(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate ${TOTAL} sentence structure drills for an intermediate English learner.
Each drill: a correct English sentence broken into individual words.
Return JSON only. Keep sentences 5-9 words each, varied grammar patterns.`,
      response_json_schema: {
        type: 'object',
        properties: {
          sentences: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                sentence: { type: 'string' },
                words: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    });
    setSentences(result.sentences || []);
    setLoading(false);
  };

  const pickWord = (word, idx) => {
    if (checked) return;
    setBuilt(prev => [...prev, word]);
    setWordBank(prev => prev.filter((_, i) => i !== idx));
  };

  const removeWord = (word, idx) => {
    if (checked) return;
    setWordBank(prev => [...prev, word]);
    setBuilt(prev => prev.filter((_, i) => i !== idx));
  };

  const checkAnswer = async () => {
    const sentence = sentences[current];
    const userSentence = built.join(' ');
    const correct = userSentence.toLowerCase().trim() === sentence.sentence.toLowerCase().trim();
    setIsCorrect(correct);
    setChecked(true);
    const newResults = [...results, { sentence: sentence.sentence, user: userSentence, isCorrect: correct }];
    setResults(newResults);

    if (current + 1 >= sentences.length) {
      setTimeout(async () => {
        setDone(true);
        const score = Math.round((newResults.filter(r => r.isCorrect).length / TOTAL) * 10);
        await base44.entities.EnglishSession.create({
          session_type: 'grammar',
          ai_question: `Sentence Drill (${TOTAL} sentences)`,
          user_response: newResults.map(r => r.user).join(' | '),
          ai_correction: newResults.map(r => r.isCorrect ? '✓' : `✗ correct: "${r.sentence}"`).join(' | '),
          score,
          session_date: format(new Date(), 'yyyy-MM-dd'),
        });
        onDone && onDone(score);
      }, 1200);
    } else {
      setTimeout(() => setCurrent(c => c + 1), 1200);
    }
  };

  if (loading) return <div className="py-8"><LoadingDots /></div>;

  if (done) {
    const correctCount = results.filter(r => r.isCorrect).length;
    return (
      <div className="space-y-4 text-center py-4">
        <div className="text-5xl font-bold text-primary">{correctCount}/{TOTAL}</div>
        <p className="text-muted-foreground">Sentence drill complete!</p>
        <div className="space-y-2 text-left">
          {results.map((r, i) => (
            <div key={i} className={`p-2 rounded-lg text-sm ${r.isCorrect ? 'bg-accent/10' : 'bg-destructive/10'}`}>
              <div className="flex items-center gap-1 mb-0.5">
                {r.isCorrect ? <CheckCircle2 className="w-3.5 h-3.5 text-accent" /> : <XCircle className="w-3.5 h-3.5 text-destructive" />}
                <span className="font-medium">{r.isCorrect ? 'Correct!' : 'Incorrect'}</span>
              </div>
              {!r.isCorrect && <p className="text-muted-foreground text-xs">✓ {r.sentence}</p>}
            </div>
          ))}
        </div>
        <Button onClick={() => { setDone(false); setCurrent(0); setResults([]); loadSentences(); }}>
          <RotateCcw className="w-4 h-4 mr-2" /> Try Again
        </Button>
      </div>
    );
  }

  const s = sentences[current];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="outline">{current + 1}/{TOTAL}</Badge>
        <p className="text-xs text-muted-foreground">Tap words to build the sentence</p>
      </div>

      {/* Built sentence */}
      <div className={`min-h-[52px] p-3 rounded-xl border-2 flex flex-wrap gap-2 transition-colors ${
        checked ? (isCorrect ? 'border-accent bg-accent/5' : 'border-destructive bg-destructive/5') : 'border-dashed border-border'
      }`}>
        {built.length === 0 && <span className="text-sm text-muted-foreground">Your sentence appears here...</span>}
        {built.map((w, i) => (
          <button
            key={i}
            onClick={() => removeWord(w, i)}
            className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors"
          >
            {w}
          </button>
        ))}
        {checked && (
          <span className="ml-auto">
            {isCorrect ? <CheckCircle2 className="w-5 h-5 text-accent" /> : <XCircle className="w-5 h-5 text-destructive" />}
          </span>
        )}
      </div>

      {/* Word bank */}
      <div className="flex flex-wrap gap-2">
        {wordBank.map((w, i) => (
          <button
            key={i}
            onClick={() => pickWord(w, i)}
            disabled={checked}
            className="px-2.5 py-1 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50"
          >
            {w}
          </button>
        ))}
      </div>

      {checked && !isCorrect && (
        <p className="text-xs text-muted-foreground bg-border/30 px-3 py-2 rounded-lg">
          ✓ Correct: <span className="font-medium text-foreground">{s.sentence}</span>
        </p>
      )}

      <div className="flex gap-2">
        <Button onClick={checkAnswer} disabled={built.length === 0 || checked} className="flex-1">
          Check Answer
        </Button>
        <Button variant="outline" size="icon" onClick={() => {
          const all = [...built, ...wordBank];
          setWordBank([...all].sort(() => Math.random() - 0.5));
          setBuilt([]);
        }} title="Shuffle">
          <Shuffle className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}