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
                console.log('Authorize called with user:', credentials?.username)

                if (!credentials?.username || !credentials?.password) {
                    console.log('Missing credentials in authorize')
                    return null
                }

                try {
                    const user = await prisma.user.findUnique({
                        where: { username: credentials.username }
                    })
                    console.log('User found in DB:', user ? 'Yes' : 'No')

                    if (!user) {
                        console.log('User not found')
                        return null
                    }

                    const passwordMatch = await bcrypt.compare(credentials.password, user.password)
                    console.log('Password match:', passwordMatch)

                    if (!passwordMatch) {
                        console.log('Password mismatch')
                        return null
                    }

                    return {
                        id: user.id,
                        name: user.username,
                        role: user.role
                    }
                } catch (error) {
                    console.error('Authorize error:', error)
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
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "secret_default_change_me",
}
