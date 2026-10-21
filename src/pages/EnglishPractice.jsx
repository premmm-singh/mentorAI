import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Languages, Send, RotateCcw, CheckCircle2, XCircle, Zap } from 'lucide-react';
import AIChatBubble from '@/components/shared/AIChatBubble';
import LoadingDots from '@/components/shared/LoadingDots';
import VocabQuiz from '@/components/english/VocabQuiz';
import SentenceDrill from '@/components/english/SentenceDrill';
import { format } from 'date-fns';

const SESSION_TYPES = [
  { value: 'grammar', label: '📝 Grammar', desc: 'Fix grammar mistakes' },
  { value: 'vocabulary', label: '📚 Vocabulary', desc: 'Learn new words' },
  { value: 'conversation', label: '💬 Conversation', desc: 'Practice dialogue' },
  { value: 'writing', label: '✍️ Writing', desc: 'Improve your writing' },
  { value: 'fill_blank', label: '🔲 Fill in the Blank', desc: 'Complete sentences' },
  { value: 'word_scramble', label: '🔀 Word Scramble', desc: 'Unscramble words' },
  { value: 'idioms', label: '🗣️ Idioms & Phrases', desc: 'Learn expressions' },
  { value: 'pronunciation', label: '🎤 Pronunciation', desc: 'Read words aloud' },
  { value: 'listening', label: '👂 Listening', desc: 'Listen & comprehend' },
];

export default function EnglishPractice() {
  const [type, setType] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [correction, setCorrection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('pick'); // pick, quiz, drill, answer, result
  const queryClient = useQueryClient();

  const { data: sessions = [] } = useQuery({
    queryKey: ['english-sessions'],
    queryFn: () => base44.entities.EnglishSession.list('-created_date', 10),
  });

  const PROMPTS = {
    grammar: `Generate a grammar practice question for an intermediate English student. Give them a sentence with an error or ask them to choose/correct the grammar. Just the question, no explanation.`,
    vocabulary: `Generate a vocabulary question for an intermediate English student. Ask for the definition, usage in a sentence, or meaning of a challenging word. Just the question.`,
    conversation: `Give an intermediate English student a realistic conversation scenario (e.g. at a job interview, ordering food, meeting someone new). Ask them to respond as they would in real life. Just the scenario + prompt.`,
    writing: `Give an intermediate English student a short writing prompt (2-4 sentences). Make it interesting and practical. Just the prompt.`,
    fill_blank: `Create a fill-in-the-blank exercise with 3-4 sentences that have ONE blank each (use ___). Choose words that test vocabulary or grammar. Show the word bank at the end. Just the exercise.`,
    word_scramble: `Give the student 5 scrambled words (all capital letters, letters in random order). Tell them to unscramble each one. Pick intermediate-level English words. Format: SCRAMBLED → ? for each word. Just the exercise.`,
    idioms: `Teach the student one English idiom or common phrase. Give the idiom, then ask them to write a sentence using it OR explain what it means in their own words. Just the idiom + question.`,
    pronunciation: `Give the student a list of 5 English words that are commonly mispronounced. Tell them to read each word aloud and then write the phonetic pronunciation as they understand it. Just the word list + instruction.`,
    listening: `Write a short paragraph (3-4 sentences) as if the student just heard it. Then ask 2 comprehension questions about it. Present the paragraph first, then the questions. Just the paragraph + questions.`,
  };

  const startSession = async (sessionType) => {
    setType(sessionType);
    setLoading(true);
    setStep('answer');
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an English teacher. ${PROMPTS[sessionType] || `Generate a ${sessionType} practice question.`}`,
    });
    setQuestion(result);
    setLoading(false);
  };

  const submitAnswer = async () => {
    if (!answer.trim()) return;
    setLoading(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an English teacher evaluating a student's ${type} practice.\n\nQuestion: ${question}\nStudent's answer: "${answer}"\n\nProvide:\n1. Score out of 10\n2. Corrections (if any grammar or spelling errors)\n3. A better way to phrase it\n4. Encouragement\n\nBe detailed but friendly.`,
      response_json_schema: {
        type: 'object',
        properties: {
          score: { type: 'number' },
          corrections: { type: 'string' },
          improved_version: { type: 'string' },
          encouragement: { type: 'string' },
          errors_found: { type: 'boolean' },
        },
      },
    });
    setCorrection(result);
    setStep('result');
    setLoading(false);

    await base44.entities.EnglishSession.create({
      session_type: type,
      ai_question: question,
      user_response: answer,
      ai_correction: result.corrections,
      score: result.score,
      session_date: format(new Date(), 'yyyy-MM-dd'),
    });
    queryClient.invalidateQueries({ queryKey: ['english-sessions'] });
  };

  const reset = () => {
    setType('');
    setQuestion('');
    setAnswer('');
    setCorrection(null);
    setStep('pick');
  };

  const todaySessions = sessions.filter(s => s.session_date === format(new Date(), 'yyyy-MM-dd'));

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">Today's sessions:</p>
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`w-8 h-2 rounded-full ${i < todaySessions.length ? 'bg-accent' : 'bg-border'}`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{todaySessions.length}/3</span>
      </div>

      <Card className="p-6">
        {step === 'pick' && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Languages className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Choose Practice Type</h3>
            </div>

            {/* Quick Interactive Drills */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Zap className="w-3.5 h-3.5 text-chart-3" />
                <p className="text-xs font-semibold text-chart-3 uppercase tracking-wide">Quick Drills</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setStep('quiz')}
                  className="h-auto py-4 px-4 flex-col items-start gap-1 rounded-xl border-2 border-chart-3/30 bg-chart-3/5 hover:bg-chart-3/10 transition-colors text-left"
                >
                  <span className="font-semibold text-foreground">🧠 Vocab Quiz</span>
                  <span className="text-xs text-muted-foreground">5 MCQs, timed — 15s each</span>
                </button>
                <button
                  onClick={() => setStep('drill')}
                  className="h-auto py-4 px-4 flex-col items-start gap-1 rounded-xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
                >
                  <span className="font-semibold text-foreground">🔤 Sentence Drill</span>
                  <span className="text-xs text-muted-foreground">Tap words to build sentences</span>
                </button>
              </div>
            </div>

            {/* Open-ended Sessions */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Open Practice</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SESSION_TYPES.map(t => (
                  <Button
                    key={t.value}
                    variant="outline"
                    className="h-auto py-4 flex-col items-start gap-1"
                    onClick={() => startSession(t.value)}
                  >
                    <span className="font-medium">{t.label}</span>
                    <span className="text-xs text-muted-foreground">{t.desc}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'quiz' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge className="bg-chart-3/10 text-chart-3">🧠 Vocab Quiz</Badge>
              <Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="w-3.5 h-3.5 mr-1" /> Back</Button>
            </div>
            <VocabQuiz onDone={(score) => { queryClient.invalidateQueries({ queryKey: ['english-sessions'] }); }} />
          </div>
        )}

        {step === 'drill' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge className="bg-primary/10 text-primary">🔤 Sentence Drill</Badge>
              <Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="w-3.5 h-3.5 mr-1" /> Back</Button>
            </div>
            <SentenceDrill onDone={(score) => { queryClient.invalidateQueries({ queryKey: ['english-sessions'] }); }} />
          </div>
        )}

        {step === 'answer' && (
          <div className="space-y-4">
            <Badge className="bg-primary/10 text-primary capitalize">{type}</Badge>
            {loading ? <LoadingDots /> : (
              <>
                <AIChatBubble isAI message={question} />
                <Textarea
                  placeholder="Type your answer..."
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  rows={4}
                />
                <Button onClick={submitAnswer} disabled={!answer.trim()}>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Answer
                </Button>
              </>
            )}
          </div>
        )}

        {step === 'result' && correction && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">{correction.score}</span>
              </div>
              <div>
                <p className="font-semibold text-foreground">Your Score</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {correction.errors_found
                    ? <XCircle className="w-3 h-3 text-destructive" />
                    : <CheckCircle2 className="w-3 h-3 text-accent" />
                  }
                  <span className="text-xs text-muted-foreground">
                    {correction.errors_found ? 'Some errors found' : 'Great job!'}
                  </span>
                </div>
              </div>
            </div>
            {correction.corrections && (
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <p className="text-xs font-semibold text-destructive mb-1">Corrections</p>
                <p className="text-sm text-foreground">{correction.corrections}</p>
              </div>
            )}
            {correction.improved_version && (
              <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                <p className="text-xs font-semibold text-accent mb-1">Improved Version</p>
                <p className="text-sm text-foreground">{correction.improved_version}</p>
              </div>
            )}
            <AIChatBubble isAI message={correction.encouragement} />
            <div className="flex gap-2">
              <Button onClick={reset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Practice Again
              </Button>
            </div>
          </div>
        )}
        {loading && step === 'result' && <LoadingDots />}
      </Card>

      {sessions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Recent Sessions</h3>
          <div className="space-y-2">
            {sessions.map(s => (
              <Card key={s.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground capitalize">{s.session_type}</p>
                  <p className="text-xs text-muted-foreground">{s.session_date}</p>
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