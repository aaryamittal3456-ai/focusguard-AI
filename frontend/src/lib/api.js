import axios from "axios";

const BACKEND_URL = 
  process.env.REACT_APP_BACKEND_URL || 
  "https://focusguard-ai-production.up.railway.app";

const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

export { api, API };
export default api;