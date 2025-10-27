import { axiosInstance } from "../components/utilities/axiosInsatnce";

const cache = new Map();

const normalizeLanguage = (language) => {
  if (!language) return "en";
  return language.toLowerCase();
};

export const translateText = async (text, targetLanguage) => {
  if (!text || typeof text !== "string") return text;
  const normalizedLang = normalizeLanguage(targetLanguage);
  if (!normalizedLang || normalizedLang.startsWith("en")) {
    return text;
  }

  const cacheKey = `${normalizedLang}|${text}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const response = await axiosInstance.post("/utils/translate", {
      text,
      targetLanguage: normalizedLang,
    });
    const translated = response?.data?.text || text;
    cache.set(cacheKey, translated);
    return translated;
  } catch (error) {
    console.error("translateText failed", error);
    return text;
  }
};

export const clearTranslationCache = () => {
  cache.clear();
};
