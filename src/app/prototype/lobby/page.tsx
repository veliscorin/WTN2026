"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function LobbyPage() {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [status, setStatus] = useState('Syncing with server...');
  const [offset, setOffset] = useState<number>(0);
  const [sessionName, setSessionName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    async function init() {
      try {
        const schoolId = localStorage.getItem('wtn_school_id');
        const email = localStorage.getItem('wtn_user_email');

        if (!schoolId || !email) {
          router.push('/prototype');
          return;
        }
        setUserEmail(email);

        // 1. Get Session Info
        const sessionRes = await fetch(`/api/session?schoolId=${schoolId}`);
        if (!sessionRes.ok) {
           throw new Error('Session not found');
        }
        const sessionData = await sessionRes.json();

        // 2. Check User Status
        const stateRes = await fetch(`/api/quiz/state?email=${userEmail}`);
        if (stateRes.ok) {
            const state = await stateRes.json();
            if (state.status === 'COMPLETED') {
                router.push('/prototype/results');
                return;
            }
            if (state.status === 'DISQUALIFIED' || state.is_disqualified) {
                router.push('/prototype/disqualified');
                return;
            }
        }

        // 3. Sync Clock (Simple implementation)
        const startTime = new Date(sessionData.startTime).getTime();
        setSessionName(sessionData.name || 'Academic Quiz Session');

        const t0 = Date.now();
        const timeRes = await fetch('/api/time');
        const timeData = await timeRes.json();
        const t1 = Date.now();
        const latency = t1 - t0;
        const serverTime = timeData.time + (latency / 2);
        const clockOffset = serverTime - t1; // Add this to local Date.now() to get Server Time
        setOffset(clockOffset);

        // 4. CHECK: If already started, go straight to Quiz
        const currentServerTime = Date.now() + clockOffset;
        if (currentServerTime >= startTime) {
           router.push('/prototype/quiz');
           return;
        }

        setStatus('Waiting for session to start...');

        // 3. Start Timer Loop
        const intervalId = setInterval(() => {
          const currentServerTime = Date.now() + clockOffset;
          const remaining = startTime - currentServerTime;

          if (remaining <= 0) {
            clearInterval(intervalId);
            router.push('/prototype/quiz');
          } else {
            setTimeLeft(remaining);
          }
        }, 100);

        return () => clearInterval(intervalId);

      } catch (err) {
        setStatus('Error connecting to server.');
      }
    }

    init();
  }, [router]);

  // Format milliseconds to MM:SS or HH:MM:SS
  const formatTime = (ms: number) => {
    if (ms < 0) return "00:00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [
        hours > 0 ? hours.toString().padStart(2, '0') : null,
        minutes.toString().padStart(2, '0'),
        seconds.toString().padStart(2, '0')
    ].filter(Boolean);

    return parts.join(':');
  };

  const handleLogout = () => {
    localStorage.removeItem('wtn_user_email');
    localStorage.removeItem('wtn_school_id');
    localStorage.removeItem('wtn_school_name');
    router.push('/prototype');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-transparent transition-colors duration-200 p-4 relative">
      <div className="relative w-full max-w-sm flex flex-col items-center">
        {/* Logo - Absolutely positioned above the card */}
        <div className="absolute bottom-full mb-6 w-full z-0 px-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/login-logo.png" alt="WTN Logo" className="w-full h-auto" />
        </div>

        <div className="relative w-full">
            {/* Mascot */}
            <div className="absolute -top-12 right-0 z-20 hidden md:block pointer-events-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/lobby-mascot.png" alt="Mascot" className="h-32 w-auto transform rotate-6" />
            </div>

            <Card className="relative z-10 w-full bg-white !bg-white dark:!bg-white rounded-[20px] shadow-2xl border-0 overflow-visible">
                <CardHeader className="text-left space-y-2 pt-8 px-8">
                    <CardTitle 
                        className="text-[28px] font-bold text-[#242F6B]"
                        style={{ fontFamily: 'var(--font-parkinsans), sans-serif' }}
                    >
                        In Waiting Room...
                    </CardTitle>
                    <div className="flex flex-col items-start gap-1">
                        <CardDescription className="text-lg font-medium text-[#333132] sr-only">
                            {sessionName}
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent className="text-center space-y-8 pb-10 px-8" style={{ fontFamily: 'Agenda, sans-serif' }}>
                    <div className="space-y-2">
                        {timeLeft !== null ? (
                            <div className="relative inline-block w-full bg-[#F6F0EB] py-6 rounded-xl shadow-inner">
                                <p 
                                    className="text-[20px] text-[#333132] uppercase tracking-widest font-bold mb-2"
                                    style={{ fontFamily: 'var(--font-parkinsans), sans-serif' }}
                                >
                                    Starting In
                                </p>
                                <div 
                                    className="text-[64px] font-bold tabular-nums text-[#EB4992] tracking-tighter leading-none"
                                    style={{ fontFamily: 'var(--font-parkinsans), sans-serif' }}
                                >
                                    {formatTime(timeLeft)}
                                </div>
                            </div>
                        ) : (
                            <div className="h-40 w-full bg-[#F6F0EB] rounded-xl flex items-center justify-center text-gray-400 animate-pulse">
                                Syncing Time...
                            </div>
                        )}
                    </div>

                    <div className="text-sm text-[#333132]">
                        <p className="font-semibold">{status}</p>
                        <p className="mt-2 text-xs opacity-80">
                            Please do not refresh the page. <br/>
                            You will be automatically redirected.
                        </p>
                    </div>

                    <button 
                        onClick={handleLogout}
                        className="text-xs text-orange-500 hover:text-orange-600 hover:underline transition-colors font-bold uppercase"
                    >
                        Wrong account? Logout
                    </button>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
