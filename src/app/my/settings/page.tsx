"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ClientContactCard } from "@/components/client/ClientContactCard";
import { InvoiceList } from "@/components/client/InvoiceList";
import { UploadInvoiceModal } from "@/components/client/UploadInvoiceModal";
import { RecordPaymentModal } from "@/components/client/RecordPaymentModal";
import { useClientProfile } from "@/hooks/useClientProfile";
import { useClientInvoices } from "@/hooks/useClientInvoices";
import { updateClientProfile } from "@/lib/firestore";
import type { ClientProfile, InvoiceRecord } from "@/types/guitars";

export default function ClientSettingsPage() {
  const { currentUser, userRole, loading } = useAuth();
  const router = useRouter();
  const isClient = userRole === "client";
  const profile = useClientProfile(isClient ? currentUser?.uid || null : null);
  const invoices = useClientInvoices(isClient ? currentUser?.uid || null : null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<InvoiceRecord | null>(null);

  const canManageInvoices = userRole === "staff" || userRole === "admin";

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

        <InvoiceList
          invoices={invoices}
          canManage={canManageInvoices}
          onUploadInvoice={() => setIsUploadModalOpen(true)}
          onRecordPayment={(invoice) => setPaymentInvoice(invoice)}
        />
      </div>

      {canManageInvoices && currentUser && (
        <UploadInvoiceModal
          clientUid={currentUser.uid}
          uploadedBy={currentUser.uid}
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
        />
      )}

      {canManageInvoices && (
        <RecordPaymentModal
          clientUid={currentUser.uid}
          invoice={paymentInvoice}
          isOpen={Boolean(paymentInvoice)}
          onClose={() => setPaymentInvoice(null)}
        />
      )}
    </AppLayout>
  );
}

