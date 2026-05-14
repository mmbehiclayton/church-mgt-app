import { getMinutes, getMeetingTypes } from "./actions";
import MinutesClient from "./MinutesClient";

export const dynamic = "force-dynamic";

export default async function MinutesPage() {
    const [{ data: minutes, pagination }, meetingTypes] = await Promise.all([
        getMinutes({ page: 1, limit: 20 }),
        getMeetingTypes(),
    ]);

    return (
        <MinutesClient
            initialMinutes={minutes}
            initialPagination={pagination}
            meetingTypes={meetingTypes}
        />
    );
}
