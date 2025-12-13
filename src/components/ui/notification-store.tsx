"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export type NotificationType = "default" | "success" | "warning" | "error" | "info";

export interface Notification {
    id: string;
    title?: string;
    description?: string;
    type: NotificationType;
    timestamp: number;
    read: boolean;
    link?: string;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearAll: () => void;
    removeNotification: (id: string) => void;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

import { notificationManager } from "@/lib/notification-manager";

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export { notificationManager };


export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem("eximley-notifications");
        if (saved) {
            try {
                setNotifications(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse notifications", e);
            }
        }
    }, []);

    // Save to localStorage on change
    useEffect(() => {
        localStorage.setItem("eximley-notifications", JSON.stringify(notifications.slice(0, 50))); // Limit to 50
    }, [notifications]);

    const addNotification = useCallback((data: Omit<Notification, "id" | "timestamp" | "read">) => {
        const newNotification: Notification = {
            id: Math.random().toString(36).substring(2, 9),
            timestamp: Date.now(),
            read: false,
            ...data,
        };
        setNotifications((prev) => [newNotification, ...prev]);
    }, []);

    // Hook internal add function to singleton
    useEffect(() => {
        notificationManager.add = addNotification;
    }, [addNotification]);

    const markAsRead = (id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
    };

    const markAllAsRead = () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const clearAll = () => {
        setNotifications([]);
    };

    const removeNotification = (id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                addNotification,
                markAsRead,
                markAllAsRead,
                clearAll,
                removeNotification,
                isOpen,
                setIsOpen,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error("useNotifications must be used within a NotificationProvider");
    }
    return context;
}
