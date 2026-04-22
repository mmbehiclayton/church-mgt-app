import { getUsers } from "@/app/actions";
import UsersPageClient from "./UsersPageClient";

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
    const users = await getUsers();

    return <UsersPageClient users={users} />;
}
