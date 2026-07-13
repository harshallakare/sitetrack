import { adminServerFetch } from "@/lib/admin-server-api";
import { NotificationSettingsForm, type NotificationSettings } from "./notification-settings-form";

export default async function AdminNotificationsPage() {
  const settings = await adminServerFetch<NotificationSettings>("/admin/notification-settings");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Configure how the platform delivers notifications. Channels are tried in priority order; credentials are
          stored encrypted and never shown again once saved.
        </p>
      </div>
      <NotificationSettingsForm initial={settings} />
    </div>
  );
}
