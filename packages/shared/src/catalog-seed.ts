import type { StorePreset } from "./contracts.js";

export interface SeedSku {
  skuId: string;
  canonicalName: string;
  aliases: string[];
  presets: StorePreset[];
  skuType: "packed" | "loose";
  unitLabel: string;
  baseMultiplier: number;
  sellPricePaise: number;
  gstPercent: number;
  isMrpInclusive: boolean;
}

export interface SeedCustomer {
  customerId: string;
  displayName: string;
  aliases: string[];
  previousBalancePaise: number;
  riskTier: "GREEN" | "AMBER" | "RED";
}

export const STARTER_CATALOG: SeedSku[] = [
  {
    skuId: "SKU_TOOR_DAL",
    canonicalName: "Toor Dal (Loose)",
    aliases: ["toor dal", "arhar dal", "tur dal", "toor", "dal"],
    presets: ["kirana", "general", "mini_supermarket"],
    skuType: "loose",
    unitLabel: "kg",
    baseMultiplier: 1000,
    sellPricePaise: 14500,
    gstPercent: 0,
    isMrpInclusive: true
  },
  {
    skuId: "SKU_BASMATI_RICE",
    canonicalName: "Basmati Rice (Loose)",
    aliases: ["chawal", "rice", "basmati", "basmati chawal"],
    presets: ["kirana", "general", "mini_supermarket"],
    skuType: "loose",
    unitLabel: "kg",
    baseMultiplier: 1000,
    sellPricePaise: 9000,
    gstPercent: 0,
    isMrpInclusive: true
  },
  {
    skuId: "SKU_CHAKKI_ATTA",
    canonicalName: "Chakki Atta (Loose)",
    aliases: ["atta", "aata", "gehu atta", "chakki atta"],
    presets: ["kirana", "general", "mini_supermarket"],
    skuType: "loose",
    unitLabel: "kg",
    baseMultiplier: 1000,
    sellPricePaise: 4200,
    gstPercent: 0,
    isMrpInclusive: true
  },
  {
    skuId: "SKU_AASHIRVAAD_ATTA_5KG",
    canonicalName: "Aashirvaad Atta 5kg",
    aliases: ["aashirvaad atta", "atta 5kg", "aashirvaad"],
    presets: ["kirana", "mini_supermarket"],
    skuType: "packed",
    unitLabel: "pack",
    baseMultiplier: 1,
    sellPricePaise: 26500,
    gstPercent: 5,
    isMrpInclusive: true
  },
  {
    skuId: "SKU_AMUL_MILK_1L",
    canonicalName: "Amul Taaza Milk 1L",
    aliases: ["doodh", "milk", "amul doodh", "amul taaza", "taaza"],
    presets: ["kirana", "dairy", "general", "mini_supermarket"],
    skuType: "packed",
    unitLabel: "litre",
    baseMultiplier: 1,
    sellPricePaise: 5400,
    gstPercent: 0,
    isMrpInclusive: true
  },
  {
    skuId: "SKU_AMUL_PANEER_200G",
    canonicalName: "Amul Paneer 200g",
    aliases: ["paneer", "amul paneer"],
    presets: ["dairy", "kirana", "mini_supermarket"],
    skuType: "packed",
    unitLabel: "pack",
    baseMultiplier: 1,
    sellPricePaise: 9000,
    gstPercent: 5,
    isMrpInclusive: true
  },
  {
    skuId: "SKU_MAGGI_SMALL",
    canonicalName: "Maggi Masala Small Pack",
    aliases: ["maggi", "chhota maggi", "maggie"],
    presets: ["kirana", "general", "mini_supermarket"],
    skuType: "packed",
    unitLabel: "pack",
    baseMultiplier: 1,
    sellPricePaise: 1500,
    gstPercent: 18,
    isMrpInclusive: true
  },
  {
    skuId: "SKU_TOMATO",
    canonicalName: "Tomato (Fresh)",
    aliases: ["tamatar", "tomato"],
    presets: ["produce", "mini_supermarket"],
    skuType: "loose",
    unitLabel: "kg",
    baseMultiplier: 1000,
    sellPricePaise: 4000,
    gstPercent: 0,
    isMrpInclusive: true
  },
  {
    skuId: "SKU_ONION",
    canonicalName: "Onion (Pyaaz / Kanda)",
    aliases: ["pyaaz", "kanda", "onion"],
    presets: ["produce", "kirana", "mini_supermarket"],
    skuType: "loose",
    unitLabel: "kg",
    baseMultiplier: 1000,
    sellPricePaise: 3600,
    gstPercent: 0,
    isMrpInclusive: true
  },
  {
    skuId: "SKU_CLASSMATE_NOTEBOOK",
    canonicalName: "Classmate Notebook 172p",
    aliases: ["copy", "notebook", "classmate", "register"],
    presets: ["stationery", "general"],
    skuType: "packed",
    unitLabel: "pcs",
    baseMultiplier: 1,
    sellPricePaise: 6000,
    gstPercent: 12,
    isMrpInclusive: true
  }
];

export const STARTER_CUSTOMERS: SeedCustomer[] = [
  {
    customerId: "CUST_RAMESH_GALI3",
    displayName: "Ramesh (Gali-3)",
    aliases: ["ramesh", "ramesh gali 3"],
    previousBalancePaise: 12000,
    riskTier: "GREEN"
  },
  {
    customerId: "CUST_RAMESH_DUDHWALA",
    displayName: "Ramesh Dudhwala",
    aliases: ["ramesh", "ramesh dudhwala", "dudhwala"],
    previousBalancePaise: 245000,
    riskTier: "RED"
  },
  {
    customerId: "CUST_SURESH_TAILOR",
    displayName: "Suresh Tailor",
    aliases: ["suresh", "suresh tailor"],
    previousBalancePaise: 45000,
    riskTier: "AMBER"
  }
];

export function getCatalogForPreset(preset: StorePreset): SeedSku[] {
  return STARTER_CATALOG.filter((item) => item.presets.includes(preset));
}
