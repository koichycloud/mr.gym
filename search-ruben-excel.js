const xlsx = require('xlsx')
const fs = require('fs')

const files = ['test_socios.xlsx', 'test_import.xlsx']

files.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`--- Checking ${file} ---`)
        const workbook = xlsx.readFile(file)
        const sheetName = workbook.SheetNames[0]
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName])

        const matches = data.filter(row =>
            Object.values(row).some(val => String(val).toLowerCase().includes('ruben'))
        )

        if (matches.length > 0) {
            console.log(`Found matches in ${file}:`, JSON.stringify(matches, null, 2))
        } else {
            console.log(`No matches for "ruben" in ${file}.`)
        }
    }
})
process.exit(0)
