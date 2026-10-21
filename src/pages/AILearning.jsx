import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Sparkles, ChevronRight, RotateCcw } from 'lucide-react';
import AIChatBubble from '@/components/shared/AIChatBubble';
import LoadingDots from '@/components/shared/LoadingDots';

const AI_TOPICS = [
  'Neural Networks Basics', 'Convolutional Neural Networks', 'Recurrent Neural Networks',
  'Natural Language Processing', 'Transformers & Attention', 'Reinforcement Learning',
  'Generative AI & GANs', 'Transfer Learning', 'Computer Vision',
  'Large Language Models', 'Embeddings & Vector Databases', 'AI Ethics & Bias',
];

export default function AILearning() {
  const [topic, setTopic] = useState('');
  const [lesson, setLesson] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('pick'); // pick, lesson, quiz

  const startLesson = async (t) => {
    setTopic(t);
    setLoading(true);
    setStep('lesson');
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an AI/ML tutor. Teach the topic "${t}" in a 20-minute reading format. Include:\n1. What it is (simple explanation)\n2. How it works (with intuition, not just math)\n3. Real-world applications\n4. Key terms to remember\n5. A simple analogy to remember the concept\n\nMake it engaging and easy to understand for a beginner.`,
    });
    setLesson(result);
    setLoading(false);
  };

  const generateQuiz = async () => {
    setLoading(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Based on the topic "${topic}", generate a quick quiz with 3 questions to test understanding. For each question, provide the answer too. Format clearly.`,
      response_json_schema: {
        type: 'object',
        properties: {
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                question: { type: 'string' },
                answer: { type: 'string' },
              },
            },
          },
        },
      },
    });
    setQuiz(result);
    setStep('quiz');
    setLoading(false);
  };

  const reset = () => {
    setTopic('');
    setLesson('');
    setQuiz(null);
    setQuizAnswer('');
    setStep('pick');
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        {step === 'pick' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Daily AI/ML Lesson</h3>
            </div>
            <p className="text-sm text-muted-foreground">Pick a topic to learn today (20-30 min session)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AI_TOPICS.map(t => (
                <Button
                  key={t}
                  variant="outline"
                  className="justify-between text-sm h-auto py-3"
                  onClick={() => startLesson(t)}
                >
                  {t}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Button>
              ))}
            </div>
          </div>
        )}

        {step === 'lesson' && (
          <div className="space-y-4">
            <Badge className="bg-primary/10 text-primary">{topic}</Badge>
            {loading ? <LoadingDots /> : (
              <>
                <div className="prose prose-sm max-w-none">
                  <AIChatBubble isAI message={lesson} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={generateQuiz}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Test My Understanding
                  </Button>
                  <Button variant="outline" onClick={reset}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    New Topic
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {step === 'quiz' && quiz && (
          <div className="space-y-4">
            <Badge className="bg-accent/10 text-accent">Quiz: {topic}</Badge>
            {loading ? <LoadingDots /> : (
              <>
                {quiz.questions?.map((q, i) => (
                  <Card key={i} className="p-4 space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      {i + 1}. {q.question}
                    </p>
                    <details className="text-sm text-muted-foreground">
                      <summary className="cursor-pointer text-primary font-medium text-xs">Reveal Answer</summary>
                      <p className="mt-2 p-2 bg-muted rounded-md text-foreground">{q.answer}</p>
                    </details>
                  </Card>
                ))}
                <Button onClick={reset}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Learn Another Topic
                </Button>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}