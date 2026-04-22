"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Shield, Users, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";

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
  _count: {
    userRoles: number;
  };
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
  userRoles: {
    role: {
      id: string;
      name: string;
      description: string | null;
    };
  }[];
  userPermissions: {
    permission: {
      id: string;
      name: string;
      resource: string;
      action: string;
      description: string | null;
    };
  }[];
}

export default function RBACManager() {
  const { hasPermission } = usePermissions();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("roles");

  // Role creation state
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // User role assignment state
  const [showAssignRole, setShowAssignRole] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userRoleAssignments, setUserRoleAssignments] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesRes, permissionsRes, usersRes] = await Promise.all([
        fetch('/api/rbac/roles'),
        fetch('/api/rbac/permissions'),
        fetch('/api/rbac/users')
      ]);

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData);
      }

      if (permissionsRes.ok) {
        const permissionsData = await permissionsRes.json();
        setPermissions(permissionsData);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }
    } catch (error) {
      console.error('Error loading RBAC data:', error);
      toast.error('Failed to load RBAC data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      toast.error('Role name is required');
      return;
    }

    try {
      const response = await fetch('/api/rbac/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoleName,
          description: newRoleDescription,
          permissionIds: selectedPermissions
        })
      });

      if (response.ok) {
        toast.success('Role created successfully');
        setShowCreateRole(false);
        setNewRoleName("");
        setNewRoleDescription("");
        setSelectedPermissions([]);
        loadData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create role');
      }
    } catch (error) {
      console.error('Error creating role:', error);
      toast.error('Failed to create role');
    }
  };

  const handleAssignRoleToUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/rbac/users/${selectedUser.id}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleIds: userRoleAssignments })
      });

      if (response.ok) {
        toast.success('Roles assigned successfully');
        setShowAssignRole(false);
        setSelectedUser(null);
        setUserRoleAssignments([]);
        loadData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to assign roles');
      }
    } catch (error) {
      console.error('Error assigning roles:', error);
      toast.error('Failed to assign roles');
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Are you sure you want to delete the role "${roleName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/rbac/roles/${roleId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Role deleted successfully');
        loadData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete role');
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Failed to delete role');
    }
  };

  const groupPermissionsByResource = (permissions: Permission[]) => {
    return permissions.reduce((acc, perm) => {
      if (!acc[perm.resource]) {
        acc[perm.resource] = [];
      }
      acc[perm.resource].push(perm);
      return acc;
    }, {} as Record<string, Permission[]>);
  };

  if (!hasPermission('rbac', 'manage')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You don&apos;t have permission to manage roles and permissions.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  const groupedPermissions = groupPermissionsByResource(permissions);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Role-Based Access Control</h1>
          <p className="text-gray-500 mt-1">Manage roles, permissions, and user access</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="users">User Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Roles</h2>
            <Dialog open={showCreateRole} onOpenChange={setShowCreateRole}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Role
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Role</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="roleName">Role Name</Label>
                    <Input
                      id="roleName"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      placeholder="e.g., Finance Manager"
                    />
                  </div>
                  <div>
                    <Label htmlFor="roleDescription">Description</Label>
                    <Input
                      id="roleDescription"
                      value={newRoleDescription}
                      onChange={(e) => setNewRoleDescription(e.target.value)}
                      placeholder="Brief description of the role"
                    />
                  </div>
                  <div>
                    <Label>Permissions</Label>
                    <div className="max-h-60 overflow-y-auto border rounded-md p-4 space-y-4">
                      {Object.entries(groupedPermissions).map(([resource, perms]) => (
                        <div key={resource}>
                          <h4 className="font-medium capitalize mb-2">{resource}</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {perms.map((perm) => (
                              <div key={perm.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={perm.id}
                                  checked={selectedPermissions.includes(perm.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedPermissions(prev => [...prev, perm.id]);
                                    } else {
                                      setSelectedPermissions(prev => prev.filter(id => id !== perm.id));
                                    }
                                  }}
                                />
                                <Label htmlFor={perm.id} className="text-sm">
                                  {perm.action} ({perm.description})
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreateRole(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateRole}>
                      Create Role
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => (
              <Card key={role.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{role.name}</CardTitle>
                    <div className="flex gap-1">
                      {role.isSystem && <Badge variant="secondary">System</Badge>}
                      {!role.isSystem && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRole(role.id, role.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {role.description && (
                    <p className="text-sm text-gray-600">{role.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">
                      {role._count.userRoles} user{role._count.userRoles !== 1 ? 's' : ''} assigned
                    </div>
                    <div className="text-sm text-gray-600">
                      {role.rolePermissions.length} permission{role.rolePermissions.length !== 1 ? 's' : ''}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {role.rolePermissions.slice(0, 3).map((rp) => (
                        <Badge key={rp.permission.id} variant="outline" className="text-xs">
                          {rp.permission.name}
                        </Badge>
                      ))}
                      {role.rolePermissions.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{role.rolePermissions.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <h2 className="text-xl font-semibold">Permissions</h2>
          <div className="space-y-6">
            {Object.entries(groupedPermissions).map(([resource, perms]) => (
              <Card key={resource}>
                <CardHeader>
                  <CardTitle className="capitalize">{resource}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {perms.map((perm) => (
                      <div key={perm.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="font-medium">{perm.action}</div>
                          <div className="text-sm text-gray-600">{perm.description}</div>
                        </div>
                        {perm.isSystem && <Badge variant="secondary">System</Badge>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">User Role Assignments</h2>
            <Dialog open={showAssignRole} onOpenChange={setShowAssignRole}>
              <DialogTrigger asChild>
                <Button>
                  <Users className="h-4 w-4 mr-2" />
                  Assign Roles
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Roles to User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Select User</Label>
                    <Select onValueChange={(userId) => {
                      const user = users.find(u => u.id === userId);
                      setSelectedUser(user || null);
                      setUserRoleAssignments(user?.userRoles.map(ur => ur.role.id) || []);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedUser && (
                    <div>
                      <Label>Roles</Label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {roles.map((role) => (
                          <div key={role.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={role.id}
                              checked={userRoleAssignments.includes(role.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setUserRoleAssignments(prev => [...prev, role.id]);
                                } else {
                                  setUserRoleAssignments(prev => prev.filter(id => id !== role.id));
                                }
                              }}
                            />
                            <Label htmlFor={role.id}>
                              {role.name}
                              {role.isSystem && <Badge variant="secondary" className="ml-2">System</Badge>}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAssignRole(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAssignRoleToUser} disabled={!selectedUser}>
                      Assign Roles
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {users.map((user) => (
              <Card key={user.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{user.name || user.email}</CardTitle>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setUserRoleAssignments(user.userRoles.map(ur => ur.role.id));
                        setShowAssignRole(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Roles
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-sm font-medium">Roles:</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {user.userRoles.length > 0 ? (
                          user.userRoles.map((ur) => (
                            <Badge key={ur.role.id} variant="default">
                              {ur.role.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">No roles assigned</span>
                        )}
                      </div>
                    </div>

                    {user.userPermissions.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Direct Permissions:</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {user.userPermissions.map((up) => (
                            <Badge key={up.permission.id} variant="outline">
                              {up.permission.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
