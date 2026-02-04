"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createCustomShopRequest } from "@/lib/firestore";
import { uploadCustomShopInspirationImage } from "@/lib/storage";
import { compressImageForUpload } from "@/utils/imageCompression";
import { ArrowLeft, Upload, X, Loader2, AlertCircle, ExternalLink, AlertTriangle, ImageIcon } from "lucide-react";

const DEPOSIT_AUD = 1000;
const MAX_IMAGES = 6;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

export default function CustomShopSubmitPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [dreamGuitar, setDreamGuitar] = useState("");
  const [motivation, setMotivation] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [inspirationFiles, setInspirationFiles] = useState<File[]>([]);
  const [depositAgreed, setDepositAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const images = files.filter((f) => f.type.startsWith("image/"));
    setInspirationFiles((prev) => [...prev, ...images].slice(0, MAX_IMAGES));
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setInspirationFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = dreamGuitar.trim();
    if (!trimmed) {
      setError("Please tell us about your dream guitar — we want to hear it in your words.");
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
        guitarDescription: trimmed,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/custom-shop" className="text-gray-600 hover:text-gray-900 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Submit a Custom Shop request</h1>
      <p className="text-gray-600">
        We want to hear about your dream guitar in your own words — and see what inspires you. Tell us the vision; we'll help bring it to life.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Inspiration images – prominent first */}
        <Section title="Inspiration — show us what you're drawn to">
          <p className="text-gray-600 text-sm">
            Upload photos that capture the look, feel, or vibe you're after. Guitars, finishes, colours, shapes — anything that speaks to your vision. We'll use these to get a true feel for what you want.
          </p>
          <div className="flex flex-wrap gap-4">
            {inspirationFiles.map((file, i) => (
              <div key={i} className="relative w-28 h-28 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 group shadow-sm">
                <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                  aria-label="Remove image"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            ))}
            {inspirationFiles.length < MAX_IMAGES && (
              <label className="w-28 h-28 rounded-xl border-2 border-dashed border-amber-300 flex flex-col items-center justify-center cursor-pointer hover:border-amber-500 hover:bg-amber-50/50 transition-colors text-amber-700">
                <ImageIcon className="w-8 h-8 mb-1" />
                <span className="text-xs font-medium">Add</span>
                <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
              </label>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Max {MAX_IMAGES} images. We'll compress them to save space.{" "}
            <a
              href="https://ormsbyguitars.com/pages/custom-shop"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View past Custom Shop builds
            </a>
          </p>
        </Section>

        {/* Dream guitar – main narrative */}
        <Section title="Tell us about your dream guitar">
          <p className="text-gray-600 text-sm mb-3">
            Describe it in your own words. What does it look like? What do you want it to sound like? What details matter most? We want to hear the vision and the passion behind it.
          </p>
          <textarea
            value={dreamGuitar}
            onChange={(e) => setDreamGuitar(e.target.value)}
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
            placeholder="e.g. I'm imagining a Hype-style body with a deep burst that goes from black at the edges to amber in the centre. I want it to feel like my main player — something that can do cleans and high-gain, with a neck that's fast but not too thin..."
            required
            disabled={submitting}
          />
        </Section>

        {/* Motivation – why now, commitment */}
        <Section title="Why this build, and why now? (optional)">
          <p className="text-gray-600 text-sm mb-3">
            We'd love to know what's driving you to build this guitar and that you're ready to wait for something made just for you. A sentence or two is enough.
          </p>
          <textarea
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
            placeholder="e.g. I've wanted a custom Ormsby for years. I'm in no rush — I'd rather wait and get exactly what I'm imagining."
            disabled={submitting}
          />
        </Section>

        {/* Timeline / other */}
        <Section title="Anything else? (optional)">
          <p className="text-gray-600 text-sm mb-3">
            Specific specs you already know, rough timeline, budget, or any references. If you don't know yet, that's fine — we'll work through it together.
          </p>
          <textarea
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            rows={2}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
            placeholder="e.g. Ideally ready by next summer. Open on woods — would love your recommendation."
            disabled={submitting}
          />
        </Section>

        {/* Timeline warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900">Build timeline</p>
            <p className="text-xs text-amber-800">
              Your build may start <strong>6–18 months</strong> after acceptance and deposit is paid. Build duration varies. Our team will keep you updated.
            </p>
          </div>
        </div>

        {/* Deposit */}
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={depositAgreed}
              onChange={(e) => setDepositAgreed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              disabled={submitting}
            />
            <span className="text-gray-800">
              I agree to a <strong>${DEPOSIT_AUD.toLocaleString()} AUD</strong> deposit to proceed once my request is approved. This deposit will be applied to my order.
            </span>
          </label>
        </div>

        <div className="flex gap-3">
          <Link href="/custom-shop" className="px-6 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || !dreamGuitar.trim() || !depositAgreed}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-amber-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
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
        </div>
      </form>
    </div>
  );
}
