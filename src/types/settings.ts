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

export interface AppSettings {
  branding: BrandingSettings;
  general: GeneralSettings;
  email: EmailSettings;
  notifications: NotificationSettings;
  system: SystemSettings;
  updatedAt: number;
  updatedBy: string;
}

