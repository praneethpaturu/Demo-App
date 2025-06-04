// Mock API server for development and testing
import LocalDatabase from "./localDatabase";
import SQLiteDatabase from "./sqliteDatabase";

interface MockRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
}

interface MockResponse {
  status: number;
  data?: any;
  error?: string;
}

class MockApiServer {
  private localDb: LocalDatabase;
  private sqliteDb: SQLiteDatabase;
  private routes: Map<string, (req: MockRequest) => Promise<MockResponse>>;
  private useSQLite: boolean = true;

  constructor() {
    this.localDb = new LocalDatabase();
    this.sqliteDb = new SQLiteDatabase();
    this.routes = new Map();
    this.setupRoutes();
  }

  private getActiveDatabase() {
    return this.useSQLite ? this.sqliteDb : this.localDb;
  }

  private setupRoutes() {
    // Health check
    this.routes.set("GET /api/health", async () => ({
      status: 200,
      data: { status: "ok", timestamp: new Date().toISOString() },
    }));

    // Authentication routes
    this.routes.set("POST /api/auth/login", async (req) => {
      try {
        const { email, password } = req.body;
        const db = this.getActiveDatabase();
        const result = await db.signInWithPassword(email, password);
        return {
          status: 200,
          data: result.data,
        };
      } catch (error) {
        return {
          status: 401,
          error:
            error instanceof Error ? error.message : "Authentication failed",
        };
      }
    });

    this.routes.set("POST /api/auth/logout", async () => {
      try {
        const db = this.getActiveDatabase();
        const result = await db.signOut();
        return {
          status: 200,
          data: result,
        };
      } catch (error) {
        return {
          status: 500,
          error: error instanceof Error ? error.message : "Logout failed",
        };
      }
    });

    this.routes.set("GET /api/auth/session", async () => {
      try {
        const db = this.getActiveDatabase();
        const result = await db.getSession();
        return {
          status: 200,
          data: result.data,
        };
      } catch (error) {
        return {
          status: 500,
          error:
            error instanceof Error ? error.message : "Session check failed",
        };
      }
    });

    // Data routes
    this.routes.set("GET /api/data", async (req) => {
      try {
        const userId = this.extractUserIdFromAuth(req.headers.authorization);
        if (!userId) {
          return { status: 401, error: "Unauthorized" };
        }
        const db = this.getActiveDatabase();
        const result = await db.fetchData(userId);
        return {
          status: 200,
          data: result.data,
        };
      } catch (error) {
        return {
          status: 500,
          error:
            error instanceof Error ? error.message : "Failed to fetch data",
        };
      }
    });

    this.routes.set("POST /api/data", async (req) => {
      try {
        const userId = this.extractUserIdFromAuth(req.headers.authorization);
        if (!userId) {
          return { status: 401, error: "Unauthorized" };
        }
        const db = this.getActiveDatabase();
        const result = await db.createItem({
          ...req.body,
          user_id: userId,
        });
        return {
          status: 201,
          data: result.data,
        };
      } catch (error) {
        return {
          status: 500,
          error:
            error instanceof Error ? error.message : "Failed to create item",
        };
      }
    });

    this.routes.set("PUT /api/data/:id", async (req) => {
      try {
        const userId = this.extractUserIdFromAuth(req.headers.authorization);
        if (!userId) {
          return { status: 401, error: "Unauthorized" };
        }
        const itemId = this.extractIdFromUrl(req.url);
        if (!itemId) {
          return { status: 400, error: "Item ID required" };
        }
        const db = this.getActiveDatabase();
        const result = await db.updateItem(itemId, req.body);
        return {
          status: 200,
          data: result.data,
        };
      } catch (error) {
        return {
          status: 500,
          error:
            error instanceof Error ? error.message : "Failed to update item",
        };
      }
    });

    this.routes.set("DELETE /api/data/:id", async (req) => {
      try {
        const userId = this.extractUserIdFromAuth(req.headers.authorization);
        if (!userId) {
          return { status: 401, error: "Unauthorized" };
        }
        const deleteItemId = this.extractIdFromUrl(req.url);
        if (!deleteItemId) {
          return { status: 400, error: "Item ID required" };
        }
        const db = this.getActiveDatabase();
        const result = await db.deleteItem(deleteItemId);
        return {
          status: 200,
          data: result,
        };
      } catch (error) {
        return {
          status: 500,
          error:
            error instanceof Error ? error.message : "Failed to delete item",
        };
      }
    });
  }

  private extractUserIdFromAuth(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    const token = authHeader.replace("Bearer ", "");
    if (token.startsWith("local_token_")) {
      return token.replace("local_token_", "");
    }
    if (token.startsWith("sqlite_token_")) {
      return token.replace("sqlite_token_", "");
    }
    return null;
  }

  private extractIdFromUrl(url: string): string | null {
    const parts = url.split("/");
    return parts[parts.length - 1] || null;
  }

  async handleRequest(
    method: string,
    url: string,
    headers: Record<string, string>,
    body?: any,
  ): Promise<MockResponse> {
    const routeKey = `${method} ${url.replace(/\/[^/]+$/, "/:id")}`;
    const exactRouteKey = `${method} ${url}`;

    const handler = this.routes.get(exactRouteKey) || this.routes.get(routeKey);

    if (!handler) {
      return {
        status: 404,
        error: "Endpoint not found",
      };
    }

    return handler({ method, url, headers, body });
  }

  // Get all available routes for debugging
  getRoutes(): string[] {
    return Array.from(this.routes.keys());
  }
}

export default MockApiServer;
