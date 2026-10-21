import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';

/**
 * Plays a buzzer beep using Web Audio API
 */
export function playBuzzer({ frequency = 440, duration = 0.4, repeats = 3 } = {}) {
  if (!window.AudioContext && !window.webkitAudioContext) return;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();

  for (let i = 0; i < repeats; i++) {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + i * (duration + 0.1));
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime + i * (duration + 0.1));
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * (duration + 0.1) + duration);

    oscillator.start(ctx.currentTime + i * (duration + 0.1));
    oscillator.stop(ctx.currentTime + i * (duration + 0.1) + duration);
  }
}

/**
 * Speaks a message using Web Speech API
 */
export function speakMessage(text, { rate = 0.9, pitch = 1 } = {}) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  utterance.pitch = pitch;
  speechSynthesis.speak(utterance);
}

/**
 * Plays buzzer then speaks a message
 */
export function notify(message, options = {}) {
  playBuzzer(options);
  setTimeout(() => speakMessage(message, options), 800);
}

/**
 * A button that triggers a buzzer + voice notification
 */
export default function NotificationBuzzer({ message = 'Attention! Time to focus!', label = 'Buzz Me', className = '' }) {
  const handleBuzz = useCallback(() => {
    notify(message);
  }, [message]);

  return (
    <Button variant="outline" onClick={handleBuzz} className={`flex items-center gap-2 ${className}`}>
      <Bell className="w-4 h-4 animate-pulse" />
      {label}
    </Button>
  );
}