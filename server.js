const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory storage for demo purposes
let users = [
  {
    id: "1",
    email: "test@example.com",
    password: "password123", // In production, this should be hashed
    name: "Test User",
  },
];

let items = [
  {
    id: "1",
    name: "Sample Item",
    description: "This is a sample item for testing",
    status: "active",
    category: "test",
    quantity: 10,
    user_id: "1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let sessions = new Map(); // Store active sessions

// Helper functions
function generateToken(userId) {
  return `api_token_${userId}_${Date.now()}`;
}

function validateToken(token) {
  if (!token || !token.startsWith("Bearer ")) return null;
  const actualToken = token.replace("Bearer ", "");
  return sessions.get(actualToken) || null;
}

function findUser(email, password) {
  return users.find(
    (user) => user.email === email && user.password === password,
  );
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    server: "Express.js",
    environment: process.env.NODE_ENV || "development",
  });
});

// Authentication endpoints
app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    const user = findUser(email, password);
    if (!user) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    const token = generateToken(user.id);
    const session = {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };

    sessions.set(token, session);

    res.json({
      data: {
        session,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

app.post("/api/auth/logout", (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      sessions.delete(token);
    }

    res.json({
      data: { message: "Logged out successfully" },
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

app.get("/api/auth/session", (req, res) => {
  try {
    const session = validateToken(req.headers.authorization);

    if (!session) {
      return res.json({
        data: { session: null },
      });
    }

    // Check if session is expired
    if (new Date() > new Date(session.expires_at)) {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (token) sessions.delete(token);
      return res.json({
        data: { session: null },
      });
    }

    res.json({
      data: { session },
    });
  } catch (error) {
    console.error("Session check error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

// Data endpoints
app.get("/api/data", (req, res) => {
  try {
    const session = validateToken(req.headers.authorization);

    if (!session) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const userItems = items.filter((item) => item.user_id === session.user.id);

    res.json({
      data: userItems,
    });
  } catch (error) {
    console.error("Fetch data error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

app.post("/api/data", (req, res) => {
  try {
    const session = validateToken(req.headers.authorization);

    if (!session) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const { name, description, status, category, quantity } = req.body;

    if (!name || !description || !status) {
      return res.status(400).json({
        error: "Name, description, and status are required",
      });
    }

    const newItem = {
      id: (items.length + 1).toString(),
      name,
      description,
      status,
      category: category || "general",
      quantity: quantity || 1,
      user_id: session.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    items.push(newItem);

    res.status(201).json({
      data: newItem,
    });
  } catch (error) {
    console.error("Create item error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

app.put("/api/data/:id", (req, res) => {
  try {
    const session = validateToken(req.headers.authorization);

    if (!session) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const { id } = req.params;
    const updates = req.body;

    const itemIndex = items.findIndex(
      (item) => item.id === id && item.user_id === session.user.id,
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        error: "Item not found",
      });
    }

    items[itemIndex] = {
      ...items[itemIndex],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    res.json({
      data: items[itemIndex],
    });
  } catch (error) {
    console.error("Update item error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

app.delete("/api/data/:id", (req, res) => {
  try {
    const session = validateToken(req.headers.authorization);

    if (!session) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const { id } = req.params;

    const itemIndex = items.findIndex(
      (item) => item.id === id && item.user_id === session.user.id,
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        error: "Item not found",
      });
    }

    const deletedItem = items.splice(itemIndex, 1)[0];

    res.json({
      data: { message: "Item deleted successfully", item: deletedItem },
    });
  } catch (error) {
    console.error("Delete item error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

// 404 handler for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({
    error: "API endpoint not found",
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Server error:", error);
  res.status(500).json({
    error: "Internal server error",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Express.js API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;
