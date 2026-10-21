import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, Mic, MicOff, Volume2, VolumeX, Users } from 'lucide-react';
import AIChatBubble from '@/components/shared/AIChatBubble';
import LoadingDots from '@/components/shared/LoadingDots';
import { format } from 'date-fns';

export default function AIAssistant() {
  const [friendMode, setFriendMode] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hey! I'm your AI Life Mentor. Ask me anything — study help, motivation, planning, or just chat. I'm here for you! 💪" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [greetingLoading, setGreetingLoading] = useState(false);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const hasGreetedRef = useRef(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  const { data: profiles, isSuccess: profilesLoaded } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => base44.entities.UserProfile.list('-created_date', 1),
  });

  const { data: todayStudy = [] } = useQuery({
    queryKey: ['study-today-assistant'],
    queryFn: () => base44.entities.StudySession.filter({ session_date: today }),
  });

  const { data: todayDSA = [] } = useQuery({
    queryKey: ['dsa-today-assistant'],
    queryFn: () => base44.entities.DSASession.filter({ session_date: today }),
  });

  const { data: todayRoutines = [] } = useQuery({
    queryKey: ['morning-today-assistant'],
    queryFn: () => base44.entities.MorningRoutine.filter({ routine_date: today }),
  });

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // On mount: generate personalized AI greeting with goal check-in, speak it, then listen
  useEffect(() => {
    if (hasGreetedRef.current) return;
    // Wait until profile query has actually resolved
    if (!profilesLoaded) return;
    hasGreetedRef.current = true;

    const profile = (profiles || [])[0];
    const name = profile?.display_name || 'there';
    const goals = profile?.study_goals?.filter(g => g.status !== 'completed') ?? [];
    const goalsSummary = goals.length > 0
      ? goals.map(g => g.goal).join(', ')
      : 'no active goals set yet';
    const sessionsDone = todayStudy.length + todayDSA.length;
    const morningDone = todayRoutines[0];

    const generateAndSpeak = async () => {
      setGreetingLoading(true);
      const fieldLabel = profile?.onboarding_field?.replace(/_/g, ' ') || '';
      const interests = (profile?.onboarding_interests || []).join(', ') || 'general learning';
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI Life Mentor. Generate a warm, personal, Siri-style greeting for the user.
- Time of day: ${timeOfDay}
- User's name: ${name}
- Field/domain: ${fieldLabel}
- Interests: ${interests}
- Active study goals: ${goalsSummary}
- Study/DSA sessions completed today: ${sessionsDone}
- Morning routine done today: ${morningDone ? 'Yes (exercise: ' + morningDone.exercise_done + ', meditation: ' + morningDone.meditation_done + ', reading: ' + morningDone.reading_done + ')' : 'Not yet'}

Say good ${timeOfDay}, mention their name, reference their field/interests naturally, briefly check in on today's progress, give one short motivating nudge relevant to their domain. Keep it under 3 sentences, conversational and warm. Do NOT use markdown.`,
      });
      setGreetingLoading(false);
      setMessages([{ role: 'ai', text: result }]);

      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(result);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.onend = () => startListening();
        speechSynthesis.speak(utterance);
      } else {
        startListening();
      }
    };

    generateAndSpeak();
  }, [profilesLoaded]);

  // Switch greeting when mode changes
  useEffect(() => {
    setMessages([{
      role: 'ai',
      text: friendMode
        ? "Yooo, what's up bro! 😄 Let's just talk — cricket, movies, life, whatever's on your mind. I'm all ears!"
        : "Hey! I'm your AI Life Mentor. Ask me anything — study help, motivation, planning, or just chat. I'm here for you! 💪"
    }]);
  }, [friendMode]);

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = friendMode ? 1.0 : 0.9;
      utterance.pitch = friendMode ? 1.1 : 1.0;
      speechSynthesis.speak(utterance);
    }
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      sendMessage(transcript);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser. Try Chrome.');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    startListening();
  };

  const sendMessage = async (textOverride) => {
    const userMsg = (textOverride || input).trim();
    if (!userMsg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    const context = messages.slice(-8).map(m => `${m.role === 'ai' ? 'AI' : 'User'}: ${m.text}`).join('\n');

    const systemPrompt = friendMode
      ? `You are the user's best friend — casual, fun, warm, and real. Talk like a close buddy. Use natural language, be playful, crack jokes when appropriate, share opinions, be genuinely curious about the user's life. Topics can be anything: cricket, movies, life struggles, funny stories, general knowledge, advice. Never be stiff or formal. Keep replies conversational — not too long.`
      : `You are an AI Life Mentor and Discipline Assistant. You are motivating, supportive, and knowledgeable. You help with studying, DSA, fitness, productivity, and personal growth. Be encouraging but honest. Keep responses concise but valuable.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `${systemPrompt}\n\nConversation history:\n${context}\n\nUser: ${userMsg}\n\nRespond naturally.`,
    });

    setMessages(prev => [...prev, { role: 'ai', text: result }]);
    setLoading(false);

    // Always speak AI reply and then resume listening (Siri-style)
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(result);
      utterance.rate = friendMode ? 1.0 : 0.9;
      utterance.pitch = friendMode ? 1.1 : 1.0;
      utterance.onend = () => startListening();
      speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Mode toggles */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <button
          onClick={() => setFriendMode(f => !f)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
            friendMode
              ? 'bg-chart-3/10 text-chart-3 border-chart-3/30'
              : 'bg-secondary text-muted-foreground border-border'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          {friendMode ? '😄 Friend Mode ON' : 'Friend Mode'}
        </button>

        <button
          onClick={() => setAutoSpeak(a => !a)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
            autoSpeak
              ? 'bg-primary/10 text-primary border-primary/30'
              : 'bg-secondary text-muted-foreground border-border'
          }`}
        >
          {autoSpeak ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          {autoSpeak ? 'Auto-Speak ON' : 'Auto-Speak'}
        </button>

        {isListening && (
          <Badge className="bg-destructive/10 text-destructive animate-pulse">
            🎤 Listening...
          </Badge>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {greetingLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xs">AI</span>
            </div>
            <Card className="px-4 py-2 flex items-center gap-2">
              <LoadingDots />
              <span className="text-xs text-muted-foreground">Preparing your check-in...</span>
            </Card>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className="flex items-start gap-1">
            <div className="flex-1">
              <AIChatBubble message={msg.text} isAI={msg.role === 'ai'} />
            </div>
            {msg.role === 'ai' && (
              <Button
                variant="ghost" size="icon"
                className="shrink-0 mt-1 text-muted-foreground hover:text-primary"
                onClick={() => speak(msg.text)}
              >
                <Volume2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xs">AI</span>
            </div>
            <Card className="px-4 py-2">
              <LoadingDots />
            </Card>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border pt-3 flex gap-2">
        <Button
          variant={isListening ? 'destructive' : 'outline'}
          size="icon"
          onClick={toggleVoice}
          className={`shrink-0 ${isListening ? 'animate-pulse' : ''}`}
          title="Tap to speak — auto sends after you talk"
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </Button>
        <Input
          placeholder={friendMode ? "Talk to your friend..." : "Ask your mentor anything..."}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          className="flex-1"
        />
        <Button onClick={() => sendMessage()} disabled={!input.trim() || loading} size="icon">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}