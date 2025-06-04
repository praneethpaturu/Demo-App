import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import LoginForm from "./LoginForm";
import Dashboard from "./Dashboard";
import LocalDatabase from "../lib/localDatabase";
import PostgresDatabase from "../lib/postgresDB";
import SQLiteDatabase from "../lib/sqliteDatabase";
import ApiService from "../lib/apiService";
import MockApiServer from "../lib/mockApiServer";

// Create a Supabase client with proper error handling
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const environment = import.meta.env.VITE_APP_ENV || "development";

// Create database client based on environment
const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const localDb = new LocalDatabase();
const sqliteDb = new SQLiteDatabase();
const postgresDb = new PostgresDatabase();
const apiService = new ApiService();
const mockApiServer = new MockApiServer();

const Home = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentEnvironment, setCurrentEnvironment] =
    useState<string>(environment);
  const [error, setError] = useState<string | null>(null);
  const [isUsingLocalDb, setIsUsingLocalDb] = useState<boolean>(
    environment === "test" || !supabase,
  );
  const [isUsingPostgres, setIsUsingPostgres] = useState<boolean>(false);
  const [isUsingSQLite, setIsUsingSQLite] = useState<boolean>(true);
  const [isUsingApi, setIsUsingApi] = useState<boolean>(false);
  const [apiStatus, setApiStatus] = useState<string>("checking");
  const [dbStatus, setDbStatus] = useState<string>("checking");

  useEffect(() => {
    // Check API availability and existing session
    const checkSession = async () => {
      try {
        setCurrentEnvironment(environment);

        // Initialize PostgreSQL connection
        const postgresConnected = await apiService.initializePostgres();
        setIsUsingPostgres(postgresConnected);

        // Check SQLite availability
        const sqliteAvailable = await sqliteDb.healthCheck();
        setIsUsingSQLite(sqliteAvailable);

        setDbStatus(
          postgresConnected
            ? "postgres"
            : sqliteAvailable
              ? "sqlite"
              : "localStorage",
        );

        // Check if API is available
        const apiAvailable = await apiService.healthCheck();
        setIsUsingApi(apiAvailable);
        setApiStatus(apiAvailable ? "connected" : "offline");

        if (apiAvailable) {
          console.log("✅ Express.js API server is running and connected");
        } else {
          console.log(
            "⚠️ Express.js API server not available, using fallback database",
          );
        }

        if (apiAvailable) {
          // Use API service
          const { data, error } = await apiService.getSession();
          if (error) throw new Error(error);
          setSession(data.session);
          setIsUsingLocalDb(false);
        } else if (environment === "test" || !supabase) {
          // Use local database (PostgreSQL, SQLite, or localStorage)
          setIsUsingLocalDb(true);
          const db = postgresConnected
            ? postgresDb
            : sqliteAvailable
              ? sqliteDb
              : localDb;
          const { data, error } = await db.getSession();
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
      const db = isUsingPostgres
        ? postgresDb
        : isUsingSQLite
          ? sqliteDb
          : localDb;
      const { data } = db.onAuthStateChange((_event, session) => {
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
  }, [isUsingLocalDb, isUsingPostgres, isUsingSQLite]);

  const handleLogin = async (email: string, password: string) => {
    try {
      setLoading(true);

      let result;
      if (isUsingApi) {
        // Use API service
        const apiResult = await apiService.login(email, password);
        if (apiResult.error) throw new Error(apiResult.error);
        result = { data: apiResult.data, error: null };
      } else if (isUsingLocalDb) {
        const db = isUsingPostgres
          ? postgresDb
          : isUsingSQLite
            ? sqliteDb
            : localDb;
        result = await db.signInWithPassword(email, password);
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
      if (isUsingApi) {
        // Use API service
        const apiResult = await apiService.logout();
        if (apiResult.error) throw new Error(apiResult.error);
        result = { error: null };
      } else if (isUsingLocalDb) {
        const db = isUsingPostgres
          ? postgresDb
          : isUsingSQLite
            ? sqliteDb
            : localDb;
        result = await db.signOut();
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
            {isUsingApi && (
              <span className="rounded-full bg-green-100 text-green-800 px-2 py-1 text-xs font-medium">
                API Connected
              </span>
            )}
            {isUsingLocalDb && !isUsingApi && (
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  isUsingPostgres
                    ? "bg-purple-100 text-purple-800"
                    : isUsingSQLite
                      ? "bg-blue-100 text-blue-800"
                      : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {isUsingPostgres
                  ? "PostgreSQL"
                  : isUsingSQLite
                    ? "SQLite"
                    : "Local DB"}
              </span>
            )}
            {!isUsingApi && !isUsingLocalDb && supabase && (
              <span className="rounded-full bg-blue-100 text-blue-800 px-2 py-1 text-xs font-medium">
                Supabase
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

        {isUsingApi && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
            <h3 className="text-sm font-medium text-green-800 mb-2">
              API Mode - Connected
            </h3>
            <p className="text-xs text-green-600">
              Using API endpoints with local database fallback. Test
              credentials: test@example.com / password123
            </p>
          </div>
        )}
        {isUsingLocalDb && !isUsingApi && (
          <div
            className={`mb-6 rounded-lg border p-4 ${
              isUsingPostgres
                ? "border-purple-200 bg-purple-50"
                : isUsingSQLite
                  ? "border-blue-200 bg-blue-50"
                  : "border-yellow-200 bg-yellow-50"
            }`}
          >
            <h3
              className={`text-sm font-medium mb-2 ${
                isUsingPostgres
                  ? "text-purple-800"
                  : isUsingSQLite
                    ? "text-blue-800"
                    : "text-yellow-800"
              }`}
            >
              {isUsingPostgres
                ? "PostgreSQL Database Mode"
                : isUsingSQLite
                  ? "SQLite Database Mode"
                  : "Local Database Mode"}
            </h3>
            <p
              className={`text-xs ${
                isUsingPostgres
                  ? "text-purple-600"
                  : isUsingSQLite
                    ? "text-blue-600"
                    : "text-yellow-600"
              }`}
            >
              Using{" "}
              {isUsingPostgres
                ? "PostgreSQL"
                : isUsingSQLite
                  ? "SQLite"
                  : "localStorage"}{" "}
              database for testing. Test credentials: test@example.com /
              password123
            </p>
          </div>
        )}

        {session ? (
          <Dashboard
            session={session}
            supabase={
              isUsingApi
                ? null
                : isUsingLocalDb
                  ? isUsingPostgres
                    ? postgresDb
                    : isUsingSQLite
                      ? sqliteDb
                      : localDb
                  : supabase
            }
            apiService={isUsingApi ? apiService : null}
            isLocalDb={isUsingLocalDb && !isUsingApi}
            isUsingApi={isUsingApi}
            isUsingPostgres={isUsingPostgres}
            isUsingSQLite={isUsingSQLite}
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
