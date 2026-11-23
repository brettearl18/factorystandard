"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ClientContactCard } from "@/components/client/ClientContactCard";
import { InvoiceList } from "@/components/client/InvoiceList";
import { useClientProfile } from "@/hooks/useClientProfile";
import { useClientInvoices } from "@/hooks/useClientInvoices";
import { useClientGuitars } from "@/hooks/useClientGuitars";
import { updateClientProfile } from "@/lib/firestore";
import type { ClientProfile } from "@/types/guitars";

export default function ClientSettingsPage() {
  const { currentUser, userRole, loading } = useAuth();
  const router = useRouter();
  const isClient = userRole === "client";
  const profile = useClientProfile(isClient ? currentUser?.uid || null : null);
  const invoices = useClientInvoices(isClient ? currentUser?.uid || null : null);
  const clientGuitars = useClientGuitars(isClient ? currentUser?.uid || null : null);

  useEffect(() => {
    if (loading) return;
    if (!currentUser) {
      router.push("/login");
      return;
    }
    if (!isClient) {
      router.push("/settings");
    }
  }, [currentUser, loading, isClient, router]);

  if (loading || !currentUser || !isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  const handleSaveProfile = (updates: Partial<ClientProfile>) => {
    if (!currentUser) return Promise.resolve();
    return updateClientProfile(currentUser.uid, updates, currentUser.uid);
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500">
            Manage your contact details, invoices, and payment history.
          </p>
        </div>

        <ClientContactCard
          profile={profile}
          onSave={handleSaveProfile}
          canEdit={true}
        />

        {/* TEMP: invoices hidden from client view for now
        <InvoiceList
          invoices={invoices}
          canManage={false}
          canEditDelete={false}
          clientUid={currentUser?.uid}
          clientGuitars={clientGuitars}
          totalOrderAmount={profile?.totalOrderAmount}
          totalOrderCurrency={profile?.totalOrderCurrency || "AUD"}
        />
        */}
      </div>
    </AppLayout>
  );
}

