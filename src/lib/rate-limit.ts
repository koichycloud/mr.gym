/**
 * Rate Limiter - In-memory para Vercel Serverless
 * 
 * Limita intentos de login por IP/username para prevenir fuerza bruta.
 * En serverless, cada instancia tiene su propia memoria, pero esto
 * aún protege contra ataques desde una misma instancia.
 * 
 * Para una solución más robusta en producción, considerar:
 * - Vercel Edge Middleware con KV
 * - Upstash Redis rate limiting
 */

type RateLimitEntry = {
    count: number
    resetAt: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

// Limpiar entradas expiradas cada 5 minutos
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup() {
    const now = Date.now()
    if (now - lastCleanup < CLEANUP_INTERVAL) return
    lastCleanup = now

    for (const [key, entry] of rateLimitMap.entries()) {
        if (now > entry.resetAt) {
            rateLimitMap.delete(key)
        }
    }
}

/**
 * Verifica si una clave (IP o username) ha excedido el límite de intentos.
 * 
 * @param key - Identificador único (e.g., IP address o username)
 * @param maxAttempts - Máximo de intentos permitidos (default: 5)
 * @param windowMs - Ventana de tiempo en ms (default: 15 minutos)
 * @returns true si el intento está permitido, false si está bloqueado
 */
export function checkRateLimit(
    key: string,
    maxAttempts: number = 5,
    windowMs: number = 15 * 60 * 1000
): { allowed: boolean; remainingAttempts: number; resetIn: number } {
    cleanup()

    const now = Date.now()
    const entry = rateLimitMap.get(key)

    // Primera vez o ventana expirada
    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(key, {
            count: 1,
            resetAt: now + windowMs,
        })
        return {
            allowed: true,
            remainingAttempts: maxAttempts - 1,
            resetIn: windowMs,
        }
    }

    // Incrementar contador
    entry.count++

    if (entry.count > maxAttempts) {
        return {
            allowed: false,
            remainingAttempts: 0,
            resetIn: entry.resetAt - now,
        }
    }

    return {
        allowed: true,
        remainingAttempts: maxAttempts - entry.count,
        resetIn: entry.resetAt - now,
    }
}
