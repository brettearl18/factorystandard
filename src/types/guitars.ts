export type UserRole = "staff" | "client" | "admin";

export interface Run {
  id: string;
  name: string;           // e.g. "Perth Run #7 – March 2026"
  factory: "perth";       // only perth runs for now
  isActive: boolean;
  startsAt: number;       // Date.now()
  endsAt?: number;
  archived?: boolean;     // true if archived (soft delete)
  archivedAt?: number;    // timestamp when archived
}

export interface RunStage {
  id: string;             // document id under runs/{runId}/stages
  label: string;          // internal label e.g. "Neck Carve & Routing"
  order: number;          // column order
  internalOnly: boolean;  // true = clients never see this stage directly
  requiresNote?: boolean; // prompt for note on move
  requiresPhoto?: boolean;// prompt for photo on move
  clientStatusLabel?: string; // simplified client-facing status e.g. "In Build"
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
}

export interface GuitarNote {
  id: string;
  guitarId: string;
  stageId: string;
  authorUid: string;
  authorName: string;
  message: string;
  createdAt: number;
  visibleToClient: boolean;
  photoUrls?: string[];
}

