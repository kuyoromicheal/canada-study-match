import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

export async function exportTextToDocx(title: string, content: string): Promise<Buffer> {
  const lines = content.split("\n");
  const children: Paragraph[] = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
    }),
  ];

  for (const line of lines) {
    if (!line.trim()) {
      children.push(new Paragraph({ text: "" }));
      continue;
    }
    if (line === line.toUpperCase() && line.length < 60 && !line.startsWith("•")) {
      children.push(new Paragraph({ text: line, heading: HeadingLevel.HEADING_2 }));
    } else if (line.startsWith("•")) {
      children.push(new Paragraph({ children: [new TextRun(line)] }));
    } else {
      children.push(new Paragraph({ children: [new TextRun(line)] }));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

export async function exportTextToPdf(title: string, content: string): Promise<Buffer> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([612, 792]);
  const margin = 50;
  let y = 742;
  const lineHeight = 14;
  const maxWidth = 512;

  function wrapText(text: string, size: number, useFont: typeof font): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (useFont.widthOfTextAtSize(test, size) > maxWidth) {
        if (current) lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  function drawLine(text: string, size: number, useFont: typeof font) {
    const wrapped = wrapText(text, size, useFont);
    for (const wline of wrapped) {
      if (y < margin) {
        page = pdfDoc.addPage([612, 792]);
        y = 742;
      }
      page.drawText(wline, { x: margin, y, size, font: useFont, color: rgb(0.1, 0.1, 0.1) });
      y -= lineHeight;
    }
  }

    drawLine(title, 16, boldFont);
  y -= 8;

  for (const line of content.split("\n")) {
    if (!line.trim()) { y -= 8; continue; }
    const isHeading = line === line.toUpperCase() && line.length < 60;
    drawLine(line, isHeading ? 12 : 10, isHeading ? boldFont : font);
    if (isHeading) y -= 4;
  }

  return Buffer.from(await pdfDoc.save());
}
