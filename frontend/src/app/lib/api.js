import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';
const REQUEST_TIMEOUT = 10000;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
});

apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token && !config.headers?.Authorization) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const buildError = (error, fallbackMessage) => {
  if (axios.isAxiosError(error)) {
    const responseMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      (typeof error.response?.data === 'string' ? error.response.data : null);

    if (responseMessage) {
      return new Error(responseMessage);
    }

    if (error.code === 'ECONNABORTED') {
      return new Error(`${fallbackMessage}. The request timed out.`);
    }

    if (!error.response) {
      return new Error(`${fallbackMessage}. Unable to reach the server.`);
    }
  }

  return error instanceof Error ? error : new Error(fallbackMessage);
};

export async function loginUser({ username, password }) {
  try {
    const res = await apiClient.post('/login', {
      username,
      password,
    });
    return res.data;
  } catch (error) {
    throw buildError(error, 'Unable to log in');
  }
}

export async function logoutUser(refreshToken) {
  try {
    await apiClient.post(
      '/logout',
      { refreshToken }
    );
  } catch (error) {
    throw buildError(error, 'Unable to log out');
  }
}

export async function fetchWordpressSites() {
  try {
    const res = await apiClient.get('/wp/site');
    return res.data?.data || [];
  } catch (error) {
    throw buildError(error, 'Unable to load WordPress sites');
  }
}

export { apiClient, API_BASE_URL };
