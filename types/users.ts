export interface UserRoleSummary {
    id: string;
    name: string;
    description: string | null;
}

export interface UserRoleAssignment {
    role: UserRoleSummary;
}

export interface UserManagementUser {
    id: string;
    email: string;
    name: string | null;
    role: string;
    isActive: boolean;
    lastLogin: Date | string | null;
    createdAt: Date | string;
    userRoles: UserRoleAssignment[];
}
