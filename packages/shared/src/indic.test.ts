import { describe, expect, it } from "vitest";
import { transliterateIndicToLatin } from "./indic.js";

describe("Indic Unicode transliterator across major Indian scripts", () => {
  it("transliterates Hindi Devanagari including the live counter phrase", () => {
    const out = transliterateIndicToLatin("रमेश भाई के खाते में 2 किलो खान 20 रुपए किलो");
    expect(out).toContain("ramesh");
    expect(out).toContain("khate");
    expect(out).toContain("2 kilo khan 20 rupae kilo");
  });

  it("transliterates Gujarati, Marathi, and Punjabi", () => {
    expect(transliterateIndicToLatin("રમેશ 2 કિલો ખાંડ")).toContain("ramesh 2 kilo khand");
    expect(transliterateIndicToLatin("रमेश 2 किलो साखर")).toContain("ramesh 2 kilo sakhar");
    expect(transliterateIndicToLatin("ਰਮੇਸ਼ 2 ਕਿਲੋ ਖੰਡ")).toContain("ramesh 2 kilo khand");
  });

  it("transliterates Tamil, Telugu, Malayalam, Bengali, and Kannada", () => {
    expect(transliterateIndicToLatin("ரமேஷ் 2 கிலோ அரிசி")).toContain("ramesh 2 kilo arisi");
    expect(transliterateIndicToLatin("రమేష్ 2 కిలో బియ్యం")).toContain("ramesh 2 kilo biyyam");
    expect(transliterateIndicToLatin("രമേശ് 2 കിലോ അരി")).toContain("ramesh 2 kilo ari");
    expect(transliterateIndicToLatin("রমেশ ২ কেজি চাল")).toContain("ramesh 2 keji chal");
    expect(transliterateIndicToLatin("ರಮೇಶ್ 2 ಕೆಜಿ ಅಕ್ಕಿ")).toContain("ramesh 2 keji akki");
  });
});
