import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Server, Database, Cloud } from "lucide-react";
import ApiService from "../lib/apiService";

interface ApiStatusProps {
  apiService: ApiService;
  isUsingApi: boolean;
  isUsingLocalDb: boolean;
  onRefresh?: () => void;
}

const ApiStatus: React.FC<ApiStatusProps> = ({
  apiService,
  isUsingApi,
  isUsingLocalDb,
  onRefresh = () => {},
}) => {
  const [apiHealth, setApiHealth] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const checkApiHealth = async () => {
    setChecking(true);
    try {
      const healthy = await apiService.healthCheck();
      setApiHealth(healthy);
    } catch (error) {
      setApiHealth(false);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkApiHealth();
  }, []);

  const getStatusBadge = () => {
    if (isUsingApi) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <Server className="w-3 h-3 mr-1" />
          API Connected
        </Badge>
      );
    } else if (isUsingLocalDb) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          <Database className="w-3 h-3 mr-1" />
          Local Database
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-800">
          <Cloud className="w-3 h-3 mr-1" />
          Supabase
        </Badge>
      );
    }
  };

  return (
    <Card className="w-full max-w-md bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          Connection Status
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              checkApiHealth();
              onRefresh();
            }}
            disabled={checking}
          >
            <RefreshCw
              className={`w-4 h-4 ${checking ? "animate-spin" : ""}`}
            />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Current Mode:</span>
          {getStatusBadge()}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">API Health:</span>
          <Badge
            variant={
              apiHealth === true
                ? "default"
                : apiHealth === false
                  ? "destructive"
                  : "secondary"
            }
            className={apiHealth === true ? "bg-green-100 text-green-800" : ""}
          >
            {checking
              ? "Checking..."
              : apiHealth === true
                ? "Healthy"
                : apiHealth === false
                  ? "Offline"
                  : "Unknown"}
          </Badge>
        </div>

        <div className="text-xs text-gray-500 mt-3">
          {isUsingApi && "Using API endpoints with local database fallback"}
          {isUsingLocalDb && !isUsingApi && "Using local database for testing"}
          {!isUsingApi && !isUsingLocalDb && "Using Supabase cloud database"}
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiStatus;
