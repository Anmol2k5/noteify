import { jsPDF } from "jspdf";
import { NoteImage } from "../types";

export async function generatePDF(notes: NoteImage[]): Promise<Blob> {
  // Sort notes by their order property
  const sortedNotes = [...notes].sort((a, b) => a.order - b.order);
  
  const pdf = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < sortedNotes.length; i++) {
    const note = sortedNotes[i];
    if (i > 0) pdf.addPage();

    const imgData = note.enhancedPreview || note.preview;
    
    // Create an image element to get dimensions
    const img = new Image();
    img.src = imgData;
    
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    const imgWidth = img.width;
    const imgHeight = img.height;
    
    const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
    const drawWidth = imgWidth * ratio;
    const drawHeight = imgHeight * ratio;
    
    const x = (pageWidth - drawWidth) / 2;
    const y = (pageHeight - drawHeight) / 2;

    pdf.addImage(imgData, 'JPEG', x, y, drawWidth, drawHeight);
    
    // Add page number at bottom
    pdf.setFontSize(10);
    pdf.setTextColor(150);
    pdf.text(`Page ${i + 1} of ${sortedNotes.length}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  return pdf.output('blob');
}
