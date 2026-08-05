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

function handleApiError(error, tokenKey) {
  const status = error?.response?.status;
  const responseData = error?.response?.data;

  // Auto-clear stale token on 401 so the user gets redirected to login
  if (status === 401 && tokenKey) {
    localStorage.removeItem(tokenKey);
    sessionStorage.removeItem(tokenKey);
  }

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
    const localToken = localStorage.getItem(this.tokenKey);
    const sessionToken = sessionStorage.getItem(this.tokenKey);

    // Staff token recovery: session token is usually from the most recent login.
    // If both storages hold different values, prefer session and normalize both.
    if (this.tokenKey === 'staff_token' && sessionToken && localToken && sessionToken !== localToken) {
      localStorage.setItem(this.tokenKey, sessionToken);
    }

    const token = sessionToken || localToken;

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
      // Staff role-token mismatch recovery: if first attempt used local token and
      // backend returned role-based 403, retry once with session token.
      const status = error?.response?.status;
      const message = String(error?.response?.data?.message || '').toLowerCase();
      const canRetryWithSession =
        this.tokenKey === 'staff_token' &&
        status === 403 &&
        message.includes('access denied') &&
        !!sessionToken &&
        !!localToken &&
        sessionToken !== localToken &&
        token === localToken;

      if (canRetryWithSession) {
        const retryConfig = {
          ...config,
          headers: {
            ...headers,
            Authorization: `Bearer ${sessionToken}`,
          },
        };

        try {
          const retryResponse = await api(retryConfig);
          localStorage.setItem(this.tokenKey, sessionToken);
          return retryResponse.data;
        } catch (retryError) {
          handleApiError(retryError, this.tokenKey);
        }
      }

      handleApiError(error, this.tokenKey);
    }
  }
}

export default BaseService;
