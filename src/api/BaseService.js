import api from "../services/api.js";

const HTTP_ERROR_MESSAGES = {
  400: "Bad Request. Please check your input parameters.",
  401: "Unauthorized. Please log in again.",
  404: "Requested resource could not be found.",
  422: "Validation or Request Error",
  429: "Too many requests. Please slow down.",
  500: "Server error. Please try again or contact the administrator.",
};

const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again.";

function handleApiError(error) {
  const status = error?.response?.status;
  const responseData = error?.response?.data;

  if (status === 422 && responseData?.errors) {
    const firstErrors = Object.values(responseData.errors)[0];
    const fieldMessage = Array.isArray(firstErrors) ? firstErrors[0] : firstErrors;
    throw new Error(fieldMessage, { cause: error });
  }

  const backendMessage = responseData?.message || error?.message;
  const baselineMessage = HTTP_ERROR_MESSAGES[status] || DEFAULT_ERROR_MESSAGE;
  const finalMessage = backendMessage || baselineMessage;

  throw new Error(finalMessage, { cause: error });
}

export class BaseService {
  /**
   * @param {string} tokenKey - storage key for this service's auth token.
   */
  constructor(tokenKey = "passenger_token") {
    this.tokenKey = tokenKey;
  }

  async request(url, method, params = {}) {
    const token =
      localStorage.getItem(this.tokenKey) ||
      sessionStorage.getItem(this.tokenKey);

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
      const response = await api(config);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  }
}

export default BaseService;
