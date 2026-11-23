"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { RunFinancialReport } from "@/components/runs/RunFinancialReport";
import { canViewRunFinancials } from "@/lib/runFinancialAccess";

export default function RunFinancialsPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = use(params);
  const { currentUser, userRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!currentUser) {
      router.push("/login");
      return;
    }
    if (!canViewRunFinancials(userRole)) {
      router.push("/");
      return;
    }
  }, [currentUser, userRole, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!currentUser || !canViewRunFinancials(userRole)) {
    return null;
  }

  return (
    <AppLayout>
      <RunFinancialReport runId={runId} />
    </AppLayout>
  );
}
