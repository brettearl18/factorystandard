"use client";

import { useState, useEffect } from "react";
import { subscribeAppSettings } from "@/lib/firestore";
import { SPEC_CATEGORIES } from "@/constants/guitarSpecs";
import type { RunSpecSettings } from "@/types/settings";

/**
 * Returns the master list of spec options per category (from Admin Run Specifications or defaults).
 * Used when creating/editing runs and for run spec constraints.
 */
export function useRunSpecOptions(): RunSpecSettings {
  const [runSpecs, setRunSpecs] = useState<RunSpecSettings>(() => {
    const out: RunSpecSettings = {};
    SPEC_CATEGORIES.forEach(({ key, options }) => {
      out[key] = [...options];
    });
    return out;
  });

  useEffect(() => {
    const unsubscribe = subscribeAppSettings((settings) => {
      if (!settings?.runSpecs) {
        const out: RunSpecSettings = {};
        SPEC_CATEGORIES.forEach(({ key, options }) => {
          out[key] = [...options];
        });
        setRunSpecs(out);
        return;
      }
      const merged: RunSpecSettings = {};
      SPEC_CATEGORIES.forEach(({ key, options }) => {
        merged[key] = (settings.runSpecs[key]?.length ? settings.runSpecs[key] : options) as string[];
      });
      setRunSpecs(merged);
    });
    return () => unsubscribe();
  }, []);

  return runSpecs;
}

/** Get option list for a single category (for components that need one key). */
export function getSpecOptionsForCategory(
  runSpecs: RunSpecSettings,
  key: keyof RunSpecSettings
): string[] {
  const cat = SPEC_CATEGORIES.find((c) => c.key === key);
  if (!cat) return [];
  return (runSpecs[key]?.length ? runSpecs[key] : cat.options) as string[];
}
