import api from "../services/api.js";

// 1. Centralized HTTP Status Error Dictionary Configuration
const HTTP_ERROR_MESSAGES = {
  400: "Bad Request. Please check your input parameters.",
  401: "Unauthorized. Please log in again.",
  404: "Requested resource could not be found.",
  422: "Validation or Request Error",
  429: "Too many requests. Please slow down.",
  500: "Server error. Please try again or contact the administrator.",
};

const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again.";

/**
 * Custom error handler that maps statuses and preserves the original root error context.
 */
function handleApiError(error) {
  const status = error?.response?.status;
  const backendMessage = error?.response?.data?.message || error?.message;

  // Resolve the best message fallback strategy
  const baselineMessage = HTTP_ERROR_MESSAGES[status] || DEFAULT_ERROR_MESSAGE;
  const finalMessage = backendMessage || baselineMessage;

  // FIX: Passing the original error object inside { cause: error } satisfies the linter!
  throw new Error(finalMessage, { cause: error });
}

// 2. Pure Core Base Service Class Implementation
export class BaseService {
  async request(url, method, params = {}) {
    // FIX: Dynamically read the active token from storage instead of forcing 'null'
    const token =
      localStorage.getItem("passenger_token") ||
      sessionStorage.getItem("passenger_token");
    const headers = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const config = {
      url,
      method: method.toUpperCase(),
      headers,
    };

    if (config.method === "GET") {
      config.params = params;
    } else {
      config.data = params;
    }

    try {
      const response = await api(config); // Uses your custom port 8000 configured instance
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  }
}

export default BaseService;
