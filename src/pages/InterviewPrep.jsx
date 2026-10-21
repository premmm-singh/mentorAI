import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, MicOff, Play, RotateCcw, Award, MessageSquare, Briefcase, ChevronRight } from 'lucide-react';
import AIChatBubble from '@/components/shared/AIChatBubble';
import LoadingDots from '@/components/shared/LoadingDots';
import { format } from 'date-fns';

const COMPANIES = ['Google', 'Amazon', 'Microsoft', 'Meta', 'Apple', 'Flipkart', 'Uber', 'Startup'];
const ROLES = ['Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack', 'Data Scientist', 'ML Engineer'];
const ROUNDS = ['Technical DSA', 'System Design', 'Behavioral (HR)', 'Low Level Design'];

export default function InterviewPrep() {
  const [company, setCompany] = useState('Google');
  const [role, setRole] = useState('Software Engineer');
  const [round, setRound] = useState('Technical DSA');
  const [step, setStep] = useState('setup'); // setup, interview, verdict
  const [messages, setMessages] = useState([]);
  const [answer, setAnswer] = useState('');
  const [verdict, setVerdict] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const recognitionRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: sessions = [] } = useQuery({
    queryKey: ['interview-sessions'],
    queryFn: () => base44.entities.InterviewSession.list('-created_date', 10),
  });

  const startInterview = async () => {
    setLoading(true);
    setStep('interview');
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a strict ${company} interviewer conducting a ${round} round for a ${role} position.
Start the interview: introduce yourself briefly, then ask the FIRST interview question. 
Be professional and company-specific. Just the intro + first question. No extra commentary.`,
    });
    setMessages([{ role: 'ai', text: result }]);
    setQuestionCount(1);
    setLoading(false);
    speakText(result);
  };

  const submitAnswer = async () => {
    if (!answer.trim()) return;
    const userAnswer = answer.trim();
    setAnswer('');
    setMessages(prev => [...prev, { role: 'user', text: userAnswer }]);
    setLoading(true);

    const history = [...messages, { role: 'user', text: userAnswer }]
      .map(m => `${m.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${m.text}`)
      .join('\n');

    if (questionCount >= 4) {
      // Final verdict
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a ${company} interviewer. Here is the complete interview for ${role} (${round} round):\n\n${history}\n\nGive a final verdict. Be detailed.`,
        response_json_schema: {
          type: 'object',
          properties: {
            decision: { type: 'string', enum: ['Strong Hire', 'Hire', 'No Hire', 'Strong No Hire'] },
            overall_score: { type: 'number' },
            strengths: { type: 'string' },
            weaknesses: { type: 'string' },
            summary: { type: 'string' },
            next_steps: { type: 'string' },
          },
        },
      });
      setVerdict(result);
      setStep('verdict');
      setLoading(false);
      await base44.entities.InterviewSession.create({
        company, role, round,
        verdict: result.decision,
        score: result.overall_score,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        session_date: format(new Date(), 'yyyy-MM-dd'),
      });
      queryClient.invalidateQueries({ queryKey: ['interview-sessions'] });
    } else {
      // Next question
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a ${company} interviewer (${round} round for ${role}).\n\nInterview so far:\n${history}\n\nBriefly acknowledge the candidate's answer (1 sentence), then ask the next interview question. Question ${questionCount + 1} of 4.`,
      });
      setMessages(prev => [...prev, { role: 'ai', text: result }]);
      setQuestionCount(c => c + 1);
      setLoading(false);
      speakText(result);
    }
  };

  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    speechSynthesis.speak(utterance);
  };

  const toggleMic = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();
    r.continuous = false;
    r.onresult = (e) => { setAnswer(e.results[0][0].transcript); setIsListening(false); };
    r.onerror = r.onend = () => setIsListening(false);
    recognitionRef.current = r;
    r.start();
    setIsListening(true);
  };

  const reset = () => {
    setStep('setup'); setMessages([]); setAnswer('');
    setVerdict(null); setQuestionCount(0);
  };

  const verdictColors = {
    'Strong Hire': 'bg-accent text-accent-foreground',
    'Hire': 'bg-accent/70 text-accent-foreground',
    'No Hire': 'bg-destructive/80 text-destructive-foreground',
    'Strong No Hire': 'bg-destructive text-destructive-foreground',
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        {step === 'setup' && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Mock Interview Simulator</h3>
            </div>
            <p className="text-sm text-muted-foreground">AI plays the interviewer. 4 questions → real hire/no-hire verdict.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Company</label>
                <Select value={company} onValueChange={setCompany}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COMPANIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Role</label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Round</label>
                <Select value={round} onValueChange={setRound}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROUNDS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={startInterview} className="w-full sm:w-auto">
              <Play className="w-4 h-4 mr-2" /> Start Interview
            </Button>
          </div>
        )}

        {step === 'interview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge className="bg-primary/10 text-primary">{company} — {round}</Badge>
              <span className="text-xs text-muted-foreground">Q {questionCount}/4</span>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {messages.map((m, i) => <AIChatBubble key={i} message={m.text} isAI={m.role === 'ai'} />)}
              {loading && <LoadingDots />}
            </div>
            {!loading && (
              <div className="space-y-2 pt-2 border-t border-border">
                <Textarea
                  placeholder="Your answer... (or use mic)"
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button onClick={submitAnswer} disabled={!answer.trim()} className="flex-1">
                    <ChevronRight className="w-4 h-4 mr-1" />
                    {questionCount >= 4 ? 'Submit & Get Verdict' : 'Answer & Next Question'}
                  </Button>
                  <Button variant={isListening ? 'destructive' : 'outline'} size="icon" onClick={toggleMic}>
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'verdict' && verdict && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`px-4 py-2 rounded-xl font-bold text-lg ${verdictColors[verdict.decision] || 'bg-muted'}`}>
                {verdict.decision}
              </div>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">{verdict.overall_score}</span>
              </div>
            </div>
            <AIChatBubble isAI message={verdict.summary} />
            <div className="grid gap-2">
              <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                <p className="text-xs font-semibold text-accent mb-1">Strengths</p>
                <p className="text-sm">{verdict.strengths}</p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <p className="text-xs font-semibold text-destructive mb-1">Weaknesses</p>
                <p className="text-sm">{verdict.weaknesses}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs font-semibold text-primary mb-1">Next Steps</p>
                <p className="text-sm">{verdict.next_steps}</p>
              </div>
            </div>
            <Button onClick={reset}><RotateCcw className="w-4 h-4 mr-2" /> New Interview</Button>
          </div>
        )}
      </Card>

      {sessions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Past Interviews</h3>
          <div className="space-y-2">
            {sessions.map(s => (
              <Card key={s.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{s.company} — {s.role}</p>
                  <p className="text-xs text-muted-foreground">{s.round} · {s.session_date}</p>
                </div>
                <Badge className={verdictColors[s.verdict] || 'bg-muted'}>{s.verdict}</Badge>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}