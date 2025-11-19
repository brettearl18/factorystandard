import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  addDoc,
  Timestamp,
  QuerySnapshot,
  DocumentData,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Run, RunStage, GuitarBuild, GuitarNote } from "@/types/guitars";

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
  return docRef.id;
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
  
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const stages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as RunStage[];
    callback(stages);
  });
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
  const guitarDoc = await getDoc(doc(db, "guitars", guitarId));
  if (!guitarDoc.exists()) return null;
  return { id: guitarDoc.id, ...guitarDoc.data() } as GuitarBuild;
}

export function subscribeGuitar(
  guitarId: string,
  callback: (guitar: GuitarBuild | null) => void
): Unsubscribe {
  const guitarRef = doc(db, "guitars", guitarId);
  
  return onSnapshot(guitarRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    callback({ id: snapshot.id, ...snapshot.data() } as GuitarBuild);
  });
}

export async function updateGuitarStage(
  guitarId: string,
  stageId: string
): Promise<void> {
  await updateDoc(doc(db, "guitars", guitarId), {
    stageId,
    updatedAt: Timestamp.now().toMillis(),
  });
}

// Notes queries
export function subscribeGuitarNotes(
  guitarId: string,
  callback: (notes: GuitarNote[]) => void,
  clientOnly: boolean = false
): Unsubscribe {
  const notesRef = collection(db, "guitars", guitarId, "notes");
  
  // For clients, filter by visibleToClient in the query to satisfy security rules
  const q = clientOnly
    ? query(notesRef, where("visibleToClient", "==", true), orderBy("createdAt", "desc"))
    : query(notesRef, orderBy("createdAt", "desc"));
  
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const notes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as GuitarNote[];
    callback(notes);
  });
}

export async function addGuitarNote(
  guitarId: string,
  note: Omit<GuitarNote, "id" | "createdAt">
): Promise<string> {
  const notesRef = collection(db, "guitars", guitarId, "notes");
  const docRef = await addDoc(notesRef, {
    ...note,
    createdAt: Timestamp.now().toMillis(),
  });
  return docRef.id;
}

// Archive functions
export async function archiveRun(runId: string): Promise<void> {
  const runRef = doc(db, "runs", runId);
  await updateDoc(runRef, {
    archived: true,
    archivedAt: Timestamp.now().toMillis(),
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
  const guitarRef = doc(db, "guitars", guitarId);
  await updateDoc(guitarRef, {
    archived: true,
    archivedAt: Timestamp.now().toMillis(),
  });
}

export async function unarchiveGuitar(guitarId: string): Promise<void> {
  const guitarRef = doc(db, "guitars", guitarId);
  await updateDoc(guitarRef, {
    archived: false,
    archivedAt: null,
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
