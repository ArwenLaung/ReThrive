import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export const addEcoPoints = async (uid, points) => {
  if (!uid) return 0;

  const userRef = doc(db, "users", uid);

  const userSnap = await getDoc(userRef);

  let newPoints = points;
  if (userSnap.exists()) {
    const currentPoints = userSnap.data().ecoPoints || 0;
    newPoints = currentPoints + points;
    await updateDoc(userRef, { ecoPoints: newPoints });
  } else {
    // use setDoc if user doesn't exist yet
    await setDoc(userRef, { ecoPoints: points }, { merge: true });
  }

  return newPoints;
};