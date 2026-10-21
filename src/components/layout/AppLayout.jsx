import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Timer, BookOpen, Code2, Languages,
  Brain, Activity, Sun, ClipboardCheck, MessageCircle,
  Menu, X, ChevronRight, Briefcase, Map, Trophy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/timer', label: 'Focus Timer', icon: Timer },
  { path: '/study', label: 'Study Mentor', icon: BookOpen },
  { path: '/dsa', label: 'DSA Practice', icon: Code2 },
  { path: '/english', label: 'English Practice', icon: Languages },
  { path: '/ai-learning', label: 'AI Learning', icon: Brain },
  { path: '/activity', label: 'Activity Tracker', icon: Activity },
  { path: '/morning', label: 'Morning Routine', icon: Sun },
  { path: '/review', label: 'Daily Review', icon: ClipboardCheck },
  { path: '/assistant', label: 'AI Assistant', icon: MessageCircle },
  { path: '/interview', label: 'Interview Prep', icon: Briefcase },
  { path: '/roadmap', label: 'AI Roadmap', icon: Map },
  { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-card border-r border-border
        transform transition-transform duration-200 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center gap-3 p-5 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-foreground">AI Life Mentor</h1>
            <p className="text-[10px] text-muted-foreground">Discipline Assistant</p>
          </div>
          <Button
            variant="ghost" size="icon"
            className="ml-auto lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-73px)] p-3">
          <nav className="space-y-1">
            {navItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-all duration-150
                    ${isActive
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }
                  `}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                  {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 lg:px-6 flex items-center gap-3">
          <Button
            variant="ghost" size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <h2 className="font-semibold text-foreground">
            {navItems.find(n => n.path === location.pathname)?.label || 'AI Life Mentor'}
          </h2>
        </header>
        <div className="p-4 lg:p-6 max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}