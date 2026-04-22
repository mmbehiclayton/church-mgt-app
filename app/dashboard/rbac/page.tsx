import RBACManager from "@/components/rbac/RBACManager";

export default function RBACPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">RBAC Management</h1>
                <p className="text-muted-foreground">
                    Manage roles, permissions, and user access control
                </p>
            </div>
            <RBACManager />
        </div>
    );
}