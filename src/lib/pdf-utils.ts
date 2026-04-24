import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'

export const generatePDFReport = ({ 
    title, 
    subtitle, 
    columns, 
    rows, 
    fileName,
    orientation = 'p' as 'p' | 'l'
}: {
    title: string,
    subtitle: string,
    columns: string[],
    rows: any[][],
    fileName: string,
    orientation?: 'p' | 'l'
}) => {
    const doc = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth()

    // Header stylized
    doc.setFillColor(25, 25, 25) 
    doc.rect(0, 0, pageWidth, 40, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('MR. GYM', pageWidth / 2, 15, { align: 'center' })
    
    doc.setFontSize(14)
    doc.text(title.toUpperCase(), pageWidth / 2, 25, { align: 'center' })
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(subtitle, pageWidth / 2, 33, { align: 'center' })

    // Report Info
    doc.setTextColor(80, 80, 80)
    doc.setFontSize(8)
    doc.text(`Fecha de impresión: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}`, 14, 48)

    // Table
    autoTable(doc, {
        startY: 52,
        head: [columns],
        body: rows,
        theme: 'grid',
        headStyles: {
            fillColor: [40, 40, 40],
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'center'
        },
        styles: {
            fontSize: 8,
            cellPadding: 2,
            overflow: 'linebreak'
        },
        alternateRowStyles: {
            fillColor: [250, 250, 250]
        },
        margin: { top: 52, bottom: 20 }
    })

    // Footer
    const totalPages = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text(
            `Página ${i} de ${totalPages} | Mr. GYM - Reporte Generado Automáticamente`,
            pageWidth / 2,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
        )
    }

    doc.save(`${fileName}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`)
}
