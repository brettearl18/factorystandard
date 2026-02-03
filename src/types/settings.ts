export interface BrandingSettings {
  companyName: string;
  companyLogo?: string;
  favicon?: string;
  backgroundImage?: string; // Background image URL for dashboard/design
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  footerText?: string;
}

export interface GeneralSettings {
  companyAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  contactEmail?: string;
  contactPhone?: string;
  websiteUrl?: string;
  timezone?: string;
}

export interface EmailSettings {
  fromName?: string;
  fromEmail?: string;
  replyToEmail?: string;
  smtpEnabled?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string; // Note: In production, this should be encrypted
}

export interface NotificationSettings {
  emailNotificationsEnabled: boolean;
  notifyOnNewGuitar: boolean;
  notifyOnStageChange: boolean;
  notifyOnNoteAdded: boolean;
  notifyOnInvoiceCreated: boolean;
  notifyOnPaymentReceived: boolean;
}

export interface SystemSettings {
  maintenanceMode: boolean;
  allowClientRegistration: boolean;
  defaultClientRole: "client" | "staff" | "admin";
  sessionTimeout: number; // in minutes
  maxFileUploadSize: number; // in MB
}

/** Master list of allowed options per run spec category (body wood, top wood, etc.). */
export interface RunSpecSettings {
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
}

export interface AppSettings {
  branding: BrandingSettings;
  general: GeneralSettings;
  email: EmailSettings;
  notifications: NotificationSettings;
  system: SystemSettings;
  runSpecs?: RunSpecSettings;
  updatedAt: number;
  updatedBy: string;
}

