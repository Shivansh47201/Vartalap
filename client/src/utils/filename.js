const decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8", { fatal: false }) : null;

const shouldAttemptDecode = (value) => {
  if (!value || typeof value !== "string") return false;
  const hasNonAscii = /[\u0080-\u00FF]/.test(value);
  const hasHigherPlane = /[^\u0000-\u00FF]/.test(value);
  return hasNonAscii && !hasHigherPlane;
};

export const normalizeFilename = (value) => {
  if (!value || typeof value !== "string") return value;
  if (!decoder || !shouldAttemptDecode(value)) return value;

  try {
    const bytes = Uint8Array.from(Array.from(value, (ch) => ch.charCodeAt(0) & 0xff));
    const decoded = decoder.decode(bytes);
    if (decoded && !decoded.includes("\uFFFD")) {
      return decoded;
    }
  } catch (error) {
    // ignore and fall back to original
  }

  return value;
};

export default normalizeFilename;
