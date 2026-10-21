import React from 'react';
import { Bot, User } from 'lucide-react';

export default function AIChatBubble({ message, isAI = false }) {
  return (
    <div className={`flex gap-3 ${isAI ? '' : 'flex-row-reverse'}`}>
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center shrink-0
        ${isAI ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}
      `}>
        {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>
      <div className={`
        max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed
        ${isAI
          ? 'bg-card border border-border text-foreground rounded-tl-sm'
          : 'bg-primary text-primary-foreground rounded-tr-sm'
        }
      `}>
        <p className="whitespace-pre-wrap">{message}</p>
      </div>
    </div>
  );
}