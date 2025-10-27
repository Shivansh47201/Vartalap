import translate from "@vitalets/google-translate-api";

const LANGUAGE_ALIASES = {
  "en": "en",
  "en-us": "en",
  "en-gb": "en",
  "en-in": "en",
  "hi": "hi",
  "ta": "ta",
  "te": "te",
  "kn": "kn",
  "bn": "bn",
  "gu": "gu",
  "ml": "ml",
  "mr": "mr",
  "zh": "zh-CN",
  "zh-cn": "zh-CN",
  "ja": "ja",
  "ru": "ru",
  "de": "de",
};

const normalizeLanguage = (input) => {
  if (!input) return "en";
  const key = input.toLowerCase();
  return LANGUAGE_ALIASES[key] || key.split("-")[0] || "en";
};

class TranslationService {
  async translateText(text, targetLanguage) {
    if (!text || typeof text !== "string") return text;
    const normalizedTarget = normalizeLanguage(targetLanguage);
    if (!normalizedTarget || normalizedTarget === "en") {
      return text;
    }

    try {
      const response = await translate(text, {
        to: normalizedTarget,
      });
      return response?.text || text;
    } catch (error) {
      console.error("Translation failed", error?.message || error);
      return text;
    }
  }
}

export default new TranslationService();
