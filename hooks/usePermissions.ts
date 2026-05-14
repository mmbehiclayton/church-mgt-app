"use client";

import { useSession } from "next-auth/react";
import { useMemo } from "react";

export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'manage' | 'export';
export type PermissionResource =
  | 'users' | 'members' | 'transactions' | 'categories' | 'attendance'
  | 'departments' | 'fellowships' | 'settings' | 'reports' | 'system' | 'rbac'
  | 'sms' | 'minutes';

/**
 * Hook to check user permissions on the client side
 */
export function usePermissions() {
  const { data: session } = useSession();

  const permissions = useMemo(() => {
    return session?.user?.permissions || {};
  }, [session?.user?.permissions]);

  const hasPermission = (
    resourceOrPermission: PermissionResource | string,
    action?: PermissionAction
  ): boolean => {
    let permissionName: string;

    if (action) {
      permissionName = `${resourceOrPermission}:${action}`;
    } else if (typeof resourceOrPermission === 'string' && resourceOrPermission.includes(':')) {
      permissionName = resourceOrPermission;
    } else {
      return false;
    }

    const [resource] = permissionName.split(':');

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
  };

  const hasAnyPermission = (permissionNames: string[]): boolean => {
    return permissionNames.some(name => permissions[name]);
  };

  const hasAllPermissions = (permissionNames: string[]): boolean => {
    return permissionNames.every(name => permissions[name]);
  };

  const isAdmin = (): boolean => {
    return hasPermission('system', 'manage') || session?.user?.role === 'ADMIN';
  };

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
  };
}

/**
 * Hook to check if user can access a specific module
 */
export function useModuleAccess(module: PermissionResource) {
  const { hasPermission } = usePermissions();

  const canRead = hasPermission(module, 'read');
  const canCreate = hasPermission(module, 'create');
  const canUpdate = hasPermission(module, 'update');
  const canDelete = hasPermission(module, 'delete');
  const canManage = hasPermission(module, 'manage');
  const canExport = hasPermission(module, 'export');

  return {
    canRead,
    canCreate,
    canUpdate,
    canDelete,
    canManage,
    canExport,
    hasAccess: canRead || canCreate || canUpdate || canDelete || canManage,
  };
}