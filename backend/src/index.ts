import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { runReminderCheck } from "./modules/reminders/reminders.service.js";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`Schulmanager backend listening on port ${env.PORT}`);
});

// Runs once at startup and then hourly - NotificationLog dedupes actual
// sends, so more-frequent-than-daily checks are safe and mean a reminder
// fires soon after its trigger date rolls over rather than up to a day late.
const REMINDER_CHECK_INTERVAL_MS = 60 * 60 * 1000;
function checkReminders() {
  runReminderCheck().catch((err) => console.error("Reminder check failed", err));
}
checkReminders();
setInterval(checkReminders, REMINDER_CHECK_INTERVAL_MS);
