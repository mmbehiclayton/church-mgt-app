"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { updateOrganization } from "@/app/actions";
import { toast } from "sonner";

interface SettingsFormProps {
    organization: {
        id: string;
        name: string;
        leaderName: string | null;
        email: string | null;
        phone: string | null;
        logoUrl: string | null;
    };
}

interface FormData {
    name: string;
    leaderName: string;
    email: string;
    phone: string;
    logoUrl: string;
}

export default function SettingsForm({ organization }: SettingsFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const [preview, setPreview] = useState<string | null>(organization.logoUrl);

    const { register, handleSubmit, setValue } = useForm<FormData>({
        defaultValues: {
            name: organization.name,
            leaderName: organization.leaderName || "",
            email: organization.email || "",
            phone: organization.phone || "",
            logoUrl: organization.logoUrl || "",
        }
    });

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 500 * 1024) {
            toast.error("File is too large. Maximum size is 500KB.");
            e.target.value = ""; // Reset input
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setPreview(base64String);
            setValue("logoUrl", base64String, { shouldDirty: true });
        };
        reader.readAsDataURL(file);
    };

    const onSubmit = async (data: FormData) => {
        setLoading(true);

        try {
            const result = await updateOrganization({
                id: organization.id,
                ...data
            });

            if (result.success) {
                toast.success("Settings updated successfully!");
                router.refresh();
            } else {
                toast.error(result.error || "Failed to update settings");
                console.error(result.error);
            }
        } catch (error) {
            toast.error("Failed to update settings");
            console.error("Failed to update settings", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Organization Settings</CardTitle>
                <CardDescription>
                    Manage your organization&apos;s global settings here.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Region</Label>
                        <Input id="name" {...register("name")} required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="leaderName">Bishop&apos;s Name</Label>
                        <Input id="leaderName" {...register("leaderName")} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input id="email" type="email" {...register("email")} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Bishop&apos;s Phone</Label>
                            <Input id="phone" {...register("phone")} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label htmlFor="logo">Organization Logo</Label>
                        <div className="flex items-center gap-4">
                            {preview ? (
                                <div className="relative h-20 w-20 rounded-lg border overflow-hidden">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={preview}
                                        alt="Logo preview"
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="h-20 w-20 rounded-lg border bg-gray-100 flex items-center justify-center text-gray-400">
                                    No Logo
                                </div>
                            )}
                            <div className="flex-1 space-y-2">
                                <Input
                                    id="logo"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    className="cursor-pointer"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Max file size: 500KB. Supported formats: PNG, JPG, JPEG.
                                </p>
                            </div>
                        </div>
                        {/* Hidden input to store the URL/Base64 string for form submission */}
                        <input type="hidden" {...register("logoUrl")} />
                    </div>

                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
