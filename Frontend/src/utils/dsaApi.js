import axiosInstance from './axiosInstance'

// Keep existing authentication/interceptors. This optional override allows the
// new DSA backend to run locally while other features use the hosted API.
const baseURL = import.meta.env.VITE_DSA_API_URL?.trim()
const config = options => baseURL ? { ...options, baseURL } : options
const dsaApi = {
  get: (url, options) => axiosInstance.get(url, config(options)),
  put: (url, body, options) => axiosInstance.put(url, body, config(options)),
  post: (url, body, options) => axiosInstance.post(url, body, config(options)),
}
export default dsaApi
