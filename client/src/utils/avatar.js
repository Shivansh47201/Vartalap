import { apiOrigin } from "../components/utilities/axiosInsatnce";

const DEFAULT_AVATAR_URL = "https://img.daisyui.com/images/profile/demo/spiderperson@192.webp";

let cachedBaseOrigin = null;

const computeBaseOrigin = () => {
  if (cachedBaseOrigin !== null) return cachedBaseOrigin;

  const explicitBase = import.meta?.env?.VITE_DB_URL;

  if (explicitBase) {
    try {
      const base = typeof window !== "undefined" ? window.location.origin : undefined;
      const parsed = new URL(explicitBase, base);
      cachedBaseOrigin = parsed.origin;
      return cachedBaseOrigin;
    } catch {
      cachedBaseOrigin = explicitBase;
      return cachedBaseOrigin;
    }
  }

  if (apiOrigin) {
    cachedBaseOrigin = apiOrigin;
    return cachedBaseOrigin;
  }

  if (typeof window !== "undefined") {
    cachedBaseOrigin = window.location.origin;
    return cachedBaseOrigin;
  }

  cachedBaseOrigin = "";
  return cachedBaseOrigin;
};

export const normalizeMediaUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== "string") return rawUrl;

  const trimmed = rawUrl.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("data:")) return trimmed;
  if (trimmed.startsWith("blob:")) return trimmed;

  if (/^\/?uploads\//.test(trimmed) || trimmed.startsWith("/uploads")) {
    const origin = computeBaseOrigin();
    const fileName = trimmed.split("/").pop();
    const encoded = encodeURIComponent(fileName || "");
    return `${origin}/api/v1/uploads/files/${encoded}`;
  }

  const base = computeBaseOrigin();

  try {
    const parsed = new URL(trimmed, base || undefined);

    if (typeof window !== "undefined") {
      const { hostname, protocol, port } = window.location;
      const isLocalHostName = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"].includes(parsed.hostname);

      if (isLocalHostName) {
        parsed.hostname = hostname;

        if (!parsed.port && port) {
          parsed.port = port;
        }

        if (parsed.protocol === "http:" && protocol === "https:") {
          parsed.protocol = "https:";
        }
      }
    }

    return parsed.toString();
  } catch {
    return trimmed;
  }
};

const dicebearAvatar = (seed, collection = "avataaars") => {
  if (!seed) return DEFAULT_AVATAR_URL;
  return `https://api.dicebear.com/6.x/${collection}/svg?seed=${encodeURIComponent(
    seed
  )}`;
};

export const resolveAvatarUrl = (user, seed, options = {}) => {
  const {
    preferDefaultFallback = false,
    defaultAvatar = DEFAULT_AVATAR_URL,
    dicebearCollection = "avataaars",
  } = options;

  const explicitAvatar =
    user?.avatar ||
    user?.profileImage ||
    user?.profilePic ||
    user?.photo ||
    user?.image;

  const normalizedExplicit =
    typeof explicitAvatar === "string" ? explicitAvatar.trim() : undefined;

  if (normalizedExplicit) return normalizeMediaUrl(normalizedExplicit);

  if (preferDefaultFallback) return defaultAvatar;

  const derivedSeed =
    seed || user?.username || user?.name || user?.email || "user";

  return dicebearAvatar(derivedSeed, dicebearCollection);
};

export const getDefaultAvatarUrl = () => DEFAULT_AVATAR_URL;
