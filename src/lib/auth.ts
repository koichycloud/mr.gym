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
                console.log("[AUTH] Authorizing user:", credentials?.username)

                if (!credentials?.username || !credentials?.password) {
                    console.log("[AUTH] Missing credentials")
                    return null
                }

                try {
                    const user = await prisma.user.findUnique({
                        where: { username: credentials.username }
                    })

                    console.log("[AUTH] User found in DB:", user ? "YES" : "NO")

                    if (!user) {
                        console.log("[AUTH] User not found")
                        return null
                    }

                    const passwordMatch = await bcrypt.compare(credentials.password, user.password)
                    console.log("[AUTH] Password match:", passwordMatch ? "YES" : "NO")

                    if (!passwordMatch) return null

                    return {
                        id: user.id,
                        name: user.username,
                        role: user.role
                    }
                } catch (error) {
                    console.error("[AUTH] Error in authorize:", error)
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
