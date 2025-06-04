import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import LoginForm from "./LoginForm";
import Dashboard from "./Dashboard";

// Create a Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const Home = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [environment, setEnvironment] = useState<string>("development");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(data.session);

        // Determine environment
        const env = import.meta.env.VITE_APP_ENV || "development";
        setEnvironment(env);
      } catch (error) {
        console.error("Error checking session:", error);
        setError("Failed to check authentication status");
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      },
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      setSession(data.session);
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
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
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
              {environment}
            </span>
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

        {session ? (
          <Dashboard session={session} supabase={supabase} />
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
