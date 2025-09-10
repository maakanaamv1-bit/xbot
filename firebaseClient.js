// firebaseClient.js
import admin from "firebase-admin";

function initFirebaseFromEnv() {
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!saJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON env var is required");
  }

  // Accept either raw JSON or base64-encoded JSON
  let parsed;
  try {
    parsed = JSON.parse(saJson);
  } catch {
    // try base64 decode
    try {
      parsed = JSON.parse(Buffer.from(saJson, "base64").toString("utf8"));
    } catch (err) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON nor base64-encoded JSON");
    }
  }

  admin.initializeApp({
    credential: admin.credential.cert(parsed),
  });

  return admin.firestore();
}

const db = initFirebaseFromEnv();

// helper: get and set lastSeen id (since_id)
const metaRef = db.collection("meta").doc("lastSeen");

export async function getSinceId() {
  const doc = await metaRef.get();
  return doc.exists ? doc.data().since_id : null;
}

export async function setSinceId(newId) {
  return metaRef.set({ since_id: String(newId) }, { merge: true });
}

// scoreboard functions
export async function updateScoreForUser(userId, username, outcome) {
  // outcome: "win" | "loss" | "tie"
  const userRef = db.collection("scores").doc(String(userId));
  await db.runTransaction(async (tx) => {
    const doc = await tx.get(userRef);
    let data = { username, wins: 0, losses: 0, ties: 0, games: 0, updatedAt: new Date() };
    if (doc.exists) data = doc.data();
    if (outcome === "win") data.wins = (data.wins || 0) + 1;
    else if (outcome === "loss") data.losses = (data.losses || 0) + 1;
    else if (outcome === "tie") data.ties = (data.ties || 0) + 1;
    data.games = (data.games || 0) + 1;
    data.username = username; // keep latest username
    data.updatedAt = new Date();
    tx.set(userRef, data, { merge: true });
  });
}

// protect from double-processing tweets: processed collection
export async function markProcessed(tweetId) {
  const r = await db.collection("processed").doc(String(tweetId)).set({
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return r;
}

export async function isProcessed(tweetId) {
  const doc = await db.collection("processed").doc(String(tweetId)).get();
  return doc.exists;
}

// optional leaderboard getter
export async function topPlayers(limit = 10) {
  const snap = await db.collection("scores").orderBy("wins", "desc").limit(limit).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
