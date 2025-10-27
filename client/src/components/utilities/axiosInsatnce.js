import axios from "axios";

const computeBaseUrl = () => {
  const explicit = import.meta.env.VITE_DB_URL;
  if (explicit) {
    try {
      const base = typeof window !== "undefined" ? window.location.origin : undefined;
      const parsed = new URL(explicit, base);

      if (typeof window !== "undefined") {
        const { hostname, protocol, port } = window.location;

        if (
          hostname &&
          ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"].includes(parsed.hostname)
        ) {
          parsed.hostname = hostname;
        }

        if (protocol === "https:" && parsed.protocol !== "https:") {
          parsed.protocol = "https:";
        }

        if (!parsed.port) {
          parsed.port = import.meta.env.VITE_API_PORT || port || "5050";
        }
      }

      return parsed.toString().replace(/\/$/, "");
    } catch {
      return explicit;
    }
  }

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol || "http:";
    const hostname = window.location.hostname || "localhost";
    const port = import.meta.env.VITE_API_PORT || "5050";
    const basePath = import.meta.env.VITE_API_BASE_PATH || "/api/v1/";
    return `${protocol}//${hostname}:${port}${basePath.startsWith("/") ? basePath : `/${basePath}`}`;
  }

  return "http://localhost:5050/api/v1/";
};

const baseURL = computeBaseUrl();

export const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

export const apiOrigin = (() => {
  try {
    return new URL(baseURL, typeof window !== "undefined" ? window.location.origin : undefined).origin;
  } catch {
    return baseURL;
  }
})();
