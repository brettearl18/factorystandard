import { useEffect, useState } from "react";
import { Edit, Phone, Mail, MapPin, MessageSquare, X } from "lucide-react";
import type { ClientProfile } from "@/types/guitars";

interface ClientContactCardProps {
  profile: ClientProfile | null;
  onSave: (updates: Partial<ClientProfile>) => Promise<void>;
  canEdit?: boolean;
}

export function ClientContactCard({ profile, onSave, canEdit = true }: ClientContactCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
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
      setIsModalOpen(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Failed to save profile", error);
      setMessage("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatAddress = () => {
    const addr = profile?.shippingAddress;
    if (!addr) return "Not provided";
    
    const parts = [
      addr.line1,
      addr.line2,
      addr.city,
      addr.state,
      addr.postalCode,
      addr.country,
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(", ") : "Not provided";
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Contact Details</h2>
            <p className="text-sm text-gray-500 mt-1">Your contact information and shipping address</p>
          </div>
          {canEdit && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Phone className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Phone</p>
                <p className="text-gray-900">{profile?.phone || "Not provided"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Mail className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Alternate Email</p>
                <p className="text-gray-900">{profile?.alternateEmail || "Not provided"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <MessageSquare className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Preferred Contact</p>
                <p className="text-gray-900 capitalize">{profile?.preferredContact || "Email"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <MapPin className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 mb-1">Shipping Address</p>
                <p className="text-gray-900">{formatAddress()}</p>
              </div>
            </div>
          </div>

          {profile?.notes && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-500 mb-2">Notes</p>
              <p className="text-gray-900">{profile.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Edit Contact Details</h2>
                <p className="text-sm text-gray-500 mt-1">Update your contact information</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">
              {message && (
                <div className={`p-3 rounded-lg ${
                  message.includes("Failed") 
                    ? "bg-red-50 text-red-700" 
                    : "bg-green-50 text-green-700"
                }`}>
                  {message}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formState.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="+61 400 000 000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Alternate Email</label>
                  <input
                    type="email"
                    value={formState.alternateEmail}
                    onChange={(e) => handleChange("alternateEmail", e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="backup@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Preferred Contact</label>
                  <select
                    value={formState.preferredContact}
                    onChange={(e) => handleChange("preferredContact", e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Shipping Address</label>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Address Line 1"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    value={formState.line1}
                    onChange={(e) => handleChange("line1", e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Address Line 2 (Optional)"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    value={formState.line2}
                    onChange={(e) => handleChange("line2", e.target.value)}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="City"
                      className="border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={formState.city}
                      onChange={(e) => handleChange("city", e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="State"
                      className="border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={formState.state}
                      onChange={(e) => handleChange("state", e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Postal Code"
                      className="border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={formState.postalCode}
                      onChange={(e) => handleChange("postalCode", e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Country"
                      className="border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={formState.country}
                      onChange={(e) => handleChange("country", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                <textarea
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                  value={formState.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  placeholder="Additional notes or special instructions..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all font-medium shadow-lg"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

