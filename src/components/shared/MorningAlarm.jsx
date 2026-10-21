import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Builds a friendly voice message based on pending tasks
function buildWakeMessage(tasks) {
  const pending = [];
  if (!tasks.exercise) pending.push('exercise');
  if (!tasks.meditation) pending.push('meditation');
  if (!tasks.reading) pending.push('reading');

  const taskList = pending.length > 0
    ? `Don't forget to do your ${pending.join(', ')} today.`
    : 'All your tasks are done — you\'re crushing it!';

  return `Good morning! It's 4 AM — time to wake up and conquer the day! ${taskList} You've got this. Let's go!`;
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.pitch = 1.1;
  // Pick a nice voice if available
  const voices = speechSynthesis.getVoices();
  const preferred = voices.find(v => v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen'));
  if (preferred) utterance.voice = preferred;
  speechSynthesis.speak(utterance);
}

export default function MorningAlarm({ wakeUpTime = '04:00', tasks = {} }) {
  const [alarmOn, setAlarmOn] = useState(() => {
    return localStorage.getItem('morning_alarm_enabled') === 'true';
  });
  const [nextFire, setNextFire] = useState('');
  const intervalRef = useRef(null);
  const firedTodayRef = useRef(localStorage.getItem('alarm_fired_date') === new Date().toDateString());

  useEffect(() => {
    localStorage.setItem('morning_alarm_enabled', alarmOn);
  }, [alarmOn]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!alarmOn) { setNextFire(''); return; }

    const check = () => {
      const now = new Date();
      const [h, m] = wakeUpTime.split(':').map(Number);
      const target = new Date();
      target.setHours(h, m, 0, 0);

      // Show next fire time
      const diffMs = target - now;
      if (diffMs > 0) {
        const diffH = Math.floor(diffMs / 3600000);
        const diffM = Math.floor((diffMs % 3600000) / 60000);
        setNextFire(`${diffH}h ${diffM}m`);
      } else {
        setNextFire('Today passed — fires tomorrow');
      }

      // Fire alarm: within 30s window of target time, once per day
      const todayStr = now.toDateString();
      const alreadyFired = localStorage.getItem('alarm_fired_date') === todayStr;
      const withinWindow = Math.abs(now - target) < 30000;

      if (withinWindow && !alreadyFired) {
        localStorage.setItem('alarm_fired_date', todayStr);
        firedTodayRef.current = true;
        speak(buildWakeMessage(tasks));
      }
    };

    check();
    intervalRef.current = setInterval(check, 20000); // check every 20s

    return () => clearInterval(intervalRef.current);
  }, [alarmOn, wakeUpTime, tasks]);

  const testAlarm = () => speak(buildWakeMessage(tasks));

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={() => setAlarmOn(a => !a)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
          alarmOn
            ? 'bg-chart-3/10 text-chart-3 border-chart-3/30'
            : 'bg-secondary text-muted-foreground border-border'
        }`}
      >
        {alarmOn ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
        {alarmOn ? `Voice Alarm ON` : 'Voice Alarm OFF'}
      </button>

      {alarmOn && nextFire && (
        <Badge variant="outline" className="text-xs text-muted-foreground">
          ⏰ Fires in {nextFire}
        </Badge>
      )}

      <button
        onClick={testAlarm}
        className="text-xs text-primary underline underline-offset-2 hover:opacity-70"
      >
        Test voice now
      </button>
    </div>
  );
}