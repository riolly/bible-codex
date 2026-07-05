/**
 * Client-generated UUID identity for every user row (ADR-0011). UUIDv7 layout:
 * a 48-bit big-endian millisecond timestamp then 74 random bits, so ids are
 * globally unique AND time-sortable — a free `ORDER BY id` for sync merge and
 * cheap debugging.
 *
 * Randomness is `Math.random` (no native `crypto` dependency in the RN runtime):
 * enough for single-device identity, and the timestamp prefix guarantees no
 * cross-time collision. If a hardware RNG is wired in later, only this file
 * changes.
 */

function rndHex(n: number): string {
  let out = '';
  for (let i = 0; i < n; i++) out += Math.floor(Math.random() * 16).toString(16);
  return out;
}

export function uuidv7(): string {
  const ms = Date.now();
  // 48-bit timestamp → 12 hex chars, big-endian.
  const ts = ms.toString(16).padStart(12, '0').slice(-12);
  const timeHigh = ts.slice(0, 8);
  const timeLow = ts.slice(8, 12);
  // version 7 nibble + 3 random; variant (8..b) + 3 random; 12 random.
  const verRand = '7' + rndHex(3);
  const variant = ((8 + Math.floor(Math.random() * 4)).toString(16)) + rndHex(3);
  const tail = rndHex(12);
  return `${timeHigh}-${timeLow}-${verRand}-${variant}-${tail}`;
}
