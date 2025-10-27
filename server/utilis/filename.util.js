export const normalizeFileName = (name) => {
  if (!name || typeof name !== "string") return name;

  const hasOnlyLatin1 = /^[\u0000-\u00FF]+$/.test(name);
  const hasSuspiciousBytes = /[\u0080-\u00FF]/.test(name);

  if (!hasOnlyLatin1 || !hasSuspiciousBytes) {
    return name;
  }

  try {
    const buffer = Buffer.from(name, "latin1");
    const decoded = buffer.toString("utf8");
    if (decoded && !decoded.includes("\uFFFD")) {
      return decoded;
    }
  } catch (error) {
    // swallow error and fall back to the original name
  }

  return name;
};

export default normalizeFileName;
