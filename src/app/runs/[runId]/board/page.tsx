"use client";

import { use } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { RunBoard } from "@/components/runs/RunBoard";

export default function RunBoardPage({
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

    if (userRole !== "staff" && userRole !== "admin") {
      router.push("/my-guitars");
      return;
    }
  }, [currentUser, userRole, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!currentUser || (userRole !== "staff" && userRole !== "admin")) {
    return null;
  }

  return (
    <AppLayout>
      <RunBoard runId={runId} />
    </AppLayout>
  );
}

