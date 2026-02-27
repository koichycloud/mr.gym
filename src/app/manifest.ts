import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Mr. GYM',
        short_name: 'Mr. GYM',
        description: 'Sistema de Gestión para Mr. GYM',
        start_url: '/',
        id: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1d1d1f',
        theme_color: '#3f2009',
        categories: ['health', 'fitness', 'business'],
        lang: 'es',
        icons: [
            {
                src: '/icons/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icons/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icons/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
        screenshots: [
            {
                src: '/screenshots/screenshot-dashboard.png',
                sizes: '1080x1920',
                type: 'image/png',
                form_factor: 'narrow',
                label: 'Dashboard con estadísticas del gimnasio',
            },
            {
                src: '/screenshots/screenshot-socios.png',
                sizes: '1080x1920',
                type: 'image/png',
                form_factor: 'narrow',
                label: 'Lista de socios registrados',
            },
        ],
        shortcuts: [
            {
                name: 'Ver Socios',
                url: '/socios',
                description: 'Lista de socios registrados',
            },
            {
                name: 'Asistencia',
                url: '/asistencia',
                description: 'Control de asistencia diaria',
            },
        ],
    }
}
