import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { ensureAdminExists } from "./modules/auth/auth.service.js";
import { runIservSyncForAllUsers } from "./modules/iserv/iservSync.service.js";
import { runReminderCheck } from "./modules/reminders/reminders.service.js";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`Schulmanager backend listening on port ${env.PORT}`);
});

// Covers deployments upgrading into the admin-role feature, where the
// first-ever account was created long before roles existed - new
// deployments never need this, since register() already makes the first
// signup an admin directly.
ensureAdminExists().catch((err) => console.error("Admin-Bootstrap fehlgeschlagen", err));

// Runs once at startup and then hourly - NotificationLog dedupes actual
// sends, so more-frequent-than-daily checks are safe and mean a reminder
// fires soon after its trigger date rolls over rather than up to a day late.
const REMINDER_CHECK_INTERVAL_MS = 60 * 60 * 1000;
function checkReminders() {
  runReminderCheck().catch((err) => console.error("Reminder check failed", err));
}
checkReminders();
setInterval(checkReminders, REMINDER_CHECK_INTERVAL_MS);

// Vertretungspläne ändern sich tagsüber - alle 30 Minuten synchronisieren,
// zusätzlich zum manuellen "Jetzt synchronisieren" in den Einstellungen.
// No-ops per-user if IServ isn't configured for them (see isIservConfigured).
const ISERV_SYNC_INTERVAL_MS = 30 * 60 * 1000;
function syncIserv() {
  runIservSyncForAllUsers().catch((err) => console.error("IServ sync failed", err));
}
syncIserv();
setInterval(syncIserv, ISERV_SYNC_INTERVAL_MS);
