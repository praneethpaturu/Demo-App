import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import swaggerSpec from "../lib/swaggerConfig";

interface SwaggerUIComponentProps {
  className?: string;
}

export default function SwaggerUIComponent({
  className = "",
}: SwaggerUIComponentProps = {}) {
  return (
    <div className={`bg-white min-h-screen ${className}`}>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">API Documentation</h1>
        <p className="text-gray-600 mb-6">
          Interactive API documentation for the Web-API-DB Integration Test
          Suite
        </p>
      </div>
      <SwaggerUI
        spec={swaggerSpec}
        docExpansion="list"
        defaultModelsExpandDepth={2}
        defaultModelExpandDepth={2}
      />
    </div>
  );
}
