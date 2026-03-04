const { Client } = require('pg')
const fs = require('fs')

const client = new Client({
    connectionString: "postgresql://postgres.irqlkbihlqgwzpfbbzhz:jJh7uow22TI83H1i@aws-1-us-east-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
})

async function main() {
    await client.connect()
    const lines = []

    const estados = await client.query(`SELECT estado, COUNT(*)::int as cnt FROM "Suscripcion" GROUP BY estado ORDER BY cnt DESC`)
    lines.push('ESTADOS:')
    estados.rows.forEach(r => lines.push(`  ${r.estado}: ${r.cnt}`))

    const activaPast = await client.query(`SELECT COUNT(*)::int as cnt FROM "Suscripcion" WHERE estado = 'ACTIVA' AND "fechaFin" < NOW()`)
    lines.push(`ACTIVA_PAST_DUE: ${activaPast.rows[0].cnt}`)

    const vencida = await client.query(`SELECT COUNT(*)::int as cnt FROM "Suscripcion" WHERE estado = 'VENCIDA'`)
    lines.push(`VENCIDA_ESTADO: ${vencida.rows[0].cnt}`)

    const activaFuture = await client.query(`SELECT COUNT(*)::int as cnt FROM "Suscripcion" WHERE estado = 'ACTIVA' AND "fechaFin" >= NOW()`)
    lines.push(`ACTIVA_FUTURE: ${activaFuture.rows[0].cnt}`)

    const totalSocios = await client.query(`SELECT COUNT(*)::int as cnt FROM "Socio"`)
    lines.push(`TOTAL_SOCIOS: ${totalSocios.rows[0].cnt}`)

    // Sample vencidas
    const vencidaDetail = await client.query(`
        SELECT s.estado, s."fechaFin"::text as fecha_fin,
               so.codigo, so.nombres, so.apellidos, so."numeroDocumento", so.telefono
        FROM "Suscripcion" s
        JOIN "Socio" so ON s."socioId" = so.id
        WHERE s.estado = 'VENCIDA'
        ORDER BY s."fechaFin" DESC
        LIMIT 15
    `)
    if (vencidaDetail.rows.length > 0) {
        lines.push('SAMPLE_VENCIDA:')
        vencidaDetail.rows.forEach(r => {
            lines.push(`  ${r.codigo}|${r.nombres} ${r.apellidos}|${r.numeroDocumento}|${r.telefono || '-'}|${r.fecha_fin}`)
        })
    }

    // Sample activa past due
    const activaPastDetail = await client.query(`
        SELECT s.estado, s."fechaFin"::text as fecha_fin,
               so.codigo, so.nombres, so.apellidos, so."numeroDocumento", so.telefono
        FROM "Suscripcion" s
        JOIN "Socio" so ON s."socioId" = so.id
        WHERE s.estado = 'ACTIVA' AND s."fechaFin" < NOW()
        ORDER BY s."fechaFin" DESC
        LIMIT 15
    `)
    if (activaPastDetail.rows.length > 0) {
        lines.push('SAMPLE_ACTIVA_PAST:')
        activaPastDetail.rows.forEach(r => {
            lines.push(`  ${r.codigo}|${r.nombres} ${r.apellidos}|${r.telefono || '-'}|${r.fecha_fin}`)
        })
    }

    fs.writeFileSync('C:/tmp/vencidos_result.txt', lines.join('\n'), 'utf8')
    console.log('DONE - wrote to C:/tmp/vencidos_result.txt')
}

main().catch(e => {
    fs.writeFileSync('C:/tmp/vencidos_result.txt', 'ERROR: ' + e.message, 'utf8')
    console.error(e)
}).finally(() => client.end())
