/**
 * Firestore Operations
 * 
 * COST OPTIMIZATION NOTES:
 * - All queries use limits where appropriate to minimize read operations
 * - Notifications: Limited to 30 most recent (configurable)
 * - Notes: Can be limited per query (used for client dashboard - only fetches 1 most recent)
 * - Invoices: Limited to 100 per client, 200 for accounting list
 * - Audit logs: 200 most recent, TTL 90 days
 * - Dashboard: Only loads 100 most recent guitars instead of all
 * - Real-time listeners (onSnapshot) are used only when necessary for live updates
 * - All listeners are properly unsubscribed to prevent memory leaks and unnecessary reads
 */

import {
  doc,
  getDoc,
  getDocs,
  collection,
  collectionGroup,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  addDoc,
  deleteDoc,
  deleteField,
  writeBatch,
  Timestamp,
  serverTimestamp,
  QuerySnapshot,
  DocumentData,
  Unsubscribe,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import type {
  Run,
  RunStage,
  GuitarBuild,
  GuitarNote,
  NoteComment,
  RunUpdate,
  RunUpdateComment,
  Notification,
  ClientProfile,
  InvoiceRecord,
  InvoicePayment,
  AuditAction,
  AuditLogEntry,
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
  // Firestore does not accept undefined; use deleteField() to remove a field
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    sanitized[key] = value === undefined ? deleteField() : value;
  }
  await updateDoc(runRef, sanitized);
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

/**
 * Get the first stage (order: 0) from a run
 * This is typically "Design & Planning" stage
 */
export async function getFirstStage(runId: string): Promise<RunStage | null> {
  const stagesRef = collection(db, "runs", runId, "stages");
  const q = query(stagesRef, where("order", "==", 0), limit(1));
  
  try {
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    const stageDoc = snapshot.docs[0];
    return {
      id: stageDoc.id,
      ...stageDoc.data(),
    } as RunStage;
  } catch (error: any) {
    console.error("Error getting first stage:", error);
    return null;
  }
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
  if (guitarData.specs) {
    // Remove undefined values from specs - Firestore doesn't accept undefined
    const cleanSpecs: any = {};
    Object.entries(guitarData.specs).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanSpecs[key] = value;
      }
    });
    // Only add specs if it has at least one property
    if (Object.keys(cleanSpecs).length > 0) {
      cleanData.specs = cleanSpecs;
    }
  }
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

/**
 * Subscribe to guitars that have the given customerEmail (for "contact from guitars" views
 * when the client has no Firebase Auth account yet).
 */
export function subscribeGuitarsByCustomerEmail(
  email: string,
  callback: (guitars: GuitarBuild[]) => void,
  includeArchived: boolean = false
): Unsubscribe {
  const guitarsRef = collection(db, "guitars");
  const q = query(
    guitarsRef,
    where("customerEmail", "==", email),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const guitars = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as GuitarBuild[];
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
      guitarId: guitarId,
      triggeredByStageId: stageId,
    }).catch((error) => {
      console.error("Failed to create invoice for stage change:", error);
    });
  }
  
  // Also check if there are any pending invoices with this trigger stage
  // When stage is reached, calculate due date based on dueDaysAfterTrigger
  if (guitar.clientUid) {
    // Query for invoices with this trigger stage that don't have a due date yet
    const invoicesRef = collectionGroup(db, "invoices");
    const q = query(
      invoicesRef, 
      where("guitarId", "==", guitarId),
      where("triggeredByStageId", "==", stageId)
    );
    
    getDocs(q).then((snapshot) => {
      snapshot.docs.forEach(async (invoiceDoc) => {
        const invoice = invoiceDoc.data() as any;
        // If invoice has dueDaysAfterTrigger but no dueDate, calculate it now
        if (invoice.dueDaysAfterTrigger && !invoice.dueDate) {
          const dueDate = Date.now() + (invoice.dueDaysAfterTrigger * 24 * 60 * 60 * 1000);
          const pathParts = invoiceDoc.ref.path.split("/");
          const clientUidIndex = pathParts.indexOf("clients");
          const clientUid = clientUidIndex >= 0 && clientUidIndex < pathParts.length - 1 
            ? pathParts[clientUidIndex + 1] 
            : null;
          
          if (clientUid) {
            const invoiceRef = doc(db, "clients", clientUid, "invoices", invoiceDoc.id);
            await updateDoc(invoiceRef, { dueDate });
          }
        }
      });
    }).catch((error) => {
      console.error("Failed to update invoice due dates:", error);
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

export async function updateGuitarNote(
  guitarId: string,
  noteId: string,
  updates: { photoUrls?: string[] }
): Promise<void> {
  const noteRef = doc(db, "guitars", guitarId, "notes", noteId);
  const cleanUpdates: any = {};
  
  if (updates.photoUrls !== undefined) {
    cleanUpdates.photoUrls = updates.photoUrls.length > 0 ? updates.photoUrls : null;
  }
  
  await updateDoc(noteRef, cleanUpdates);
}

/** Mark a guitar note as viewed by the current user (thumbs up). Client-only. */
export async function recordGuitarNoteViewed(
  guitarId: string,
  noteId: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const noteRef = doc(db, "guitars", guitarId, "notes", noteId);
  await updateDoc(noteRef, {
    [`viewedBy.${user.uid}`]: Date.now(),
  });
}

/** Add a comment to a guitar note. Client (owner) or staff. */
export async function addGuitarNoteComment(
  guitarId: string,
  noteId: string,
  message: string
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be signed in to comment");
  const authorName = user.displayName || user.email || "Unknown";
  const commentsRef = collection(db, "guitars", guitarId, "notes", noteId, "comments");
  const docRef = await addDoc(commentsRef, {
    authorUid: user.uid,
    authorName,
    message: message.trim(),
    createdAt: Timestamp.now().toMillis(),
  });
  return docRef.id;
}

export function subscribeGuitarNoteComments(
  guitarId: string,
  noteId: string,
  callback: (comments: NoteComment[]) => void
): Unsubscribe {
  const commentsRef = collection(db, "guitars", guitarId, "notes", noteId, "comments");
  const q = query(commentsRef, orderBy("createdAt", "asc"));
  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const comments: NoteComment[] = snapshot.docs.map((d) => {
        const data = d.data();
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : (data.createdAt as number) ?? 0;
        return {
          id: d.id,
          authorUid: data.authorUid ?? "",
          authorName: data.authorName ?? "",
          message: data.message ?? "",
          createdAt,
        };
      });
      callback(comments);
    },
    (err) => {
      console.error("Guitar note comments subscription error:", err);
      callback([]);
    }
  );
}

/** Mark a run update as viewed by the current user (thumbs up). Client-only. */
export async function recordRunUpdateViewed(
  runId: string,
  updateId: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const updateRef = doc(db, "runs", runId, "updates", updateId);
  await updateDoc(updateRef, {
    [`viewedBy.${user.uid}`]: Date.now(),
  });
}

/** Add a comment to a run update. Client or staff. */
export async function addRunUpdateComment(
  runId: string,
  updateId: string,
  message: string
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be signed in to comment");
  const authorName = user.displayName || user.email || "Unknown";
  const commentsRef = collection(db, "runs", runId, "updates", updateId, "comments");
  const docRef = await addDoc(commentsRef, {
    authorUid: user.uid,
    authorName,
    message: message.trim(),
    createdAt: Timestamp.now().toMillis(),
  });
  return docRef.id;
}

export function subscribeRunUpdateComments(
  runId: string,
  updateId: string,
  callback: (comments: RunUpdateComment[]) => void
): Unsubscribe {
  const commentsRef = collection(db, "runs", runId, "updates", updateId, "comments");
  const q = query(commentsRef, orderBy("createdAt", "asc"));
  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const comments: RunUpdateComment[] = snapshot.docs.map((d) => {
        const data = d.data();
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : (data.createdAt as number) ?? 0;
        return {
          id: d.id,
          authorUid: data.authorUid ?? "",
          authorName: data.authorName ?? "",
          message: data.message ?? "",
          createdAt,
        };
      });
      callback(comments);
    },
    (err) => {
      console.error("Run update comments subscription error:", err);
      callback([]);
    }
  );
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

function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      out[key] = stripUndefined(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export async function updateClientProfile(
  clientUid: string,
  updates: Partial<ClientProfile>,
  updatedBy?: string
): Promise<void> {
  const profileRef = doc(db, "clients", clientUid);
  // Firestore does not allow undefined; strip undefined values from updates
  const cleanUpdates = stripUndefined(updates as Record<string, unknown>);
  await setDoc(
    profileRef,
    {
      ...cleanUpdates,
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
  
  // Build the document data, excluding undefined values
  const invoiceData: any = {
    ...invoice,
    uploadedAt: Timestamp.now().toMillis(),
    payments: [],
  };
  
  // Remove undefined values to avoid Firestore errors
  Object.keys(invoiceData).forEach(key => {
    if (invoiceData[key] === undefined) {
      delete invoiceData[key];
    }
  });
  
  const docRef = await addDoc(invoicesRef, invoiceData);
  return docRef.id;
}

export async function recordInvoicePayment(
  clientUid: string,
  invoiceId: string,
  payment: Omit<InvoicePayment, "id" | "paidAt"> & { paidAt?: number; receiptUrl?: string }
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
  
  // Set approval status based on who recorded the payment
  const approvalStatus = payment.recordedBy === "client" ? "pending" : "approved";
  
  const paymentData: InvoicePayment = {
    id: paymentId,
    ...payment,
    paidAt,
    approvalStatus,
  };

  // Strip undefined values so Firestore accepts the document
  const cleanPayment = (p: InvoicePayment): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    (Object.keys(p) as (keyof InvoicePayment)[]).forEach((key) => {
      const v = p[key];
      if (v !== undefined) out[key] = v;
    });
    return out;
  };

  const existingPayments = invoice.payments || [];
  const newPaymentsRaw = [...existingPayments, paymentData];
  const newPayments = newPaymentsRaw.map((p) => cleanPayment(p));

  // Only count approved payments when calculating totals
  const approvedPayments = newPaymentsRaw.filter(p => p.approvalStatus !== "rejected" && (p.approvalStatus === "approved" || p.approvalStatus === undefined));
  const totalPaid = approvedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

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

  // Notify accounting if client recorded a payment
  if (payment.recordedBy === "client") {
    notifyAllStaff({
      type: "guitar_note_added", // Reusing this type for now
      title: "Payment Recorded - Awaiting Approval",
      message: `Client recorded a payment of ${payment.currency} ${payment.amount.toLocaleString()} for invoice: ${invoice.title}. Please review and approve.`,
      read: false,
      guitarId: invoice.guitarId,
      metadata: {
        customerName: invoice.title,
      },
    }).catch((error) => {
      console.error("Failed to notify accounting about pending payment:", error);
    });
  }

  // Update guitar's payment info if invoice is linked to a guitar
  if (invoice.guitarId) {
    await updateGuitarPaymentInfo(invoice.guitarId).catch((error) => {
      console.error("Failed to update guitar payment info:", error);
    });
  }
}

// Approve or reject a pending payment
export async function approvePayment(
  clientUid: string,
  invoiceId: string,
  paymentId: string,
  approvedBy: string,
  approved: boolean,
  rejectionReason?: string
): Promise<void> {
  const invoiceRef = doc(db, "clients", clientUid, "invoices", invoiceId);
  const snapshot = await getDoc(invoiceRef);
  if (!snapshot.exists()) {
    throw new Error("Invoice not found");
  }

  const invoice = snapshot.data() as InvoiceRecord;
  const payments = invoice.payments || [];
  const paymentIndex = payments.findIndex(p => p.id === paymentId);
  
  if (paymentIndex === -1) {
    throw new Error("Payment not found");
  }

  const updatedPayments = [...payments];
  updatedPayments[paymentIndex] = {
    ...updatedPayments[paymentIndex],
    approvalStatus: approved ? "approved" : "rejected",
    approvedBy,
    approvedAt: Timestamp.now().toMillis(),
    ...(rejectionReason ? { rejectionReason } : {}),
  };

  // Recalculate totals based on approved payments
  const approvedPayments = updatedPayments.filter(p => p.approvalStatus !== "rejected" && (p.approvalStatus === "approved" || p.approvalStatus === undefined));
  const totalPaid = approvedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  let newStatus: InvoiceRecord["status"] = invoice.status;
  if (totalPaid >= invoice.amount) {
    newStatus = "paid";
  } else if (totalPaid > 0) {
    newStatus = "partial";
  } else {
    newStatus = "pending";
  }

  await updateDoc(invoiceRef, {
    payments: updatedPayments,
    status: newStatus,
  });

  // Update guitar's payment info if invoice is linked to a guitar
  if (invoice.guitarId) {
    await updateGuitarPaymentInfo(invoice.guitarId).catch((error) => {
      console.error("Failed to update guitar payment info:", error);
    });
  }
}

// Update invoice fields (title, amount, dueDate, description, currency) – staff/accounting
export async function updateInvoiceRecord(
  clientUid: string,
  invoiceId: string,
  updates: Partial<Pick<InvoiceRecord, "title" | "amount" | "dueDate" | "description" | "currency" | "status">>
): Promise<void> {
  const invoiceRef = doc(db, "clients", clientUid, "invoices", invoiceId);
  const snapshot = await getDoc(invoiceRef);
  if (!snapshot.exists()) {
    throw new Error("Invoice not found");
  }
  const clean: Record<string, unknown> = {};
  (Object.keys(updates) as (keyof typeof updates)[]).forEach((key) => {
    const v = updates[key];
    if (v !== undefined) clean[key] = v;
  });
  if (Object.keys(clean).length === 0) return;
  await updateDoc(invoiceRef, clean);
  const invoice = snapshot.data() as InvoiceRecord;
  if (invoice.guitarId) {
    await updateGuitarPaymentInfo(invoice.guitarId).catch((e) => console.error("Failed to update guitar payment info:", e));
  }
}

// Delete an invoice – staff/accounting
export async function deleteInvoiceRecord(clientUid: string, invoiceId: string): Promise<void> {
  const invoiceRef = doc(db, "clients", clientUid, "invoices", invoiceId);
  const snapshot = await getDoc(invoiceRef);
  if (!snapshot.exists()) {
    throw new Error("Invoice not found");
  }
  const invoice = snapshot.data() as InvoiceRecord;
  await deleteDoc(invoiceRef);
  if (invoice.guitarId) {
    await updateGuitarPaymentInfo(invoice.guitarId).catch((e) => console.error("Failed to update guitar payment info:", e));
  }
}

// Update a payment (amount, method, note, paidAt) – staff/accounting
export async function updateInvoicePayment(
  clientUid: string,
  invoiceId: string,
  paymentId: string,
  updates: Partial<Pick<InvoicePayment, "amount" | "currency" | "method" | "note" | "paidAt">>
): Promise<void> {
  const invoiceRef = doc(db, "clients", clientUid, "invoices", invoiceId);
  const snapshot = await getDoc(invoiceRef);
  if (!snapshot.exists()) {
    throw new Error("Invoice not found");
  }
  const invoice = snapshot.data() as InvoiceRecord;
  const payments = invoice.payments || [];
  const idx = payments.findIndex((p) => p.id === paymentId);
  if (idx === -1) throw new Error("Payment not found");
  const updatedPayments = [...payments];
  updatedPayments[idx] = { ...updatedPayments[idx], ...updates };
  const approvedPayments = updatedPayments.filter(
    (p) => p.approvalStatus !== "rejected" && (p.approvalStatus === "approved" || p.approvalStatus === undefined)
  );
  const totalPaid = approvedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  let newStatus: InvoiceRecord["status"] = invoice.status;
  if (totalPaid >= invoice.amount) newStatus = "paid";
  else if (totalPaid > 0) newStatus = "partial";
  else newStatus = "pending";
  await updateDoc(invoiceRef, {
    payments: updatedPayments,
    status: newStatus,
  });
  if (invoice.guitarId) {
    await updateGuitarPaymentInfo(invoice.guitarId).catch((e) => console.error("Failed to update guitar payment info:", e));
  }
}

// Delete a payment – staff/accounting
export async function deleteInvoicePayment(
  clientUid: string,
  invoiceId: string,
  paymentId: string
): Promise<void> {
  const invoiceRef = doc(db, "clients", clientUid, "invoices", invoiceId);
  const snapshot = await getDoc(invoiceRef);
  if (!snapshot.exists()) {
    throw new Error("Invoice not found");
  }
  const invoice = snapshot.data() as InvoiceRecord;
  const payments = (invoice.payments || []).filter((p) => p.id !== paymentId);
  const approvedPayments = payments.filter(
    (p) => p.approvalStatus !== "rejected" && (p.approvalStatus === "approved" || p.approvalStatus === undefined)
  );
  const totalPaid = approvedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  let newStatus: InvoiceRecord["status"] = invoice.status;
  if (totalPaid >= invoice.amount) newStatus = "paid";
  else if (totalPaid > 0) newStatus = "partial";
  else newStatus = "pending";
  await updateDoc(invoiceRef, {
    payments,
    status: newStatus,
  });
  if (invoice.guitarId) {
    await updateGuitarPaymentInfo(invoice.guitarId).catch((e) => console.error("Failed to update guitar payment info:", e));
  }
}

// Get all invoices for a specific guitar
export function subscribeGuitarInvoices(
  guitarId: string,
  callback: (invoices: InvoiceRecord[]) => void
): Unsubscribe {
  const invoicesRef = collectionGroup(db, "invoices");
  const q = query(invoicesRef, where("guitarId", "==", guitarId), orderBy("uploadedAt", "desc"));

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
      console.error("Error subscribing to guitar invoices:", error);
      callback([]);
    }
  );
}

// Calculate total paid for a guitar across all invoices (only approved payments)
export async function calculateGuitarTotalPaid(guitarId: string): Promise<number> {
  const invoicesRef = collectionGroup(db, "invoices");
  const q = query(invoicesRef, where("guitarId", "==", guitarId));
  const snapshot = await getDocs(q);
  
  let totalPaid = 0;
  snapshot.docs.forEach((doc) => {
    const invoice = doc.data() as InvoiceRecord;
    const payments = invoice.payments || [];
    // Only count approved payments (or payments without approvalStatus for backward compatibility)
    const approvedPayments = payments.filter(p => p.approvalStatus !== "rejected" && (p.approvalStatus === "approved" || p.approvalStatus === undefined));
    const invoicePaid = approvedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    totalPaid += invoicePaid;
  });
  
  return totalPaid;
}

// Update guitar payment info (total paid, remaining balance)
export async function updateGuitarPaymentInfo(guitarId: string): Promise<void> {
  const guitarRef = doc(db, "guitars", guitarId);
  const guitarDoc = await getDoc(guitarRef);
  
  if (!guitarDoc.exists()) {
    throw new Error("Guitar not found");
  }
  
  const guitar = guitarDoc.data() as GuitarBuild;
  const totalPaid = await calculateGuitarTotalPaid(guitarId);
  const price = guitar.price || 0;
  const remainingBalance = Math.max(price - totalPaid, 0);
  
  await updateDoc(guitarRef, {
    // Store calculated values for quick access
    // Note: These are derived values, but storing them avoids recalculating on every read
  });
  
  // Return the calculated values (we'll compute on the fly in UI for accuracy)
}

// Accounting functions - get all invoices across all clients
export interface InvoiceWithClient extends InvoiceRecord {
  clientUid: string;
  clientName?: string;
  clientEmail?: string;
}

export function subscribeAllInvoices(
  callback: (invoices: InvoiceWithClient[]) => void,
  maxInvoices: number = 200
): Unsubscribe {
  // Use collectionGroup to query all invoices across all clients
  const invoicesRef = collectionGroup(db, "invoices");
  const q = query(invoicesRef, orderBy("uploadedAt", "desc"), limit(maxInvoices));

  return onSnapshot(
    q,
    async (snapshot: QuerySnapshot<DocumentData>) => {
      const invoices: InvoiceWithClient[] = [];
      
      for (const docSnapshot of snapshot.docs) {
        // Extract clientUid from the path: clients/{clientUid}/invoices/{invoiceId}
        const pathParts = docSnapshot.ref.path.split("/");
        const clientUidIndex = pathParts.indexOf("clients");
        const clientUid = clientUidIndex >= 0 && clientUidIndex < pathParts.length - 1 
          ? pathParts[clientUidIndex + 1] 
          : "unknown";

        // Try to get client name/email
        let clientName: string | undefined;
        let clientEmail: string | undefined;
        
        try {
          const invoiceData = docSnapshot.data() as InvoiceRecord;
          
          // First, try to get customer name from linked guitar (most reliable)
          if (invoiceData.guitarId) {
            try {
              const guitarDoc = await getDoc(doc(db, "guitars", invoiceData.guitarId));
              if (guitarDoc.exists()) {
                const guitar = guitarDoc.data() as GuitarBuild;
                if (guitar.customerName) {
                  clientName = guitar.customerName;
                }
                if (guitar.customerEmail) {
                  clientEmail = guitar.customerEmail;
                }
              }
            } catch (error) {
              // Ignore errors getting guitar
            }
          }
          
          // If we don't have a name yet, try to get user info from Firebase Auth via Cloud Function
          if (!clientName || !clientEmail) {
            try {
              const { getFunctions, httpsCallable } = await import("firebase/functions");
              const functions = getFunctions();
              const getUserInfo = httpsCallable(functions, "getUserInfo");
              const result = await getUserInfo({ uid: clientUid });
              const userData = (result.data as any);
              if (userData?.success) {
                if (!clientName && userData.displayName) {
                  clientName = userData.displayName;
                }
                if (!clientEmail && userData.email) {
                  clientEmail = userData.email;
                }
              }
            } catch (error) {
              // Ignore errors - Cloud Function might not exist or user might not be found
            }
          }
        } catch (error) {
          // Ignore errors getting client info
        }

        invoices.push({
          id: docSnapshot.id,
          clientUid,
          clientName,
          clientEmail,
          ...docSnapshot.data(),
        } as InvoiceWithClient);
      }
      
      callback(invoices);
    },
    (error: any) => {
      console.error("Error subscribing to all invoices:", error);
      callback([]);
    }
  );
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

/** Archive a client (soft delete). Hides them from the default Clients list. */
export async function archiveClient(
  clientUid: string,
  archivedBy?: string
): Promise<void> {
  const profileRef = doc(db, "clients", clientUid);
  await setDoc(
    profileRef,
    {
      archived: true,
      archivedAt: Timestamp.now().toMillis(),
      ...(archivedBy ? { archivedBy } : {}),
      updatedAt: Timestamp.now().toMillis(),
      ...(archivedBy ? { updatedBy: archivedBy } : {}),
    },
    { merge: true }
  );
}

/** Unarchive a client so they appear in the Clients list again. */
export async function unarchiveClient(clientUid: string): Promise<void> {
  const profileRef = doc(db, "clients", clientUid);
  await setDoc(
    profileRef,
    {
      archived: false,
      archivedAt: null,
      archivedBy: null,
      updatedAt: Timestamp.now().toMillis(),
    },
    { merge: true }
  );
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
  maxNotifications: number = 30
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
  } catch (error: any) {
    // If error is permission-denied (e.g., factory worker calling), just log and continue
    // Factory workers don't need to notify staff - they ARE the staff on the factory floor
    if (error?.code === "permission-denied" || error?.message?.includes("Only staff") || error?.message?.includes("Only staff and admins")) {
      console.log("Skipping staff notifications (factory worker or insufficient permissions)");
      return;
    }
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

// Run Updates functions
export function subscribeRunUpdates(
  runId: string,
  callback: (updates: RunUpdate[]) => void,
  clientOnly: boolean = false
): Unsubscribe {
  const updatesRef = collection(db, "runs", runId, "updates");
  const q = clientOnly
    ? query(updatesRef, where("visibleToClients", "==", true), orderBy("createdAt", "desc"))
    : query(updatesRef, orderBy("createdAt", "desc"));
  
  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const updates = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as RunUpdate[];
      callback(updates);
    },
    (error: any) => {
      console.error("Error subscribing to run updates:", error);
      callback([]);
    }
  );
}

export async function createRunUpdate(
  runId: string,
  update: Omit<RunUpdate, "id" | "createdAt">
): Promise<string> {
  const updatesRef = collection(db, "runs", runId, "updates");
  const docRef = await addDoc(updatesRef, {
    ...update,
    createdAt: Timestamp.now().toMillis(),
  });
  
  // Get all clients in this run (through their guitars)
  const guitars = await new Promise<GuitarBuild[]>((resolve) => {
    const unsubscribe = subscribeGuitarsForRun(runId, (guitars) => {
      unsubscribe();
      resolve(guitars);
    });
    // Timeout after 3 seconds
    setTimeout(() => {
      unsubscribe();
      resolve([]);
    }, 3000);
  });
  
  // Get unique client UIDs
  const clientUids = [...new Set(guitars.map((g) => g.clientUid).filter((uid): uid is string => !!uid))];
  
  // Notify all clients in the run if update is visible to them
  if (update.visibleToClients && clientUids.length > 0) {
    const run = await getRun(runId);
    const batch = writeBatch(db);
    const notificationsRef = collection(db, "notifications");
    
    clientUids.forEach((clientUid) => {
      const notificationRef = doc(notificationsRef);
      batch.set(notificationRef, {
        type: "run_update",
        title: update.title,
        message: update.message,
        read: false,
        userId: clientUid,
        runId: runId,
        createdAt: Timestamp.now().toMillis(),
        metadata: {
          runName: run?.name,
          authorName: update.authorName,
        },
      });
    });
    
    await batch.commit().catch((error) => {
      console.error("Failed to send notifications for run update:", error);
    });
  }
  
  // Also notify all staff about the update
  const run = await getRun(runId);
  notifyAllStaff({
    type: "run_update",
    title: `Run Update: ${update.title}`,
    message: `${update.authorName} posted an update to ${run?.name || "the run"}`,
    read: false,
    runId: runId,
    metadata: {
      runName: run?.name,
      authorName: update.authorName,
    },
  }).catch((error) => {
    console.error("Failed to send staff notifications for run update:", error);
  });
  
  return docRef.id;
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

/**
 * Add gallery images to a guitar (client-submitted)
 * This appends images to the existing referenceImages array
 */
export async function addGuitarGalleryImages(
  guitarId: string,
  imageUrls: string[]
): Promise<void> {
  const guitarRef = doc(db, "guitars", guitarId);
  const guitarDoc = await getDoc(guitarRef);
  
  if (!guitarDoc.exists()) {
    throw new Error("Guitar not found");
  }
  
  const guitar = guitarDoc.data() as GuitarBuild;
  const existingImages = guitar.referenceImages || [];
  const updatedImages = [...existingImages, ...imageUrls];
  
  await updateDoc(guitarRef, {
    referenceImages: updatedImages,
    updatedAt: Timestamp.now().toMillis(),
  });
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
  if (updates.specs !== undefined) {
    if (updates.specs === null) {
      cleanUpdates.specs = null;
    } else {
      // Remove undefined values from specs - Firestore doesn't accept undefined
      const cleanSpecs: any = {};
      Object.entries(updates.specs).forEach(([key, value]) => {
        if (value !== undefined) {
          cleanSpecs[key] = value;
        }
      });
      // Only set specs if it has at least one property, otherwise set to null
      cleanUpdates.specs = Object.keys(cleanSpecs).length > 0 ? cleanSpecs : null;
    }
  }
  if (updates.referenceImages !== undefined) cleanUpdates.referenceImages = updates.referenceImages || null;
  if (updates.coverPhotoUrl !== undefined) cleanUpdates.coverPhotoUrl = updates.coverPhotoUrl || null;
  if (updates.photoCount !== undefined) cleanUpdates.photoCount = updates.photoCount;
  if (updates.price !== undefined) cleanUpdates.price = updates.price || null;
  if (updates.currency !== undefined) cleanUpdates.currency = updates.currency || null;
  if (updates.invoiceTriggerStageId !== undefined) cleanUpdates.invoiceTriggerStageId = updates.invoiceTriggerStageId || null;

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

// ——— Audit logs (admin-visible activity: logins, client views) ———

const AUDIT_LOGS_LIMIT = 200; // Keep low to reduce read cost; older entries auto-expire via TTL

/**
 * Record an audit log entry. Call from client after auth is set.
 * Users can only write entries for their own userId (enforced by Firestore rules).
 */
export async function recordAuditLog(
  action: AuditAction,
  details: Record<string, unknown> = {}
): Promise<void> {
  if (typeof window === "undefined") return;
  const user = auth.currentUser;
  if (!user) return;
  try {
    const token = await user.getIdTokenResult(true);
    const userRole = (token.claims.role as string) || null;
    const ref = collection(db, "auditLogs");
    const now = Date.now();
    const expireAtMs = now + 90 * 24 * 60 * 60 * 1000; // TTL: delete after 90 days
    await addDoc(ref, {
      userId: user.uid,
      userEmail: user.email ?? null,
      userRole,
      action,
      details,
      createdAt: serverTimestamp(),
      expireAt: Timestamp.fromMillis(expireAtMs), // For Firestore TTL policy (enable in Console)
    });
  } catch (err) {
    console.error("Failed to record audit log:", err);
  }
}

/**
 * Subscribe to audit logs (newest first). Staff/admin only.
 */
export function subscribeAuditLogs(
  callback: (entries: AuditLogEntry[]) => void,
  maxEntries: number = AUDIT_LOGS_LIMIT
): Unsubscribe {
  const ref = collection(db, "auditLogs");
  const q = query(ref, orderBy("createdAt", "desc"), limit(maxEntries));
  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const entries: AuditLogEntry[] = snapshot.docs.map((d) => {
        const data = d.data();
        const createdAt = data.createdAt instanceof Timestamp
          ? data.createdAt.toMillis()
          : (data.createdAt as number) ?? 0;
        return {
          id: d.id,
          userId: data.userId ?? "",
          userEmail: data.userEmail ?? null,
          userRole: data.userRole ?? null,
          action: data.action as AuditAction,
          details: (data.details as Record<string, unknown>) ?? {},
          createdAt,
        };
      });
      callback(entries);
    },
    (err) => {
      console.error("Audit logs subscription error:", err);
      callback([]);
    }
  );
}

const AUDIT_LOGS_BY_ENTITY_LIMIT = 30;

function mapAuditSnapshot(snapshot: QuerySnapshot<DocumentData>): AuditLogEntry[] {
  return snapshot.docs.map((d) => {
    const data = d.data();
    const createdAt = data.createdAt instanceof Timestamp
      ? data.createdAt.toMillis()
      : (data.createdAt as number) ?? 0;
    return {
      id: d.id,
      userId: data.userId ?? "",
      userEmail: data.userEmail ?? null,
      userRole: data.userRole ?? null,
      action: data.action as AuditAction,
      details: (data.details as Record<string, unknown>) ?? {},
      createdAt,
    };
  });
}

/**
 * Subscribe to audit logs for a specific guitar (actions that reference this guitar, e.g. view_guitar).
 * Staff/admin only. Requires composite index: auditLogs (details.guitarId ASC, createdAt DESC).
 */
export function subscribeAuditLogsByGuitar(
  guitarId: string,
  callback: (entries: AuditLogEntry[]) => void,
  maxEntries: number = AUDIT_LOGS_BY_ENTITY_LIMIT
): Unsubscribe {
  const ref = collection(db, "auditLogs");
  const q = query(
    ref,
    where("details.guitarId", "==", guitarId),
    orderBy("createdAt", "desc"),
    limit(maxEntries)
  );
  return onSnapshot(
    q,
    (snapshot) => callback(mapAuditSnapshot(snapshot)),
    (err) => {
      console.error("Audit logs by guitar subscription error:", err);
      callback([]);
    }
  );
}

/**
 * Subscribe to audit logs for a specific user (purchaser/client activity: login, view_my_guitars, view_guitar, etc.).
 * Staff/admin only. Requires composite index: auditLogs (userId ASC, createdAt DESC).
 */
export function subscribeAuditLogsByUser(
  userId: string,
  callback: (entries: AuditLogEntry[]) => void,
  maxEntries: number = AUDIT_LOGS_BY_ENTITY_LIMIT
): Unsubscribe {
  const ref = collection(db, "auditLogs");
  const q = query(
    ref,
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(maxEntries)
  );
  return onSnapshot(
    q,
    (snapshot) => callback(mapAuditSnapshot(snapshot)),
    (err) => {
      console.error("Audit logs by user subscription error:", err);
      callback([]);
    }
  );
}
