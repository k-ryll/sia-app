export const API_CONFIG = {
  BASE_URL: "http://72.60.194.243:8000", // <- deployed backend
  ENDPOINTS: {
    TRANSLATE: "/translate/",
    LANGUAGES: "/languages",
    MESSAGES: '/messages',  
  }
};

export function getApiUrl(endpoint) {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
}
