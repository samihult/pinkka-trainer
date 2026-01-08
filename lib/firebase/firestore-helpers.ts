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
import type { Species, Stack, Group, SpeciesImage, User } from "../types";

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

/** Fetch groups, optionally filtered by owner. */
export async function getGroups(ownerId?: string): Promise<Group[]> {
  let q = query(collection(db, "groups"), orderBy("order"));

  if (ownerId) {
    q = query(
      collection(db, "groups"),
      where("ownerId", "==", ownerId),
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

/** Delete a group document. */
export async function deleteGroup(groupId: string): Promise<void> {
  await deleteDoc(doc(db, "groups", groupId));
}

// Stack operations
/** Create a stack and link it to the provided groups. */
export async function createStack(
  stack: Omit<Stack, "id" | "createdAt" | "updatedAt">,
  groupIds: string[] = [],
): Promise<string> {
  const stackRef = doc(collection(db, "stacks"));
  const newStack = {
    ...stack,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  await setDoc(stackRef, newStack);

  // Update groups' stackIds in order
  for (const groupId of groupIds) {
    const groupDoc = await getDoc(doc(db, "groups", groupId));
    if (!groupDoc.exists()) continue;
    const currentStackIds = groupDoc.data().stackIds || [];
    await updateDoc(doc(db, "groups", groupId), {
      stackIds: [...currentStackIds, stackRef.id],
      updatedAt: Timestamp.now(),
    });
  }

  return stackRef.id;
}

/** Fetch stacks, optionally filtered by group and/or owner. */
export async function getStacks(
  groupId?: string,
  ownerId?: string,
): Promise<Stack[]> {
  if (groupId) {
    const groupDoc = await getDoc(doc(db, "groups", groupId));
    if (!groupDoc.exists()) return [];
    const stackIds: string[] = groupDoc.data().stackIds || [];
    if (stackIds.length === 0) return [];

    const stackDocs = await Promise.all(
      stackIds.map((id) => getDoc(doc(db, "stacks", id))),
    );

    return stackDocs
      .filter((stackDoc) => stackDoc.exists())
      .map(
        (stackDoc) =>
          ({
            id: stackDoc.id,
            ...stackDoc.data(),
            createdAt: stackDoc.data()?.createdAt?.toDate(),
            updatedAt: stackDoc.data()?.updatedAt?.toDate(),
          }) as Stack,
      )
      .filter((stack) => (ownerId ? stack.ownerId === ownerId : true));
  }

  let q = query(collection(db, "stacks"), orderBy("data.id"));
  if (ownerId) {
    q = query(
      collection(db, "stacks"),
      where("ownerId", "==", ownerId),
      orderBy("data.id"),
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

/** Delete a stack document and unlink it from groups. */
export async function deleteStack(stackId: string): Promise<void> {
  const groupQuery = query(
    collection(db, "groups"),
    where("stackIds", "array-contains", stackId),
  );
  const groupSnapshot = await getDocs(groupQuery);

  for (const groupDoc of groupSnapshot.docs) {
    const stackIds = groupDoc.data().stackIds || [];
    await updateDoc(doc(db, "groups", groupDoc.id), {
      stackIds: stackIds.filter((id: string) => id !== stackId),
      updatedAt: Timestamp.now(),
    });
  }

  await deleteDoc(doc(db, "stacks", stackId));
}

/** Update the ordered stack ids for a group. */
export async function updateGroupStackOrder(
  groupId: string,
  stackIds: string[],
): Promise<void> {
  await updateDoc(doc(db, "groups", groupId), {
    stackIds,
    updatedAt: Timestamp.now(),
  });
}

/** Update the ordered species ids for a stack. */
export async function updateStackSpeciesOrder(
  stackId: string,
  speciesIds: string[],
): Promise<void> {
  await updateDoc(doc(db, "stacks", stackId), {
    speciesIds,
    updatedAt: Timestamp.now(),
  });
}

// Species operations
/** Create a species and link it to the provided stacks. */
export async function createSpecies(
  species: Omit<Species, "id" | "createdAt" | "updatedAt">,
  stackIds: string[] = [],
): Promise<string> {
  const speciesRef = doc(collection(db, "species"));
  const newSpecies = {
    ...species,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  await setDoc(speciesRef, newSpecies);

  // Update stacks' speciesIds in order
  for (const stackId of stackIds) {
    const stackDoc = await getDoc(doc(db, "stacks", stackId));
    if (!stackDoc.exists()) continue;
    const currentSpeciesIds = stackDoc.data().speciesIds || [];
    await updateDoc(doc(db, "stacks", stackId), {
      speciesIds: [...currentSpeciesIds, speciesRef.id],
      updatedAt: Timestamp.now(),
    });
  }

  return speciesRef.id;
}

/** Fetch species, optionally filtered by stack. */
export async function getSpecies(stackId?: string): Promise<Species[]> {
  if (stackId) {
    const stackDoc = await getDoc(doc(db, "stacks", stackId));
    if (!stackDoc.exists()) return [];
    const speciesIds: string[] = stackDoc.data().speciesIds || [];
    if (speciesIds.length === 0) return [];

    const speciesDocs = await Promise.all(
      speciesIds.map((id) => getDoc(doc(db, "species", id))),
    );

    return speciesDocs
      .filter((speciesDoc) => speciesDoc.exists())
      .map(
        (speciesDoc) =>
          ({
            id: speciesDoc.id,
            ...speciesDoc.data(),
            createdAt: speciesDoc.data()?.createdAt?.toDate(),
            updatedAt: speciesDoc.data()?.updatedAt?.toDate(),
          }) as Species,
      );
  }

  const snapshot = await getDocs(query(collection(db, "species")));
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
    const images = speciesDoc.data().data?.images || [];
    for (const image of images) {
      try {
        const urls = image.urls || {};
        const urlList = Object.values(urls).filter(Boolean) as string[];
        for (const url of urlList) {
          const imageRef = ref(storage, url);
          await deleteObject(imageRef);
        }
      } catch (error) {
        console.error("Error deleting image:", error);
      }
    }

    // Remove from stacks' speciesIds
    const stackQuery = query(
      collection(db, "stacks"),
      where("speciesIds", "array-contains", speciesId),
    );
    const stackSnapshot = await getDocs(stackQuery);
    for (const stackDoc of stackSnapshot.docs) {
      const speciesIds = stackDoc.data().speciesIds || [];
      await updateDoc(doc(db, "stacks", stackDoc.id), {
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
  _order: number,
): Promise<SpeciesImage> {
  const imageId = `${speciesId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const imageRef = ref(storage, `species/${speciesId}/${imageId}`);

  await uploadBytes(imageRef, file);
  const url = await getDownloadURL(imageRef);

  return {
    id: imageId,
    urls: {
      original: url,
      full: url,
      large: url,
      square: url,
      thumbnail: url,
    },
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
      const images = speciesDoc.data().data?.images || [];
      const updatedImages = images.filter((img: SpeciesImage) => {
        const urls = img.urls || {};
        return !Object.values(urls).includes(imageUrl);
      });
      await updateDoc(doc(db, "species", speciesId), {
        "data.images": updatedImages,
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
