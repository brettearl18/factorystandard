import type { GuitarSpecs } from "@/types/guitars";
import { SPEC_CATEGORIES } from "@/constants/guitarSpecs";

function specLabel(key: keyof GuitarSpecs): string {
  const cat = SPEC_CATEGORIES.find((c) => c.key === key);
  if (cat) return cat.label;
  if (key === "finishColor") return "Finish colour";
  return String(key);
}

const STEP0_SPEC_KEYS: (keyof GuitarSpecs)[] = ["strings", "handedness", "scaleLength"];
const STEP1_SPEC_KEYS: (keyof GuitarSpecs)[] = ["bodyWood", "topWood", "neckWood", "fretboardWood"];
const STEP2_SPEC_KEYS: (keyof GuitarSpecs)[] = ["bridge", "tuners", "nut", "pickguard"];
const STEP3_SPEC_KEYS: (keyof GuitarSpecs)[] = [
  "pickupConfiguration",
  "pickupNeck",
  "pickupBridge",
  "controls",
  "switch",
];
const STEP4_SPEC_KEYS: (keyof GuitarSpecs)[] = [
  "frets",
  "neckProfile",
  "radius",
  "stringGauge",
  "action",
  "finishType",
  "binding",
  "inlays",
];

function missingSpecKeys(specs: Partial<GuitarSpecs>, keys: (keyof GuitarSpecs)[]): string | null {
  for (const k of keys) {
    const v = specs[k];
    if (v == null || String(v).trim() === "") {
      return `Please select: ${specLabel(k)}`;
    }
  }
  return null;
}

export function validateStandardCustomShopStep(
  step: number,
  args: {
    instrumentType: "" | "guitar" | "bass";
    specs: Partial<GuitarSpecs>;
    dreamGuitar: string;
  }
): string | null {
  if (step === 0) {
    if (!args.instrumentType) return "Please select Guitar or Bass.";
    return missingSpecKeys(args.specs, STEP0_SPEC_KEYS);
  }
  if (step === 1) return missingSpecKeys(args.specs, STEP1_SPEC_KEYS);
  if (step === 2) return missingSpecKeys(args.specs, STEP2_SPEC_KEYS);
  if (step === 3) return missingSpecKeys(args.specs, STEP3_SPEC_KEYS);
  if (step === 4) {
    const m = missingSpecKeys(args.specs, STEP4_SPEC_KEYS);
    if (m) return m;
    const fc = args.specs.finishColor;
    if (fc == null || String(fc).trim() === "") return "Please enter a finish colour or burst description.";
    return null;
  }
  if (step === 5) {
    if (!args.dreamGuitar.trim()) return "Please tell us about your dream guitar.";
    return null;
  }
  return null;
}
