"use client";

import { useEffect, useState } from "react";
import type { GuitarSpecs } from "@/types/guitars";
import type { CustomShopCatalogSpecKey } from "@/types/customShopSpecCatalog";
import { CUSTOM_SHOP_BUDGET_RANGES } from "@/lib/customShopStandardPricing";
import type { WizardCategoryRow } from "@/lib/customShopCatalogPricing";
import { Camera, ImagePlus, X } from "lucide-react";
import type { RefObject } from "react";

function InspirationThumbnails({
  files,
  disabled,
  removeInspiration,
}: {
  files: File[];
  disabled: boolean;
  removeInspiration: (index: number) => void;
}) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const next = files.map((f) => URL.createObjectURL(f));
    setUrls(next);
    return () => {
      next.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);

  return (
    <div className="flex flex-wrap gap-4">
      {files.map((file, i) => (
        <div
          key={`${file.name}-${file.size}-${i}`}
          className="relative w-28 h-28 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group shadow-sm"
        >
          {urls[i] && <img src={urls[i]} alt="" className="w-full h-full object-cover" />}
          <button
            type="button"
            onClick={() => removeInspiration(i)}
            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
            aria-label="Remove image"
            disabled={disabled}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      ))}
    </div>
  );
}

const STEP_TITLES = [
  "Instrument basics",
  "Woods",
  "Hardware",
  "Electronics",
  "Setup & finish",
  "Inspiration & story",
  "Review & submit",
] as const;

export const STANDARD_CUSTOM_SHOP_STEP_COUNT = STEP_TITLES.length;

export function standardCustomShopStepTitle(step: number): string {
  return STEP_TITLES[step] ?? "";
}

function SpecSelect({
  wizardCategories,
  specKey,
  value,
  onChange,
  disabled,
}: {
  wizardCategories: WizardCategoryRow[];
  specKey: CustomShopCatalogSpecKey;
  value: string | undefined;
  onChange: (key: keyof GuitarSpecs, value: string) => void;
  disabled: boolean;
}) {
  const cat = wizardCategories.find((c) => c.key === specKey);
  if (!cat) return null;
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">
        {cat.label}
        <span className="text-red-500"> *</span>
      </span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(cat.key, e.target.value)}
        required
        disabled={disabled}
        className="w-full h-11 px-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-accent/30 focus:border-accent/40 text-sm bg-white"
      >
        <option value="">Select…</option>
        {cat.options.map((opt) => (
          <option key={opt.label} value={opt.label}>
            {opt.label}
            {opt.priceDeltaAUD > 0 ? ` (+$${opt.priceDeltaAUD} AUD)` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

export type StandardCustomShopWizardBodyProps = {
  wizardCategories: WizardCategoryRow[];
  indicativeEstimate: { base: number; optionsTotal: number; estimatedTotal: number };
  step: number;
  disabled: boolean;
  specs: Partial<GuitarSpecs>;
  setSpec: (key: keyof GuitarSpecs, value: string) => void;
  instrumentType: "guitar" | "bass" | "";
  setInstrumentType: (v: "guitar" | "bass" | "") => void;
  model: string;
  setModel: (v: string) => void;
  budgetRange: string;
  setBudgetRange: (v: string) => void;
  dreamGuitar: string;
  setDreamGuitar: (v: string) => void;
  motivation: string;
  setMotivation: (v: string) => void;
  additionalNotes: string;
  setAdditionalNotes: (v: string) => void;
  inspirationFiles: File[];
  maxImages: number;
  galleryInputRef: RefObject<HTMLInputElement | null>;
  cameraInputRef: RefObject<HTMLInputElement | null>;
  onInspirationFilesChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeInspiration: (index: number) => void;
  depositAgreed: boolean;
  setDepositAgreed: (v: boolean) => void;
  depositAud: number;
};

export function StandardCustomShopWizardBody(props: StandardCustomShopWizardBodyProps) {
  const {
    wizardCategories,
    indicativeEstimate,
    step,
    disabled,
    specs,
    setSpec,
    instrumentType,
    setInstrumentType,
    model,
    setModel,
    budgetRange,
    setBudgetRange,
    dreamGuitar,
    setDreamGuitar,
    motivation,
    setMotivation,
    additionalNotes,
    setAdditionalNotes,
    inspirationFiles,
    maxImages,
    galleryInputRef,
    cameraInputRef,
    onInspirationFilesChange,
    removeInspiration,
    depositAgreed,
    setDepositAgreed,
    depositAud,
  } = props;

  const estimate = indicativeEstimate;

  if (step === 0) {
    return (
      <div className="space-y-6">
        <Section title="What are you building?">
          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-medium text-slate-700 mb-2">
              Instrument type<span className="text-red-500"> *</span>
            </legend>
            <div className="flex flex-wrap gap-4">
              {(["guitar", "bass"] as const).map((t) => (
                <label key={t} className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="instrumentType"
                    value={t}
                    checked={instrumentType === t}
                    onChange={() => setInstrumentType(t)}
                    disabled={disabled}
                    className="text-accent focus:ring-accent/30"
                  />
                  <span className="text-slate-800 capitalize">{t}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block sm:col-span-2">
            <span className="block text-sm font-medium text-slate-700 mb-1">Model / shape (optional)</span>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={disabled}
              placeholder="e.g. Hype GTR, Goliath"
              className="w-full h-11 px-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-accent/30 text-sm"
            />
          </label>
          <SpecSelect
            wizardCategories={wizardCategories}
            specKey="strings"
            value={specs.strings}
            onChange={setSpec}
            disabled={disabled}
          />
          <SpecSelect
            wizardCategories={wizardCategories}
            specKey="handedness"
            value={specs.handedness}
            onChange={setSpec}
            disabled={disabled}
          />
          <div className="sm:col-span-2">
            <SpecSelect
              wizardCategories={wizardCategories}
              specKey="scaleLength"
              value={specs.scaleLength}
              onChange={setSpec}
              disabled={disabled}
            />
          </div>
        </Section>
      </div>
    );
  }

  if (step === 1) {
    return (
      <Section title="Timbers">
        <SpecSelect wizardCategories={wizardCategories} specKey="bodyWood" value={specs.bodyWood} onChange={setSpec} disabled={disabled} />
        <SpecSelect wizardCategories={wizardCategories} specKey="topWood" value={specs.topWood} onChange={setSpec} disabled={disabled} />
        <SpecSelect wizardCategories={wizardCategories} specKey="neckWood" value={specs.neckWood} onChange={setSpec} disabled={disabled} />
        <SpecSelect wizardCategories={wizardCategories} specKey="fretboardWood" value={specs.fretboardWood} onChange={setSpec} disabled={disabled} />
      </Section>
    );
  }

  if (step === 2) {
    return (
      <Section title="Hardware">
        <SpecSelect wizardCategories={wizardCategories} specKey="bridge" value={specs.bridge} onChange={setSpec} disabled={disabled} />
        <SpecSelect wizardCategories={wizardCategories} specKey="tuners" value={specs.tuners} onChange={setSpec} disabled={disabled} />
        <SpecSelect wizardCategories={wizardCategories} specKey="nut" value={specs.nut} onChange={setSpec} disabled={disabled} />
        <SpecSelect wizardCategories={wizardCategories} specKey="pickguard" value={specs.pickguard} onChange={setSpec} disabled={disabled} />
      </Section>
    );
  }

  if (step === 3) {
    return (
      <Section title="Electronics">
        <SpecSelect
          wizardCategories={wizardCategories}
          specKey="pickupConfiguration"
          value={specs.pickupConfiguration}
          onChange={setSpec}
          disabled={disabled}
        />
        <SpecSelect wizardCategories={wizardCategories} specKey="pickupNeck" value={specs.pickupNeck} onChange={setSpec} disabled={disabled} />
        <SpecSelect wizardCategories={wizardCategories} specKey="pickupBridge" value={specs.pickupBridge} onChange={setSpec} disabled={disabled} />
        <SpecSelect wizardCategories={wizardCategories} specKey="controls" value={specs.controls} onChange={setSpec} disabled={disabled} />
        <div className="sm:col-span-2">
          <SpecSelect wizardCategories={wizardCategories} specKey="switch" value={specs.switch} onChange={setSpec} disabled={disabled} />
        </div>
      </Section>
    );
  }

  if (step === 4) {
    return (
      <div className="space-y-6">
        <Section title="Neck & setup">
          <SpecSelect wizardCategories={wizardCategories} specKey="frets" value={specs.frets} onChange={setSpec} disabled={disabled} />
          <SpecSelect wizardCategories={wizardCategories} specKey="neckProfile" value={specs.neckProfile} onChange={setSpec} disabled={disabled} />
          <SpecSelect wizardCategories={wizardCategories} specKey="radius" value={specs.radius} onChange={setSpec} disabled={disabled} />
          <SpecSelect wizardCategories={wizardCategories} specKey="stringGauge" value={specs.stringGauge} onChange={setSpec} disabled={disabled} />
          <div className="sm:col-span-2">
            <SpecSelect wizardCategories={wizardCategories} specKey="action" value={specs.action} onChange={setSpec} disabled={disabled} />
          </div>
        </Section>
        <Section title="Finish & look">
          <SpecSelect wizardCategories={wizardCategories} specKey="finishType" value={specs.finishType} onChange={setSpec} disabled={disabled} />
          <label className="block sm:col-span-2">
            <span className="block text-sm font-medium text-slate-700 mb-1">
              Finish colour / burst<span className="text-red-500"> *</span>
            </span>
            <input
              type="text"
              value={specs.finishColor ?? ""}
              onChange={(e) => setSpec("finishColor", e.target.value)}
              disabled={disabled}
              placeholder='e.g. Seafoam Green, Trans Black Burst'
              className="w-full h-11 px-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-accent/30 text-sm"
            />
          </label>
          <SpecSelect wizardCategories={wizardCategories} specKey="binding" value={specs.binding} onChange={setSpec} disabled={disabled} />
          <SpecSelect wizardCategories={wizardCategories} specKey="inlays" value={specs.inlays} onChange={setSpec} disabled={disabled} />
        </Section>
      </div>
    );
  }

  if (step === 5) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Inspiration — show us what you&apos;re drawn to</h3>
          <p className="text-slate-600 text-sm mb-3">
            Optional reference photos. Same limits as before — we&apos;ll compress on upload.
          </p>
          <InspirationThumbnails files={inspirationFiles} disabled={disabled} removeInspiration={removeInspiration} />
          {inspirationFiles.length < maxImages && (
            <div className="flex flex-col gap-2 mt-4">
              <input
                id="std-inspiration-gallery"
                ref={galleryInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/heic"
                multiple
                onChange={onInspirationFilesChange}
                className="hidden"
                aria-label="Add from gallery"
                disabled={disabled}
              />
              <input
                id="std-inspiration-camera"
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={onInspirationFilesChange}
                className="hidden"
                aria-label="Take photo"
                disabled={disabled}
              />
              <div className="flex gap-2 flex-wrap">
                <label
                  htmlFor="std-inspiration-gallery"
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-accent bg-accent/5 text-accent font-medium text-sm cursor-pointer hover:bg-accent/10 transition-colors"
                >
                  <ImagePlus className="w-5 h-5" />
                  Add from gallery
                </label>
                <label
                  htmlFor="std-inspiration-camera"
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-700 font-medium text-sm cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <Camera className="w-5 h-5" />
                  Take photo
                </label>
              </div>
            </div>
          )}
          {inspirationFiles.length < maxImages && (
            <p className="text-xs text-slate-500 mt-2">Max {maxImages} images.</p>
          )}
        </div>

        <div>
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1">
              Tell us about your dream guitar<span className="text-red-500"> *</span>
            </span>
            <textarea
              value={dreamGuitar}
              onChange={(e) => setDreamGuitar(e.target.value)}
              rows={6}
              disabled={disabled}
              className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-accent/30 resize-none text-sm"
              placeholder="Describe the vision in your own words — look, feel, sound, and what matters most."
              required
            />
          </label>
        </div>

        <div>
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1">Why this build, and why now? (optional)</span>
            <textarea
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              rows={3}
              disabled={disabled}
              className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-accent/30 resize-none text-sm"
            />
          </label>
        </div>

        <div>
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1">Anything else? (optional)</span>
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              rows={2}
              disabled={disabled}
              className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-accent/30 resize-none text-sm"
            />
          </label>
        </div>

        <label className="block max-w-md">
          <span className="block text-sm font-medium text-slate-700 mb-1">Budget band (optional)</span>
          <select
            value={budgetRange}
            onChange={(e) => setBudgetRange(e.target.value)}
            disabled={disabled}
            className="w-full h-11 px-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-accent/30 text-sm bg-white"
          >
            {CUSTOM_SHOP_BUDGET_RANGES.map((o) => (
              <option key={o.value || "none"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    );
  }

  if (step === 6) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">Specification summary</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {instrumentType && (
              <div className="flex gap-2">
                <dt className="text-slate-500">Instrument:</dt>
                <dd className="text-slate-900 capitalize">{instrumentType}</dd>
              </div>
            )}
            {model.trim() && (
              <div className="flex gap-2 sm:col-span-2">
                <dt className="text-slate-500">Model:</dt>
                <dd className="text-slate-900">{model.trim()}</dd>
              </div>
            )}
            {wizardCategories.map((cat) => {
              const v = specs[cat.key];
              if (v == null || String(v).trim() === "") return null;
              return (
                <div key={cat.key} className="flex gap-2">
                  <dt className="text-slate-500 shrink-0">{cat.label}:</dt>
                  <dd className="text-slate-900">{v}</dd>
                </div>
              );
            })}
            {specs.finishColor != null && String(specs.finishColor).trim() !== "" && (
              <div className="flex gap-2 sm:col-span-2">
                <dt className="text-slate-500">Finish colour:</dt>
                <dd className="text-slate-900">{specs.finishColor}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Indicative price (AUD)</h3>
          <p className="text-2xl font-bold text-accent">
            ${estimate.estimatedTotal.toLocaleString("en-AU")}{" "}
            <span className="text-sm font-normal text-slate-600">estimated total</span>
          </p>
          <p className="text-xs text-slate-600 mt-2">
            Base ${estimate.base.toLocaleString("en-AU")}
            {estimate.optionsTotal > 0
              ? ` + options $${estimate.optionsTotal.toLocaleString("en-AU")}`
              : " + selected options"}
            . This is not a binding quote — final pricing is confirmed by staff after review.
          </p>
        </div>

        {budgetRange && (
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-700">Budget band:</span> {budgetRange}
          </p>
        )}

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={depositAgreed}
              onChange={(e) => setDepositAgreed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-slate-200 text-accent focus:ring-accent/30"
              disabled={disabled}
            />
            <span className="text-slate-800 text-sm">
              I agree to a <strong>${depositAud.toLocaleString()} AUD</strong> deposit to proceed once my request is
              approved. This deposit will be applied to my order.
            </span>
          </label>
        </div>
      </div>
    );
  }

  return null;
}
