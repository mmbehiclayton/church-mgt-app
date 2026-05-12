import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'manage' | 'export';
export type PermissionResource =
  | 'users' | 'members' | 'transactions' | 'categories' | 'attendance'
  | 'departments' | 'fellowships' | 'settings' | 'reports' | 'system' | 'rbac'
  | 'sms';

export interface UserPermissions {
  [key: string]: boolean;
}

/**
 * Get all permissions for the current user
 */
export async function getUserPermissions(): Promise<UserPermissions> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return {};
    }

    // Get user with roles and permissions
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        },
        userPermissions: {
          include: {
            permission: true
          }
        }
      }
    });

    if (!user) {
      return {};
    }

    const permissions: UserPermissions = {};

    // Add role-based permissions
    user.userRoles.forEach(userRole => {
      userRole.role.rolePermissions.forEach(rolePerm => {
        permissions[rolePerm.permission.name] = true;
      });
    });

    // Add direct user permissions (override role permissions)
    user.userPermissions.forEach(userPerm => {
      permissions[userPerm.permission.name] = true;
    });

    return permissions;
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return {};
  }
}

/**
 * Get all permissions for a specific user by ID
 */
export async function getUserPermissionsById(userId: string): Promise<UserPermissions> {
  try {
    // Get user with roles and permissions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        },
        userPermissions: {
          include: {
            permission: true
          }
        }
      }
    });

    if (!user) {
      return {};
    }

    const permissions: UserPermissions = {};

    // Add role-based permissions
    user.userRoles.forEach(userRole => {
      userRole.role.rolePermissions.forEach(rolePerm => {
        permissions[rolePerm.permission.name] = true;
      });
    });

    // Add direct user permissions (override role permissions)
    user.userPermissions.forEach(userPerm => {
      permissions[userPerm.permission.name] = true;
    });

    return permissions;
  } catch (error) {
    console.error('Error getting user permissions by ID:', error);
    return {};
  }
}

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
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
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