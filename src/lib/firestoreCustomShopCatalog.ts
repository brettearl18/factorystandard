import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
  serverTimestamp,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  CustomShopCatalogSpecKey,
  CustomShopSpecCatalogGlobal,
  CustomShopSpecConstraintRule,
  CustomShopSpecOptionRow,
} from "@/types/customShopSpecCatalog";
import { buildDefaultCustomShopSpecCatalog } from "@/lib/customShopCatalogDefaults";

const COLLECTION = "customShopSpecSettings";
const GLOBAL_DOC = "global";

function normalizeCatalogFromFirestore(raw: DocumentData | undefined): CustomShopSpecCatalogGlobal {
  const defaults = buildDefaultCustomShopSpecCatalog();
  if (!raw || typeof raw !== "object") return defaults;

  const base =
    typeof raw.standardBasePriceAUD === "number" && !Number.isNaN(raw.standardBasePriceAUD)
      ? raw.standardBasePriceAUD
      : defaults.standardBasePriceAUD;

  const categories: CustomShopSpecCatalogGlobal["categories"] = { ...defaults.categories };
  if (raw.categories && typeof raw.categories === "object") {
    const rawCats = raw.categories as Record<string, { options?: unknown }>;
    for (const k of Object.keys(rawCats)) {
      const key = k as CustomShopCatalogSpecKey;
      const entry = rawCats[k];
      if (!entry?.options || !Array.isArray(entry.options)) continue;
      const options: CustomShopSpecOptionRow[] = entry.options
        .map((o: unknown) => {
          if (!o || typeof o !== "object") return null;
          const row = o as { label?: unknown; priceDeltaAUD?: unknown };
          const label = typeof row.label === "string" ? row.label.trim() : "";
          if (!label) return null;
          const price =
            typeof row.priceDeltaAUD === "number" && !Number.isNaN(row.priceDeltaAUD) ? row.priceDeltaAUD : 0;
          return { label, priceDeltaAUD: price };
        })
        .filter((o): o is CustomShopSpecOptionRow => o != null);
      if (options.length > 0) categories[key] = { options };
    }
  }

  let constraintRules = defaults.constraintRules;
  if (Array.isArray(raw.constraintRules)) {
    const parsed: CustomShopSpecConstraintRule[] = [];
    for (const r of raw.constraintRules) {
      if (!r || typeof r !== "object") continue;
      const obj = r as Record<string, unknown>;
      if (typeof obj.id !== "string" || typeof obj.message !== "string") continue;
      const when = obj.when as Record<string, unknown> | undefined;
      const block = obj.block as Record<string, unknown> | undefined;
      if (!when || !block || typeof when.field !== "string" || typeof block.field !== "string") continue;
      parsed.push({
        id: obj.id,
        enabled: obj.enabled !== false,
        message: obj.message,
        when: {
          field: when.field as CustomShopCatalogSpecKey,
          anyOf: Array.isArray(when.anyOf) ? when.anyOf.filter((x): x is string => typeof x === "string") : [],
        },
        block: {
          field: block.field as CustomShopCatalogSpecKey,
          anyOf: Array.isArray(block.anyOf) ? block.anyOf.filter((x): x is string => typeof x === "string") : [],
        },
      });
    }
    if (parsed.length > 0) constraintRules = parsed;
  }

  return {
    schemaVersion: 1,
    standardBasePriceAUD: base,
    categories,
    constraintRules,
    updatedAt:
      typeof raw.updatedAt?.toMillis === "function"
        ? raw.updatedAt.toMillis()
        : typeof raw.updatedAt === "number"
          ? raw.updatedAt
          : undefined,
  };
}

export async function getCustomShopSpecCatalog(): Promise<CustomShopSpecCatalogGlobal> {
  const snap = await getDoc(doc(db, COLLECTION, GLOBAL_DOC));
  if (!snap.exists()) return buildDefaultCustomShopSpecCatalog();
  return normalizeCatalogFromFirestore(snap.data());
}

export function subscribeCustomShopSpecCatalog(
  callback: (catalog: CustomShopSpecCatalogGlobal) => void
): Unsubscribe {
  return onSnapshot(doc(db, COLLECTION, GLOBAL_DOC), (snap) => {
    if (!snap.exists()) {
      callback(buildDefaultCustomShopSpecCatalog());
      return;
    }
    callback(normalizeCatalogFromFirestore(snap.data()));
  });
}

export async function saveCustomShopSpecCatalog(catalog: CustomShopSpecCatalogGlobal): Promise<void> {
  const ref = doc(db, COLLECTION, GLOBAL_DOC);
  await setDoc(
    ref,
    {
      schemaVersion: catalog.schemaVersion ?? 1,
      standardBasePriceAUD: catalog.standardBasePriceAUD,
      categories: catalog.categories,
      constraintRules: catalog.constraintRules,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
