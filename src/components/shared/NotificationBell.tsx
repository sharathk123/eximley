"use client";

import { useNotifications } from "@/components/ui/notification-store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Check, Trash2, CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, removeNotification, isOpen, setIsOpen } = useNotifications();

    const getIcon = (type: string) => {
        switch (type) {
            case "success": return <CheckCircle2 className="h-4 w-4 text-green-600" />;
            case "error": return <AlertCircle className="h-4 w-4 text-red-600" />;
            case "warning": return <AlertCircle className="h-4 w-4 text-orange-600" />;
            default: return <Info className="h-4 w-4 text-blue-600" />;
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-8 w-8 hover:bg-muted-foreground/10" aria-label="Notifications">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-600 border border-background animate-pulse" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                    <h4 className="font-semibold text-sm">Notifications</h4>
                    {notifications.length > 0 && (
                        <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={markAllAsRead} title="Mark all as read">
                                <Check className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={clearAll} title="Clear all">
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    )}
                </div>
                <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground text-sm p-4 text-center">
                            <Bell className="h-8 w-8 mb-2 opacity-20" />
                            <p>No notifications yet</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "p-3 flex gap-3 text-sm hover:bg-muted/50 transition-colors relative group",
                                        !notification.read && "bg-blue-50/50 dark:bg-blue-900/10"
                                    )}
                                    onMouseEnter={() => !notification.read && markAsRead(notification.id)}
                                >
                                    <div className="mt-0.5 shrink-0">
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        {notification.title && (
                                            <p className={cn("font-medium leading-none", !notification.read && "text-blue-700 dark:text-blue-300")}>
                                                {notification.title}
                                            </p>
                                        )}
                                        {notification.description && (
                                            <p className="text-muted-foreground text-xs leading-snug">
                                                {notification.description}
                                            </p>
                                        )}
                                        <p className="text-[10px] text-muted-foreground/60 pt-1">
                                            {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 opacity-0 group-hover:opacity-100 absolute top-2 right-2 transition-opacity"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeNotification(notification.id);
                                        }}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}

export default NotificationBell;
