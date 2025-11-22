/**
 * Firestore Operations
 * 
 * COST OPTIMIZATION NOTES:
 * - All queries use limits where appropriate to minimize read operations
 * - Notifications: Limited to 50 most recent (configurable)
 * - Notes: Can be limited per query (used for client dashboard - only fetches 1 most recent)
 * - Invoices: Limited to 100 most recent
 * - Dashboard: Only loads 100 most recent guitars instead of all
 * - Real-time listeners (onSnapshot) are used only when necessary for live updates
 * - All listeners are properly unsubscribed to prevent memory leaks and unnecessary reads
 */

import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  addDoc,
  deleteDoc,
  writeBatch,
  Timestamp,
  QuerySnapshot,
  DocumentData,
  Unsubscribe,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  Run,
  RunStage,
  GuitarBuild,
  GuitarNote,
  Notification,
  ClientProfile,
  InvoiceRecord,
  InvoicePayment,
} from "@/types/guitars";
import type { AppSettings } from "@/types/settings";

// Run queries
export async function getRun(runId: string): Promise<Run | null> {
  const runDoc = await getDoc(doc(db, "runs", runId));
  if (!runDoc.exists()) return null;
  return { id: runDoc.id, ...runDoc.data() } as Run;
}

export function subscribeRuns(
  callback: (runs: Run[]) => void,
  includeArchived: boolean = false
): Unsubscribe {
  const runsRef = collection(db, "runs");
  // Query all runs and filter in memory to handle documents without archived field
  const q = query(runsRef, orderBy("startsAt", "desc"));
  
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const runs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Run[];
    // Filter out archived items if includeArchived is false
    // Documents without archived field are treated as not archived
    const filteredRuns = includeArchived 
      ? runs 
      : runs.filter((r) => !r.archived);
    callback(filteredRuns);
  });
}

export async function createRun(runData: Omit<Run, "id">): Promise<string> {
  const runsRef = collection(db, "runs");
  const docRef = await addDoc(runsRef, {
    ...runData,
    startsAt: Timestamp.now().toMillis(),
  });
  
  // Notify all staff about new run (non-blocking)
  notifyAllStaff({
    type: "run_created",
    title: `New Run Created: ${runData.name}`,
    message: `A new run "${runData.name}" has been created`,
    read: false,
    runId: docRef.id,
    metadata: {
      runName: runData.name,
    },
  }).catch((error) => {
    // Log error but don't throw - notifications are non-critical
    console.error("Failed to send notifications for new run:", error);
  });
  
  return docRef.id;
}

export async function updateRun(
  runId: string,
  updates: Partial<Omit<Run, "id">>
): Promise<void> {
  const runRef = doc(db, "runs", runId);
  await updateDoc(runRef, updates);
}

export async function createStage(
  runId: string,
  stageData: Omit<RunStage, "id">
): Promise<string> {
  const stagesRef = collection(db, "runs", runId, "stages");
  const docRef = await addDoc(stagesRef, stageData);
  return docRef.id;
}

export function subscribeRunStages(
  runId: string,
  callback: (stages: RunStage[]) => void
): Unsubscribe {
  const stagesRef = collection(db, "runs", runId, "stages");
  const q = query(stagesRef, orderBy("order", "asc"));
  
  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const stages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as RunStage[];
      callback(stages);
    },
    (error: any) => {
      // Suppress permission errors - they're handled by redirecting users
      if (error?.code !== "permission-denied") {
        console.error("Error subscribing to run stages:", error);
      }
      callback([]);
    }
  );
}

// Guitar queries
export function subscribeGuitarsForRun(
  runId: string,
  callback: (guitars: GuitarBuild[]) => void,
  includeArchived: boolean = false
): Unsubscribe {
  const guitarsRef = collection(db, "guitars");
  // Query all guitars for the run and filter in memory to handle documents without archived field
  const q = query(
    guitarsRef,
    where("runId", "==", runId),
    orderBy("createdAt", "desc")
  );
  
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const guitars = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as GuitarBuild[];
    // Filter out archived items if includeArchived is false
    // Documents without archived field are treated as not archived
    const filteredGuitars = includeArchived 
      ? guitars 
      : guitars.filter((g) => !g.archived);
    callback(filteredGuitars);
  });
}

export async function createGuitar(
  guitarData: Omit<GuitarBuild, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const guitarsRef = collection(db, "guitars");
  const now = Timestamp.now().toMillis();
  
  // Remove undefined values - Firestore doesn't accept undefined
  const cleanData: any = {
    runId: guitarData.runId,
    stageId: guitarData.stageId,
    orderNumber: guitarData.orderNumber,
    model: guitarData.model,
    finish: guitarData.finish,
    createdAt: now,
    updatedAt: now,
  };
  
  // Only add customer fields if they are provided
  if (guitarData.clientUid) cleanData.clientUid = guitarData.clientUid;
  if (guitarData.customerName) cleanData.customerName = guitarData.customerName;
  if (guitarData.customerEmail) cleanData.customerEmail = guitarData.customerEmail;
  
  // Only add optional fields if they have values
  if (guitarData.serial) cleanData.serial = guitarData.serial;
  if (guitarData.specs) cleanData.specs = guitarData.specs;
  if (guitarData.referenceImages && guitarData.referenceImages.length > 0) {
    cleanData.referenceImages = guitarData.referenceImages;
  }
  if (guitarData.coverPhotoUrl) cleanData.coverPhotoUrl = guitarData.coverPhotoUrl;
  if (guitarData.photoCount !== undefined) cleanData.photoCount = guitarData.photoCount;
  
  const docRef = await addDoc(guitarsRef, cleanData);
  
  // Notify all staff about new guitar (non-blocking)
  notifyAllStaff({
    type: "guitar_created",
    title: `New Guitar Added: ${guitarData.model}`,
    message: `${guitarData.model} - ${guitarData.finish} (${guitarData.orderNumber})${guitarData.customerName ? ` for ${guitarData.customerName}` : ""}`,
    read: false,
    guitarId: docRef.id,
    runId: guitarData.runId,
    metadata: {
      guitarModel: guitarData.model,
      guitarFinish: guitarData.finish,
      customerName: guitarData.customerName,
    },
  }).catch((error) => {
    // Log error but don't throw - notifications are non-critical
    console.error("Failed to send notifications for new guitar:", error);
  });
  
  return docRef.id;
}

export function subscribeClientGuitars(
  clientUid: string,
  callback: (guitars: GuitarBuild[]) => void,
  includeArchived: boolean = false
): Unsubscribe {
  const guitarsRef = collection(db, "guitars");
  // Query all guitars for the client and filter in memory to handle documents without archived field
  const q = query(
    guitarsRef,
    where("clientUid", "==", clientUid),
    orderBy("createdAt", "desc")
  );
  
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const guitars = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as GuitarBuild[];
    // Filter out archived items if includeArchived is false
    // Documents without archived field are treated as not archived
    const filteredGuitars = includeArchived 
      ? guitars 
      : guitars.filter((g) => !g.archived);
    callback(filteredGuitars);
  });
}

export async function getGuitar(guitarId: string): Promise<GuitarBuild | null> {
  try {
    const guitarDoc = await getDoc(doc(db, "guitars", guitarId));
    if (!guitarDoc.exists()) return null;
    return { id: guitarDoc.id, ...guitarDoc.data() } as GuitarBuild;
  } catch (error: any) {
    // If permission denied, return null (caller will handle redirect)
    if (error?.code === "permission-denied") {
      return null;
    }
    throw error;
  }
}

export function subscribeGuitar(
  guitarId: string,
  callback: (guitar: GuitarBuild | null) => void
): Unsubscribe {
  const guitarRef = doc(db, "guitars", guitarId);
  
  return onSnapshot(
    guitarRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      callback({ id: snapshot.id, ...snapshot.data() } as GuitarBuild);
    },
    (error: any) => {
      // Suppress permission errors - they're handled by redirecting users
      if (error?.code !== "permission-denied") {
        console.error("Error subscribing to guitar:", error);
      }
      callback(null);
    }
  );
}

export async function updateGuitarStage(
  guitarId: string,
  stageId: string,
  updatedBy?: string
): Promise<void> {
  // Get guitar and run info for notification
  const guitar = await getGuitar(guitarId);
  if (!guitar) return;
  
  const run = await getRun(guitar.runId);
  if (!run) return;
  
  // Get stage info
  let stageName = "Unknown Stage";
  let stageData: any = null;
  const stagesRef = collection(db, "runs", guitar.runId, "stages");
  const stageDoc = await getDoc(doc(stagesRef, stageId));
  if (stageDoc.exists()) {
    stageData = stageDoc.data();
    stageName = stageData?.label || stageName;
  }
  const clientStageLabel = stageData?.clientStatusLabel || stageName;
  const isClientVisibleStage = stageData?.internalOnly === false;
  
  await updateDoc(doc(db, "guitars", guitarId), {
    stageId,
    updatedAt: Timestamp.now().toMillis(),
  });
  
  // Check if this stage has an invoice schedule and create invoice if needed (non-blocking)
  if (guitar.clientUid && stageData?.invoiceSchedule?.enabled && stageData.invoiceSchedule.amount) {
    const schedule = stageData.invoiceSchedule;
    const invoiceTitle = schedule.title || `${stageName} - ${guitar.model}`;
    const invoiceAmount = schedule.amount;
    const invoiceCurrency = schedule.currency || "AUD";
    const dueDateDays = schedule.dueDateDays || 30;
    const dueDate = Date.now() + (dueDateDays * 24 * 60 * 60 * 1000);
    
    createInvoiceRecord(guitar.clientUid, {
      title: invoiceTitle,
      description: schedule.description || `Invoice for ${guitar.model} - ${stageName}`,
      amount: invoiceAmount,
      currency: invoiceCurrency,
      status: "pending",
      dueDate,
      paymentLink: schedule.paymentLink,
      uploadedBy: updatedBy || "system",
    }).catch((error) => {
      console.error("Failed to create invoice for stage change:", error);
    });
  }
  
  // Notify all staff about stage change (non-blocking)
  notifyAllStaff({
    type: "guitar_stage_changed",
    title: `Guitar moved to ${stageName}`,
    message: `${guitar.model} - ${guitar.finish} (${guitar.orderNumber}) moved to ${stageName}`,
    read: false,
    guitarId: guitarId,
    runId: guitar.runId,
    metadata: {
      guitarModel: guitar.model,
      guitarFinish: guitar.finish,
      customerName: guitar.customerName,
      stageName: stageName,
      runName: run.name,
    },
  }).catch((error) => {
    // Log error but don't throw - notifications are non-critical
    console.error("Failed to send notifications for stage change:", error);
  });
  
  // Notify client if this stage is visible to them
  if (guitar.clientUid && isClientVisibleStage) {
    notifyUser(guitar.clientUid, {
      type: "guitar_stage_changed",
      title: `${guitar.model} moved to ${clientStageLabel}`,
      message: `Your guitar is now in ${clientStageLabel}.`,
      read: false,
      guitarId: guitarId,
      runId: guitar.runId,
      metadata: {
        guitarModel: guitar.model,
        guitarFinish: guitar.finish,
        stageName: clientStageLabel,
      },
    }).catch((error) => {
      console.error("Failed to send client notification for stage change:", error);
    });
  }
}

// Notes queries
export function subscribeGuitarNotes(
  guitarId: string,
  callback: (notes: GuitarNote[]) => void,
  clientOnly: boolean = false,
  maxNotes: number | null = null
): Unsubscribe {
  const notesRef = collection(db, "guitars", guitarId, "notes");
  
  // For clients, filter by visibleToClient in the query to satisfy security rules
  let q;
  if (clientOnly) {
    if (maxNotes) {
      q = query(
        notesRef,
        where("visibleToClient", "==", true),
        orderBy("createdAt", "desc"),
        limit(maxNotes)
      );
    } else {
      q = query(
        notesRef,
        where("visibleToClient", "==", true),
        orderBy("createdAt", "desc")
      );
    }
  } else {
    if (maxNotes) {
      q = query(
        notesRef,
        orderBy("createdAt", "desc"),
        limit(maxNotes)
      );
    } else {
      q = query(
        notesRef,
        orderBy("createdAt", "desc")
      );
    }
  }
  
  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const notes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as GuitarNote[];
      callback(notes);
    },
    (error: any) => {
      // Suppress permission errors - they're handled by redirecting users
      if (error?.code !== "permission-denied") {
        console.error("Error subscribing to guitar notes:", error);
      }
      callback([]);
    }
  );
}

export async function addGuitarNote(
  guitarId: string,
  note: Omit<GuitarNote, "id" | "createdAt">
): Promise<string> {
  // First, create the note - this is the critical operation
  // Clean up undefined values - Firestore doesn't accept undefined
  const cleanNote: any = {
    guitarId: note.guitarId,
    stageId: note.stageId,
    authorUid: note.authorUid,
    authorName: note.authorName,
    message: note.message,
    createdAt: Timestamp.now().toMillis(),
    visibleToClient: note.visibleToClient,
  };
  
  // Include type if provided
  if (note.type) {
    cleanNote.type = note.type;
  }
  
  // Only include photoUrls if it exists and has items
  if (note.photoUrls && note.photoUrls.length > 0) {
    cleanNote.photoUrls = note.photoUrls;
  }
  
  const notesRef = collection(db, "guitars", guitarId, "notes");
  const docRef = await addDoc(notesRef, cleanNote);
  
  // Then, try to get guitar and run info for notification (non-blocking)
  // Don't let notification setup failures block note creation
  try {
    const guitar = await getGuitar(guitarId);
    if (guitar) {
      const run = await getRun(guitar.runId);
      const clientUid = guitar.clientUid;
      
      // Get note type label for notifications
      const noteTypeLabels: Record<string, string> = {
        milestone: "Milestone",
        quality_check: "Quality Check",
        issue: "Issue",
        status_change: "Status Change",
        general: "General",
        update: "Update",
      };
      const noteTypeLabel = noteTypeLabels[note.type || "update"] || "Update";
      
      // Notify all staff about new note (only if visible to client or has photos)
      if (note.visibleToClient || (note.photoUrls && note.photoUrls.length > 0)) {
        notifyAllStaff({
          type: "guitar_note_added",
          title: `New ${noteTypeLabel.toLowerCase()}: ${guitar.model}`,
          message: `${note.authorName} added a ${noteTypeLabel.toLowerCase()}${note.photoUrls && note.photoUrls.length > 0 ? ` with ${note.photoUrls.length} photo(s)` : ""}`,
          read: false,
          guitarId: guitarId,
          runId: guitar.runId,
          noteId: docRef.id,
          metadata: {
            guitarModel: guitar.model,
            guitarFinish: guitar.finish,
            customerName: guitar.customerName,
            runName: run?.name,
            authorName: note.authorName,
            noteType: note.type || "update",
          },
        }).catch((error) => {
          // Log error but don't throw - notifications are non-critical
          console.error("Failed to send notifications for note:", error);
        });
      }
      
      // Notify the client when a client-visible update is added
      if (clientUid && note.visibleToClient) {
        notifyUser(clientUid, {
          type: "guitar_note_added",
          title: `New ${noteTypeLabel.toLowerCase()} on ${guitar.model}`,
          message: note.message || `A new ${noteTypeLabel.toLowerCase()} has been posted.`,
          read: false,
          guitarId: guitarId,
          runId: guitar.runId,
          noteId: docRef.id,
          metadata: {
            guitarModel: guitar.model,
            guitarFinish: guitar.finish,
            runName: run?.name,
            authorName: note.authorName,
            noteType: note.type || "update",
          },
        }).catch((error) => {
          console.error("Failed to send client notification for note:", error);
        });
      }
    }
  } catch (notificationError) {
    // Log notification setup error but don't throw - note was already created
    console.error("Failed to set up notifications for note (note was still created):", notificationError);
  }
  
  return docRef.id;
}

// Client profile & billing
export function subscribeClientProfile(
  clientUid: string | null,
  callback: (profile: ClientProfile | null) => void
): Unsubscribe | null {
  if (!clientUid) {
    callback(null);
    return null;
  }

  const profileRef = doc(db, "clients", clientUid);
  return onSnapshot(
    profileRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      callback({ uid: snapshot.id, ...snapshot.data() } as ClientProfile);
    },
    (error: any) => {
      // Only log non-permission errors (permission errors are expected for staff accessing client data)
      if (error?.code !== "permission-denied") {
        console.error("Error subscribing to client profile:", error);
      }
      // Return null on error to prevent UI breaking
      callback(null);
    }
  );
}

export async function updateClientProfile(
  clientUid: string,
  updates: Partial<ClientProfile>,
  updatedBy?: string
): Promise<void> {
  const profileRef = doc(db, "clients", clientUid);
  await setDoc(
    profileRef,
    {
      ...updates,
      updatedAt: Timestamp.now().toMillis(),
      ...(updatedBy ? { updatedBy } : {}),
    },
    { merge: true }
  );
}

export function subscribeClientInvoices(
  clientUid: string | null,
  callback: (invoices: InvoiceRecord[]) => void,
  maxInvoices: number = 100
): Unsubscribe | null {
  if (!clientUid) {
    callback([]);
    return null;
  }

  const invoicesRef = collection(db, "clients", clientUid, "invoices");
  const q = query(invoicesRef, orderBy("uploadedAt", "desc"), limit(maxInvoices));

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const invoices = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as InvoiceRecord[];
      callback(invoices);
    },
    (error: any) => {
      // Only log non-permission errors (permission errors are expected for staff accessing client data)
      if (error?.code !== "permission-denied") {
        console.error("Error subscribing to invoices:", error);
      }
      // Return empty array on error to prevent UI breaking
      callback([]);
    }
  );
}

export async function createInvoiceRecord(
  clientUid: string,
  invoice: Omit<InvoiceRecord, "id" | "uploadedAt" | "uploadedBy" | "payments"> & {
    uploadedBy: string;
  }
): Promise<string> {
  const invoicesRef = collection(db, "clients", clientUid, "invoices");
  const docRef = await addDoc(invoicesRef, {
    ...invoice,
    uploadedAt: Timestamp.now().toMillis(),
    payments: [],
  });
  return docRef.id;
}

export async function recordInvoicePayment(
  clientUid: string,
  invoiceId: string,
  payment: Omit<InvoicePayment, "id" | "paidAt"> & { paidAt?: number }
): Promise<void> {
  const invoiceRef = doc(db, "clients", clientUid, "invoices", invoiceId);
  const snapshot = await getDoc(invoiceRef);
  if (!snapshot.exists()) {
    throw new Error("Invoice not found");
  }

  const invoice = snapshot.data() as InvoiceRecord;
  const paymentId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 10);
  const paidAt = payment.paidAt ?? Timestamp.now().toMillis();
  const paymentData: InvoicePayment = {
    id: paymentId,
    ...payment,
    paidAt,
  };

  const existingPayments = invoice.payments || [];
  const newPayments = [...existingPayments, paymentData];
  const totalPaid = newPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  let newStatus: InvoiceRecord["status"] = invoice.status;
  if (totalPaid >= invoice.amount) {
    newStatus = "paid";
  } else if (totalPaid > 0) {
    newStatus = "partial";
  }

  await updateDoc(invoiceRef, {
    payments: newPayments,
    status: newStatus,
  });
}

// Archive functions
export async function archiveRun(runId: string): Promise<void> {
  const run = await getRun(runId);
  if (!run) return;
  
  const runRef = doc(db, "runs", runId);
  await updateDoc(runRef, {
    archived: true,
    archivedAt: Timestamp.now().toMillis(),
  });
  
  // Notify all staff about run archive (non-blocking)
  notifyAllStaff({
    type: "run_archived",
    title: `Run Archived: ${run.name}`,
    message: `Run "${run.name}" has been archived`,
    read: false,
    runId: runId,
    metadata: {
      runName: run.name,
    },
  }).catch((error) => {
    // Log error but don't throw - notifications are non-critical
    console.error("Failed to send notifications for archived run:", error);
  });
}

export async function unarchiveRun(runId: string): Promise<void> {
  const runRef = doc(db, "runs", runId);
  await updateDoc(runRef, {
    archived: false,
    archivedAt: null,
  });
}

export async function archiveGuitar(guitarId: string): Promise<void> {
  const guitar = await getGuitar(guitarId);
  if (!guitar) return;
  
  const guitarRef = doc(db, "guitars", guitarId);
  await updateDoc(guitarRef, {
    archived: true,
    archivedAt: Timestamp.now().toMillis(),
  });
  
  // Notify all staff about guitar archive (non-blocking)
  notifyAllStaff({
    type: "guitar_archived",
    title: `Guitar Archived: ${guitar.model}`,
    message: `${guitar.model} - ${guitar.finish} (${guitar.orderNumber}) has been archived`,
    read: false,
    guitarId: guitarId,
    runId: guitar.runId,
    metadata: {
      guitarModel: guitar.model,
      guitarFinish: guitar.finish,
      customerName: guitar.customerName,
    },
  }).catch((error) => {
    // Log error but don't throw - notifications are non-critical
    console.error("Failed to send notifications for archived guitar:", error);
  });
}

export async function unarchiveGuitar(guitarId: string): Promise<void> {
  const guitarRef = doc(db, "guitars", guitarId);
  await updateDoc(guitarRef, {
    archived: false,
    archivedAt: null,
  });
}

// Notification functions
export async function createNotification(
  notification: Omit<Notification, "id" | "createdAt">
): Promise<string> {
  const notificationsRef = collection(db, "notifications");
  const docRef = await addDoc(notificationsRef, {
    ...notification,
    read: false,
    createdAt: Timestamp.now().toMillis(),
  });
  return docRef.id;
}

export function subscribeNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void,
  maxNotifications: number = 50
): Unsubscribe {
  const notificationsRef = collection(db, "notifications");
  const q = query(
    notificationsRef,
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(maxNotifications)
  );
  
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Notification[];
    callback(notifications);
  });
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const notificationRef = doc(db, "notifications", notificationId);
  await updateDoc(notificationRef, {
    read: true,
    readAt: Timestamp.now().toMillis(),
  });
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const notificationsRef = collection(db, "notifications");
  const q = query(
    notificationsRef,
    where("userId", "==", userId),
    where("read", "==", false)
  );
  
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      read: true,
      readAt: Timestamp.now().toMillis(),
    });
  });
  
  await batch.commit();
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const notificationRef = doc(db, "notifications", notificationId);
  await deleteDoc(notificationRef);
}

// Helper function to notify all staff users
export async function notifyAllStaff(
  notification: Omit<Notification, "id" | "createdAt" | "userId">
): Promise<void> {
  // Get all staff users via Cloud Function
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  const functions = getFunctions();
  const listUsers = httpsCallable(functions, "listUsers");
  
  try {
    const result = await listUsers({ roleFilter: "staff" });
    const users = (result.data as any)?.users || [];
    
    // Also include admins
    const adminResult = await listUsers({ roleFilter: "admin" });
    const admins = (adminResult.data as any)?.users || [];
    
    const allStaff = [...users, ...admins];
    const uniqueStaff = Array.from(
      new Map(allStaff.map((u: any) => [u.uid, u])).values()
    );
    
    // Create notifications for each staff member
    const batch = writeBatch(db);
    const notificationsRef = collection(db, "notifications");
    
    uniqueStaff.forEach((user: any) => {
      const notificationRef = doc(notificationsRef);
      batch.set(notificationRef, {
        ...notification,
        userId: user.uid,
        read: false,
        createdAt: Timestamp.now().toMillis(),
      });
    });
    
    await batch.commit();
  } catch (error) {
    console.error("Error notifying staff:", error);
    // Fallback: create notification for current user if available
    // This is a graceful degradation
  }
}

// Helper function to notify a specific user
export async function notifyUser(
  userId: string,
  notification: Omit<Notification, "id" | "createdAt" | "userId">
): Promise<string> {
  return createNotification({
    ...notification,
    userId,
  });
}

export async function updateGuitarPhotoInfo(
  guitarId: string,
  coverPhotoUrl?: string,
  photoCount?: number
): Promise<void> {
  const updates: Partial<GuitarBuild> = {
    updatedAt: Timestamp.now().toMillis(),
  };
  if (coverPhotoUrl !== undefined) {
    updates.coverPhotoUrl = coverPhotoUrl;
  }
  if (photoCount !== undefined) {
    updates.photoCount = photoCount;
  }
  await updateDoc(doc(db, "guitars", guitarId), updates);
}

export async function updateGuitar(
  guitarId: string,
  updates: Partial<Omit<GuitarBuild, "id" | "createdAt">>
): Promise<void> {
  const cleanUpdates: any = {
    updatedAt: Timestamp.now().toMillis(),
  };

  // Only include fields that are provided and not undefined
  if (updates.runId !== undefined) cleanUpdates.runId = updates.runId;
  if (updates.stageId !== undefined) cleanUpdates.stageId = updates.stageId;
  if (updates.clientUid !== undefined) cleanUpdates.clientUid = updates.clientUid;
  if (updates.customerName !== undefined) cleanUpdates.customerName = updates.customerName;
  if (updates.customerEmail !== undefined) cleanUpdates.customerEmail = updates.customerEmail;
  if (updates.orderNumber !== undefined) cleanUpdates.orderNumber = updates.orderNumber;
  if (updates.model !== undefined) cleanUpdates.model = updates.model;
  if (updates.finish !== undefined) cleanUpdates.finish = updates.finish;
  if (updates.serial !== undefined) cleanUpdates.serial = updates.serial || null;
  if (updates.specs !== undefined) cleanUpdates.specs = updates.specs || null;
  if (updates.referenceImages !== undefined) cleanUpdates.referenceImages = updates.referenceImages || null;
  if (updates.coverPhotoUrl !== undefined) cleanUpdates.coverPhotoUrl = updates.coverPhotoUrl || null;
  if (updates.photoCount !== undefined) cleanUpdates.photoCount = updates.photoCount;

  await updateDoc(doc(db, "guitars", guitarId), cleanUpdates);
}

// App Settings
const SETTINGS_DOC_ID = "app_settings";

export async function getAppSettings(): Promise<AppSettings | null> {
  const settingsDoc = await getDoc(doc(db, "settings", SETTINGS_DOC_ID));
  if (!settingsDoc.exists()) return null;
  return settingsDoc.data() as AppSettings;
}

export function subscribeAppSettings(
  callback: (settings: AppSettings | null) => void
): Unsubscribe {
  const settingsRef = doc(db, "settings", SETTINGS_DOC_ID);
  
  return onSnapshot(settingsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    callback(snapshot.data() as AppSettings);
  });
}

export async function updateAppSettings(
  updates: Partial<AppSettings>,
  updatedBy: string
): Promise<void> {
  const settingsRef = doc(db, "settings", SETTINGS_DOC_ID);
  const existing = await getDoc(settingsRef);
  
  const now = Date.now();
  const updateData = {
    ...updates,
    updatedAt: now,
    updatedBy,
  };
  
  if (existing.exists()) {
    await updateDoc(settingsRef, updateData);
  } else {
    // Create default settings if they don't exist
    const defaultSettings: AppSettings = {
      branding: {
        companyName: "Factory Standards",
        primaryColor: "#F97316", // orange
        secondaryColor: "#3B82F6", // blue
        accentColor: "#10B981", // green
      },
      general: {
        timezone: "Australia/Perth",
      },
      email: {},
      notifications: {
        emailNotificationsEnabled: true,
        notifyOnNewGuitar: true,
        notifyOnStageChange: true,
        notifyOnNoteAdded: true,
        notifyOnInvoiceCreated: true,
        notifyOnPaymentReceived: true,
      },
      system: {
        maintenanceMode: false,
        allowClientRegistration: false,
        defaultClientRole: "client",
        sessionTimeout: 60,
        maxFileUploadSize: 10,
      },
      updatedAt: now,
      updatedBy,
    };
    await setDoc(settingsRef, defaultSettings);
  }
}
