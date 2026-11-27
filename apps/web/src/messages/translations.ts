export type AppLocale = "hi" | "gu" | "mr" | "pa" | "ta" | "te" | "ml" | "bn" | "kn" | "en";

export interface LocaleConfig {
  code: AppLocale;
  label: string;
  speechLang: string;
  sampleUtterance: string;
  ui: {
    subtitle: string;
    counterTab: string;
    offlineTab: string;
    catalogTab: string;
    speakBtn: string;
    stopBtn: string;
    parseBtn: string;
    holdCartBtn: string;
    placeholder: string;
    translatedLabel: string;
    totalLabel: string;
    gstLabel: string;
    paidLabel: string;
    udhaarLabel: string;
    saveOfflineBtn: string;
    showQrBtn: string;
  };
}

export const SUPPORTED_LOCALES: LocaleConfig[] = [
  {
    code: "hi",
    label: "हिन्दी (Hindi)",
    speechLang: "hi-IN",
    sampleUtterance: "रमेश भाई के खाते में 2 किलो खान 20 रुपए किलो",
    ui: {
      subtitle: "भारत के छोटे व्यापारियों के लिए वॉइस-फर्स्ट बिलिंग और खाता सहायक",
      counterTab: "काउंटर वॉइस बेंच",
      offlineTab: "ऑफलाइन कतार",
      catalogTab: "कैटलॉग और API",
      speakBtn: "बोलें (माइक)",
      stopBtn: "रुकें",
      parseBtn: "ड्राफ्ट बनाएं",
      holdCartBtn: "नया बिल होल्ड करें",
      placeholder: "हिंदी, हिंग्लिश या किसी भी भारतीय भाषा में बोलें या टाइप करें...",
      translatedLabel: "अंग्रेजी / सामान्यीकृत अर्थ",
      totalLabel: "कुल राशि (MRP सहित)",
      gstLabel: "शामिल GST",
      paidLabel: "नकद / UPI जमा",
      udhaarLabel: "बाकी उधार",
      saveOfflineBtn: "ऑफलाइन सेव करें (Dexie)",
      showQrBtn: "UPI QR दिखाएं"
    }
  },
  {
    code: "gu",
    label: "ગુજરાતી (Gujarati)",
    speechLang: "gu-IN",
    sampleUtterance: "રમેશ ભાઈ ના ખાતા માં 2 કિલો ખાંડ 20 રૂપિયા કિલો",
    ui: {
      subtitle: "ભારતીય દુકાનદારો માટે વોઈસ-ફર્સ્ટ બિલિંગ અને ખાતા સહાયક",
      counterTab: "કાઉન્ટર વોઈસ બેન્ચ",
      offlineTab: "ઓફલાઈન કતાર",
      catalogTab: "કેટલોગ અને API",
      speakBtn: "બોલો (માઈક)",
      stopBtn: "રોકો",
      parseBtn: "ડ્રાફ્ટ બનાવો",
      holdCartBtn: "નવું બિલ હોલ્ડ કરો",
      placeholder: "ગુજરાતી અથવા કોઈપણ ભારતીય ભાષામાં બોલો...",
      translatedLabel: "અંગ્રેજી અનુવાદ / સારાંશ",
      totalLabel: "કુલ રકમ (MRP સાથે)",
      gstLabel: "સમાવિષ્ટ GST",
      paidLabel: "રોકડ / UPI જમા",
      udhaarLabel: "બાકી ઉધાર",
      saveOfflineBtn: "ઓફલાઈન સેવ કરો (Dexie)",
      showQrBtn: "UPI QR બતાવો"
    }
  },
  {
    code: "mr",
    label: "मराठी (Marathi)",
    speechLang: "mr-IN",
    sampleUtterance: "रमेश च्या खात्यात 2 किलो साखर 40 रुपये किलो",
    ui: {
      subtitle: "भारतीय दुकानदारांसाठी व्हॉइस-फर्स्ट बिलिंग आणि खाते सहाय्यक",
      counterTab: "काउंटर व्हॉइस बेंच",
      offlineTab: "ऑफलाइन रांग",
      catalogTab: "कॅटलॉग व API",
      speakBtn: "बोला (माइक)",
      stopBtn: "थांबा",
      parseBtn: "ड्राफ्ट तयार करा",
      holdCartBtn: "नवीन बिल होल्ड करा",
      placeholder: "मराठी किंवा कोणत्याही भारतीय भाषेत बोला...",
      translatedLabel: "इंग्रजी रूपांतर / सारांश",
      totalLabel: "एकूण रक्कम (MRP सह)",
      gstLabel: "समाविष्ट GST",
      paidLabel: "रोख / UPI जमा",
      udhaarLabel: "बाकी उधार",
      saveOfflineBtn: "ऑफलाइन सेव्ह करा (Dexie)",
      showQrBtn: "UPI QR दाखवा"
    }
  },
  {
    code: "pa",
    label: "ਪੰਜਾਬੀ (Punjabi)",
    speechLang: "pa-Guru-IN",
    sampleUtterance: "ਰਮੇਸ਼ ਦੇ ਖਾਤੇ ਵਿੱਚ 2 ਕਿਲੋ ਖੰਡ 20 ਰੁਪਏ ਕਿਲੋ",
    ui: {
      subtitle: "ਭਾਰਤੀ ਦੁਕਾਨਦਾਰਾਂ ਲਈ ਵੌਇਸ-ਫਸਟ ਬਿਲਿੰਗ ਅਤੇ ਖਾਤਾ ਸਹਾਇਕ",
      counterTab: "ਕਾਊਂਟਰ ਵੌਇਸ ਬੈਂਚ",
      offlineTab: "ਆਫਲਾਈਨ ਕਤਾਰ",
      catalogTab: "ਕੈਟਾਲਾਗ ਅਤੇ API",
      speakBtn: "ਬੋਲੋ (ਮਾਈਕ)",
      stopBtn: "ਰੁਕੋ",
      parseBtn: "ਡਰਾਫਟ ਬਣਾਓ",
      holdCartBtn: "ਨਵਾਂ ਬਿੱਲ ਹੋਲਡ ਕਰੋ",
      placeholder: "ਪੰਜਾਬੀ ਜਾਂ ਕਿਸੇ ਵੀ ਭਾਰਤੀ ਭਾਸ਼ਾ ਵਿੱਚ ਬੋਲੋ...",
      translatedLabel: "ਅੰਗਰੇਜ਼ੀ ਅਨੁਵਾਦ / ਸਾਰ",
      totalLabel: "ਕੁੱਲ ਰਕਮ (MRP ਸਮੇਤ)",
      gstLabel: "ਸ਼ਾਮਲ GST",
      paidLabel: "ਨਕਦ / UPI ਜਮ੍ਹਾਂ",
      udhaarLabel: "ਬਾਕੀ ਉਧਾਰ",
      saveOfflineBtn: "ਆਫਲਾਈਨ ਸੇਵ ਕਰੋ (Dexie)",
      showQrBtn: "UPI QR ਦਿਖਾਓ"
    }
  },
  {
    code: "ta",
    label: "தமிழ் (Tamil)",
    speechLang: "ta-IN",
    sampleUtterance: "ரமேஷ் 2 கிலோ அரிசி 90 ரூபாய்",
    ui: {
      subtitle: "இந்திய கடைக்காரர்களுக்கான குரல்-முதல் பில்லிங் & கணக்கு உதவியாளர்",
      counterTab: "கவுண்டர் குரல் பெஞ்ச்",
      offlineTab: "ஆஃப்லைன் வரிசை",
      catalogTab: "பட்டியல் & API",
      speakBtn: "பேசவும் (மைக்)",
      stopBtn: "நிறுத்து",
      parseBtn: "வரைவு உருவாக்கு",
      holdCartBtn: "புதிய பில் ஹோல்ட்",
      placeholder: "தமிழ் அல்லது எந்த இந்திய மொழியிலும் பேசவும்...",
      translatedLabel: "ஆங்கில மொழிபெயர்ப்பு / சுருக்கம்",
      totalLabel: "மொத்த தொகை (MRP)",
      gstLabel: "உள்ளடங்கிய GST",
      paidLabel: "பணம் / UPI வரவு",
      udhaarLabel: "பாக்கி கடன்",
      saveOfflineBtn: "ஆஃப்லைனில் சேமி (Dexie)",
      showQrBtn: "UPI QR காட்டு"
    }
  },
  {
    code: "te",
    label: "తెలుగు (Telugu)",
    speechLang: "te-IN",
    sampleUtterance: "రమేష్ 2 కిలో బియ్యం 90 రూపాయలు",
    ui: {
      subtitle: "భారతీయ దుకాణదారుల కోసం వాయిస్-ఫస్ట్ బిల్లింగ్ మరియు ఖాతా సహాయకుడు",
      counterTab: "కౌంటర్ వాయిస్ బెంచ్",
      offlineTab: "ఆఫ్‌లైన్ క్యూ",
      catalogTab: "కేటలాగ్ & API",
      speakBtn: "మాట్లాడండి (మైక్)",
      stopBtn: "ఆపండి",
      parseBtn: "డ్రాఫ్ట్ తయారు చేయి",
      holdCartBtn: "కొత్త బిల్ హోల్డ్",
      placeholder: "తెలుగు లేదా ఏదైనా భారతీయ భాషలో మాట్లాడండి...",
      translatedLabel: "ఇంగ్లీష్ అనువాదం / సారాంశం",
      totalLabel: "మొత్తం (MRP తో)",
      gstLabel: "కలిపిన GST",
      paidLabel: "నగదు / UPI జమ",
      udhaarLabel: "బాకీ ఉధార్",
      saveOfflineBtn: "ఆఫ్‌లైన్ సేవ్ (Dexie)",
      showQrBtn: "UPI QR చూపించు"
    }
  },
  {
    code: "ml",
    label: "മലയാളം (Malayalam)",
    speechLang: "ml-IN",
    sampleUtterance: "രമേശ് 2 കിലോ അരി 90 രൂപ",
    ui: {
      subtitle: "ഇന്ത്യൻ കടയുടമകൾക്കായുള്ള വോയിസ്-ഫസ്റ്റ് ബില്ലിംഗും അക്കൗണ്ട് സഹായിയും",
      counterTab: "കൗണ്ടർ വോയിസ് ബെഞ്ച്",
      offlineTab: "ഓഫ്‌ലൈൻ ക്യൂ",
      catalogTab: "കാറ്റലോഗും API-യും",
      speakBtn: "സംസാരിക്കുക (മൈക്ക്)",
      stopBtn: "നിർത്തുക",
      parseBtn: "ഡ്രാഫ്റ്റ് തയ്യാറാക്കുക",
      holdCartBtn: "പുതിയ ബിൽ ഹോൾഡ്",
      placeholder: "മലയാളത്തിലോ ഏതെങ്കിലും ഇന്ത്യൻ ഭാഷയിലോ സംസാരിക്കുക...",
      translatedLabel: "ഇംഗ്ലീഷ് വിവർത്തനം / സംഗ്രഹം",
      totalLabel: "ആകെ തുക (MRP ഉൾപ്പെടെ)",
      gstLabel: "ഉൾപ്പെടുത്തിയ GST",
      paidLabel: "ക്യാഷ് / UPI ലഭിച്ചത്",
      udhaarLabel: "ബാക്കി കടം",
      saveOfflineBtn: "ഓഫ്‌ലൈൻ സേവ് (Dexie)",
      showQrBtn: "UPI QR കാണിക്കുക"
    }
  },
  {
    code: "bn",
    label: "বাংলা (Bengali)",
    speechLang: "bn-IN",
    sampleUtterance: "রমেশ 2 কেজি চাল 90 টাকা",
    ui: {
      subtitle: "ভারতীয় দোকানদারদের জন্য ভয়েস-ফার্স্ট বিলিং ও খাতা সহকারী",
      counterTab: "কাউন্টার ভয়েস বেঞ্চ",
      offlineTab: "অফলাইন কিউ",
      catalogTab: "ক্যাটালগ ও API",
      speakBtn: "বলুন (মাইক)",
      stopBtn: "থামুন",
      parseBtn: "ড্রাফট তৈরি করুন",
      holdCartBtn: "নতুন বিল হোল্ড",
      placeholder: "বাংলা বা যেকোনো ভারতীয় ভাষায় বলুন...",
      translatedLabel: "ইংরেজি অনুবাদ / সারসংক্ষেপ",
      totalLabel: "মোট টাকা (MRP সহ)",
      gstLabel: "অন্তর্ভুক্ত GST",
      paidLabel: "নগদ / UPI জমা",
      udhaarLabel: "বাকি উধার",
      saveOfflineBtn: "অফলাইন সেভ (Dexie)",
      showQrBtn: "UPI QR দেখান"
    }
  },
  {
    code: "kn",
    label: "ಕನ್ನಡ (Kannada)",
    speechLang: "kn-IN",
    sampleUtterance: "ರಮೇಶ್ 2 ಕೆಜಿ ಅಕ್ಕಿ 90 ರೂಪಾಯಿ",
    ui: {
      subtitle: "ಭಾರತೀಯ ಅಂಗಡಿಯವರಿಗೆ ವಾಯ್ಸ್-ಫಸ್ಟ್ ಬಿಲ್ಲಿಂಗ್ ಮತ್ತು ಖಾತಾ ಸಹಾಯಕ",
      counterTab: "ಕೌಂಟರ್ ವಾಯ್ಸ್ ಬೆಂಚ್",
      offlineTab: "ಆಫ್‌ಲೈನ್ ಸರದಿ",
      catalogTab: "ಕ್ಯಾಟಲಾಗ್ & API",
      speakBtn: "ಮಾತನಾಡಿ (ಮೈಕ್)",
      stopBtn: "ನಿಲ್ಲಿಸಿ",
      parseBtn: "ಡ್ರಾಫ್ಟ್ ರಚಿಸಿ",
      holdCartBtn: "ಹೊಸ ಬಿಲ್ ಹೋಲ್ಡ್",
      placeholder: "ಕನ್ನಡ ಅಥವಾ ಯಾವುದೇ ಭಾರತೀಯ ಭಾಷೆಯಲ್ಲಿ ಮಾತನಾಡಿ...",
      translatedLabel: "ಇಂಗ್ಲಿಷ್ ಅನುವಾದ / ಸಾರಾಂಶ",
      totalLabel: "ಒಟ್ಟು ಮೊತ್ತ (MRP ಸಹಿತ)",
      gstLabel: "ಒಳಗೊಂಡಿರುವ GST",
      paidLabel: "ನಗದು / UPI ಪಾವತಿ",
      udhaarLabel: "ಬಾಕಿ ಉಧಾರ್",
      saveOfflineBtn: "ಆಫ್‌ಲೈನ್ ಸೇವ್ (Dexie)",
      showQrBtn: "UPI QR ತೋರಿಸಿ"
    }
  },
  {
    code: "en",
    label: "English (India)",
    speechLang: "en-IN",
    sampleUtterance: "Ramesh ko 2 kilo chawal, 1 litre doodh, 100 rupaye jama, baaki mahine ke end mein",
    ui: {
      subtitle: "Voice-first counter billing, khata, and inventory copilot for Indian small businesses",
      counterTab: "Counter Voice Bench",
      offlineTab: "Offline Queue",
      catalogTab: "Catalog & API Status",
      speakBtn: "Speak (Mic)",
      stopBtn: "Stop Listening",
      parseBtn: "Parse Draft",
      holdCartBtn: "Hold New Cart",
      placeholder: "Speak or dictate via Wispr Flow in any Indian language...",
      translatedLabel: "Normalized / English Meaning",
      totalLabel: "Total (MRP Incl.)",
      gstLabel: "Included GST",
      paidLabel: "Cash / UPI Paid",
      udhaarLabel: "Udhaar Remaining",
      saveOfflineBtn: "Save to Offline Queue (Dexie)",
      showQrBtn: "Show UPI QR"
    }
  }
];

export function getLocaleConfig(code: AppLocale): LocaleConfig {
  return SUPPORTED_LOCALES.find((l) => l.code === code) ?? SUPPORTED_LOCALES[0]!;
}
