import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs,
  query, where, orderBy, serverTimestamp, increment, limit, startAfter,
  type DocumentData, type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { migrateGenome, type CGPGenome } from './cgp';

export interface ShapeDoc {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  name: string;
  genome: string;
  thumbnailURL: string;
  createdAt: any;
  updatedAt: any;
  generation: number;
  gridSize: string;
  seedPreset: string | null;
  forkedFrom: string | null;
  tags: string[];
  starCount: number;
  commentCount: number;
  public: boolean;
}

const shapesCol = collection(db, 'shapes');

export async function saveShape(params: {
  userId: string;
  userName: string;
  userPhoto: string;
  name: string;
  genome: CGPGenome;
  thumbnailURL: string;
  generation: number;
  gridSize: string;
  seedPreset: string | null;
  forkedFrom?: string | null;
  tags?: string[];
  isPublic?: boolean;
}): Promise<string> {
  const docRef = await addDoc(shapesCol, {
    userId: params.userId,
    userName: params.userName,
    userPhoto: params.userPhoto,
    name: params.name,
    genome: JSON.stringify(params.genome),
    thumbnailURL: params.thumbnailURL,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    generation: params.generation,
    gridSize: params.gridSize,
    seedPreset: params.seedPreset,
    forkedFrom: params.forkedFrom ?? null,
    tags: params.tags ?? [],
    starCount: 0,
    commentCount: 0,
    public: params.isPublic ?? true,
  });

  // Increment user's shape count
  const userRef = doc(db, 'users', params.userId);
  await updateDoc(userRef, { shapeCount: increment(1) }).catch(() => {});

  return docRef.id;
}

export async function getShape(shapeId: string): Promise<ShapeDoc | null> {
  const snap = await getDoc(doc(db, 'shapes', shapeId));
  if (!snap.exists()) return null;
  const data = { id: snap.id, ...snap.data() } as ShapeDoc;
  // Migrate genome to v2 format if needed
  try {
    const genome = JSON.parse(data.genome);
    const migrated = migrateGenome(genome);
    if (migrated !== genome) data.genome = JSON.stringify(migrated);
  } catch { /* leave as-is if parse fails */ }
  return data;
}

export async function getUserShapes(userId: string): Promise<ShapeDoc[]> {
  const q = query(shapesCol, where('userId', '==', userId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = { id: d.id, ...d.data() } as ShapeDoc;
    // Migrate genome to v2 format if needed
    try {
      const genome = JSON.parse(data.genome);
      const migrated = migrateGenome(genome);
      if (migrated !== genome) data.genome = JSON.stringify(migrated);
    } catch { /* leave as-is */ }
    return data;
  });
}

export async function getPublicShapes(lastDoc?: QueryDocumentSnapshot): Promise<{
  shapes: ShapeDoc[];
  lastDoc: QueryDocumentSnapshot | null;
}> {
  const q = lastDoc
    ? query(shapesCol, where('public', '==', true), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(20))
    : query(shapesCol, where('public', '==', true), orderBy('createdAt', 'desc'), limit(20));
  const snap = await getDocs(q);
  const shapes = snap.docs.map(d => {
    const data = { id: d.id, ...d.data() } as ShapeDoc;
    try {
      const genome = JSON.parse(data.genome);
      const migrated = migrateGenome(genome);
      if (migrated !== genome) data.genome = JSON.stringify(migrated);
    } catch { /* leave as-is */ }
    return data;
  });
  return {
    shapes,
    lastDoc: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
  };
}

export async function deleteShape(shapeId: string, userId: string): Promise<void> {
  await deleteDoc(doc(db, 'shapes', shapeId));
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { shapeCount: increment(-1) }).catch(() => {});
}

export async function updateShape(shapeId: string, data: Partial<DocumentData>): Promise<void> {
  await updateDoc(doc(db, 'shapes', shapeId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}
