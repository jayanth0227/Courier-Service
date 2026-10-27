// Unified API client for Courier & Bus Dispatch Management System

const API_BASE = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('courier_token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !response.url?.includes('/auth/login')) {
      // Signal cross-tab auth state invalidation without broadcasting any credentials
      try {
        if (typeof window !== 'undefined' && window.BroadcastChannel) {
          const channel = new BroadcastChannel('courier_auth_sync_channel');
          channel.postMessage({ type: 'SESSION_REVOKED', timestamp: Date.now() });
          channel.close();
        }
      } catch {}
    }
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.code = data.code;
    throw err;
  }
  return data;
};

export const api = {
  // Auth API
  auth: {
    login: async (credentials) => {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      return handleResponse(res);
    },
    logout: async () => {
      const res = await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getMe: async () => {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getUsers: async () => {
      const res = await fetch(`${API_BASE}/auth/users`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    createUser: async (userData) => {
      const res = await fetch(`${API_BASE}/auth/users`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(userData),
      });
      return handleResponse(res);
    },
    updateUser: async (id, userData) => {
      const res = await fetch(`${API_BASE}/auth/users/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(userData),
      });
      return handleResponse(res);
    },
    deleteUser: async (id) => {
      const res = await fetch(`${API_BASE}/auth/users/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    changePassword: async (passwords) => {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(passwords),
      });
      return handleResponse(res);
    },
    resetStaffPassword: async (id, newPassword) => {
      const res = await fetch(`${API_BASE}/auth/users/${id}/reset-password`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ newPassword }),
      });
      return handleResponse(res);
    },
    sendResetOtp: async ({ identifier }) => {
      const res = await fetch(`${API_BASE}/auth/forgot-password/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      return handleResponse(res);
    },
    verifyAndResetPassword: async ({ identifier, otp, newPassword }) => {
      const res = await fetch(`${API_BASE}/auth/forgot-password/verify-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, otp, newPassword }),
      });
      return handleResponse(res);
    },
    forgotPassword: async (payload) => {
      const res = await fetch(`${API_BASE}/auth/forgot-password/verify-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return handleResponse(res);
    },
  },

  // Bookings API
  bookings: {
    create: async (bookingData) => {
      const res = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(bookingData),
      });
      return handleResponse(res);
    },
    list: async (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE}/bookings?${queryString}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getById: async (id) => {
      const res = await fetch(`${API_BASE}/bookings/${id}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    update: async (id, data) => {
      const res = await fetch(`${API_BASE}/bookings/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    updateStatus: async (id, statusData) => {
      const res = await fetch(`${API_BASE}/bookings/${id}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(statusData),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await fetch(`${API_BASE}/bookings/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Bus Dispatch API
  dispatch: {
    getPending: async (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE}/dispatch/pending?${queryString}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    assignBus: async (dispatchData) => {
      const res = await fetch(`${API_BASE}/dispatch/assign`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(dispatchData),
      });
      return handleResponse(res);
    },
    getHistory: async (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE}/dispatch/history?${queryString}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Public Tracking API
  tracking: {
    trackByOrderId: async (orderId) => {
      const res = await fetch(`${API_BASE}/tracking/${orderId.trim()}`);
      return handleResponse(res);
    },
  },

  // Customers API
  customers: {
    list: async (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE}/customers?${queryString}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getById: async (id) => {
      const res = await fetch(`${API_BASE}/customers/${id}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Reports API
  reports: {
    getDashboardStats: async () => {
      const res = await fetch(`${API_BASE}/reports/dashboard-stats`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getDetailed: async (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE}/reports/detailed?${queryString}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getAnalytics: async (params = '7days') => {
      const queryParams = typeof params === 'string' ? { timeframe: params } : params;
      const queryString = new URLSearchParams(queryParams).toString();
      const res = await fetch(`${API_BASE}/reports/analytics?${queryString}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Settings API
  settings: {
    get: async () => {
      const res = await fetch(`${API_BASE}/settings`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    update: async (data) => {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
  },

  // Destinations & Delivery Details API
  destinations: {
    list: async () => {
      const res = await fetch(`${API_BASE}/destinations`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getById: async (id) => {
      const res = await fetch(`${API_BASE}/destinations/${id}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    create: async (data) => {
      const res = await fetch(`${API_BASE}/destinations`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    update: async (id, data) => {
      const res = await fetch(`${API_BASE}/destinations/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await fetch(`${API_BASE}/destinations/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Cities & Locations API (From & To Destinations)
  cities: {
    list: async () => {
      const res = await fetch(`${API_BASE}/cities`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getById: async (id) => {
      const res = await fetch(`${API_BASE}/cities/${id}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    create: async (data) => {
      const res = await fetch(`${API_BASE}/cities`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    update: async (id, data) => {
      const res = await fetch(`${API_BASE}/cities/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await fetch(`${API_BASE}/cities/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    deleteLocation: async (id, location) => {
      const res = await fetch(`${API_BASE}/cities/${id}/locations`, {
        method: 'DELETE',
        headers: getHeaders(),
        body: JSON.stringify({ location }),
      });
      return handleResponse(res);
    },
  },

  // Parcel Types API (Persisted in MongoDB)
  parcelTypes: {
    list: async () => {
      const res = await fetch(`${API_BASE}/parcel-types`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getById: async (id) => {
      const res = await fetch(`${API_BASE}/parcel-types/${id}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    create: async (data) => {
      const res = await fetch(`${API_BASE}/parcel-types`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    update: async (id, data) => {
      const res = await fetch(`${API_BASE}/parcel-types/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await fetch(`${API_BASE}/parcel-types/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Notifications API
  notifications: {
    list: async (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE}/notifications?${queryString}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    resend: async (bookingId) => {
      const res = await fetch(`${API_BASE}/notifications/resend/${bookingId}`, {
        method: 'POST',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // System & Company Settings API
  settings: {
    get: async () => {
      const res = await fetch(`${API_BASE}/settings`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getPublic: async () => {
      const res = await fetch(`${API_BASE}/settings/public`);
      return handleResponse(res);
    },
    update: async (data) => {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
  },

  // Buses & Fleet API
  buses: {
    list: async (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE}/buses?${queryString}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getById: async (id) => {
      const res = await fetch(`${API_BASE}/buses/${id}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    create: async (data) => {
      const res = await fetch(`${API_BASE}/buses`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    update: async (id, data) => {
      const res = await fetch(`${API_BASE}/buses/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await fetch(`${API_BASE}/buses/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Drivers & Crew API
  drivers: {
    list: async (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE}/drivers?${queryString}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getById: async (id) => {
      const res = await fetch(`${API_BASE}/drivers/${id}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    create: async (data) => {
      const res = await fetch(`${API_BASE}/drivers`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    update: async (id, data) => {
      const res = await fetch(`${API_BASE}/drivers/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await fetch(`${API_BASE}/drivers/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // SaaS Super Admin API
  superadmin: {
    getStats: async () => {
      const res = await fetch(`${API_BASE}/superadmin/stats`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getTenants: async () => {
      const res = await fetch(`${API_BASE}/superadmin/tenants`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    createTenant: async (data) => {
      const res = await fetch(`${API_BASE}/superadmin/tenants`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    getTenantById: async (id) => {
      const res = await fetch(`${API_BASE}/superadmin/tenants/${id}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    updateTenant: async (id, data) => {
      const res = await fetch(`${API_BASE}/superadmin/tenants/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    deleteTenant: async (id) => {
      const res = await fetch(`${API_BASE}/superadmin/tenants/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    resetPassword: async (id, newPassword) => {
      const res = await fetch(`${API_BASE}/superadmin/tenants/${id}/reset-password`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ newPassword }),
      });
      return handleResponse(res);
    },
    impersonate: async (id) => {
      const res = await fetch(`${API_BASE}/superadmin/tenants/${id}/impersonate`, {
        method: 'POST',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getTenantWhatsApp: async (id) => {
      const res = await fetch(`${API_BASE}/superadmin/tenants/${id}/whatsapp`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    updateTenantWhatsApp: async (id, data) => {
      const res = await fetch(`${API_BASE}/superadmin/tenants/${id}/whatsapp`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    testTenantWhatsApp: async (id, data) => {
      const res = await fetch(`${API_BASE}/superadmin/tenants/${id}/test-whatsapp`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    getSettings: async () => {
      const res = await fetch(`${API_BASE}/superadmin/settings`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    updateSettings: async (data) => {
      const res = await fetch(`${API_BASE}/superadmin/settings`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    resetCmsDefaults: async () => {
      const res = await fetch(`${API_BASE}/superadmin/settings/reset-defaults`, {
        method: 'POST',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    sendTenantCredentials: async (id, data = {}) => {
      const res = await fetch(`${API_BASE}/superadmin/tenants/${id}/send-credentials`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    testSmtp: async () => {
      const res = await fetch(`${API_BASE}/superadmin/test-smtp`, {
        method: 'POST',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Security Audit Logs API
  auditLogs: {
    list: async (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE}/audit-logs?${queryString}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getActions: async () => {
      const res = await fetch(`${API_BASE}/audit-logs/actions`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Inquiries & Leads API
  inquiries: {
    create: async (data) => {
      const res = await fetch(`${API_BASE}/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    list: async () => {
      const res = await fetch(`${API_BASE}/inquiries`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    update: async (id, data) => {
      const res = await fetch(`${API_BASE}/inquiries/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
  },
};


