import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, Coffee, Brain } from 'lucide-react';
import { motion } from 'framer-motion';
import NotificationBuzzer, { notify } from '@/components/shared/NotificationBuzzer';

const FOCUS_TIME = 25 * 60;
const BREAK_TIME = 5 * 60;

export default function FocusTimer() {
  const [timeLeft, setTimeLeft] = useState(FOCUS_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef(null);

  const speak = useCallback((text) => notify(text), []);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      clearInterval(intervalRef.current);
      if (isBreak) {
        speak("Break is over! Time to focus again. Let's go!");
        setIsBreak(false);
        setTimeLeft(FOCUS_TIME);
        setIsRunning(false);
      } else {
        setSessions(s => s + 1);
        speak("Great focus session complete! Take a 5 minute break. You earned it.");
        setIsBreak(true);
        setTimeLeft(BREAK_TIME);
        setIsRunning(false);
      }
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft, isBreak, speak]);

  const toggleTimer = () => {
    if (!isRunning && timeLeft === (isBreak ? BREAK_TIME : FOCUS_TIME)) {
      speak(isBreak ? "Break time. Relax and recharge." : "Focus session started. Stay strong!");
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(FOCUS_TIME);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const totalTime = isBreak ? BREAK_TIME : FOCUS_TIME;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="space-y-6">
      <Card className="p-8 flex flex-col items-center">
        <Badge className={`mb-6 ${isBreak ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'}`}>
          {isBreak ? <><Coffee className="w-3 h-3 mr-1" /> Break Time</> : <><Brain className="w-3 h-3 mr-1" /> Focus Mode</>}
        </Badge>

        {/* Timer Circle */}
        <div className="relative w-64 h-64 mb-8">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 260 260">
            <circle cx="130" cy="130" r="120" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
            <motion.circle
              cx="130" cy="130" r="120" fill="none"
              stroke={isBreak ? 'hsl(var(--accent))' : 'hsl(var(--primary))'}
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.5 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold font-mono text-foreground">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <span className="text-xs text-muted-foreground mt-2">
              {isBreak ? 'Take a breather' : 'Stay focused'}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={resetTimer} className="rounded-full w-12 h-12">
            <RotateCcw className="w-5 h-5" />
          </Button>
          <Button
            size="lg"
            onClick={toggleTimer}
            className={`rounded-full w-16 h-16 ${isBreak ? 'bg-accent hover:bg-accent/90' : ''}`}
          >
            {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mt-6">
          Sessions completed: <span className="font-semibold text-foreground">{sessions}</span>
        </p>

        <div className="mt-4">
          <NotificationBuzzer
            message={isBreak ? "Break time! Relax and recharge." : "Focus session active. Stay strong and keep going!"}
            label="Test Buzzer"
          />
        </div>
      </Card>
    </div>
  );
}