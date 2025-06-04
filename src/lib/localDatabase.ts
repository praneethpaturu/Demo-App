// Local database implementation for testing
interface User {
  id: string;
  email: string;
  password: string;
  created_at: string;
}

interface DataItem {
  id: string;
  name: string;
  description: string;
  status: string;
  category?: string;
  quantity?: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

class LocalDatabase {
  private users: User[] = [];
  private dataItems: DataItem[] = [];
  private storageKey = "local_test_db";

  constructor() {
    this.loadFromStorage();
    this.seedData();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.users = data.users || [];
        this.dataItems = data.dataItems || [];
      }
    } catch (error) {
      console.warn("Failed to load from localStorage:", error);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(
        this.storageKey,
        JSON.stringify({
          users: this.users,
          dataItems: this.dataItems,
        }),
      );
    } catch (error) {
      console.warn("Failed to save to localStorage:", error);
    }
  }

  private seedData() {
    // Only seed if no data exists
    if (this.users.length === 0) {
      // Create test user
      const testUser: User = {
        id: "test-user-1",
        email: "test@example.com",
        password: "password123", // In real app, this would be hashed
        created_at: new Date().toISOString(),
      };
      this.users.push(testUser);

      // Create sample data items
      const sampleItems: DataItem[] = [
        {
          id: "1",
          name: "Local Test Item 1",
          description: "This is a test item from local database",
          status: "active",
          category: "electronics",
          quantity: 5,
          user_id: testUser.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "2",
          name: "Local Test Item 2",
          description: "Another test item for local testing",
          status: "pending",
          category: "books",
          quantity: 3,
          user_id: testUser.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      this.dataItems.push(...sampleItems);
      this.saveToStorage();
    }
  }

  // Auth methods
  async signInWithPassword(email: string, password: string) {
    await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay

    const user = this.users.find(
      (u) => u.email === email && u.password === password,
    );
    if (!user) {
      throw new Error("Invalid email or password");
    }

    return {
      data: {
        session: {
          access_token: `local_token_${user.id}`,
          user: {
            id: user.id,
            email: user.email,
          },
        },
      },
      error: null,
    };
  }

  async signOut() {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return { error: null };
  }

  async getSession() {
    // For local testing, we'll simulate a session
    const testUser = this.users[0];
    if (testUser) {
      return {
        data: {
          session: {
            access_token: `local_token_${testUser.id}`,
            user: {
              id: testUser.id,
              email: testUser.email,
            },
          },
        },
        error: null,
      };
    }
    return { data: { session: null }, error: null };
  }

  // Data methods
  async fetchData(userId: string) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const userItems = this.dataItems.filter((item) => item.user_id === userId);
    return {
      data: userItems,
      error: null,
    };
  }

  async createItem(item: Omit<DataItem, "id" | "created_at" | "updated_at">) {
    await new Promise((resolve) => setTimeout(resolve, 400));

    const newItem: DataItem = {
      ...item,
      id: `local_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.dataItems.push(newItem);
    this.saveToStorage();

    return {
      data: newItem,
      error: null,
    };
  }

  async updateItem(id: string, updates: Partial<DataItem>) {
    await new Promise((resolve) => setTimeout(resolve, 400));

    const itemIndex = this.dataItems.findIndex((item) => item.id === id);
    if (itemIndex === -1) {
      throw new Error("Item not found");
    }

    this.dataItems[itemIndex] = {
      ...this.dataItems[itemIndex],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.saveToStorage();

    return {
      data: this.dataItems[itemIndex],
      error: null,
    };
  }

  async deleteItem(id: string) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const itemIndex = this.dataItems.findIndex((item) => item.id === id);
    if (itemIndex === -1) {
      throw new Error("Item not found");
    }

    this.dataItems.splice(itemIndex, 1);
    this.saveToStorage();

    return { error: null };
  }

  // Auth state change simulation
  onAuthStateChange(callback: (event: string, session: any) => void) {
    // For local testing, we'll just return a mock subscription
    return {
      data: {
        subscription: {
          unsubscribe: () => {},
        },
      },
    };
  }

  // Clear all data (useful for testing)
  clearAll() {
    this.users = [];
    this.dataItems = [];
    localStorage.removeItem(this.storageKey);
    this.seedData();
  }
}

export default LocalDatabase;
export type { User, DataItem };
