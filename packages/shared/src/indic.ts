/**
 * Zero-dependency Unicode Indic-to-Latin phonetic transliterator covering:
 * Devanagari (Hindi/Marathi), Bengali, Gurmukhi (Punjabi), Gujarati,
 * Tamil, Telugu, Kannada, and Malayalam + Indic decimal digits.
 */

const SCRIPT_BASES = [
  0x0900, // Devanagari (hi, mr)
  0x0980, // Bengali (bn)
  0x0a00, // Gurmukhi (pa)
  0x0a80, // Gujarati (gu)
  0x0b00, // Oriya (or)
  0x0b80, // Tamil (ta)
  0x0c00, // Telugu (te)
  0x0c80, // Kannada (kn)
  0x0d00 // Malayalam (ml)
] as const;

const OFFSET_VOWELS: Record<number, string> = {
  0x05: "a",
  0x06: "a",
  0x07: "i",
  0x08: "i",
  0x09: "u",
  0x0a: "u",
  0x0b: "ri",
  0x0e: "e",
  0x0f: "e",
  0x10: "ai",
  0x12: "o",
  0x13: "o",
  0x14: "au"
};

const OFFSET_MATRAS: Record<number, string> = {
  0x3e: "a",
  0x3f: "i",
  0x40: "i",
  0x41: "u",
  0x42: "u",
  0x43: "ri",
  0x46: "e",
  0x47: "e",
  0x48: "ai",
  0x4a: "o",
  0x4b: "o",
  0x4c: "au"
};

const OFFSET_CONSONANTS: Record<number, string> = {
  0x15: "k",
  0x16: "kh",
  0x17: "g",
  0x18: "gh",
  0x19: "ng",
  0x1a: "ch",
  0x1b: "chh",
  0x1c: "j",
  0x1d: "jh",
  0x1e: "ny",
  0x1f: "t",
  0x20: "th",
  0x21: "d",
  0x22: "dh",
  0x23: "n",
  0x24: "t",
  0x25: "th",
  0x26: "d",
  0x27: "dh",
  0x28: "n",
  0x29: "n",
  0x2a: "p",
  0x2b: "ph",
  0x2c: "b",
  0x2d: "bh",
  0x2e: "m",
  0x2f: "y",
  0x30: "r",
  0x31: "r",
  0x32: "l",
  0x33: "l",
  0x34: "l",
  0x35: "v",
  0x36: "sh",
  0x37: "sh",
  0x38: "s",
  0x39: "h",
  0x58: "q",
  0x59: "kh",
  0x5a: "g",
  0x5b: "z",
  0x5c: "d",
  0x5d: "dh",
  0x5e: "f",
  0x5f: "y"
};

const SPECIAL_INDIC_CHARS: Record<number, string> = {
  // Bengali Khanda Ta
  0x09ce: "t",
  // Gurmukhi Tippi / Addak / special consonants
  0x0a70: "n",
  0x0a71: "",
  0x0a72: "i",
  0x0a73: "u",
  0x0a59: "kh",
  0x0a5a: "g",
  0x0a5b: "z",
  0x0a5c: "r",
  0x0a5e: "f",
  // Malayalam Chillu forms
  0x0d7a: "n",
  0x0d7b: "n",
  0x0d7c: "r",
  0x0d7d: "l",
  0x0d7e: "l",
  0x0d7f: "k"
};

function getIndicScriptInfo(code: number): { base: number; offset: number } | null {
  for (const base of SCRIPT_BASES) {
    if (code >= base && code <= base + 0x7f) {
      return { base, offset: code - base };
    }
  }
  return null;
}

function transliterateWord(word: string): string {
  const chars = Array.from(word);
  let out = "";

  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i] ?? "";
    const code = ch.codePointAt(0) ?? 0;

    if (SPECIAL_INDIC_CHARS[code] !== undefined) {
      out += SPECIAL_INDIC_CHARS[code];
      continue;
    }

    const info = getIndicScriptInfo(code);
    if (!info) {
      out += ch;
      continue;
    }

    const { base, offset } = info;

    // Indic decimal digits (0x66..0x6F in all Indic Unicode blocks)
    if (offset >= 0x66 && offset <= 0x6f) {
      out += String(offset - 0x66);
      continue;
    }

    // Nukta (0x3C) and Chandrabindu/Anusvara/Visarga
    if (offset === 0x3c) {
      continue;
    }
    if (offset === 0x01 || offset === 0x02) {
      const isSouthScript = base === 0x0c00 || base === 0x0c80 || base === 0x0d00;
      out += isSouthScript && i === chars.length - 1 ? "m" : "n";
      continue;
    }
    if (offset === 0x03) {
      out += "h";
      continue;
    }

    if (OFFSET_VOWELS[offset] !== undefined) {
      out += OFFSET_VOWELS[offset];
      continue;
    }

    if (OFFSET_MATRAS[offset] !== undefined) {
      out += OFFSET_MATRAS[offset];
      continue;
    }

    if (offset === 0x4d) {
      // Virama/Halant suppresses implicit vowel (handled by lookahead below)
      continue;
    }

    let consonant = OFFSET_CONSONANTS[offset];
    if (consonant !== undefined) {
      const nextCode = chars[i + 1]?.codePointAt(0);
      const nextInfo = nextCode !== undefined ? getIndicScriptInfo(nextCode) : null;
      const nextOffset = nextInfo?.offset;

      // Decomposed nukta sequences (e.g. Gurmukhi ਸ + ਼ -> sh, ਜ + ਼ -> z, ਫ + ਼ -> f)
      if (nextOffset === 0x3c) {
        if (offset === 0x38) consonant = "sh";
        else if (offset === 0x1c) consonant = "z";
        else if (offset === 0x2b) consonant = "f";
      }

      // Tamil intervocalic ச (0x0B9A) softens to 's' when not word-initial or geminated
      if (base === 0x0b80 && offset === 0x1a && i > 0) {
        const prevCode = chars[i - 1]?.codePointAt(0);
        const prevInfo = prevCode !== undefined ? getIndicScriptInfo(prevCode) : null;
        if (prevInfo?.offset !== 0x4d) {
          consonant = "s";
        }
      }

      out += consonant;

      // Skip implicit 'a' if followed by matra, virama, or end of multi-char word
      const afterNuktaCode = nextOffset === 0x3c ? chars[i + 2]?.codePointAt(0) : nextCode;
      const afterNuktaInfo = afterNuktaCode !== undefined ? getIndicScriptInfo(afterNuktaCode) : null;
      const effNextOffset = afterNuktaInfo?.offset;

      const hasExplicitVowelOrHalant =
        effNextOffset !== undefined &&
        (OFFSET_MATRAS[effNextOffset] !== undefined || effNextOffset === 0x4d);

      const isEndOfWord = nextOffset === 0x3c ? i + 1 === chars.length - 1 : i === chars.length - 1;
      if (!hasExplicitVowelOrHalant && !isEndOfWord) {
        out += "a";
      } else if (isEndOfWord && chars.length === 1) {
        out += "a";
      }
      continue;
    }

    // Punctuation like Danda (0x0964) -> space
    if (offset === 0x64 || offset === 0x65) {
      out += " ";
    }
  }

  return out;
}

/**
 * Transliterates mixed Indian-script text (Hindi, Marathi, Gujarati, Punjabi,
 * Tamil, Telugu, Malayalam, Bengali, Kannada) into lowercase Latin phonetic text.
 */
export function transliterateIndicToLatin(input: string): string {
  return input
    .normalize("NFC")
    .trim()
    .split(/(\s+|[,.।|!?]+)/)
    .map((segment) => {
      if (!segment || /^(\s+|[,.।|!?]+)$/.test(segment)) {
        return segment === "।" || segment === "|" ? " " : segment;
      }
      return transliterateWord(segment);
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
