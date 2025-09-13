export const API_CONFIG = {
  BASE_URL: "http://localhost:8000",
  ENDPOINTS: {
    TRANSLATE: "/translate/",   // ✅ no trailing slash
    LANGUAGES: "/languages"
  }
};

export function getApiUrl(endpoint) {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
}
