const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const { onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");

admin.initializeApp();

exports.cleanupDeletedRoomTree = onDocumentDeleted("rooms/{roomId}", async (event) => {
  const roomId = event.params.roomId;
  const roomRef = admin.firestore().collection("rooms").doc(roomId);

  try {
    // Firestore TTL only deletes the parent document; descendants need explicit cleanup.
    await admin.firestore().recursiveDelete(roomRef);
    logger.info(`Cleanup done for room ${roomId}`);
  } catch (error) {
    logger.error(`Cleanup failed for room ${roomId}`, error);
    throw error;
  }
});

exports.cleanupExpiredRooms = onSchedule("every 15 minutes", async () => {
  const now = admin.firestore.Timestamp.now();
  const db = admin.firestore();

  const snap = await db.collection("rooms").where("expiresAt", "<=", now).get();
  if (snap.empty) {
    logger.info("No expired rooms found.");
    return;
  }

  for (const docSnap of snap.docs) {
    try {
      // Remove descendants first, then the room document itself.
      await db.recursiveDelete(docSnap.ref);
      logger.info(`Expired room deleted: ${docSnap.id}`);
    } catch (error) {
      logger.error(`Failed deleting expired room: ${docSnap.id}`, error);
    }
  }
});
