"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Shield, Users, Trash2, Edit, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";

interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  rolePermissions: {
    permission: {
      id: string;
      name: string;
      resource: string;
      action: string;
      description: string | null;
    };
  }[];
  _count: { userRoles: number };
}

interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string | null;
  isSystem: boolean;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  userRoles: { role: { id: string; name: string } }[];
  userPermissions: { permission: { id: string; name: string; resource: string; action: string } }[];
}

function getInitials(name?: string | null, email?: string | null): string {
  const src = name?.trim() || email?.split("@")[0] || "?";
  const parts = src.split(/\s+/).filter(Boolean);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : src.slice(0, 2).toUpperCase();
}

const RESOURCE_LABEL: Record<string, string> = {
  transactions: "Finance",
  members: "Membership",
  attendance: "Attendance",
  sms: "SMS",
  users: "Users",
  rbac: "Roles & Permissions",
  settings: "Settings",
  minutes: "Meeting Minutes",
};

const ACTION_COLOUR: Record<string, string> = {
  read:   "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  create: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  update: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  delete: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  manage: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  send:   "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
};

function groupByResource<T extends { resource: string }>(items: T[]): Record<string, T[]> {
  return items.reduce((acc, item) => {
    (acc[item.resource] ??= []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

export default function RBACManager() {
  const { hasPermission } = usePermissions();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("roles");

  // Create role dialog
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Assign roles dialog
  const [showAssign, setShowAssign] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [assignedRoles, setAssignedRoles] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [rRes, pRes, uRes] = await Promise.all([
        fetch("/api/rbac/roles"),
        fetch("/api/rbac/permissions"),
        fetch("/api/rbac/users"),
      ]);
      if (rRes.ok) setRoles(await rRes.json());
      if (pRes.ok) setPermissions(await pRes.json());
      if (uRes.ok) setUsers(await uRes.json());
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateRole() {
    if (!newRoleName.trim()) { toast.error("Role name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/rbac/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoleName, description: newRoleDesc, permissionIds: selectedPerms }),
      });
      if (res.ok) {
        toast.success("Role created");
        setShowCreateRole(false);
        setNewRoleName(""); setNewRoleDesc(""); setSelectedPerms([]);
        loadData();
      } else {
        const e = await res.json();
        toast.error(e.error || "Failed to create role");
      }
    } catch { toast.error("Failed to create role"); }
    finally { setSaving(false); }
  }

  async function handleDeleteRole(id: string, name: string) {
    if (!confirm(`Delete role "${name}"? Users assigned this role will lose its permissions.`)) return;
    const res = await fetch(`/api/rbac/roles/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Role deleted"); loadData(); }
    else { const e = await res.json(); toast.error(e.error || "Failed to delete role"); }
  }

  async function handleAssignRoles() {
    if (!selectedUser) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/rbac/users/${selectedUser.id}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleIds: assignedRoles }),
      });
      if (res.ok) {
        toast.success("Roles updated");
        setShowAssign(false); setSelectedUser(null); setAssignedRoles([]);
        loadData();
      } else {
        const e = await res.json();
        toast.error(e.error || "Failed to update roles");
      }
    } catch { toast.error("Failed to update roles"); }
    finally { setAssigning(false); }
  }

  function openAssign(user: User) {
    setSelectedUser(user);
    setAssignedRoles(user.userRoles.map(ur => ur.role.id));
    setShowAssign(true);
  }

  if (!hasPermission("rbac", "manage")) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 mx-auto rounded-full bg-muted flex items-center justify-center">
            <Shield className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold">Access Denied</h3>
          <p className="text-sm text-muted-foreground">You don&apos;t have permission to manage roles.</p>
        </div>
      </div>
    );
  }

  const groupedPerms = groupByResource(permissions);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roles &amp; Permissions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Control who can do what across every module.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="roles">
              <Shield className="h-3.5 w-3.5 mr-1.5" />
              Roles <span className="ml-1.5 text-xs opacity-60">{roles.length}</span>
            </TabsTrigger>
            <TabsTrigger value="permissions">
              <Lock className="h-3.5 w-3.5 mr-1.5" />
              Permissions <span className="ml-1.5 text-xs opacity-60">{permissions.length}</span>
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Users <span className="ml-1.5 text-xs opacity-60">{users.length}</span>
            </TabsTrigger>
          </TabsList>

          {/* ── Roles tab ── */}
          <TabsContent value="roles" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{roles.length} role{roles.length !== 1 ? "s" : ""} defined</p>
              <Button size="sm" onClick={() => setShowCreateRole(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> New Role
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {roles.map((role, i) => (
                <div
                  key={role.id}
                  className={cn("flex items-start gap-4 px-4 py-3.5", i > 0 && "border-t border-border")}
                >
                  {/* Icon */}
                  <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Shield className="h-4 w-4" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{role.name}</span>
                      {role.isSystem && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">System</Badge>
                      )}
                    </div>
                    {role.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {role.rolePermissions.slice(0, 6).map(rp => (
                        <span
                          key={rp.permission.id}
                          className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
                            ACTION_COLOUR[rp.permission.action] ?? "bg-muted text-muted-foreground")}
                        >
                          {rp.permission.name}
                        </span>
                      ))}
                      {role.rolePermissions.length > 6 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
                          +{role.rolePermissions.length - 6} more
                        </span>
                      )}
                      {role.rolePermissions.length === 0 && (
                        <span className="text-[11px] text-muted-foreground">No permissions assigned</span>
                      )}
                    </div>
                  </div>

                  {/* Meta + actions */}
                  <div className="shrink-0 text-right space-y-1.5">
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {role._count.userRoles} user{role._count.userRoles !== 1 ? "s" : ""}
                    </p>
                    {!role.isSystem && (
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteRole(role.id, role.name)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {roles.length === 0 && (
                <div className="py-16 text-center text-sm text-muted-foreground">No roles yet.</div>
              )}
            </div>
          </TabsContent>

          {/* ── Permissions tab ── */}
          <TabsContent value="permissions" className="space-y-4">
            <p className="text-sm text-muted-foreground">{permissions.length} permissions across {Object.keys(groupedPerms).length} modules</p>
            <div className="space-y-3">
              {Object.entries(groupedPerms).map(([resource, perms]) => (
                <div key={resource} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {RESOURCE_LABEL[resource] ?? resource}
                    </span>
                    <span className="text-xs text-muted-foreground">{perms.length}</span>
                  </div>
                  <div className="divide-y divide-border">
                    {perms.map(perm => (
                      <div key={perm.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium shrink-0 w-16 justify-center",
                          ACTION_COLOUR[perm.action] ?? "bg-muted text-muted-foreground")}>
                          {perm.action}
                        </span>
                        <span className="text-sm font-mono text-muted-foreground">{perm.name}</span>
                        {perm.description && (
                          <span className="text-xs text-muted-foreground ml-auto truncate max-w-[240px]">{perm.description}</span>
                        )}
                        {perm.isSystem && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0 ml-auto">System</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── Users tab ── */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{users.length} user{users.length !== 1 ? "s" : ""}</p>
              <Button size="sm" onClick={() => { setSelectedUser(null); setAssignedRoles([]); setShowAssign(true); }}>
                <Users className="h-3.5 w-3.5 mr-1.5" /> Assign Roles
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {users.map((user, i) => {
                const initials = getInitials(user.name, user.email);
                return (
                  <div
                    key={user.id}
                    className={cn("flex items-center gap-3 px-4 py-3", i > 0 && "border-t border-border")}
                  >
                    {/* Avatar */}
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                      {initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name || user.email}</p>
                      {user.name && (
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {user.userRoles.length > 0 ? (
                          user.userRoles.map(ur => (
                            <Badge key={ur.role.id} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {ur.role.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-[11px] text-muted-foreground">No roles</span>
                        )}
                      </div>
                    </div>

                    {/* Edit */}
                    <Button
                      variant="ghost" size="sm"
                      className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
                      onClick={() => openAssign(user)}
                    >
                      <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                  </div>
                );
              })}
              {users.length === 0 && (
                <div className="py-16 text-center text-sm text-muted-foreground">No users found.</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* ── Create Role dialog ── */}
      <Dialog open={showCreateRole} onOpenChange={o => { if (!saving) setShowCreateRole(o); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <Label htmlFor="r-name">Name <span className="text-destructive">*</span></Label>
              <Input id="r-name" placeholder="e.g. Finance Manager"
                value={newRoleName} onChange={e => setNewRoleName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-desc">Description</Label>
              <Input id="r-desc" placeholder="What this role allows…"
                value={newRoleDesc} onChange={e => setNewRoleDesc(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="max-h-56 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                {Object.entries(groupedPerms).map(([resource, perms]) => (
                  <div key={resource}>
                    <div className="px-3 py-2 bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {RESOURCE_LABEL[resource] ?? resource}
                    </div>
                    <div className="px-3 py-2 grid grid-cols-2 gap-x-4 gap-y-2">
                      {perms.map(perm => (
                        <label key={perm.id} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={selectedPerms.includes(perm.id)}
                            onCheckedChange={checked =>
                              setSelectedPerms(prev =>
                                checked ? [...prev, perm.id] : prev.filter(id => id !== perm.id)
                              )
                            }
                          />
                          <span className="text-xs">
                            <span className={cn("inline-block px-1 rounded text-[10px] font-medium mr-1",
                              ACTION_COLOUR[perm.action] ?? "bg-muted text-muted-foreground")}>
                              {perm.action}
                            </span>
                            {RESOURCE_LABEL[perm.resource] ?? perm.resource}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {selectedPerms.length > 0 && (
                <p className="text-xs text-muted-foreground">{selectedPerms.length} permission{selectedPerms.length !== 1 ? "s" : ""} selected</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowCreateRole(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleCreateRole} disabled={saving}>
                {saving ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Creating…</> : "Create Role"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Assign Roles dialog ── */}
      <Dialog open={showAssign} onOpenChange={o => { if (!assigning) setShowAssign(o); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Roles</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <Label>User</Label>
              <Select
                value={selectedUser?.id ?? ""}
                onValueChange={uid => {
                  const u = users.find(u => u.id === uid) ?? null;
                  setSelectedUser(u);
                  setAssignedRoles(u?.userRoles.map(ur => ur.role.id) ?? []);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedUser && (
              <div className="space-y-2">
                <Label>Roles</Label>
                <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
                  {roles.map(role => (
                    <label key={role.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors">
                      <Checkbox
                        checked={assignedRoles.includes(role.id)}
                        onCheckedChange={checked =>
                          setAssignedRoles(prev =>
                            checked ? [...prev, role.id] : prev.filter(id => id !== role.id)
                          )
                        }
                      />
                      <span className="text-sm flex-1">{role.name}</span>
                      {role.isSystem && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">System</Badge>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowAssign(false)} disabled={assigning}>Cancel</Button>
              <Button onClick={handleAssignRoles} disabled={!selectedUser || assigning}>
                {assigning ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving…</> : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
