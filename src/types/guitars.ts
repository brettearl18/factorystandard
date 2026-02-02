export type UserRole = "staff" | "client" | "admin" | "factory" | "accounting";

export interface Run {
  id: string;
  name: string;           // e.g. "Perth Run #7 – March 2026"
  factory: "perth";       // only perth runs for now
  isActive: boolean;
  startsAt: number;       // Date.now()
  endsAt?: number;
  thumbnailUrl?: string; // thumbnail image for easy reference
  archived?: boolean;     // true if archived (soft delete)
  archivedAt?: number;    // timestamp when archived
  specConstraints?: {     // Optional constraints for spec options allowed in this run
    bodyWood?: string[];
    topWood?: string[];
    neckWood?: string[];
    fretboardWood?: string[];
    pickupNeck?: string[];
    pickupBridge?: string[];
    pickupConfiguration?: string[];
    controls?: string[];
    switch?: string[];
    bridge?: string[];
    tuners?: string[];
    nut?: string[];
    pickguard?: string[];
    strings?: string[];
    stringGauge?: string[];
    scaleLength?: string[];
    action?: string[];
    finishType?: string[];
    binding?: string[];
    inlays?: string[];
    frets?: string[];
    neckProfile?: string[];
    radius?: string[];
    handedness?: string[];
  };
}

export interface InvoiceSchedule {
  enabled: boolean;        // whether to create invoice when guitar reaches this stage
  title?: string;         // invoice title (defaults to stage label if not provided)
  amount?: number;         // invoice amount (required if enabled)
  currency?: string;       // invoice currency (defaults to AUD)
  dueDateDays?: number;   // days from stage entry until due date (defaults to 30)
  paymentLink?: string;   // optional payment link
  description?: string;   // optional invoice description
}

export interface RunStage {
  id: string;             // document id under runs/{runId}/stages
  label: string;          // internal label e.g. "Neck Carve & Routing"
  order: number;          // column order
  internalOnly: boolean;  // true = clients never see this stage directly
  requiresNote?: boolean; // prompt for note on move
  requiresPhoto?: boolean;// prompt for photo on move
  clientStatusLabel?: string; // simplified client-facing status e.g. "In Build"
  invoiceSchedule?: InvoiceSchedule; // invoice schedule for this stage
}

export interface GuitarSpecs {
  // Timber/Wood
  bodyWood?: string;
  neckWood?: string;
  fretboardWood?: string;
  topWood?: string;
  
  // Hardware
  bridge?: string;
  tuners?: string;
  nut?: string;
  pickguard?: string;
  
  // Electronics
  pickups?: string; // Legacy - kept for backward compatibility
  pickupNeck?: string;
  pickupBridge?: string;
  pickupConfiguration?: string; // e.g., "H-H", "H-S-S", "S-S"
  controls?: string;
  switch?: string;
  
  // Strings & Setup
  strings?: string;
  stringGauge?: string;
  scaleLength?: string;
  action?: string;
  
  // Finish & Appearance
  finishColor?: string;
  finishType?: string; // e.g., "Nitro", "Poly", "Oil"
  binding?: string;
  inlays?: string;
  
  // Other
  frets?: string;
  neckProfile?: string;
  radius?: string;
  handedness?: string; // "Left Handed" or "Right Handed"
  customNotes?: string;
}

export interface GuitarBuild {
  id: string;
  runId: string;
  stageId: string;        // RunStage id under runs/{runId}/stages
  clientUid?: string;      // Firebase auth uid of owner (optional - can be assigned later)
  customerName?: string;   // Optional - can be assigned later
  customerEmail?: string;  // Optional - can be assigned later
  orderNumber: string;
  model: string;          // e.g. "Hype GTR"
  finish: string;         // e.g. "Interstellar"
  serial?: string;
  specs?: GuitarSpecs;   // Build specifications
  referenceImages?: string[]; // Initial reference images uploaded when creating guitar
  createdAt: number;
  updatedAt: number;
  coverPhotoUrl?: string;
  photoCount?: number;
  archived?: boolean;     // true if archived (soft delete)
  archivedAt?: number;    // timestamp when archived
  price?: number;         // Total price/value of the guitar
  currency?: string;      // Currency for price (defaults to AUD)
  invoiceTriggerStageId?: string; // Stage ID that triggers invoice creation
}

export type NoteType = 
  | "update"
  | "milestone"
  | "issue"
  | "quality_check"
  | "status_change"
  | "general";

/** When a client marks an update as viewed (thumbs up). uid -> timestamp ms */
export type ViewedByMap = Record<string, number>;

export interface GuitarNote {
  id: string;
  guitarId: string;
  stageId: string;
  authorUid: string;
  authorName: string;
  message: string;
  type?: NoteType; // Type of update
  createdAt: number;
  visibleToClient: boolean;
  photoUrls?: string[];
  /** Client uids who marked this note as viewed (thumbs up), with timestamp */
  viewedBy?: ViewedByMap;
}

/** Comment on a guitar note (subcollection guitars/{id}/notes/{noteId}/comments) */
export interface NoteComment {
  id: string;
  authorUid: string;
  authorName: string;
  message: string;
  createdAt: number;
}

export interface ClientProfile {
  uid: string;
  phone?: string;
  alternateEmail?: string;
  shippingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  preferredContact?: "phone" | "email" | "sms";
  notes?: string;
  updatedAt?: number;
  updatedBy?: string;
  // Initial login credentials (stored when account is created)
  initialPassword?: string; // Only visible to staff/admin
  accountCreatedAt?: number; // Timestamp when account was created
  accountCreatedBy?: string; // UID of staff/admin who created the account
  // Run assignments - clients can only see runs they're assigned to
  assignedRunIds?: string[]; // Array of run IDs this client has access to
  // Archive (soft delete for dev/test cleanup)
  archived?: boolean;
  archivedAt?: number;
  archivedBy?: string;
}

export interface InvoicePayment {
  id: string;
  amount: number;
  currency: string;
  method: string;
  note?: string;
  paidAt: number;
  recordedBy: string;
  receiptUrl?: string; // Screenshot/receipt image URL
  approvalStatus?: "pending" | "approved" | "rejected"; // Approval status for client-recorded payments
  approvedBy?: string; // UID of staff/accounting who approved/rejected
  approvedAt?: number; // Timestamp when approved/rejected
  rejectionReason?: string; // Reason if rejected
}

export interface InvoiceRecord {
  id: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "overdue" | "partial";
  dueDate?: number;
  dueDaysAfterTrigger?: number; // Days after trigger stage to set due date
  downloadUrl?: string;
  paymentLink?: string; // URL for payment (e.g., Stripe, PayPal, bank transfer link)
  uploadedAt: number;
  uploadedBy: string;
  payments?: InvoicePayment[];
  guitarId?: string;     // Link to guitar if invoice is for a specific guitar
  triggeredByStageId?: string; // Stage ID that triggered this invoice
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  readAt?: number;
  createdAt: number;
  // Related entity IDs for navigation
  guitarId?: string;
  runId?: string;
  noteId?: string;
  // Additional metadata
  metadata?: {
    guitarModel?: string;
    guitarFinish?: string;
    customerName?: string;
    stageName?: string;
    runName?: string;
    authorName?: string;
    noteType?: string; // Type of note (update, milestone, issue, etc.)
  };
}

export type NotificationType =
  | "guitar_stage_changed"
  | "guitar_note_added"
  | "guitar_note_comment"
  | "guitar_created"
  | "guitar_assigned"
  | "run_created"
  | "run_archived"
  | "guitar_archived"
  | "run_update"
  | "run_update_comment"
  | "payment_pending_approval";

export interface RunUpdate {
  id: string; // document id under runs/{runId}/updates
  runId: string;
  title: string;
  message: string;
  authorUid: string;
  authorName: string;
  createdAt: number;
  visibleToClients: boolean; // if false, only staff can see
  imageUrls?: string[]; // Optional images attached to the update
  /** Client uids who marked this update as viewed (thumbs up), with timestamp */
  viewedBy?: ViewedByMap;
}

/** Comment on a run update (subcollection runs/{runId}/updates/{updateId}/comments) */
export interface RunUpdateComment {
  id: string;
  authorUid: string;
  authorName: string;
  message: string;
  createdAt: number;
}

/** Audit log action types for client/staff activity */
export type AuditAction =
  | "login"
  | "view_my_guitars"
  | "view_guitar"
  | "view_run_updates";

export interface AuditLogEntry {
  id: string;
  userId: string;
  userEmail: string | null;
  userRole: UserRole | null;
  action: AuditAction;
  details: Record<string, unknown>; // e.g. { guitarId, runId }
  createdAt: number; // timestamp (ms or Firestore Timestamp)
}

