import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Brain, ChevronRight, CheckCircle2 } from 'lucide-react';

const FIELDS = [
  { id: 'software_engineering', label: '💻 Software Engineering', desc: 'DSA, system design, coding interviews' },
  { id: 'data_science_ml', label: '🤖 Data Science / ML', desc: 'Machine learning, statistics, AI' },
  { id: 'web_development', label: '🌐 Web Development', desc: 'Frontend, backend, full-stack' },
  { id: 'competitive_programming', label: '🏆 Competitive Programming', desc: 'Codeforces, LeetCode, ICPC' },
  { id: 'general_studies', label: '📚 General Studies', desc: 'Academics, exams, self-improvement' },
  { id: 'english_communication', label: '🗣️ English / Communication', desc: 'Language skills, public speaking' },
  { id: 'product_design', label: '🎨 Product & Design', desc: 'UI/UX, product management' },
  { id: 'other', label: '✨ Other / Multiple', desc: 'Mix of various interests' },
];

const INTERESTS = [
  'DSA Practice', 'Mock Interviews', 'Study Sessions', 'English Grammar',
  'Vocabulary Building', 'AI/ML Learning', 'System Design', 'Focus & Productivity',
  'Morning Routine', 'Goal Tracking', 'Daily Reviews', 'Roadmap Planning',
];

const GOALS = [
  'Crack FAANG interview', 'Get first dev job', 'Improve English fluency',
  'Master DSA', 'Learn AI/ML', 'Score well in exams', 'Build side projects',
  'Boost daily productivity',
];

export default function OnboardingModal({ onComplete }) {
  const [step, setStep] = useState(1); // 1=name, 2=field, 3=interests, 4=goal
  const [name, setName] = useState('');
  const [field, setField] = useState('');
  const [interests, setInterests] = useState([]);
  const [goal, setGoal] = useState('');
  const [customGoal, setCustomGoal] = useState('');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const toggleInterest = (item) => {
    setInterests(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleFinish = async () => {
    setSaving(true);
    const finalGoal = customGoal.trim() || goal;
    const focusMap = {
      software_engineering: ['dsa_practice', 'system_design'],
      data_science_ml: ['ai_ml_learning'],
      web_development: ['web_development'],
      competitive_programming: ['competitive_programming', 'dsa_practice'],
      general_studies: ['deep_work', 'reading'],
      english_communication: ['english_improvement'],
      product_design: ['deep_work'],
      other: ['deep_work'],
    };

    await base44.entities.UserProfile.create({
      display_name: name.trim(),
      productivity_focus_areas: focusMap[field] || [],
      study_goals: finalGoal
        ? [{ goal: finalGoal, priority: 'high', status: 'not_started' }]
        : [],
      onboarding_field: field,
      onboarding_interests: interests,
    });

    await base44.auth.updateMe({ full_name: name.trim() });

    queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    setSaving(false);
    onComplete({ name, field, interests, goal: finalGoal });
  };

  const canNext1 = name.trim().length > 1;
  const canNext2 = !!field;
  const canNext3 = interests.length > 0;
  const canFinish = goal || customGoal.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-foreground text-lg">Welcome to AI Life Mentor</h2>
            <p className="text-xs text-muted-foreground">Step {step} of 4 — Let's personalize your experience</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${(step / 4) * 100}%` }} />
        </div>

        {/* Step 1 — Name */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-1">What's your name?</h3>
              <p className="text-sm text-muted-foreground">I'll use this to personalize your AI greetings and sessions.</p>
            </div>
            <Input
              placeholder="Your first name..."
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && canNext1 && setStep(2)}
            />
            <Button className="w-full" disabled={!canNext1} onClick={() => setStep(2)}>
              Continue <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Step 2 — Field */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-1">What's your primary field?</h3>
              <p className="text-sm text-muted-foreground">This shapes your study sessions, DSA problems, and AI mentoring.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
              {FIELDS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setField(f.id)}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${
                    field === f.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40 hover:bg-muted'
                  }`}
                >
                  <p className="font-medium text-sm text-foreground">{f.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" disabled={!canNext2} onClick={() => setStep(3)}>
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 — Interests */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-1">What do you want to improve? <span className="text-muted-foreground font-normal text-xs">(pick 2+)</span></h3>
              <p className="text-sm text-muted-foreground">Your dashboard and AI suggestions will be tuned to these.</p>
            </div>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {INTERESTS.map(item => (
                <button
                  key={item}
                  onClick={() => toggleInterest(item)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    interests.includes(item)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                  }`}
                >
                  {interests.includes(item) && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                  {item}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button className="flex-1" disabled={!canNext3} onClick={() => setStep(4)}>
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4 — Goal */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-1">What's your #1 goal right now?</h3>
              <p className="text-sm text-muted-foreground">Your roadmap and AI mentor will focus on this above everything.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {GOALS.map(g => (
                <button
                  key={g}
                  onClick={() => { setGoal(g); setCustomGoal(''); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    goal === g && !customGoal
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                  }`}
                >
                  {goal === g && !customGoal && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                  {g}
                </button>
              ))}
            </div>
            <Input
              placeholder="Or type your own goal..."
              value={customGoal}
              onChange={e => { setCustomGoal(e.target.value); setGoal(''); }}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
              <Button className="flex-1" disabled={!canFinish || saving} onClick={handleFinish}>
                {saving ? 'Saving...' : "🚀 Let's Go!"}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}