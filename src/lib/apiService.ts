// API service layer for handling HTTP requests
import LocalDatabase from "./localDatabase";

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface CreateItemRequest {
  name: string;
  description: string;
  status: string;
  category?: string;
  quantity?: number;
}

class ApiService {
  private baseUrl: string;
  private localDb: LocalDatabase;
  private token: string | null = null;

  constructor() {
    this.baseUrl = "/api";
    this.localDb = new LocalDatabase();
    this.token = localStorage.getItem("auth_token");
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers = {
        "Content-Type": "application/json",
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      };

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      return {
        data: data.data || data,
        error: data.error,
        status: response.status,
      };
    } catch (error) {
      console.warn(
        "API request failed, falling back to local database:",
        error,
      );
      return this.handleLocalFallback(endpoint, options);
    }
  }

  private async handleLocalFallback<T>(
    endpoint: string,
    options: RequestInit,
  ): Promise<ApiResponse<T>> {
    try {
      const method = options.method || "GET";
      const body = options.body ? JSON.parse(options.body as string) : null;

      switch (true) {
        case endpoint === "/auth/login" && method === "POST":
          const loginResult = await this.localDb.signInWithPassword(
            body.email,
            body.password,
          );
          if (loginResult.data.session) {
            this.token = loginResult.data.session.access_token;
            localStorage.setItem("auth_token", this.token);
          }
          return { data: loginResult.data, status: 200 };

        case endpoint === "/auth/logout" && method === "POST":
          const logoutResult = await this.localDb.signOut();
          this.token = null;
          localStorage.removeItem("auth_token");
          return { data: logoutResult, status: 200 };

        case endpoint === "/auth/session" && method === "GET":
          const sessionResult = await this.localDb.getSession();
          return { data: sessionResult.data, status: 200 };

        case endpoint.startsWith("/data") && method === "GET":
          const userId = this.getUserIdFromToken();
          if (!userId) throw new Error("Unauthorized");
          const fetchResult = await this.localDb.fetchData(userId);
          return { data: fetchResult.data, status: 200 };

        case endpoint.startsWith("/data") && method === "POST":
          const createUserId = this.getUserIdFromToken();
          if (!createUserId) throw new Error("Unauthorized");
          const createResult = await this.localDb.createItem({
            ...body,
            user_id: createUserId,
          });
          return { data: createResult.data, status: 201 };

        case endpoint.includes("/data/") && method === "PUT":
          const itemId = endpoint.split("/").pop();
          if (!itemId) throw new Error("Item ID required");
          const updateResult = await this.localDb.updateItem(itemId, body);
          return { data: updateResult.data, status: 200 };

        case endpoint.includes("/data/") && method === "DELETE":
          const deleteItemId = endpoint.split("/").pop();
          if (!deleteItemId) throw new Error("Item ID required");
          const deleteResult = await this.localDb.deleteItem(deleteItemId);
          return { data: deleteResult, status: 200 };

        default:
          throw new Error("Endpoint not found");
      }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unknown error",
        status: 500,
      };
    }
  }

  private getUserIdFromToken(): string | null {
    if (!this.token) return null;
    // For local testing, extract user ID from token
    if (this.token.startsWith("local_token_")) {
      return this.token.replace("local_token_", "");
    }
    return null;
  }

  // Authentication endpoints
  async login(email: string, password: string) {
    const response = await this.makeRequest<any>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return response;
  }

  async logout() {
    const response = await this.makeRequest<any>("/auth/logout", {
      method: "POST",
    });
    return response;
  }

  async getSession() {
    const response = await this.makeRequest<any>("/auth/session");
    return response;
  }

  // Data endpoints
  async fetchData() {
    const response = await this.makeRequest<any[]>("/data");
    return response;
  }

  async createItem(item: CreateItemRequest) {
    const response = await this.makeRequest<any>("/data", {
      method: "POST",
      body: JSON.stringify(item),
    });
    return response;
  }

  async updateItem(id: string, updates: Partial<CreateItemRequest>) {
    const response = await this.makeRequest<any>(`/data/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
    return response;
  }

  async deleteItem(id: string) {
    const response = await this.makeRequest<any>(`/data/${id}`, {
      method: "DELETE",
    });
    return response;
  }

  // Health check
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export default ApiService;
export type { ApiResponse, LoginRequest, CreateItemRequest };
