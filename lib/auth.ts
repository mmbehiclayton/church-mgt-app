import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { buildPermissionMap, loadUserAuthz } from "@/lib/rbac";

// Fail fast if the JWT signing secret is missing in production — without it,
// NextAuth would fall back to an insecure default and tokens could be forged.
if (process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_SECRET) {
    throw new Error("NEXTAUTH_SECRET is not set. Generate one with `openssl rand -base64 32` and set it in the environment.");
}

// Session lifetime: 8h absolute, rolling (re-issued on activity older than 1h).
const SESSION_MAX_AGE = 8 * 60 * 60; // 8 hours
const SESSION_UPDATE_AGE = 60 * 60;  // 1 hour
// How often to re-check the user's role/permissions/active-state against the DB
// while a session is alive, so admin changes propagate without a full re-login.
const TOKEN_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
        maxAge: SESSION_MAX_AGE,
        updateAge: SESSION_UPDATE_AGE,
    },
    jwt: {
        maxAge: SESSION_MAX_AGE,
    },
    pages: {
        signIn: "/",
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                // Single lean query: only what's needed to authenticate + authorize.
                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        isActive: true,
                        password: true,
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

                if (!user) {
                    return null;
                }

                const isPasswordValid = await bcrypt.compare(
                    credentials.password,
                    user.password
                );

                if (!isPasswordValid) {
                    return null;
                }

                // Deactivated users cannot sign in. Return the same null as a bad
                // password so we don't reveal that the account exists/is disabled.
                if (!user.isActive) {
                    return null;
                }

                // Build permissions from the query we already ran — no second graph fetch.
                const permissions = buildPermissionMap(user);

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    isActive: user.isActive,
                    permissions,
                };
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            // Initial sign-in: seed the token from the authorize() result.
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.permissions = user.permissions;
                token.isActive = user.isActive ?? true;
                token.refreshedAt = Date.now();
                return token;
            }

            // Subsequent requests: periodically re-validate against the DB so that
            // role/permission changes and deactivation propagate without a re-login.
            const refreshedAt = (token.refreshedAt as number | undefined) ?? 0;
            if (token.id && Date.now() - refreshedAt > TOKEN_REFRESH_INTERVAL_MS) {
                try {
                    const authz = await loadUserAuthz(token.id as string);
                    if (!authz) {
                        // User deleted — drop authority.
                        token.isActive = false;
                        token.permissions = {};
                    } else {
                        token.role = authz.role;
                        token.isActive = authz.isActive;
                        token.permissions = authz.isActive ? authz.permissions : {};
                    }
                } catch (error) {
                    console.error("jwt refresh error:", error);
                    // On a transient error, keep the existing token rather than locking the user out.
                }
                token.refreshedAt = Date.now();
            }

            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.user.permissions = token.permissions as { [key: string]: boolean };
                session.user.isActive = (token.isActive as boolean | undefined) ?? true;
            }
            return session;
        },
    }
};
