"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { SPEC_CATEGORIES } from "@/constants/guitarSpecs";
import { buildDefaultCustomShopSpecCatalog } from "@/lib/customShopCatalogDefaults";
import { getCustomShopSpecCatalog, saveCustomShopSpecCatalog } from "@/lib/firestoreCustomShopCatalog";
import type {
  CustomShopCatalogSpecKey,
  CustomShopSpecCatalogGlobal,
  CustomShopSpecConstraintRule,
  CustomShopSpecOptionRow,
} from "@/types/customShopSpecCatalog";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  AlertCircle,
  Link2,
} from "lucide-react";

const FIELD_OPTIONS = SPEC_CATEGORIES.map((c) => ({
  value: c.key as CustomShopCatalogSpecKey,
  label: c.label,
}));

function newRuleId() {
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function CustomShopSpecsSettingsPage() {
  const { currentUser, userRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const [catalog, setCatalog] = useState<CustomShopSpecCatalogGlobal>(() => buildDefaultCustomShopSpecCatalog());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      router.push("/login");
      return;
    }
    if (userRole !== "staff" && userRole !== "admin") {
      router.push("/settings");
      return;
    }
  }, [currentUser, userRole, authLoading, router]);

  useEffect(() => {
    if (!currentUser || (userRole !== "staff" && userRole !== "admin")) return;
    let cancelled = false;
    setLoading(true);
    getCustomShopSpecCatalog()
      .then((c) => {
        if (!cancelled) setCatalog(c);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load catalog");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser, userRole]);

  const setBasePrice = (v: string) => {
    const n = parseFloat(v);
    setCatalog((prev) => ({
      ...prev,
      standardBasePriceAUD: Number.isFinite(n) ? Math.max(0, n) : prev.standardBasePriceAUD,
    }));
  };

  const updateCategoryOptions = (key: CustomShopCatalogSpecKey, options: CustomShopSpecOptionRow[]) => {
    setCatalog((prev) => ({
      ...prev,
      categories: { ...prev.categories, [key]: { options } },
    }));
  };

  const addOptionRow = (key: CustomShopCatalogSpecKey) => {
    const cur = catalog.categories[key]?.options ?? [];
    updateCategoryOptions(key, [...cur, { label: "New option", priceDeltaAUD: 0 }]);
  };

  const removeOptionRow = (key: CustomShopCatalogSpecKey, index: number) => {
    const cur = catalog.categories[key]?.options ?? [];
    updateCategoryOptions(
      key,
      cur.filter((_, i) => i !== index)
    );
  };

  const patchOptionRow = (
    key: CustomShopCatalogSpecKey,
    index: number,
    patch: Partial<CustomShopSpecOptionRow>
  ) => {
    const cur = [...(catalog.categories[key]?.options ?? [])];
    cur[index] = { ...cur[index], ...patch };
    updateCategoryOptions(key, cur);
  };

  const addConstraintRule = () => {
    setCatalog((prev) => ({
      ...prev,
      constraintRules: [
        ...prev.constraintRules,
        {
          id: newRuleId(),
          enabled: true,
          message: "These choices can’t be combined — adjust pickup configuration or pickup models.",
          when: { field: "pickupConfiguration", anyOf: [] },
          block: { field: "pickupBridge", anyOf: [] },
        },
      ],
    }));
  };

  const removeConstraintRule = (id: string) => {
    setCatalog((prev) => ({
      ...prev,
      constraintRules: prev.constraintRules.filter((r) => r.id !== id),
    }));
  };

  const patchRule = (id: string, patch: Partial<CustomShopSpecConstraintRule>) => {
    setCatalog((prev) => ({
      ...prev,
      constraintRules: prev.constraintRules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const parseLines = (text: string) =>
    text
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

  const handleSave = async () => {
    setError(null);
    setMessage(null);
    for (const cat of SPEC_CATEGORIES) {
      const k = cat.key as CustomShopCatalogSpecKey;
      const opts = catalog.categories[k]?.options ?? [];
      if (opts.length === 0) {
        setError(`"${cat.label}" has no options — add at least one or reload defaults.`);
        return;
      }
      for (const o of opts) {
        if (!o.label.trim()) {
          setError(`Empty label in ${cat.label}`);
          return;
        }
      }
    }
    setSaving(true);
    try {
      await saveCustomShopSpecCatalog(catalog);
      setMessage("Saved. Custom Shop submit form will use these options and prices.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (!window.confirm("Replace the editor with built-in defaults (unsaved edits lost)?")) return;
    setCatalog(buildDefaultCustomShopSpecCatalog());
    setMessage("Reset to defaults in the editor — click Save to write to Firestore.");
  };

  const handleReloadServer = () => {
    setLoading(true);
    getCustomShopSpecCatalog()
      .then(setCatalog)
      .catch((e) => setError(e instanceof Error ? e.message : "Reload failed"))
      .finally(() => setLoading(false));
  };

  if (authLoading || !currentUser || (userRole !== "staff" && userRole !== "admin")) return null;

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/settings" className="text-gray-600 hover:text-gray-900 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Settings
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Custom Shop spec catalog</h1>
        <p className="text-gray-600 mb-6">
          Control which options appear on the public Custom Shop wizard, upgrade prices (AUD), and conflict rules
          (e.g. single-pickup layout vs humbucker models). Clients read this from Firestore; staff can edit here.
        </p>

        {message && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <label className="block max-w-xs">
                <span className="text-sm font-medium text-gray-700">Standard base price (AUD)</span>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={catalog.standardBasePriceAUD}
                  onChange={(e) => setBasePrice(e.target.value)}
                  className="mt-1 w-full h-11 px-3 border border-gray-300 rounded-lg"
                />
              </label>
              <p className="text-xs text-gray-500 mt-2">
                Indicative total = base + sum of selected option upgrade prices.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">Options per category</h2>
              {SPEC_CATEGORIES.map((cat) => {
                const key = cat.key as CustomShopCatalogSpecKey;
                const rows = catalog.categories[key]?.options ?? [];
                return (
                  <details key={key} className="bg-white rounded-xl border border-gray-200 group">
                    <summary className="px-4 py-3 cursor-pointer font-medium text-gray-900 list-none flex justify-between items-center">
                      <span>{cat.label}</span>
                      <span className="text-xs text-gray-500">{rows.length} options</span>
                    </summary>
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
                      {rows.map((row, i) => (
                        <div key={i} className="flex flex-wrap gap-2 items-end">
                          <label className="flex-1 min-w-[160px]">
                            <span className="text-xs text-gray-500">Label</span>
                            <input
                              value={row.label}
                              onChange={(e) => patchOptionRow(key, i, { label: e.target.value })}
                              className="w-full h-10 px-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </label>
                          <label className="w-28">
                            <span className="text-xs text-gray-500">+$ AUD</span>
                            <input
                              type="number"
                              min={0}
                              step={50}
                              value={row.priceDeltaAUD}
                              onChange={(e) =>
                                patchOptionRow(key, i, {
                                  priceDeltaAUD: Math.max(0, parseFloat(e.target.value) || 0),
                                })
                              }
                              className="w-full h-10 px-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => removeOptionRow(key, i)}
                            className="h-10 px-2 text-red-600 hover:bg-red-50 rounded-lg border border-red-200"
                            aria-label="Remove option"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addOptionRow(key)}
                        className="inline-flex items-center gap-1 text-sm text-amber-700 font-medium mt-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add option
                      </button>
                    </div>
                  </details>
                );
              })}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Conflict rules</h2>
              </div>
              <p className="text-sm text-gray-600">
                Each rule: if <strong>When field</strong> is one of the listed values, then <strong>Block field</strong>{" "}
                must not be one of the blocked values. Example: configuration &quot;S (neck only)&quot; with a
                bridge humbucker model — block those bridge models.
              </p>
              <button
                type="button"
                onClick={addConstraintRule}
                className="inline-flex items-center gap-2 text-sm font-medium text-amber-700"
              >
                <Plus className="w-4 h-4" />
                Add rule
              </button>
              <div className="space-y-4">
                {catalog.constraintRules.map((rule) => (
                  <div key={rule.id} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50/50">
                    <div className="flex justify-between items-center">
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={(e) => patchRule(rule.id, { enabled: e.target.checked })}
                        />
                        Enabled
                      </label>
                      <button
                        type="button"
                        onClick={() => removeConstraintRule(rule.id)}
                        className="text-red-600 text-sm inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    </div>
                    <label className="block">
                      <span className="text-xs font-medium text-gray-600">Message shown to client</span>
                      <textarea
                        value={rule.message}
                        onChange={(e) => patchRule(rule.id, { message: e.target.value })}
                        rows={2}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs font-medium text-gray-600">When field</span>
                        <select
                          value={rule.when.field}
                          onChange={(e) =>
                            patchRule(rule.id, {
                              when: { ...rule.when, field: e.target.value as CustomShopCatalogSpecKey },
                            })
                          }
                          className="mt-1 w-full h-10 border border-gray-300 rounded-lg text-sm"
                        >
                          {FIELD_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        <label className="block mt-2">
                          <span className="text-xs text-gray-500">When values (one per line, exact label)</span>
                          <textarea
                            value={rule.when.anyOf.join("\n")}
                            onChange={(e) =>
                              patchRule(rule.id, {
                                when: { ...rule.when, anyOf: parseLines(e.target.value) },
                              })
                            }
                            rows={3}
                            className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm font-mono"
                          />
                        </label>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-600">Block field</span>
                        <select
                          value={rule.block.field}
                          onChange={(e) =>
                            patchRule(rule.id, {
                              block: { ...rule.block, field: e.target.value as CustomShopCatalogSpecKey },
                            })
                          }
                          className="mt-1 w-full h-10 border border-gray-300 rounded-lg text-sm"
                        >
                          {FIELD_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        <label className="block mt-2">
                          <span className="text-xs text-gray-500">Blocked values (one per line)</span>
                          <textarea
                            value={rule.block.anyOf.join("\n")}
                            onChange={(e) =>
                              patchRule(rule.id, {
                                block: { ...rule.block, anyOf: parseLines(e.target.value) },
                              })
                            }
                            rows={3}
                            className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm font-mono"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-amber-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Save to Firestore
              </button>
              <button
                type="button"
                onClick={handleReloadServer}
                disabled={saving}
                className="inline-flex items-center gap-2 border border-gray-300 px-5 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                <RotateCcw className="w-5 h-5" />
                Reload from server
              </button>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="inline-flex items-center gap-2 border border-amber-300 text-amber-800 px-5 py-2.5 rounded-xl hover:bg-amber-50"
              >
                Reset editor to code defaults
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
