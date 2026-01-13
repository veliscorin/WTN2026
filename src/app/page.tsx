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
        
        // Calculate Login Window (Respecting Test Mode)
        const windowMinutes = isTestMode() ? TEST_MODE_CONFIG.LOGIN_WINDOW_MINUTES : 30;
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

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!loginAllowed) return;

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
    console.log('Logging in with:', email);
    
    // Save session info
    localStorage.setItem('wtn_user_email', email);
    localStorage.setItem('wtn_school_id', selectedSchool.id);
    localStorage.setItem('wtn_school_name', selectedSchool.name);

    // Proceed to lobby
    router.push('/lobby');
  };

  const handleResume = () => {
      if (existingSession?.isCompleted) {
        router.push('/results');
      } else {
        router.push('/lobby');
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
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-zinc-900 transition-colors duration-200 p-4">
      <Card className="w-full max-w-md md:max-w-lg shadow-md border-0 md:border">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold">WTN 2026</CardTitle>
          <CardDescription className="text-lg font-medium">
              {existingSession ? 'Resume Session' : 'Student Login'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {existingSession ? (
              <div className="space-y-6">
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800 text-center space-y-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wider">Logged in as</p>
                      <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300 font-mono">
                          {existingSession.email}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                          {existingSession.schoolName}
                      </p>
                  </div>
                  
                  <div className="space-y-3">
                    <Button 
                        onClick={handleResume} 
                        className="w-full text-lg h-12"
                    >
                        {existingSession.isCompleted ? 'View Results' : 'Resume Quiz'}
                    </Button>
                    <button 
                        onClick={handleSwitchAccount}
                        className="w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:underline transition-colors"
                    >
                        Not you? Switch account
                    </button>
                  </div>
              </div>
          ) : (
          <form className="space-y-6" onSubmit={handleLogin}>
            {/* School Selection */}
            <div className="space-y-2">
              <label htmlFor="school" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                School
              </label>
              <Select
                id="school"
                name="school"
                value={selectedSchool?.id || ''}
                onChange={(e) => {
                  const school = schools.find(s => s.id === e.target.value);
                  setSelectedSchool(school || null);
                }}
                disabled={isLoadingSchools}
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

            {/* Status Message / Login Block */}
            {!loginAllowed && !isLoadingSchools && (
               <div className="p-4 rounded-md bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-center text-sm font-medium">
                  {isCheckingSession ? "Checking session..." : (statusMessage || "Quiz not started.")}
               </div>
            )}

            {/* Email Input - Hidden if not allowed */}
            {loginAllowed && (
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Address
              </label>
              <div className="flex">
                <Input
                  id="email"
                  name="email"
                  type="text"
                  value={emailPrefix}
                  onChange={(e) => setEmailPrefix(e.target.value.toLowerCase())}
                  placeholder="e.g. li_weiliang"
                  className="rounded-r-none focus:z-10"
                />
                <span className="inline-flex items-center px-3 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-zinc-600 border border-l-0 border-gray-300 dark:border-zinc-600 rounded-r-md sm:text-sm whitespace-nowrap">
                  @{selectedSchool?.domain || '...'}
                </span>
              </div>
            </div>
            )}

            {error && (
              <div className="p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300 rounded-md">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={!loginAllowed || isCheckingSession}
              className="w-full"
              size="lg"
            >
               {loginAllowed ? 'Launch Quiz' : 'Please Wait'}
            </Button>
          </form>
          )}
        </CardContent>

        <CardFooter className="justify-center text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p>Please use a supported browser on your PLD.</p>
                <p>By joining, you agree to the exam regulations.</p>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
