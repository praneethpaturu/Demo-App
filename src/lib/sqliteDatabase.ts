// Browser-compatible SQLite-like implementation using IndexedDB

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

class SQLiteDatabase {
  private dbName: string = "TestAppDB";
  private version: number = 1;
  private db: IDBDatabase | null = null;

  constructor(dbPath: string = "test_app.db") {
    // dbPath is ignored in browser implementation
    this.initialize();
  }

  private async initialize() {
    try {
      await this.openDatabase();
      await this.seedData();
      console.log("IndexedDB database initialized successfully");
    } catch (error) {
      console.error("Failed to initialize IndexedDB database:", error);
    }
  }

  private openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create users store
        if (!db.objectStoreNames.contains("users")) {
          const usersStore = db.createObjectStore("users", { keyPath: "id" });
          usersStore.createIndex("email", "email", { unique: true });
        }

        // Create data_items store
        if (!db.objectStoreNames.contains("data_items")) {
          const itemsStore = db.createObjectStore("data_items", {
            keyPath: "id",
          });
          itemsStore.createIndex("user_id", "user_id", { unique: false });
        }
      };
    });
  }

  private async seedData() {
    if (!this.db) throw new Error("Database not initialized");

    // Check if test user already exists
    const existingUser = await this.getUser("test@example.com");

    if (!existingUser) {
      const userId = "test-user-1";

      // Create test user
      await this.addUser({
        id: userId,
        email: "test@example.com",
        password: "password123",
        created_at: new Date().toISOString(),
      });

      // Create sample data items
      const sampleItems = [
        {
          id: "1",
          name: "IndexedDB Test Item 1",
          description: "This is a test item from IndexedDB database",
          status: "active",
          category: "electronics",
          quantity: 5,
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "2",
          name: "IndexedDB Test Item 2",
          description: "Another test item for IndexedDB testing",
          status: "pending",
          category: "books",
          quantity: 3,
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      for (const item of sampleItems) {
        await this.addDataItem(item);
      }

      console.log("Sample data seeded to IndexedDB database");
    }
  }

  private async getUser(email: string): Promise<User | undefined> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["users"], "readonly");
      const store = transaction.objectStore("users");
      const index = store.index("email");
      const request = index.get(email);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async addUser(user: User): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["users"], "readwrite");
      const store = transaction.objectStore("users");
      const request = store.add(user);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async addDataItem(item: DataItem): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["data_items"], "readwrite");
      const store = transaction.objectStore("data_items");
      const request = store.add(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Auth methods
  async signInWithPassword(email: string, password: string) {
    if (!this.db) throw new Error("Database not initialized");

    await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["users"], "readonly");
      const store = transaction.objectStore("users");
      const index = store.index("email");
      const request = index.get(email);

      request.onsuccess = () => {
        const user = request.result as User | undefined;

        if (!user || user.password !== password) {
          resolve({
            data: { session: null },
            error: { message: "Invalid email or password" },
          });
          return;
        }

        resolve({
          data: {
            session: {
              access_token: `sqlite_token_${user.id}`,
              user: {
                id: user.id,
                email: user.email,
              },
            },
          },
          error: null,
        });
      };

      request.onerror = () => reject(request.error);
    });
  }

  async signOut() {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return { error: null };
  }

  async getSession() {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(["users"], "readonly");
      const store = transaction.objectStore("users");
      const request = store.getAll();

      request.onsuccess = () => {
        const users = request.result as User[];
        const user = users[0];

        if (user) {
          resolve({
            data: {
              session: {
                access_token: `sqlite_token_${user.id}`,
                user: {
                  id: user.id,
                  email: user.email,
                },
              },
            },
            error: null,
          });
        } else {
          resolve({ data: { session: null }, error: null });
        }
      };

      request.onerror = () => resolve({ data: { session: null }, error: null });
    });
  }

  // Data methods
  async fetchData(userId: string) {
    if (!this.db) throw new Error("Database not initialized");

    await new Promise((resolve) => setTimeout(resolve, 300));

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(["data_items"], "readonly");
      const store = transaction.objectStore("data_items");
      const index = store.index("user_id");
      const request = index.getAll(userId);

      request.onsuccess = () => {
        const items = request.result as DataItem[];
        // Sort by created_at DESC
        items.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        resolve({
          data: items,
          error: null,
        });
      };

      request.onerror = () => resolve({ data: [], error: request.error });
    });
  }

  async createItem(item: Omit<DataItem, "id" | "created_at" | "updated_at">) {
    if (!this.db) throw new Error("Database not initialized");

    await new Promise((resolve) => setTimeout(resolve, 400));

    const newItem: DataItem = {
      ...item,
      id: `sqlite_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["data_items"], "readwrite");
      const store = transaction.objectStore("data_items");
      const request = store.add(newItem);

      request.onsuccess = () => {
        resolve({
          data: newItem,
          error: null,
        });
      };

      request.onerror = () => reject(request.error);
    });
  }

  async updateItem(id: string, updates: Partial<DataItem>) {
    if (!this.db) throw new Error("Database not initialized");

    await new Promise((resolve) => setTimeout(resolve, 400));

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["data_items"], "readwrite");
      const store = transaction.objectStore("data_items");
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const existingItem = getRequest.result as DataItem;

        if (!existingItem) {
          resolve({
            data: null,
            error: { message: "Item not found" },
          });
          return;
        }

        const updatedItem = {
          ...existingItem,
          ...updates,
          id: existingItem.id, // Preserve original id
          created_at: existingItem.created_at, // Preserve original created_at
          updated_at: new Date().toISOString(),
        };

        const putRequest = store.put(updatedItem);

        putRequest.onsuccess = () => {
          resolve({
            data: updatedItem,
            error: null,
          });
        };

        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteItem(id: string) {
    if (!this.db) throw new Error("Database not initialized");

    await new Promise((resolve) => setTimeout(resolve, 300));

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["data_items"], "readwrite");
      const store = transaction.objectStore("data_items");
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve({ error: null });
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Auth state change simulation
  onAuthStateChange(callback: (event: string, session: any) => void) {
    // For IndexedDB, we'll just return a mock subscription
    return {
      data: {
        subscription: {
          unsubscribe: () => {},
        },
      },
    };
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    if (!this.db) return false;

    try {
      // Try to perform a simple operation
      const transaction = this.db.transaction(["users"], "readonly");
      const store = transaction.objectStore("users");
      const request = store.count();

      return new Promise((resolve) => {
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  // Clear all data (useful for testing)
  async clearAll() {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ["data_items", "users"],
        "readwrite",
      );

      const clearItems = transaction.objectStore("data_items").clear();
      const clearUsers = transaction.objectStore("users").clear();

      transaction.oncomplete = async () => {
        await this.seedData();
        resolve(undefined);
      };

      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export default SQLiteDatabase;
export type { User, DataItem };
