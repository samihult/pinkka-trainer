import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "./firebase-config";
import type { Species, Stack, Group, SpeciesImage, User } from "./types";

// User operations
/** Fetch a user's role by uid. */
export async function getUserRole(userId: string): Promise<string | null> {
  const userDoc = await getDoc(doc(db, "users", userId));
  return userDoc.exists() ? userDoc.data().role : null;
}

/** Update a user's role by uid. */
export async function updateUserRole(
  userId: string,
  role: string,
): Promise<void> {
  await updateDoc(doc(db, "users", userId), { role });
}

/** Fetch all users from Firestore. */
export async function getAllUsers(): Promise<User[]> {
  const usersSnapshot = await getDocs(collection(db, "users"));
  return usersSnapshot.docs.map(
    (doc) =>
      ({
        uid: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      }) as User,
  );
}

// Group operations
/** Create a new group and return its id. */
export async function createGroup(
  group: Omit<Group, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const groupRef = doc(collection(db, "groups"));
  const newGroup = {
    ...group,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  await setDoc(groupRef, newGroup);
  return groupRef.id;
}

/** Fetch groups, optionally filtered by creator. */
export async function getGroups(userId?: string): Promise<Group[]> {
  let q = query(collection(db, "groups"), orderBy("order"));

  if (userId) {
    q = query(
      collection(db, "groups"),
      where("createdBy", "==", userId),
      orderBy("order"),
    );
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      }) as Group,
  );
}

/** Fetch a single group by id. */
export async function getGroup(groupId: string): Promise<Group | null> {
  const groupDoc = await getDoc(doc(db, "groups", groupId));
  if (!groupDoc.exists()) return null;

  return {
    id: groupDoc.id,
    ...groupDoc.data(),
    createdAt: groupDoc.data().createdAt?.toDate(),
    updatedAt: groupDoc.data().updatedAt?.toDate(),
  } as Group;
}

/** Update a group with partial fields. */
export async function updateGroup(
  groupId: string,
  updates: Partial<Group>,
): Promise<void> {
  await updateDoc(doc(db, "groups", groupId), {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

/** Delete a group and its related stacks/species. */
export async function deleteGroup(groupId: string): Promise<void> {
  // Get all stacks in this group
  const stacksQuery = query(
    collection(db, "stacks"),
    where("groupId", "==", groupId),
  );
  const stacksSnapshot = await getDocs(stacksQuery);

  // Delete all species in those stacks
  for (const stackDoc of stacksSnapshot.docs) {
    await deleteStack(stackDoc.id);
  }

  await deleteDoc(doc(db, "groups", groupId));
}

// Stack operations
/** Create a stack and link it to its group. */
export async function createStack(
  stack: Omit<Stack, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const stackRef = doc(collection(db, "stacks"));
  const newStack = {
    ...stack,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  await setDoc(stackRef, newStack);

  // Update group's stackIds
  const groupDoc = await getDoc(doc(db, "groups", stack.groupId));
  if (groupDoc.exists()) {
    const currentStackIds = groupDoc.data().stackIds || [];
    await updateDoc(doc(db, "groups", stack.groupId), {
      stackIds: [...currentStackIds, stackRef.id],
      updatedAt: Timestamp.now(),
    });
  }

  return stackRef.id;
}

/** Fetch stacks, optionally filtered by group and/or creator. */
export async function getStacks(
  groupId?: string,
  userId?: string,
): Promise<Stack[]> {
  let q = query(collection(db, "stacks"), orderBy("order"));

  if (groupId && userId) {
    q = query(
      collection(db, "stacks"),
      where("groupId", "==", groupId),
      where("createdBy", "==", userId),
      orderBy("order"),
    );
  } else if (groupId) {
    q = query(
      collection(db, "stacks"),
      where("groupId", "==", groupId),
      orderBy("order"),
    );
  } else if (userId) {
    q = query(
      collection(db, "stacks"),
      where("createdBy", "==", userId),
      orderBy("order"),
    );
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      }) as Stack,
  );
}

/** Fetch a single stack by id. */
export async function getStack(stackId: string): Promise<Stack | null> {
  const stackDoc = await getDoc(doc(db, "stacks", stackId));
  if (!stackDoc.exists()) return null;

  return {
    id: stackDoc.id,
    ...stackDoc.data(),
    createdAt: stackDoc.data().createdAt?.toDate(),
    updatedAt: stackDoc.data().updatedAt?.toDate(),
  } as Stack;
}

/** Update a stack with partial fields. */
export async function updateStack(
  stackId: string,
  updates: Partial<Stack>,
): Promise<void> {
  await updateDoc(doc(db, "stacks", stackId), {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

/** Delete a stack and its related species. */
export async function deleteStack(stackId: string): Promise<void> {
  // Get all species in this stack
  const speciesQuery = query(
    collection(db, "species"),
    where("stackId", "==", stackId),
  );
  const speciesSnapshot = await getDocs(speciesQuery);

  // Delete all species
  for (const speciesDoc of speciesSnapshot.docs) {
    await deleteSpecies(speciesDoc.id);
  }

  // Remove from group's stackIds
  const stackDoc = await getDoc(doc(db, "stacks", stackId));
  if (stackDoc.exists()) {
    const groupId = stackDoc.data().groupId;
    const groupDoc = await getDoc(doc(db, "groups", groupId));
    if (groupDoc.exists()) {
      const stackIds = groupDoc.data().stackIds || [];
      await updateDoc(doc(db, "groups", groupId), {
        stackIds: stackIds.filter((id: string) => id !== stackId),
        updatedAt: Timestamp.now(),
      });
    }
  }

  await deleteDoc(doc(db, "stacks", stackId));
}

// Species operations
/** Create a species and link it to its stack. */
export async function createSpecies(
  species: Omit<Species, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const speciesRef = doc(collection(db, "species"));
  const newSpecies = {
    ...species,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  await setDoc(speciesRef, newSpecies);

  // Update stack's speciesIds
  const stackDoc = await getDoc(doc(db, "stacks", species.stackId));
  if (stackDoc.exists()) {
    const currentSpeciesIds = stackDoc.data().speciesIds || [];
    await updateDoc(doc(db, "stacks", species.stackId), {
      speciesIds: [...currentSpeciesIds, speciesRef.id],
      updatedAt: Timestamp.now(),
    });
  }

  return speciesRef.id;
}

/** Fetch species, optionally filtered by stack. */
export async function getSpecies(stackId?: string): Promise<Species[]> {
  let q = query(collection(db, "species"), orderBy("order"));

  if (stackId) {
    q = query(
      collection(db, "species"),
      where("stackId", "==", stackId),
      orderBy("order"),
    );
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      }) as Species,
  );
}

/** Fetch a single species by id. */
export async function getSpeciesById(
  speciesId: string,
): Promise<Species | null> {
  const speciesDoc = await getDoc(doc(db, "species", speciesId));
  if (!speciesDoc.exists()) return null;

  return {
    id: speciesDoc.id,
    ...speciesDoc.data(),
    createdAt: speciesDoc.data().createdAt?.toDate(),
    updatedAt: speciesDoc.data().updatedAt?.toDate(),
  } as Species;
}

/** Update a species with partial fields. */
export async function updateSpecies(
  speciesId: string,
  updates: Partial<Species>,
): Promise<void> {
  await updateDoc(doc(db, "species", speciesId), {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

/** Delete a species and its stored images. */
export async function deleteSpecies(speciesId: string): Promise<void> {
  const speciesDoc = await getDoc(doc(db, "species", speciesId));

  if (speciesDoc.exists()) {
    // Delete all images from storage
    const images = speciesDoc.data().images || [];
    for (const image of images) {
      try {
        const imageRef = ref(storage, image.url);
        await deleteObject(imageRef);
      } catch (error) {
        console.error("Error deleting image:", error);
      }
    }

    // Remove from stack's speciesIds
    const stackId = speciesDoc.data().stackId;
    const stackDoc = await getDoc(doc(db, "stacks", stackId));
    if (stackDoc.exists()) {
      const speciesIds = stackDoc.data().speciesIds || [];
      await updateDoc(doc(db, "stacks", stackId), {
        speciesIds: speciesIds.filter((id: string) => id !== speciesId),
        updatedAt: Timestamp.now(),
      });
    }
  }

  await deleteDoc(doc(db, "species", speciesId));
}

// Image operations
/** Upload an image to storage and return its metadata. */
export async function uploadSpeciesImage(
  speciesId: string,
  file: File,
  order: number,
): Promise<SpeciesImage> {
  const imageId = `${speciesId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const imageRef = ref(storage, `species/${speciesId}/${imageId}`);

  await uploadBytes(imageRef, file);
  const url = await getDownloadURL(imageRef);

  return {
    id: imageId,
    url,
    order,
  };
}

/** Delete an image from storage and update species metadata. */
export async function deleteSpeciesImage(
  speciesId: string,
  imageUrl: string,
): Promise<void> {
  try {
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);

    // Update species document to remove image
    const speciesDoc = await getDoc(doc(db, "species", speciesId));
    if (speciesDoc.exists()) {
      const images = speciesDoc.data().images || [];
      const updatedImages = images.filter(
        (img: SpeciesImage) => img.url !== imageUrl,
      );
      await updateDoc(doc(db, "species", speciesId), {
        images: updatedImages,
        updatedAt: Timestamp.now(),
      });
    }
  } catch (error) {
    console.error("Error deleting image:", error);
    throw error;
  }
}

// Batch reordering
/** Update ordering fields for a list of items in a collection. */
export async function reorderItems(
  collectionName: string,
  items: { id: string; order: number }[],
): Promise<void> {
  const batch = writeBatch(db);

  items.forEach((item) => {
    const docRef = doc(db, collectionName, item.id);
    batch.update(docRef, { order: item.order, updatedAt: Timestamp.now() });
  });

  await batch.commit();
}
