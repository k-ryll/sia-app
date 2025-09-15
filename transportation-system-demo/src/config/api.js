export const API_CONFIG = {
  BASE_URL: "https://gabaylakbay-backend.azurewebsites.net", // <- deployed backend
  ENDPOINTS: {
    TRANSLATE: "/translate/",
    LANGUAGES: "/languages",
    MESSAGES: '/messages',  
  }
};

export function getApiUrl(endpoint) {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
}
