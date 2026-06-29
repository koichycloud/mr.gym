import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { checkRateLimit } from "@/lib/rate-limit"

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Usuario", type: "text" },
                password: { label: "Contraseña", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) {
                    return null
                }

                // Rate limiting: máx 5 intentos por username cada 15 min
                const rateCheck = checkRateLimit(`login:${credentials.username}`, 5, 15 * 60 * 1000)
                if (!rateCheck.allowed) {
                    const minutesLeft = Math.ceil(rateCheck.resetIn / 60000)
                    throw new Error(`Demasiados intentos. Intente en ${minutesLeft} minutos.`)
                }

                try {
                    const user = await prisma.user.findUnique({
                        where: { username: credentials.username },
                        select: {
                            id: true,
                            username: true,
                            password: true,
                            role: true,
                            permissions: true
                        }
                    })

                    if (!user) {
                        return null
                    }

                    const passwordMatch = await bcrypt.compare(credentials.password, user.password)

                    if (!passwordMatch) {
                        return null
                    }

                    // Log the login to the new AuditLog table 
                    try {
                        await prisma.auditLog.create({
                            data: {
                                usuario: user.username,
                                accion: 'LOGIN',
                                detalles: 'Inicio de sesión exitoso'
                            }
                        })
                    } catch(e) { console.error("Could not write login audit log", e) }
                    return {
                        id: user.id,
                        name: user.username,
                        role: user.role,
                        permissions: user.permissions
                    }
                } catch (error) {
                    console.error("[AUTH] Error en authorize:", error instanceof Error ? error.message : "Unknown error")
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
                token.permissions = user.permissions
            }
            return token
        },
        async session({ session, token }: any) {
            if (session.user) {
                session.user.role = token.role
                session.user.id = token.id
                session.user.permissions = token.permissions
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
    secret: process.env.NEXTAUTH_SECRET,

}

// Solución para Vercel Preview URLs
if (process.env.VERCEL_URL) {
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https"
    // Set the authentication URL to Vercel's generated URL for this preview
    process.env.NEXTAUTH_URL = `${protocol}://${process.env.VERCEL_URL}`
}
