// Static Swagger configuration for browser compatibility
const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "Web-API-DB Integration Test Suite API",
    version: "1.0.0",
    description:
      "A 3-tier test application API with authentication and CRUD operations",
  },
  servers: [
    {
      url: "/api",
      description: "Development server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "user@example.com",
          },
          password: {
            type: "string",
            minLength: 6,
            example: "password123",
          },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          session: {
            type: "object",
            properties: {
              access_token: {
                type: "string",
              },
              user: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                  },
                  email: {
                    type: "string",
                  },
                },
              },
            },
          },
        },
      },
      CreateItemRequest: {
        type: "object",
        required: ["name", "description", "status"],
        properties: {
          name: {
            type: "string",
            example: "Sample Item",
          },
          description: {
            type: "string",
            example: "This is a sample item description",
          },
          status: {
            type: "string",
            enum: ["active", "inactive", "pending"],
            example: "active",
          },
          category: {
            type: "string",
            example: "electronics",
          },
          quantity: {
            type: "number",
            minimum: 0,
            example: 10,
          },
        },
      },
      DataItem: {
        type: "object",
        properties: {
          id: {
            type: "string",
          },
          name: {
            type: "string",
          },
          description: {
            type: "string",
          },
          status: {
            type: "string",
          },
          category: {
            type: "string",
          },
          quantity: {
            type: "number",
          },
          user_id: {
            type: "string",
          },
          created_at: {
            type: "string",
            format: "date-time",
          },
          updated_at: {
            type: "string",
            format: "date-time",
          },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: {
            type: "string",
          },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check endpoint",
        description: "Check if the API is running",
        responses: {
          "200": {
            description: "API is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: {
                      type: "string",
                      example: "ok",
                    },
                    timestamp: {
                      type: "string",
                      format: "date-time",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "User login",
        description: "Authenticate user with email and password",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/LoginRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Login successful",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AuthResponse",
                },
              },
            },
          },
          "401": {
            description: "Authentication failed",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Authentication"],
        summary: "User logout",
        description: "Log out the current user",
        security: [
          {
            bearerAuth: [],
          },
        ],
        responses: {
          "200": {
            description: "Logout successful",
          },
          "500": {
            description: "Logout failed",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
    "/auth/session": {
      get: {
        tags: ["Authentication"],
        summary: "Get current session",
        description: "Get the current user session",
        responses: {
          "200": {
            description: "Session retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AuthResponse",
                },
              },
            },
          },
          "500": {
            description: "Session check failed",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
    "/data": {
      get: {
        tags: ["Data"],
        summary: "Get all data items",
        description: "Retrieve all data items for the authenticated user",
        security: [
          {
            bearerAuth: [],
          },
        ],
        responses: {
          "200": {
            description: "Data retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/DataItem",
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "500": {
            description: "Failed to fetch data",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Data"],
        summary: "Create a new data item",
        description: "Create a new data item for the authenticated user",
        security: [
          {
            bearerAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CreateItemRequest",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Item created successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/DataItem",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "500": {
            description: "Failed to create item",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
    "/data/{id}": {
      put: {
        tags: ["Data"],
        summary: "Update a data item",
        description: "Update an existing data item",
        security: [
          {
            bearerAuth: [],
          },
        ],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
            description: "The ID of the item to update",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CreateItemRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Item updated successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/DataItem",
                },
              },
            },
          },
          "400": {
            description: "Item ID required",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "500": {
            description: "Failed to update item",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Data"],
        summary: "Delete a data item",
        description: "Delete an existing data item",
        security: [
          {
            bearerAuth: [],
          },
        ],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
            description: "The ID of the item to delete",
          },
        ],
        responses: {
          "200": {
            description: "Item deleted successfully",
          },
          "400": {
            description: "Item ID required",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "500": {
            description: "Failed to delete item",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
  },
};

export default swaggerSpec;
