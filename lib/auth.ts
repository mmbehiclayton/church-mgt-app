import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { getUserPermissionsById } from "@/lib/rbac";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
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

                const user = await prisma.user.findUnique({
                    where: {
                        email: credentials.email
                    },
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
                    return null;
                }

                const isPasswordValid = await bcrypt.compare(
                    credentials.password,
                    user.password
                );

                if (!isPasswordValid) {
                    return null;
                }

                // Get permissions
                const permissions = await getUserPermissionsById(user.id);

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    permissions,
                };
            }
        })
    ],
    callbacks: {
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.user.permissions = token.permissions as { [key: string]: boolean };
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.permissions = user.permissions;
            }
            return token;
        }
    }
};
