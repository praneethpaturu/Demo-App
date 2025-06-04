import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import PostgresDatabase from "../lib/postgresDB";

interface PostgresStatusProps {
  postgresDb?: PostgresDatabase;
  onStatusChange?: (isConnected: boolean) => void;
}

const PostgresStatus: React.FC<PostgresStatusProps> = ({
  postgresDb,
  onStatusChange,
}) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkConnection = async () => {
    if (!postgresDb) return;

    setIsChecking(true);
    setError(null);

    try {
      const connected = await postgresDb.healthCheck();
      setIsConnected(connected);
      setLastChecked(new Date());
      onStatusChange?.(connected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection check failed");
      setIsConnected(false);
      onStatusChange?.(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkConnection();

    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, [postgresDb]);

  const getStatusIcon = () => {
    if (isChecking) {
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    }
    if (isConnected) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    if (error) {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
    return <AlertCircle className="h-4 w-4 text-yellow-600" />;
  };

  const getStatusColor = () => {
    if (isConnected) return "bg-green-100 text-green-800";
    if (error) return "bg-red-100 text-red-800";
    return "bg-yellow-100 text-yellow-800";
  };

  const getStatusText = () => {
    if (isChecking) return "Checking...";
    if (isConnected) return "Connected";
    if (error) return "Error";
    return "Disconnected";
  };

  return (
    <Card className="w-full max-w-md bg-white">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Database className="h-4 w-4" />
          PostgreSQL Status
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={checkConnection}
          disabled={isChecking}
        >
          {getStatusIcon()}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Badge className={getStatusColor()}>{getStatusText()}</Badge>
          {lastChecked && (
            <span className="text-xs text-muted-foreground">
              Last checked: {lastChecked.toLocaleTimeString()}
            </span>
          )}
        </div>

        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
            {error}
          </div>
        )}

        {isConnected && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-600">
            PostgreSQL database is ready for use
          </div>
        )}

        {!isConnected && !error && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-600">
            Falling back to localStorage
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PostgresStatus;
