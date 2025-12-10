export const generateUUID = (): string => {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => {
    const gCrypto = globalThis.crypto;
    if (!gCrypto?.getRandomValues) {
      const n2 = Number(c);
      return (n2 ^ ((Math.random() * 16) >> (n2 / 4))).toString(16);
    }
    const arr = gCrypto.getRandomValues(new Uint8Array(1));
    const byte = arr[0];
    const n = Number(c);
    return (n ^ ((byte & 15) >> (n / 4))).toString(16);
  });
};

export const generateRequestId = (): string => {
  const gCrypto = globalThis.crypto;
  if (gCrypto?.randomUUID) {
    return gCrypto.randomUUID();
  }
  return generateUUID();
};
