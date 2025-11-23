"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { subscribeGuitar, getRun, subscribeRunStages, subscribeGuitarNotes } from "@/lib/firestore";
import { GuitarInvoiceManager } from "@/components/guitars/GuitarInvoiceManager";
import { ArrowLeft, X, Camera, User, Mail, Package, Hash, Calendar, Settings, TreePine, Zap, Music, Palette, DollarSign } from "lucide-react";
import type { GuitarBuild, GuitarNote, RunStage } from "@/types/guitars";

export default function GuitarDetailPage({
  params,
}: {
  params: Promise<{ guitarId: string }>;
}) {
  const { guitarId } = use(params);
  const { currentUser, userRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const [guitar, setGuitar] = useState<GuitarBuild | null>(null);
  const [notes, setNotes] = useState<GuitarNote[]>([]);
  const [stage, setStage] = useState<RunStage | null>(null);
  const [run, setRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      router.push("/login");
      return;
    }

    // Only accounting, staff, admin, and factory can access
    if (userRole !== "accounting" && userRole !== "staff" && userRole !== "admin" && userRole !== "factory") {
      router.push("/");
      return;
    }
  }, [currentUser, userRole, authLoading, router]);

  useEffect(() => {
    if (!guitarId) return;

    const unsubscribes: (() => void)[] = [];

    // Subscribe to guitar
    const unsubscribeGuitar = subscribeGuitar(guitarId, (loadedGuitar) => {
      setGuitar(loadedGuitar);
      if (loadedGuitar) {
        // Load run and stage
        getRun(loadedGuitar.runId).then((runData) => {
          setRun(runData);
        });

        const unsubscribeStages = subscribeRunStages(loadedGuitar.runId, (loadedStages) => {
          const currentStage = loadedStages.find((s) => s.id === loadedGuitar.stageId);
          setStage(currentStage || null);
        });
        unsubscribes.push(unsubscribeStages);

        // Load notes
        const unsubscribeNotes = subscribeGuitarNotes(guitarId, (loadedNotes) => {
          setNotes(loadedNotes);
        });
        unsubscribes.push(unsubscribeNotes);
      }
      setLoading(false);
    });
    unsubscribes.push(unsubscribeGuitar);

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [guitarId]);

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (!guitar) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-lg text-gray-600 mb-4">Guitar not found</p>
            <button
              onClick={() => router.push("/guitars")}
              className="text-blue-600 hover:text-blue-700"
            >
              Back to Guitars
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/guitars")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Guitars
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{guitar.model}</h1>
              <p className="text-xl text-gray-600 mt-1">{guitar.finish}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left Column - Main Info */}
          <div className="space-y-6">
            {/* Cover Photo */}
            {guitar.coverPhotoUrl && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cover Photo
                </label>
                <img
                  src={guitar.coverPhotoUrl}
                  alt={guitar.model}
                  className="w-full h-64 object-cover rounded-lg border border-gray-200"
                />
              </div>
            )}

            {/* Guitar Details */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Guitar Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    Order Number
                  </span>
                  <span className="font-semibold text-gray-900">
                    {guitar.orderNumber}
                  </span>
                </div>
                {guitar.serial && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      Serial Number
                    </span>
                    <span className="font-mono text-gray-900">
                      {guitar.serial}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Created
                  </span>
                  <span className="text-gray-900">
                    {new Date(guitar.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Last Updated
                  </span>
                  <span className="text-gray-900">
                    {new Date(guitar.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                {guitar.price !== undefined && guitar.price > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <span className="text-gray-500 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Price
                    </span>
                    <span className="font-semibold text-gray-900">
                      {guitar.currency || "AUD"} ${guitar.price.toLocaleString()}
                    </span>
                  </div>
                )}
                {stage && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Current Stage</span>
                    <span className="font-semibold text-blue-600">
                      {stage.label}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Client Information */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="w-5 h-5" />
                Client Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Name
                  </span>
                  <span className="font-semibold text-gray-900">
                    {guitar.customerName || "No customer assigned"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </span>
                  <a
                    href={guitar.customerEmail ? `mailto:${guitar.customerEmail}` : undefined}
                    className={guitar.customerEmail ? "text-blue-600 hover:text-blue-700 hover:underline" : "text-gray-400"}
                  >
                    {guitar.customerEmail || "No email assigned"}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Invoices & Payments (for accounting) */}
          <div className="space-y-6">
            {userRole === "accounting" && (
              <GuitarInvoiceManager
                guitar={guitar}
                onUpdate={() => {
                  // Guitar data will refresh automatically via subscription
                }}
              />
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

