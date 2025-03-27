import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

async function generatePrescriptionPDF(prescriptionData) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595, 842]); // A4 size (595 x 842 points)

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Layout constants
  const margin = 50;
  const maxLineWidth = 495; // 595 - 2*50 margin
  let y = page.getHeight() - margin;
  const lineHeight = 15;
  const sectionGap = 25;
  const bulletIndent = 15;
  const minY = margin + 50; // Minimum Y position before new page

  // Helper to check/create new page
  const checkForNewPage = (linesToAdd = 1) => {
    const neededSpace = linesToAdd * lineHeight;
    if (y - neededSpace < minY) {
      page = pdfDoc.addPage([595, 842]);
      y = page.getHeight() - margin;
      return true;
    }
    return false;
  };

  // --- HEADER SECTION ---
  page.drawText("MEDICAL PRESCRIPTION", {
    x: margin,
    y,
    size: 18,
    font: boldFont,
    color: rgb(0, 0, 0),
    maxWidth: maxLineWidth,
  });
  y -= 30;

  const today = new Date().toLocaleDateString();
  page.drawText(`Date: ${today}`, {
    x: margin,
    y,
    size: 12,
    font,
    maxWidth: maxLineWidth,
  });
  y -= sectionGap;
  checkForNewPage();

  // --- MEDICAL ASSESSMENT ---
  page.drawText("Medical Assessment:", {
    x: margin,
    y,
    size: 14,
    font: boldFont,
    maxWidth: maxLineWidth,
  });
  y -= lineHeight;

  const summaryLines = wrapText(prescriptionData.summary, maxLineWidth);
  summaryLines.forEach((line) => {
    if (checkForNewPage()) {
      page.drawText("Medical Assessment (continued):", {
        x: margin,
        y,
        size: 14,
        font: boldFont,
        maxWidth: maxLineWidth,
      });
      y -= lineHeight;
    }
    page.drawText(line, {
      x: margin,
      y,
      size: 12,
      font,
      maxWidth: maxLineWidth,
    });
    y -= lineHeight;
  });
  y -= sectionGap;
  checkForNewPage();

  // --- RECOMMENDED TREATMENT ---
  page.drawText("Recommended Treatment:", {
    x: margin,
    y,
    size: 14,
    font: boldFont,
    maxWidth: maxLineWidth,
  });
  y -= lineHeight;

  prescriptionData.medications.forEach((med, index) => {
    const medLines =
      Math.ceil(med.name.length / 60) +
      Math.ceil(med.dosage.length / 60) +
      Math.ceil(med.purpose.length / 60) +
      3;
    checkForNewPage(medLines);

    // Medication Name
    const medName = `${index + 1}. ${med.name}`;
    const medNameLines = wrapText(medName, maxLineWidth);
    medNameLines.forEach((line, i) => {
      if (i > 0 && checkForNewPage()) {
        page.drawText(`   ${line}`, {
          x: margin,
          y,
          size: 12,
          font: boldFont,
          maxWidth: maxLineWidth,
        });
      } else {
        page.drawText(line, {
          x: margin,
          y,
          size: 12,
          font: boldFont,
          maxWidth: maxLineWidth,
        });
      }
      y -= lineHeight;
    });

    // Dosage
    const dosageText = `   Dosage: ${med.dosage}`;
    const dosageLines = wrapText(dosageText, maxLineWidth - 15);
    dosageLines.forEach((line, i) => {
      if (checkForNewPage()) {
        page.drawText(line, {
          x: margin + 15,
          y,
          size: 12,
          font,
          maxWidth: maxLineWidth - 15,
        });
      } else {
        page.drawText(line, {
          x: margin + (i > 0 ? 30 : 15),
          y,
          size: 12,
          font,
          maxWidth: maxLineWidth - 15,
        });
      }
      y -= lineHeight;
    });

    // Purpose
    const purposeText = `   Purpose: ${med.purpose}`;
    const purposeLines = wrapText(purposeText, maxLineWidth - 15);
    purposeLines.forEach((line, i) => {
      if (checkForNewPage()) {
        page.drawText(line, {
          x: margin + 15,
          y,
          size: 12,
          font,
          maxWidth: maxLineWidth - 15,
        });
      } else {
        page.drawText(line, {
          x: margin + (i > 0 ? 30 : 15),
          y,
          size: 12,
          font,
          maxWidth: maxLineWidth - 15,
        });
      }
      y -= lineHeight;
    });

    y -= lineHeight / 2;
  });
  y -= sectionGap;
  checkForNewPage();

  // --- CARE INSTRUCTIONS ---
  page.drawText("Care Instructions:", {
    x: margin,
    y,
    size: 14,
    font: boldFont,
    maxWidth: maxLineWidth,
  });
  y -= lineHeight;

  const instructionsText = prescriptionData.instructions;
  const instructionItems = parseInstructionItems(instructionsText);

  instructionItems.forEach((item) => {
    if (!item.text.trim()) return;

    if (item.isBoldHeading) {
      // Handle bold headings (like **Bathing:**)
      const lines = wrapText(item.text, maxLineWidth - bulletIndent);
      lines.forEach((line, i) => {
        if (checkForNewPage()) {
          page.drawText("Care Instructions (continued):", {
            x: margin,
            y,
            size: 14,
            font: boldFont,
            maxWidth: maxLineWidth,
          });
          y -= lineHeight;
        }

        page.drawText(line, {
          x: margin + (i > 0 ? bulletIndent : 0),
          y,
          size: 12,
          font: boldFont,
          maxWidth: maxLineWidth - (i > 0 ? bulletIndent : 0),
        });
        y -= lineHeight;
      });
    } else {
      // Handle regular bullet points
      const lines = wrapText(item.text, maxLineWidth - bulletIndent);
      lines.forEach((line, i) => {
        if (checkForNewPage()) {
          page.drawText("Care Instructions (continued):", {
            x: margin,
            y,
            size: 14,
            font: boldFont,
            maxWidth: maxLineWidth,
          });
          y -= lineHeight;
        }

        const isBullet =
          line.startsWith("•") || line.startsWith("*") || /^\d+\./.test(line);
        const xPos = margin + (isBullet ? 0 : bulletIndent);
        page.drawText(line, {
          x: xPos,
          y,
          size: 12,
          font,
          maxWidth: maxLineWidth - xPos + margin,
        });
        y -= lineHeight;
      });
    }
  });
  y -= sectionGap;
  checkForNewPage();

  // --- WARNING SECTION ---
  page.drawText("When to Seek Medical Attention:", {
    x: margin,
    y,
    size: 14,
    font: boldFont,
    color: rgb(1, 0, 0),
    maxWidth: maxLineWidth,
  });
  y -= lineHeight;

  const warningLines = wrapText(prescriptionData.warning, maxLineWidth);
  warningLines.forEach((line) => {
    if (checkForNewPage()) {
      page.drawText("When to Seek Medical Attention (continued):", {
        x: margin,
        y,
        size: 14,
        font: boldFont,
        color: rgb(1, 0, 0),
        maxWidth: maxLineWidth,
      });
      y -= lineHeight;
    }
    page.drawText(line, {
      x: margin,
      y,
      size: 12,
      font,
      color: rgb(1, 0, 0),
      maxWidth: maxLineWidth,
    });
    y -= lineHeight;
  });
  y -= sectionGap;
  checkForNewPage();

  // --- DISCLAIMER ---
  page.drawText("Disclaimer:", {
    x: margin,
    y,
    size: 12,
    font: boldFont,
    color: rgb(0.5, 0, 0),
    maxWidth: maxLineWidth,
  });
  y -= lineHeight;

  const disclaimerLines = wrapText(prescriptionData.disclaimer, maxLineWidth);
  disclaimerLines.forEach((line) => {
    if (checkForNewPage()) {
      page.drawText("Disclaimer (continued):", {
        x: margin,
        y,
        size: 12,
        font: boldFont,
        color: rgb(0.5, 0, 0),
        maxWidth: maxLineWidth,
      });
      y -= lineHeight;
    }
    page.drawText(line, {
      x: margin,
      y,
      size: 10,
      font,
      color: rgb(0.5, 0, 0),
      maxWidth: maxLineWidth,
    });
    y -= lineHeight - 2;
  });

  // --- FINALIZE PDF ---
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}

// Parse instruction items with bold headings
function parseInstructionItems(text) {
  if (!text) return [];

  const items = [];
  const lines = text.split("\n");

  lines.forEach((line) => {
    if (!line.trim()) return;

    // Check for bold headings (format: 1. **Bathing:**)
    const boldMatch = line.match(/^(\d+\.)\s*\*\*(.*?)\*\*(.*)$/);
    if (boldMatch) {
      const [, number, heading, content] = boldMatch;
      items.push({
        isBoldHeading: true,
        text: `${number} ${heading}:${content}`,
      });
    }
    // Check for regular bullet points
    else if (line.match(/^(\d+\.|\*|\-)\s/)) {
      items.push({
        isBoldHeading: false,
        text: line,
      });
    }
    // Continuation of previous item
    else if (items.length > 0) {
      items[items.length - 1].text += ` ${line.trim()}`;
    }
  });

  return items;
}

// Improved text wrapping
function wrapText(text, maxWidth) {
  if (!text) return [];

  const lines = text.split("\n");
  let result = [];
  const avgCharWidth = 6; // Approximate width of a character

  lines.forEach((line) => {
    if (!line.trim()) return;

    let currentLine = "";
    const words = line.split(/\s+/);

    words.forEach((word) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;

      if (testLine.length * avgCharWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) result.push(currentLine);
        currentLine = word;
      }
    });

    if (currentLine) result.push(currentLine);
  });

  return result;
}

export default generatePrescriptionPDF;
