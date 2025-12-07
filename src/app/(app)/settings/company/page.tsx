"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [company, setCompany] = useState<any>(null);

    useEffect(() => {
        // Fetch Profile & Company
        // We'll separate APIs or one aggregation?
        // Separate for cleanliness
        setLoading(true);
        Promise.all([
            fetch("/api/profile/get").then(res => res.json()),
            fetch("/api/company/get").then(res => res.json())
        ]).then(([profileRes, companyRes]) => {
            if (profileRes.profile) setProfile(profileRes.profile);
            if (companyRes.company) setCompany(companyRes.company);
        }).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex p-10 justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold">Settings</h1>

            <Tabs defaultValue="company" className="w-full">
                <TabsList>
                    <TabsTrigger value="company">Company</TabsTrigger>
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                </TabsList>

                <TabsContent value="company">
                    <Card>
                        <CardHeader>
                            <CardTitle>Company Details</CardTitle>
                            <CardDescription>Manage your company information.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label>Company Name</Label>
                                <Input defaultValue={company?.name} disabled />
                            </div>
                            <div className="grid gap-2">
                                <Label>Address</Label>
                                <Input defaultValue={company?.address || ""} placeholder="Update details via API (read-only MVP)" disabled />
                            </div>
                            <div className="grid gap-2">
                                <Label>GST</Label>
                                <Input defaultValue={company?.gst || ""} disabled />
                            </div>
                            <div className="grid gap-2">
                                <Label>IEC</Label>
                                <Input defaultValue={company?.iec || ""} disabled />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="profile">
                    <Card>
                        <CardHeader>
                            <CardTitle>Your Profile</CardTitle>
                            <CardDescription>Update your personal details.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label>Full Name</Label>
                                <Input defaultValue={profile?.full_name} disabled />
                            </div>
                            <div className="grid gap-2">
                                <Label>Phone</Label>
                                <Input defaultValue={profile?.phone} disabled />
                            </div>
                            <div className="grid gap-2">
                                <Label>Job Title</Label>
                                <Input defaultValue={profile?.job_title} disabled />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
