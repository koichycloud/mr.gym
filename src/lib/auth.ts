import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Usuario", type: "text" },
                password: { label: "Contraseña", type: "password" }
            },
            async authorize(credentials) {
                console.log("[AUTH_DEBUG] 1. Authorizing attempt for:", credentials?.username)

                if (!credentials?.username || !credentials?.password) {
                    console.error("[AUTH_DEBUG] 2. Missing credentials (username or password)")
                    return null
                }

                try {
                    console.log("[AUTH_DEBUG] 3. Searching for user in DB...")
                    const user = await prisma.user.findUnique({
                        where: { username: credentials.username }
                    })

                    console.log("[AUTH_DEBUG] 4. User found in DB:", user ? "YES (ID: " + user.id + ")" : "NO")

                    if (!user) {
                        console.error("[AUTH_DEBUG] 5. User not found for username:", credentials.username)
                        return null
                    }

                    console.log("[AUTH_DEBUG] 6. Verifying password...")
                    const passwordMatch = await bcrypt.compare(credentials.password, user.password)
                    console.log("[AUTH_DEBUG] 7. Password match result:", passwordMatch ? "MATCH" : "NO MATCH")

                    if (!passwordMatch) {
                        console.error("[AUTH_DEBUG] 8. Password mismatch")
                        return null
                    }

                    console.log("[AUTH_DEBUG] 9. Authorization successful for:", user.username)
                    return {
                        id: user.id,
                        name: user.username,
                        role: user.role
                    }
                } catch (error) {
                    console.error("[AUTH_DEBUG] CRITICAL ERROR in authorize function:", error)
                    return null
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }: any) {
            if (user) {
                token.role = user.role
                token.id = user.id
            }
            return token
        },
        async session({ session, token }: any) {
            if (session.user) {
                session.user.role = token.role
                session.user.id = token.id
            }
            return session
        }
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET || "secret_default_change_me",
}
