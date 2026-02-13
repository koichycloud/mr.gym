import { getServerSession } from "next-auth/next"
import { authOptions } from "./auth"

export async function requireAuth() {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
        throw new Error("Unauthorized: You must be logged in to perform this action.")
    }

    // Optional: Check for specific roles if needed
    // if (session.user.role !== 'ADMIN') { ... }

    return session
}
