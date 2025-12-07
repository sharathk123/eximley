"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        setLoading(true);
        try {
            await fetch("/api/auth/logout", {
                method: "POST",
            });
            // We redirect regardless of success to ensure user leaves the app
            router.push("/login");
            router.refresh(); // Clear client cache
        } catch (error) {
            console.error("Logout failed", error);
            router.push("/login");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleLogout}
            disabled={loading}
            className="flex w-full items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100 hover:text-red-600 transition-colors group"
        >
            <LogOut className="w-5 h-5 text-gray-500 group-hover:text-red-600 transition-colors" />
            <span className="font-medium">{loading ? "Signing out..." : "Log out"}</span>
        </button>
    );
}
