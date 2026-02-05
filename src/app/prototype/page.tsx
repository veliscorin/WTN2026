'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { isTestMode, TEST_MODE_CONFIG } from '@/lib/test-mode';

// Define the School type
interface School {
  id: string;
  name: string;
  domain: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [emailPrefix, setEmailPrefix] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  
  // UI States
  const [isLoadingSchools, setIsLoadingSchools] = useState(true);
  const [isCheckingSession, setIsCheckingSession] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [loginAllowed, setLoginAllowed] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  
  // Resume State
  const [existingSession, setExistingSession] = useState<{ email: string, schoolName: string, isCompleted?: boolean } | null>(null);

  // 1. Fetch Schools & Check Existing Session
  useEffect(() => {
    async function init() {
      // Check for existing session
      const storedEmail = localStorage.getItem('wtn_user_email');
      const storedSchoolName = localStorage.getItem('wtn_school_name');
      const storedSchoolId = localStorage.getItem('wtn_school_id');

      if (storedEmail && storedSchoolName && storedSchoolId) {
        setExistingSession({ email: storedEmail, schoolName: storedSchoolName });
        
        // Fetch actual status to see if they finished
        fetch(`/api/quiz/state?email=${storedEmail}`)
          .then(res => res.ok ? res.json() : null)
          .then(state => {
            if (state && state.status === 'COMPLETED') {
              setExistingSession({ 
                email: storedEmail, 
                schoolName: storedSchoolName, 
                isCompleted: true 
              });
            }
          })
          .catch(err => console.error("Error checking resume status:", err));
      }

      try {
        const response = await fetch('/api/schools');
        if (!response.ok) {
          throw new Error('Failed to fetch schools');
        }
        const data: School[] = await response.json();
        setSchools(data);
        
        // If resuming, we don't auto-select yet unless they switch
        if (!storedSchoolId && data.length > 0) {
          setSelectedSchool(data[0]);
        } else if (storedSchoolId) {
           // Pre-select the stored school for the dropdown if they switch back
           const preMatch = data.find(s => s.id === storedSchoolId);
           if (preMatch) setSelectedSchool(preMatch);
        }

      } catch (err) {
        setError('Could not load school data. Please try refreshing the page.');
      } finally {
        setIsLoadingSchools(false);
      }
    }

    init();
  }, []);

  // 2. Check Session Status whenever Selected School changes
  useEffect(() => {
    if (!selectedSchool) return;

    let isMounted = true;
    
    async function checkSession() {
      setIsCheckingSession(true);
      setLoginAllowed(false);
      setStatusMessage('Checking session status...');
      setError('');

      try {
        const res = await fetch(`/api/session?schoolId=${selectedSchool!.id}`);
        if (!res.ok) {
          if (res.status === 404) {
             throw new Error("No exam scheduled for this school.");
          }
          throw new Error("Error checking session.");
        }

        const session = await res.json();
        const now = Date.now();
        // Parse ISO strings from DynamoDB
        const startTime = new Date(session.startTime).getTime();
        
        // Calculate Duration & End Time
        const endTime = startTime + (session.durationMinutes * 60 * 1000);
        
        // Calculate Login Window (Prioritize DB config -> Test Mode -> Default 30)
        const windowMinutes = session.entryWindowMinutes !== undefined 
            ? session.entryWindowMinutes 
            : (isTestMode() ? TEST_MODE_CONFIG.LOGIN_WINDOW_MINUTES : 30);

        const loginOpenTime = startTime - (windowMinutes * 60 * 1000);

        if (now > endTime) {
           setStatusMessage("The exam session has ended.");
           setLoginAllowed(false);
        } else if (now < loginOpenTime) {
           const openDate = new Date(loginOpenTime);
           setStatusMessage(`Login opens at ${openDate.toLocaleTimeString()}.`);
           setLoginAllowed(false);
        } else {
           // Login Window Open OR Late Entry
           setStatusMessage("");
           setLoginAllowed(true);
        }

      } catch (err: any) {
        if (isMounted) {
            setStatusMessage(err.message || "Error checking session.");
            setLoginAllowed(false);
        }
      } finally {
        if (isMounted) setIsCheckingSession(false);
      }
    }

    checkSession();

    return () => { isMounted = false; };
  }, [selectedSchool]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!loginAllowed || isJoining) return;

    if (!emailPrefix.trim()) {
      setError('Please enter your email prefix.');
      return;
    }
    if (!selectedSchool) {
      setError('Please select your school.');
      return;
    }

    const email = `${emailPrefix}@${selectedSchool.domain}`;
    setError('');
    setIsJoining(true);
    
    try {
      // Call Backend to Lock/Claim Email
      const res = await fetch('/api/auth/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          schoolId: selectedSchool.id,
          schoolName: selectedSchool.name
        })
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle Sabotage/Disqualified/Other Errors
        if (data.code === 'SABOTAGE_BLOCK') {
          throw new Error("ACCESS DENIED: This email is active in another session.");
        }
        if (data.code === 'DISQUALIFIED') {
          router.push('/prototype/disqualified');
          return;
        }
        throw new Error(data.error || "Login failed.");
      }

      // Success: Save local session & Redirect
      console.log('Login successful:', data.status);
      localStorage.setItem('wtn_user_email', email);
      localStorage.setItem('wtn_school_id', selectedSchool.id);
      localStorage.setItem('wtn_school_name', selectedSchool.name);

      if (data.status === 'RESUMED' && data.prevStatus === 'COMPLETED') {
        router.push('/prototype/results');
      } else {
        router.push('/prototype/lobby');
      }

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setIsJoining(false);
    }
  };

  const handleResume = () => {
      if (existingSession?.isCompleted) {
        router.push('/prototype/results');
      } else {
        router.push('/prototype/lobby');
      }
  };

  const handleSwitchAccount = () => {
      localStorage.removeItem('wtn_user_email');
      localStorage.removeItem('wtn_school_id');
      localStorage.removeItem('wtn_school_name');
      setExistingSession(null);
      // Reset logic handles defaults via the useEffects
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
            {/* Mascot - Shifted right by 10px from previous position */}
            <div className="absolute -top-8 right-[22px] z-20 hidden md:block pointer-events-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/login-mascot.png" alt="Mascot" className="h-32 w-auto transform rotate-6" />
            </div>

            <Card className="relative z-10 w-full bg-white !bg-white dark:!bg-white rounded-[20px] shadow-2xl border-0 overflow-visible">
              <CardHeader className="text-left space-y-2 pt-8 px-8">
                <CardTitle 
                    className="text-[28px] font-bold text-[#242F6B]"
                    style={{ fontFamily: 'var(--font-parkinsans), sans-serif' }}
                >
                    Student Login
                </CardTitle>
                <CardDescription className="text-lg font-medium sr-only">
                    {existingSession ? 'Resume Session' : 'Enter your details'}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pb-10 px-8" style={{ fontFamily: 'Agenda, sans-serif' }}>
                {existingSession ? (
                    <div className="space-y-6">
                        <div className="bg-[#F6F0EB] p-4 rounded-xl border border-indigo-100 text-center space-y-2">
                            <p className="text-sm text-gray-500 uppercase font-semibold tracking-wider">Logged in as</p>
                            <p className="text-lg font-bold text-[#333132] font-mono">
                                {existingSession.email}
                            </p>
                            <p className="text-sm text-gray-600">
                                {existingSession.schoolName}
                            </p>
                        </div>
                        
                        <div className="space-y-3">
                          <Button 
                              onClick={handleResume} 
                              className="w-full text-lg h-12 bg-[#F38133] hover:bg-[#d9722b] text-white rounded-full font-bold shadow-md"
                          >
                              {existingSession.isCompleted ? 'View Results' : 'Resume Quiz'}
                          </Button>
                          <button 
                              onClick={handleSwitchAccount}
                              className="w-full text-sm text-gray-500 hover:text-gray-700 hover:underline transition-colors"
                          >
                              Not you? Switch account
                          </button>
                        </div>
                    </div>
                ) : (
                <form className="space-y-6" onSubmit={handleLogin}>
                  {/* School Selection */}
                  <div className="space-y-2">
                    <label htmlFor="school" className="block text-sm font-bold text-[#333132] ml-1">
                      Select Your School
                    </label>
                    <div className="relative">
                        <Select
                            id="school"
                            name="school"
                            value={selectedSchool?.id || ''}
                            onChange={(e) => {
                            const school = schools.find(s => s.id === e.target.value);
                            setSelectedSchool(school || null);
                            }}
                            disabled={isLoadingSchools}
                            className="!bg-[#F6F0EB] border border-[#C7C8CA] rounded-xl h-12 text-gray-700 font-medium focus:ring-2 focus:ring-[#F38133] dark:!bg-[#F6F0EB] dark:text-gray-700 dark:border-[#C7C8CA]"
                        >
                            {isLoadingSchools ? (
                            <option>Loading schools...</option>
                            ) : (
                            schools.map((school) => (
                                <option key={school.id} value={school.id}>
                                {school.name}
                                </option>
                            ))
                            )}
                        </Select>
                    </div>
                  </div>

                  {/* Status Message / Login Block */}
                  {!loginAllowed && !isLoadingSchools && (
                     <div className="p-4 rounded-xl bg-yellow-50 text-yellow-800 text-center text-sm font-medium border border-yellow-100">
                        {isCheckingSession ? "Checking session..." : (statusMessage || "Quiz not started.")}
                     </div>
                  )}

                                {/* Email Input - Hidden if not allowed */}
                                {loginAllowed && (
                                <div className="space-y-2">
                                  <label htmlFor="email" className="block text-sm font-bold text-[#333132] ml-1">
                                    Your Student Email
                                  </label>
                                  <div className="flex">                      <Input
                        id="email"
                        name="email"
                        type="text"
                        value={emailPrefix}
                        onChange={(e) => setEmailPrefix(e.target.value.toLowerCase())}
                        placeholder="e.g. li_weiliang"
                        className="flex-1 !bg-[#F6F0EB] border border-[#C7C8CA] border-r-0 rounded-l-xl rounded-r-none h-12 shadow-none focus:z-10 focus:ring-2 focus:ring-[#F38133] placeholder:text-gray-400 dark:!bg-[#F6F0EB] dark:text-gray-700 dark:border-[#C7C8CA] dark:border-r-0"
                      />
                      <span className="inline-flex items-center px-4 text-gray-600 font-medium bg-[#EEE7E1] border border-[#C7C8CA] border-l-0 rounded-r-xl h-12 whitespace-nowrap dark:border-[#C7C8CA] dark:border-l-0">
                        @{selectedSchool?.domain || '...'}
                      </span>
                    </div>
                  </div>
                  )}

                  {error && (
                    <div className="p-3 text-sm text-red-700 bg-red-100 rounded-xl text-center font-medium">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={!loginAllowed || isCheckingSession || isJoining}
                    className="w-full h-12 text-lg bg-[#F38133] hover:bg-[#d9722b] text-white rounded-full font-bold shadow-md transition-all transform active:scale-95"
                  >
                     {isJoining ? 'JOINING...' : (loginAllowed ? 'LAUNCH QUIZ' : 'PLEASE WAIT')}
                  </Button>
                </form>
                )}
              </CardContent>

              <CardFooter className="justify-center text-center pb-8" style={{ fontFamily: 'Agenda, sans-serif' }}>
                  <div className="text-xs text-gray-400 space-y-1">
                      <p>Please use a supported browser on your PLD.</p>
                      <p>By joining, you agree to the exam regulations.</p>
                  </div>
              </CardFooter>
            </Card>
        </div>
      </div>
    </div>
  );
}
