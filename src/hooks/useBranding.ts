import { useState, useEffect } from "react";
import { subscribeAppSettings } from "@/lib/firestore";
import type { BrandingSettings } from "@/types/settings";

const defaultBranding: BrandingSettings = {
  companyName: "Factory Standards",
  primaryColor: "#F97316",
  secondaryColor: "#3B82F6",
  accentColor: "#10B981",
};

export function useBranding() {
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);

  useEffect(() => {
    const unsubscribe = subscribeAppSettings((settings) => {
      if (settings?.branding) {
        setBranding(settings.branding);
      } else {
        setBranding(defaultBranding);
      }
    });

    return () => unsubscribe();
  }, []);

  return branding;
}

