export const getBaseUrl = () => {
  if (process.env.NODE_ENV === "production") {
    return "https://***REMOVED***/api";
  } else {
    return `http://localhost:${BACKEND_PORT}/api`;
  }
};

export const ANIMATION_TIME_3_MS = "0.3s";
const BACKEND_PORT = 3000;
export const GOOGLE = "google";
export const API_BASEURL = getBaseUrl();
