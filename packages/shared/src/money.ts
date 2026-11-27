/**
 * Convert rupees (e.g., 12.50) into exact integer paise (1250) to prevent floating-point drift.
 */
export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees) || rupees < 0) {
    throw new RangeError(`Invalid rupee amount: ${rupees}`);
  }
  return Math.round(rupees * 100);
}

/**
 * Format integer paise into standard INR string (e.g., 1250 -> "12.50").
 */
export function formatPaiseAsRupees(paise: number): string {
  if (!Number.isInteger(paise)) {
    throw new RangeError(`Paise must be an integer: ${paise}`);
  }
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}${whole}.${frac}`;
}

/**
 * Back-calculate MRP-inclusive GST split in integer paise (legal Indian retail default).
 */
export function splitMrpInclusiveTax(mrpPaise: number, gstPercent: number): {
  basePaise: number;
  taxPaise: number;
} {
  if (!Number.isInteger(mrpPaise) || mrpPaise < 0) {
    throw new RangeError(`Invalid MRP paise: ${mrpPaise}`);
  }
  if (gstPercent < 0 || gstPercent > 100) {
    throw new RangeError(`Invalid GST rate: ${gstPercent}`);
  }
  if (gstPercent === 0) {
    return { basePaise: mrpPaise, taxPaise: 0 };
  }
  const basePaise = Math.round((mrpPaise * 100) / (100 + gstPercent));
  return {
    basePaise,
    taxPaise: mrpPaise - basePaise
  };
}
