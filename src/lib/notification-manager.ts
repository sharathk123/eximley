import { Notification } from "@/components/ui/notification-store";

type NotificationInput = Omit<Notification, "id" | "timestamp" | "read">;

// Singleton for external access (e.g., from generic toast functions)
export const notificationManager = {
    add: (notification: NotificationInput) => {
        // This will be overwritten by the React component
        console.warn("NotificationManager not initialized yet", notification);
    }
};
