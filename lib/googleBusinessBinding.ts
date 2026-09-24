type ConnectionWrite = "saved" | "conflict" | "error";
type ProfileUpdate = "updated" | "conflict" | "error";

type BindingActions = {
  insertConnection: () => Promise<ConnectionWrite>;
  upsertConnection: () => Promise<boolean>;
  updateProfile: () => Promise<ProfileUpdate>;
  removeInsertedConnection: () => Promise<boolean>;
};

export type BindingResult = {
  status: "connected" | "connection_conflict" | "connection_save_failed" |
    "profile_update_failed" | "business_identity_changed";
  cleanupFailed?: boolean;
};

export async function saveGoogleBusinessBinding(
  placeChanged: boolean, actions: BindingActions,
): Promise<BindingResult> {
  if (!placeChanged) {
    try {
      return { status: await actions.upsertConnection() ? "connected" : "connection_save_failed" };
    } catch {
      return { status: "connection_save_failed" };
    }
  }

  let inserted: ConnectionWrite;
  try { inserted = await actions.insertConnection(); }
  catch { inserted = "error"; }
  if (inserted === "conflict") return { status: "connection_conflict" };
  if (inserted !== "saved") return { status: "connection_save_failed" };

  let updated: ProfileUpdate;
  try { updated = await actions.updateProfile(); }
  catch { updated = "error"; }
  if (updated === "updated") return { status: "connected" };

  let cleanupFailed: boolean;
  try { cleanupFailed = !(await actions.removeInsertedConnection()); }
  catch { cleanupFailed = true; }
  return {
    status: updated === "conflict" ? "business_identity_changed" : "profile_update_failed",
    cleanupFailed,
  };
}
