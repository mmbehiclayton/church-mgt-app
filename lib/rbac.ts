import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'manage' | 'export';
export type PermissionResource =
  | 'users' | 'members' | 'transactions' | 'categories' | 'attendance'
  | 'departments' | 'fellowships' | 'settings' | 'reports' | 'system' | 'rbac'
  | 'sms' | 'minutes';

export interface UserPermissions {
  [key: string]: boolean;
}

/**
 * Shape returned by the lean authorization query. Only the fields needed for
 * access control — never the password hash or reset tokens.
 */
interface UserAuthzRow {
  role: string;
  isActive: boolean;
  userRoles: { role: { rolePermissions: { permission: { name: string } }[] } }[];
  userPermissions: { permission: { name: string } }[];
}

export interface UserAuthz {
  role: string;
  isActive: boolean;
  permissions: UserPermissions;
}

/**
 * Merge role-based and direct user permissions into a flat lookup map.
 * Pure function — shared between the DB loader here and the NextAuth authorize() flow.
 */
export function buildPermissionMap(user: Pick<UserAuthzRow, 'userRoles' | 'userPermissions'>): UserPermissions {
  const permissions: UserPermissions = {};
  for (const userRole of user.userRoles) {
    for (const rolePerm of userRole.role.rolePermissions) {
      permissions[rolePerm.permission.name] = true;
    }
  }
  // Direct user permissions override/extend role permissions
  for (const userPerm of user.userPermissions) {
    permissions[userPerm.permission.name] = true;
  }
  return permissions;
}

/**
 * Load a user's authorization context (role, active flag, permission map) in a
 * single lean query. Explicitly selects only the fields needed — the password
 * hash and password-reset tokens are never pulled into memory.
 * Returns null if the user no longer exists.
 */
export async function loadUserAuthz(userId: string): Promise<UserAuthz | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      isActive: true,
      userRoles: {
        select: {
          role: {
            select: {
              rolePermissions: {
                select: { permission: { select: { name: true } } },
              },
            },
          },
        },
      },
      userPermissions: {
        select: { permission: { select: { name: true } } },
      },
    },
  });

  if (!user) return null;

  return {
    role: user.role,
    isActive: user.isActive,
    permissions: buildPermissionMap(user),
  };
}

/**
 * Get all permissions for the current user.
 * Wrapped in React cache() so multiple callers in the same request share one DB query.
 * Returns an empty map for missing OR deactivated users, so a user toggled
 * "Inactive" immediately loses all server-side access.
 */
export const getUserPermissions = cache(async (): Promise<UserPermissions> => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return {};
    }

    const authz = await loadUserAuthz(session.user.id);
    if (!authz || !authz.isActive) {
      return {};
    }
    return authz.permissions;
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return {};
  }
});

/**
 * Check if user has a specific permission
 */
export async function hasPermission(resource: PermissionResource, action: PermissionAction): Promise<boolean> {
  const permissions = await getUserPermissions();
  const permissionName = `${resource}:${action}`;

  // Check for specific permission
  if (permissions[permissionName]) {
    return true;
  }

  // Check for manage permission (grants all actions)
  if (permissions[`${resource}:manage`]) {
    return true;
  }

  // Check for system manage permission
  if (permissions['system:manage']) {
    return true;
  }

  return false;
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(permissions: string[]): Promise<boolean> {
  const userPermissions = await getUserPermissions();
  return permissions.some(perm => userPermissions[perm]);
}

/**
 * Check if user has all of the specified permissions
 */
export async function hasAllPermissions(permissions: string[]): Promise<boolean> {
  const userPermissions = await getUserPermissions();
  return permissions.every(perm => userPermissions[perm]);
}

/**
 * Get user roles
 */
export async function getUserRoles(): Promise<string[]> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return [];
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        userRoles: {
          select: { role: { select: { name: true } } },
        },
      },
    });

    return user?.userRoles.map(ur => ur.role.name) || [];
  } catch (error) {
    console.error('Error getting user roles:', error);
    return [];
  }
}

/**
 * Check if user has a specific role
 */
export async function hasRole(roleName: string): Promise<boolean> {
  const roles = await getUserRoles();
  return roles.includes(roleName);
}

/**
 * Check if user is admin (has admin role or system manage permission)
 */
export async function isAdmin(): Promise<boolean> {
  const [hasAdminRole, hasSystemManage] = await Promise.all([
    hasRole('Admin'),
    hasPermission('system', 'manage')
  ]);

  return hasAdminRole || hasSystemManage;
}

/**
 * Middleware function to check permissions
 */
export async function requirePermission(resource: PermissionResource, action: PermissionAction) {
  const hasPerm = await hasPermission(resource, action);
  if (!hasPerm) {
    throw new Error(`Insufficient permissions: ${resource}:${action}`);
  }
}

/**
 * Get all available roles
 */
export async function getAllRoles() {
  try {
    return await prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        },
        _count: {
          select: {
            userRoles: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
  } catch (error) {
    console.error('Error getting roles:', error);
    return [];
  }
}

/**
 * Get all available permissions
 */
export async function getAllPermissions() {
  try {
    return await prisma.permission.findMany({
      orderBy: [
        { resource: 'asc' },
        { action: 'asc' }
      ]
    });
  } catch (error) {
    console.error('Error getting permissions:', error);
    return [];
  }
}

/**
 * Assign role to user
 */
export async function assignRoleToUser(userId: string, roleId: string) {
  try {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId
        }
      },
      update: {},
      create: {
        userId,
        roleId
      }
    });
    return { success: true };
  } catch (error) {
    console.error('Error assigning role:', error);
    return { error: 'Failed to assign role' };
  }
}

/**
 * Assign multiple roles to user
 */
export async function assignRolesToUser(userId: string, roleIds: string[]) {
  try {
    const userRoles = [];
    for (const roleId of roleIds) {
      const result = await assignRoleToUser(userId, roleId);
      if (result.success) {
        userRoles.push({ roleId });
      }
    }
    return { success: true, assigned: userRoles.length };
  } catch (error) {
    console.error('Error assigning roles to user:', error);
    return { error: 'Failed to assign roles' };
  }
}

/**
 * Remove role from user
 */
export async function removeRoleFromUser(userId: string, roleId: string) {
  try {
    await prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId
        }
      }
    });
    return { success: true };
  } catch (error) {
    console.error('Error removing role:', error);
    return { error: 'Failed to remove role' };
  }
}

/**
 * Assign direct permission to user
 */
export async function assignPermissionToUser(userId: string, permissionId: string) {
  try {
    await prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId,
          permissionId
        }
      },
      update: {},
      create: {
        userId,
        permissionId
      }
    });
    return { success: true };
  } catch (error) {
    console.error('Error assigning permission:', error);
    return { error: 'Failed to assign permission' };
  }
}

/**
 * Remove direct permission from user
 */
export async function removePermissionFromUser(userId: string, permissionId: string) {
  try {
    await prisma.userPermission.delete({
      where: {
        userId_permissionId: {
          userId,
          permissionId
        }
      }
    });
    return { success: true };
  } catch (error) {
    console.error('Error removing permission:', error);
    return { error: 'Failed to remove permission' };
  }
}