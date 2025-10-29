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

const toWordpressPayload = (site) => ({
  name: site.name,
  url: site.url,
  logo: site.logo,
  wordpressVersion: site.wordpressVersion,
  status: site.status,
  theme:
    site.theme && typeof site.theme === 'object'
      ? site.theme
      : { name: '', version: '' },
  plugins: Array.isArray(site.plugins) ? site.plugins : [],
  maintenanceNotes: site.maintenanceNotes,
  isConfirmed: Boolean(site.isConfirmed),
  lastChecked: site.lastChecked,
});

const unwrapSiteResponse = (res) => {
  if (!res?.data) {
    return null;
  }

  const { data } = res.data;
  if (Array.isArray(data)) {
    return data[0] || null;
  }

  return data ?? null;
};

export async function createWordpressSite(site) {
  try {
    const payload = toWordpressPayload(site);
    const res = await apiClient.post('/wp/create', payload);
    return unwrapSiteResponse(res);
  } catch (error) {
    throw buildError(error, 'Unable to create WordPress site');
  }
}

export async function updateWordpressSite(id, site) {
  try {
    const payload = toWordpressPayload(site);
    const res = await apiClient.put(`/wp/edit/${id}`, payload);
    return unwrapSiteResponse(res);
  } catch (error) {
    throw buildError(error, 'Unable to update WordPress site');
  }
}

export async function deleteWordpressSite(id) {
  try {
    await apiClient.delete(`/wp/del/${id}`);
  } catch (error) {
    throw buildError(error, 'Unable to delete WordPress site');
  }
}

const toSupportpalPayload = (site) => ({
  name: site.name,
  url: site.url,
  logo: site.logo,
  status: site.status,
  versions:
    site.versions && typeof site.versions === 'object'
      ? site.versions
      : {
          nginx: '',
          php: '',
          mariadb: '',
          supportpal: '',
        },
  maintenanceNotes: site.maintenanceNotes,
  isConfirmed: Boolean(site.isConfirmed),
  lastChecked: site.lastChecked,
});

export async function fetchSupportpalSites() {
  try {
    const res = await apiClient.get('/sp/site');
    return res.data?.data || [];
  } catch (error) {
    throw buildError(error, 'Unable to load SupportPal sites');
  }
}

export async function createSupportpalSite(site) {
  try {
    const payload = toSupportpalPayload(site);
    const res = await apiClient.post('/sp/create', payload);
    return unwrapSiteResponse(res);
  } catch (error) {
    throw buildError(error, 'Unable to create SupportPal site');
  }
}

export async function updateSupportpalSite(id, site) {
  try {
    const payload = toSupportpalPayload(site);
    const res = await apiClient.put(`/sp/edit/${id}`, payload);
    return unwrapSiteResponse(res);
  } catch (error) {
    throw buildError(error, 'Unable to update SupportPal site');
  }
}

export async function deleteSupportpalSite(id) {
  try {
    await apiClient.delete(`/sp/del/${id}`);
  } catch (error) {
    throw buildError(error, 'Unable to delete SupportPal site');
  }
}

export { apiClient, API_BASE_URL };
