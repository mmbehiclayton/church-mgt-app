import { getOwnProfile } from "@/app/actions";
import ProfileClient from "./ProfileClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
    const result = await getOwnProfile();
    if (result.error || !result.data) redirect("/dashboard");
    return <ProfileClient user={result.data} />;
}
