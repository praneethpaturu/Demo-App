import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import LoginForm from "./LoginForm";
import Dashboard from "./Dashboard";
import LocalDatabase from "../lib/localDatabase";

// Create a Supabase client with proper error handling
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const environment = import.meta.env.VITE_APP_ENV || "development";

// Create database client based on environment
const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const localDb = new LocalDatabase();

const Home = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentEnvironment, setCurrentEnvironment] =
    useState<string>(environment);
  const [error, setError] = useState<string | null>(null);
  const [isUsingLocalDb, setIsUsingLocalDb] = useState<boolean>(
    environment === "test" || !supabase,
  );

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        setCurrentEnvironment(environment);

        if (environment === "test" || !supabase) {
          // Use local database
          setIsUsingLocalDb(true);
          const { data, error } = await localDb.getSession();
          if (error) throw error;
          setSession(data.session);
        } else {
          // Use Supabase
          setIsUsingLocalDb(false);
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          setSession(data.session);
        }
      } catch (error) {
        console.error("Error checking session:", error);
        setError("Failed to check authentication status");
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Set up auth state listener
    let authListener: any = null;
    if (isUsingLocalDb) {
      const { data } = localDb.onAuthStateChange((_event, session) => {
        setSession(session);
      });
      authListener = data;
    } else if (supabase) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });
      authListener = data;
    }

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [isUsingLocalDb]);

  const handleLogin = async (email: string, password: string) => {
    try {
      setLoading(true);

      let result;
      if (isUsingLocalDb) {
        result = await localDb.signInWithPassword(email, password);
      } else if (supabase) {
        result = await supabase.auth.signInWithPassword({
          email,
          password,
        });
      } else {
        setError("No database configuration available.");
        return;
      }

      if (result.error) throw result.error;
      setSession(result.data.session);
      setError(null);
    } catch (error: any) {
      console.error("Error logging in:", error);
      setError(error.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);

      let result;
      if (isUsingLocalDb) {
        result = await localDb.signOut();
      } else if (supabase) {
        result = await supabase.auth.signOut();
      } else {
        setError("No database configuration available.");
        return;
      }

      if (result.error) throw result.error;
      setSession(null);
    } catch (error: any) {
      console.error("Error logging out:", error);
      setError(error.message || "Failed to logout");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">3-Tier Test Application</h1>
            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              {currentEnvironment}
            </span>
            {isUsingLocalDb && (
              <span className="rounded-full bg-yellow-100 text-yellow-800 px-2 py-1 text-xs font-medium">
                Local DB
              </span>
            )}
          </div>
          {session && (
            <button
              onClick={handleLogout}
              className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
            >
              Logout
            </button>
          )}
        </div>
      </header>

      <main className="container py-8">
        {error && (
          <div className="mb-6 rounded-md bg-destructive/15 p-4 text-destructive">
            <p>{error}</p>
          </div>
        )}

        {isUsingLocalDb && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              Local Database Mode
            </h3>
            <p className="text-xs text-blue-600">
              Using local database for testing. Test credentials:
              test@example.com / password123
            </p>
          </div>
        )}

        {session ? (
          <Dashboard
            session={session}
            supabase={isUsingLocalDb ? localDb : supabase}
            isLocalDb={isUsingLocalDb}
          />
        ) : (
          <div className="mx-auto max-w-md">
            <LoginForm onLogin={handleLogin} error={error} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
