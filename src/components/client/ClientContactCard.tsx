import { useEffect, useState } from "react";
import type { ClientProfile } from "@/types/guitars";

interface ClientContactCardProps {
  profile: ClientProfile | null;
  onSave: (updates: Partial<ClientProfile>) => Promise<void>;
  canEdit?: boolean;
}

export function ClientContactCard({ profile, onSave, canEdit = true }: ClientContactCardProps) {
  const [formState, setFormState] = useState({
    phone: "",
    alternateEmail: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    preferredContact: "email",
    notes: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFormState({
        phone: profile.phone || "",
        alternateEmail: profile.alternateEmail || "",
        line1: profile.shippingAddress?.line1 || "",
        line2: profile.shippingAddress?.line2 || "",
        city: profile.shippingAddress?.city || "",
        state: profile.shippingAddress?.state || "",
        postalCode: profile.shippingAddress?.postalCode || "",
        country: profile.shippingAddress?.country || "",
        preferredContact: profile.preferredContact || "email",
        notes: profile.notes || "",
      });
    }
  }, [profile]);

  const handleChange = (field: string, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    setIsSaving(true);
    setMessage(null);
    try {
      await onSave({
        phone: formState.phone || undefined,
        alternateEmail: formState.alternateEmail || undefined,
        preferredContact: formState.preferredContact as ClientProfile["preferredContact"],
        notes: formState.notes || undefined,
        shippingAddress: {
          line1: formState.line1 || undefined,
          line2: formState.line2 || undefined,
          city: formState.city || undefined,
          state: formState.state || undefined,
          postalCode: formState.postalCode || undefined,
          country: formState.country || undefined,
        },
      });
      setMessage("Saved!");
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Failed to save profile", error);
      setMessage("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Contact Details</h2>
          <p className="text-sm text-gray-500">Update your preferred contact information.</p>
        </div>
        {message && <span className="text-sm text-green-600">{message}</span>}
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formState.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              placeholder="+61 400 000 000"
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Email</label>
            <input
              type="email"
              value={formState.alternateEmail}
              onChange={(e) => handleChange("alternateEmail", e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              placeholder="backup@email.com"
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Contact</label>
            <select
              value={formState.preferredContact}
              onChange={(e) => handleChange("preferredContact", e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              disabled={!canEdit}
            >
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="sms">SMS</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Address</label>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Line 1"
              className="w-full border rounded-md px-3 py-2"
              value={formState.line1}
              onChange={(e) => handleChange("line1", e.target.value)}
              disabled={!canEdit}
            />
            <input
              type="text"
              placeholder="Line 2"
              className="w-full border rounded-md px-3 py-2"
              value={formState.line2}
              onChange={(e) => handleChange("line2", e.target.value)}
              disabled={!canEdit}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="City"
                className="border rounded-md px-3 py-2"
                value={formState.city}
                onChange={(e) => handleChange("city", e.target.value)}
                disabled={!canEdit}
              />
              <input
                type="text"
                placeholder="State"
                className="border rounded-md px-3 py-2"
                value={formState.state}
                onChange={(e) => handleChange("state", e.target.value)}
                disabled={!canEdit}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Postal Code"
                className="border rounded-md px-3 py-2"
                value={formState.postalCode}
                onChange={(e) => handleChange("postalCode", e.target.value)}
                disabled={!canEdit}
              />
              <input
                type="text"
                placeholder="Country"
                className="border rounded-md px-3 py-2"
                value={formState.country}
                onChange={(e) => handleChange("country", e.target.value)}
                disabled={!canEdit}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            className="w-full border rounded-md px-3 py-2 h-24"
            value={formState.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            disabled={!canEdit}
          />
        </div>

        {canEdit && (
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

