import type { AngelTick } from "./types.js";

function readString(buffer: Buffer, start: number, length: number) {
  return buffer
    .subarray(start, start + length)
    .toString("utf8")
    .replace(/\0/g, "")
    .trim();
}

export function decodeAngelTick(buffer: Buffer): AngelTick | null {
  try {
    const token = readString(buffer, 2, 25);

    const sequenceNumber = buffer.readBigInt64LE(27).toString();

    const exchangeTimestamp = Number(buffer.readBigInt64LE(35));

    /**
     * Angel sends price in paise/multiplied by 100.
     * Example:
     * 2413050 => 24130.50
     */
    const ltp = Number(buffer.readBigInt64LE(43)) / 100;

    return {
      token,
      sequenceNumber,
      exchangeTimestamp,
      ltp,
    };
  } catch {
    return null;
  }
}
