'use client';

import { useState, useEffect } from 'react';

// Define the School type
interface School {
  id: string;
  name: string;
  domain: string;
}

export default function LoginPage() {
  const [emailPrefix, setEmailPrefix] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchSchools() {
      try {
        const response = await fetch('/api/schools');
        if (!response.ok) {
          throw new Error('Failed to fetch schools');
        }
        const data: School[] = await response.json();
        setSchools(data);
        if (data.length > 0) {
          setSelectedSchool(data[0]);
        }
      } catch (err) {
        setError('Could not load school data. Please try refreshing the page.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSchools();
  }, []);

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
    // Here you would typically handle the login logic,
    // e.g., redirect to the quiz page or call an API.
    // For now, we'll just log it.
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md md:max-w-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            What's The News 2026
          </h1>
          <h2 className="text-2xl font-semibold text-gray-700 mt-2">
            Student Login
          </h2>
        </div>

        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label htmlFor="school" className="block text-sm font-medium text-gray-700">
              School
            </label>
            <select
              id="school"
              name="school"
              value={selectedSchool?.id || ''}
              onChange={(e) => {
                const school = schools.find(s => s.id === e.target.value);
                setSelectedSchool(school || null);
              }}
              disabled={isLoading}
              className="block w-full px-3 py-2 mt-1 text-base text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-200 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <option>Loading schools...</option>
              ) : (
                schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <div className="flex mt-1">
              <input
                id="email"
                name="email"
                type="text"
                value={emailPrefix}
                onChange={(e) => setEmailPrefix(e.target.value.toLowerCase())}
                placeholder="e.g. li_weiliang"
                disabled={isLoading}
                className="flex-1 w-full min-w-0 px-3 py-2 text-gray-900 placeholder-gray-400 bg-white border border-gray-300 rounded-l-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-200 disabled:cursor-not-allowed"
              />
              <span className="inline-flex items-center px-3 text-gray-500 bg-gray-50 border border-l-0 border-gray-300 rounded-r-md sm:text-sm">
                @{selectedSchool?.domain || '...'}
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Joining...
                </>
              ) : (
                'Launch Quiz'
              )}
            </button>
          </div>
        </form>

        <div className="text-center text-xs text-gray-500">
            <p>Please use a supported browser on your PLD (iPad, Chromebook, or Laptop).</p>
            <p className="mt-1">By joining, you agree to the exam regulations.</p>
        </div>
      </div>
    </div>
  );
}