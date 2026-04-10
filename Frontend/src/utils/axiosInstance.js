import axios from "axios";
import { BASE_URL } from "./apiPath";

const axiosInstance = axios.create({
  baseURL: BASE_URL,        // FIXED (baseURL, not baseUrl)
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",   // FIXED (removed space)
    Accept: "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("token");
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;  // FIXED
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      if (error.response.status === 401) {
        window.location.href = "/login";
      } else if (error.response.status === 500) {
        console.error("Server Error, Please Try Again Later");
      }
    } else if (error.code === "ECONNABORTED") {
      console.error("Request Timeout, Please Try Again Later");
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
