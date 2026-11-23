"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createCustomShopRequest } from "@/lib/firestore";
import { uploadCustomShopInspirationImage } from "@/lib/storage";
import { compressImageForUpload } from "@/utils/imageCompression";
import type { GuitarSpecs } from "@/types/guitars";
import { STANDARD_CUSTOM_SHOP_FORM_ID, STANDARD_CUSTOM_SHOP_FORM_VERSION } from "@/lib/customShopStandardPricing";
import { buildDefaultCustomShopSpecCatalog } from "@/lib/customShopCatalogDefaults";
import type { CustomShopSpecCatalogGlobal } from "@/types/customShopSpecCatalog";
import {
  buildWizardCategoriesFromCatalog,
  computeEstimateFromCatalog,
} from "@/lib/customShopCatalogPricing";
import { subscribeCustomShopSpecCatalog } from "@/lib/firestoreCustomShopCatalog";
import { evaluateCustomShopConstraintRules } from "@/lib/customShopSpecConstraintValidation";
import { validateStandardCustomShopStep } from "@/lib/customShopStandardValidation";
import {
  StandardCustomShopWizardBody,
  STANDARD_CUSTOM_SHOP_STEP_COUNT,
  standardCustomShopStepTitle,
} from "@/components/custom-shop/StandardCustomShopWizardBody";
import { ArrowLeft, Loader2, AlertCircle, ExternalLink, AlertTriangle } from "lucide-react";

const DEPOSIT_AUD = 1000;
const MAX_IMAGES = 6;

function compactSpecs(s: Partial<GuitarSpecs>): Partial<GuitarSpecs> {
  const out: Partial<GuitarSpecs> = {};
  for (const [k, v] of Object.entries(s) as [keyof GuitarSpecs, string | undefined][]) {
    if (v != null && String(v).trim() !== "") {
      (out as Record<string, string>)[k as string] = String(v).trim();
    }
  }
  return out;
}

export default function CustomShopSubmitPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [specs, setSpecs] = useState<Partial<GuitarSpecs>>({});
  const [instrumentType, setInstrumentType] = useState<"" | "guitar" | "bass">("");
  const [model, setModel] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [dreamGuitar, setDreamGuitar] = useState("");
  const [motivation, setMotivation] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [inspirationFiles, setInspirationFiles] = useState<File[]>([]);
  const [depositAgreed, setDepositAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [catalog, setCatalog] = useState<CustomShopSpecCatalogGlobal>(() => buildDefaultCustomShopSpecCatalog());

  useEffect(() => {
    const unsub = subscribeCustomShopSpecCatalog(setCatalog);
    return () => unsub();
  }, []);

  const wizardCategories = useMemo(() => buildWizardCategoriesFromCatalog(catalog), [catalog]);
  const indicativeEstimate = useMemo(() => computeEstimateFromCatalog(specs, catalog), [specs, catalog]);

  const setSpec = useCallback((key: keyof GuitarSpecs, value: string) => {
    setSpecs((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const images = files.filter((f) => f.type.startsWith("image/"));
    setInspirationFiles((prev) => [...prev, ...images].slice(0, MAX_IMAGES));
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setInspirationFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const goNext = () => {
    setError(null);
    const err = validateStandardCustomShopStep(step, {
      instrumentType,
      specs,
      dreamGuitar,
    });
    if (err) {
      setError(err);
      return;
    }
    const conflict = evaluateCustomShopConstraintRules(specs, catalog.constraintRules);
    if (conflict) {
      setError(conflict);
      return;
    }
    setStep((s) => Math.min(s + 1, STANDARD_CUSTOM_SHOP_STEP_COUNT - 1));
  };

  const goBack = () => {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const v5 = validateStandardCustomShopStep(5, { instrumentType, specs, dreamGuitar });
    if (v5) {
      setError(v5);
      return;
    }
    if (!depositAgreed) {
      setError("You must agree to the $1,000 AUD deposit to submit.");
      return;
    }
    if (!currentUser) {
      setError("You must be signed in to submit.");
      return;
    }
    setSubmitting(true);
    try {
      for (let s = 0; s <= 5; s++) {
        const stepErr = validateStandardCustomShopStep(s, { instrumentType, specs, dreamGuitar });
        if (stepErr) {
          setError(stepErr);
          setSubmitting(false);
          return;
        }
      }
      const compact = compactSpecs(specs);
      const conflict = evaluateCustomShopConstraintRules(compact, catalog.constraintRules);
      if (conflict) {
        setError(conflict);
        setSubmitting(false);
        return;
      }
      const estimate = computeEstimateFromCatalog(compact, catalog);
      const urls: string[] = [];
      for (const file of inspirationFiles) {
        const compressed = await compressImageForUpload(file);
        const url = await uploadCustomShopInspirationImage(currentUser.uid, compressed);
        urls.push(url);
      }
      await createCustomShopRequest({
        submitterUid: currentUser.uid,
        submitterEmail: currentUser.email ?? "",
        submitterName: currentUser.displayName ?? undefined,
        guitarDescription: dreamGuitar.trim(),
        specs: compact,
        model: model.trim() || undefined,
        formId: STANDARD_CUSTOM_SHOP_FORM_ID,
        formVersion: STANDARD_CUSTOM_SHOP_FORM_VERSION,
        instrumentType: instrumentType === "" ? undefined : instrumentType,
        budgetRange: budgetRange.trim() || undefined,
        estimatedTotalAUD: estimate.estimatedTotal,
        motivationNotes: motivation.trim() || undefined,
        additionalNotes: additionalNotes.trim() || undefined,
        inspirationImageUrls: urls,
      });
      router.push("/custom-shop/requests");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const progressPct = ((step + 1) / STANDARD_CUSTOM_SHOP_STEP_COUNT) * 100;
  const isLastStep = step === STANDARD_CUSTOM_SHOP_STEP_COUNT - 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/custom-shop" className="text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>
      <h1 className="text-2xl font-semibold text-slate-900">Submit a Custom Shop request</h1>
      <p className="text-sm text-slate-500">
        Configure your build step by step, see an indicative price, then tell us the story behind it. Logged-in
        clients only.
      </p>

      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent transition-all duration-300 rounded-full"
          style={{ width: `${progressPct}%` }}
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={STANDARD_CUSTOM_SHOP_STEP_COUNT}
          aria-label="Form progress"
        />
      </div>
      <p className="text-sm text-slate-500">
        Step {step + 1} of {STANDARD_CUSTOM_SHOP_STEP_COUNT}: {standardCustomShopStepTitle(step)}
      </p>

      <form onSubmit={isLastStep ? handleSubmit : (e) => e.preventDefault()} className="space-y-6">
        {error && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-2"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
              {standardCustomShopStepTitle(step)}
            </h2>
          </div>
          <div className="p-5 space-y-4">
            <StandardCustomShopWizardBody
              wizardCategories={wizardCategories}
              indicativeEstimate={indicativeEstimate}
              step={step}
              disabled={submitting}
              specs={specs}
              setSpec={setSpec}
              instrumentType={instrumentType}
              setInstrumentType={setInstrumentType}
              model={model}
              setModel={setModel}
              budgetRange={budgetRange}
              setBudgetRange={setBudgetRange}
              dreamGuitar={dreamGuitar}
              setDreamGuitar={setDreamGuitar}
              motivation={motivation}
              setMotivation={setMotivation}
              additionalNotes={additionalNotes}
              setAdditionalNotes={setAdditionalNotes}
              inspirationFiles={inspirationFiles}
              maxImages={MAX_IMAGES}
              galleryInputRef={galleryInputRef}
              cameraInputRef={cameraInputRef}
              onInspirationFilesChange={handleFileChange}
              removeInspiration={removeImage}
              depositAgreed={depositAgreed}
              setDepositAgreed={setDepositAgreed}
              depositAud={DEPOSIT_AUD}
            />
          </div>
        </div>

        {step < 5 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">Build timeline</p>
              <p className="text-xs text-amber-800">
                Your build may start <strong>6–18 months</strong> after acceptance and deposit is paid. Build duration
                varies.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Link
            href="/custom-shop"
            className="px-6 py-3 rounded-2xl border border-slate-200 font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          {step > 0 && (
            <button
              type="button"
              onClick={goBack}
              disabled={submitting}
              className="px-6 py-3 rounded-2xl border border-slate-200 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Back
            </button>
          )}
          {!isLastStep ? (
            <button
              type="button"
              onClick={goNext}
              disabled={submitting}
              className="flex-1 min-w-[140px] inline-flex justify-center items-center gap-2 h-11 bg-accent text-accent-foreground rounded-2xl font-medium hover:bg-accent-light disabled:opacity-60 transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting || !depositAgreed}
              className="flex-1 min-w-[140px] inline-flex justify-center items-center gap-2 h-11 bg-accent text-accent-foreground rounded-2xl font-medium hover:bg-accent-light disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit request"
              )}
            </button>
          )}
        </div>

        <p className="text-xs text-slate-500">
          <a
            href="https://ormsbyguitars.com/pages/custom-shop"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-accent hover:text-accent-light transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View past Custom Shop builds
          </a>
        </p>
      </form>
    </div>
  );
}
