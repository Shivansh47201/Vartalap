import TranslationService from "../services/translation.service.js";

export const translateText = async (req, res) => {
  try {
    const { text, targetLanguage } = req.body || {};
    if (!text || !targetLanguage) {
      return res
        .status(400)
        .json({ success: false, message: "text and targetLanguage are required" });
    }

    const translated = await TranslationService.translateText(
      text,
      targetLanguage
    );

    return res.status(200).json({ success: true, text: translated });
  } catch (error) {
    console.error("translateText error", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Unable to translate text",
    });
  }
};
