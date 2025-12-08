"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldAlert } from "lucide-react";

const passwordSchema = z.object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

export default function UpdatePasswordPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const form = useForm<z.infer<typeof passwordSchema>>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    async function onSubmit(values: z.infer<typeof passwordSchema>) {
        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/auth/update-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: values.password }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to update password");
            }

            const data = await response.json();

            // Show success message
            setSuccess(true);

            // Wait 2 seconds before redirecting
            setTimeout(() => {
                // Redirect based on user role
                if (data.isSuperAdmin) {
                    router.push("/admin");
                } else {
                    router.push("/dashboard");
                }
                router.refresh();
            }, 2000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
            <Card className="w-full max-w-md border-amber-500/50 shadow-2xl">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-amber-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                        <ShieldAlert className="w-6 h-6 text-amber-600" />
                    </div>
                    <CardTitle className="text-2xl">Security Update Required</CardTitle>
                    <CardDescription>
                        You must change your password before continuing.
                        This is required for your account security.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>New Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="••••••••" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Confirm New Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="••••••••" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {error && (
                                <div className="text-sm text-red-500 font-medium text-center bg-red-50 p-2 rounded">{error}</div>
                            )}

                            {success && (
                                <div className="text-sm text-green-600 font-medium text-center bg-green-50 border border-green-200 p-3 rounded-lg">
                                    <p className="font-semibold">✓ Password updated successfully!</p>
                                    <p className="text-xs mt-1">Redirecting to your dashboard...</p>
                                </div>
                            )}

                            <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white" disabled={loading || success}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    "Update Password & Sign In"
                                )}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
