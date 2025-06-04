// PostgreSQL database implementation
import { Client } from "pg";

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

class PostgresDatabase {
  private client: Client | null = null;
  private isConnected: boolean = false;
  private connectionString: string;

  constructor() {
    // Default connection string for local development
    this.connectionString =
      process.env.DATABASE_URL ||
      "postgresql://postgres:password@localhost:5432/testdb";
  }

  async connect(): Promise<boolean> {
    try {
      this.client = new Client({
        connectionString: this.connectionString,
      });

      await this.client.connect();
      this.isConnected = true;

      // Initialize database schema
      await this.initializeSchema();
      await this.seedData();

      console.log("PostgreSQL connected successfully");
      return true;
    } catch (error) {
      console.warn("Failed to connect to PostgreSQL:", error);
      this.isConnected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
      this.isConnected = false;
    }
  }

  private async initializeSchema(): Promise<void> {
    if (!this.client) throw new Error("Database not connected");

    try {
      // Create users table
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create data_items table
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS data_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          category VARCHAR(100),
          quantity INTEGER DEFAULT 1,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create trigger for updated_at
      await this.client.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);

      await this.client.query(`
        DROP TRIGGER IF EXISTS update_data_items_updated_at ON data_items;
        CREATE TRIGGER update_data_items_updated_at
          BEFORE UPDATE ON data_items
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);

      console.log("Database schema initialized");
    } catch (error) {
      console.error("Error initializing schema:", error);
      throw error;
    }
  }

  private async seedData(): Promise<void> {
    if (!this.client) throw new Error("Database not connected");

    try {
      // Check if test user already exists
      const userResult = await this.client.query(
        "SELECT id FROM users WHERE email = $1",
        ["test@example.com"],
      );

      let userId: string;
      if (userResult.rows.length === 0) {
        // Create test user
        const insertUserResult = await this.client.query(
          "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id",
          ["test@example.com", "password123"],
        );
        userId = insertUserResult.rows[0].id;

        // Create sample data items
        const sampleItems = [
          {
            name: "PostgreSQL Test Item 1",
            description: "This is a test item from PostgreSQL database",
            status: "active",
            category: "electronics",
            quantity: 5,
          },
          {
            name: "PostgreSQL Test Item 2",
            description: "Another test item for PostgreSQL testing",
            status: "pending",
            category: "books",
            quantity: 3,
          },
        ];

        for (const item of sampleItems) {
          await this.client.query(
            "INSERT INTO data_items (name, description, status, category, quantity, user_id) VALUES ($1, $2, $3, $4, $5, $6)",
            [
              item.name,
              item.description,
              item.status,
              item.category,
              item.quantity,
              userId,
            ],
          );
        }

        console.log("Sample data seeded");
      }
    } catch (error) {
      console.error("Error seeding data:", error);
    }
  }

  // Auth methods
  async signInWithPassword(email: string, password: string) {
    if (!this.client) throw new Error("Database not connected");

    try {
      const result = await this.client.query(
        "SELECT id, email FROM users WHERE email = $1 AND password = $2",
        [email, password],
      );

      if (result.rows.length === 0) {
        throw new Error("Invalid email or password");
      }

      const user = result.rows[0];
      return {
        data: {
          session: {
            access_token: `pg_token_${user.id}`,
            user: {
              id: user.id,
              email: user.email,
            },
          },
        },
        error: null,
      };
    } catch (error) {
      throw error;
    }
  }

  async signOut() {
    return { error: null };
  }

  async getSession() {
    if (!this.client) throw new Error("Database not connected");

    try {
      // For PostgreSQL, we'll get the first user as a test session
      const result = await this.client.query(
        "SELECT id, email FROM users LIMIT 1",
      );

      if (result.rows.length > 0) {
        const user = result.rows[0];
        return {
          data: {
            session: {
              access_token: `pg_token_${user.id}`,
              user: {
                id: user.id,
                email: user.email,
              },
            },
          },
          error: null,
        };
      }

      return { data: { session: null }, error: null };
    } catch (error) {
      throw error;
    }
  }

  // Data methods
  async fetchData(userId: string) {
    if (!this.client) throw new Error("Database not connected");

    try {
      const result = await this.client.query(
        "SELECT * FROM data_items WHERE user_id = $1 ORDER BY created_at DESC",
        [userId],
      );

      return {
        data: result.rows,
        error: null,
      };
    } catch (error) {
      throw error;
    }
  }

  async createItem(item: Omit<DataItem, "id" | "created_at" | "updated_at">) {
    if (!this.client) throw new Error("Database not connected");

    try {
      const result = await this.client.query(
        "INSERT INTO data_items (name, description, status, category, quantity, user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        [
          item.name,
          item.description,
          item.status,
          item.category,
          item.quantity,
          item.user_id,
        ],
      );

      return {
        data: result.rows[0],
        error: null,
      };
    } catch (error) {
      throw error;
    }
  }

  async updateItem(id: string, updates: Partial<DataItem>) {
    if (!this.client) throw new Error("Database not connected");

    try {
      const setParts = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (key !== "id" && key !== "created_at" && key !== "updated_at") {
          setParts.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      if (setParts.length === 0) {
        throw new Error("No valid fields to update");
      }

      values.push(id);
      const query = `UPDATE data_items SET ${setParts.join(", ")} WHERE id = $${paramIndex} RETURNING *`;

      const result = await this.client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error("Item not found");
      }

      return {
        data: result.rows[0],
        error: null,
      };
    } catch (error) {
      throw error;
    }
  }

  async deleteItem(id: string) {
    if (!this.client) throw new Error("Database not connected");

    try {
      const result = await this.client.query(
        "DELETE FROM data_items WHERE id = $1 RETURNING id",
        [id],
      );

      if (result.rows.length === 0) {
        throw new Error("Item not found");
      }

      return { error: null };
    } catch (error) {
      throw error;
    }
  }

  // Auth state change simulation
  onAuthStateChange(callback: (event: string, session: any) => void) {
    // For PostgreSQL, we'll just return a mock subscription
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
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      await this.client.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }

  // Get connection status
  isConnectedToDatabase(): boolean {
    return this.isConnected;
  }

  // Clear all data (useful for testing)
  async clearAll() {
    if (!this.client) throw new Error("Database not connected");

    try {
      await this.client.query("DELETE FROM data_items");
      await this.client.query("DELETE FROM users");
      await this.seedData();
    } catch (error) {
      console.error("Error clearing data:", error);
      throw error;
    }
  }
}

export default PostgresDatabase;
export type { User, DataItem };
