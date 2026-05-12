import { hasPermission } from "@/lib/rbac";
import prisma from "@/lib/db";
import { getDepartments, getHomeFellowships, getAttendanceSessionById } from "@/app/actions";
import MarkAttendanceClient from "./MarkAttendanceClient";

export const dynamic = "force-dynamic";

export default async function MarkAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  const canCreate = await hasPermission("attendance", "create");
  const canUpdate = await hasPermission("attendance", "update");
  if (!canCreate && !canUpdate) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground mt-2">
            You don&apos;t have permission to mark attendance.
          </p>
        </div>
      </div>
    );
  }

  const [members, departments, fellowships, session] = await Promise.all([
    prisma.member.findMany({
      select: {
        id: true,
        fullName: true,
        gender: true,
        homeFellowship: { select: { id: true, name: true } },
        departments: {
          select: { department: { select: { id: true, name: true } } },
        },
      },
      orderBy: { fullName: "asc" },
    }),
    getDepartments(),
    getHomeFellowships(),
    id ? getAttendanceSessionById(id) : Promise.resolve(null),
  ]);

  return (
    <MarkAttendanceClient
      members={members.map(m => ({
        id: m.id,
        fullName: m.fullName,
        gender: m.gender,
        homeFellowshipId: m.homeFellowship?.id ?? null,
        homeFellowshipName: m.homeFellowship?.name ?? null,
        departmentIds: m.departments.map(d => d.department.id),
      }))}
      departments={departments.map(d => ({ id: d.id, name: d.name }))}
      fellowships={fellowships.map(f => ({ id: f.id, name: f.name }))}
      session={
        session
          ? {
              id: session.id,
              date: session.date.toISOString(),
              type: session.type,
              description: session.description ?? "",
              status: session.status,
              records: session.records.map(r => ({ memberId: r.memberId, status: r.status })),
            }
          : null
      }
    />
  );
}
