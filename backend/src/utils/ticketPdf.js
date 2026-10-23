import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

/**
 * The ticket as a PDF: a single tall page sized for phones, in Sofia Pro and
 * the brand greens. Each PDF is kept on the server (TICKETS_DIR) so the same
 * file can be re-downloaded; it is rebuilt when the ticket or event changes.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(__dirname, '../../assets');
export const ticketsDir = () => path.resolve(process.env.TICKETS_DIR || path.join(__dirname, '../../storage/tickets'));

const C = {
  green: '#14402a',
  greenMid: '#2f6b3d',
  greenLight: '#9ec6a6',
  mint: '#eef4ee',
  cream: '#f4f1ea',
  text: '#1c2b22',
  soft: '#5b6a61',
  line: '#dfe4dc',
};
const W = 420;
const M = 18; // cream margin around the ticket
const P = 26; // padding inside the ticket
const INNER = W - 2 * M - 2 * P;

function fonts(doc) {
  for (const w of ['Regular', 'Medium', 'SemiBold', 'Bold']) doc.registerFont(w, path.join(ASSETS, 'fonts', `SofiaPro-${w}.otf`));
}

const label = (doc, text, x, y, width) =>
  doc.font('SemiBold').fontSize(7.5).fillColor(C.greenMid).text(text.toUpperCase(), x, y, { width, characterSpacing: 1.2, lineBreak: false });

/** Lays the ticket out on `doc`; returns the height used. Run once to measure, once to draw. */
function layout(doc, t, qr, { draw }) {
  const x0 = M + P;
  let y = M;

  // Header band.
  const logoW = 118;
  const logoH = logoW * (413 / 520);
  doc.font('Bold').fontSize(23);
  const titleH = doc.heightOfString(t.title, { width: INNER, lineGap: 1 });
  const headH = P + logoH + 16 + titleH + 8 + 16 + P;
  if (draw) {
    doc.save().roundedRect(M, M, W - 2 * M, headH + 12, 16).fill(C.green).restore();
    doc.image(path.join(ASSETS, 'logo-white.png'), (W - logoW) / 2, y + P, { width: logoW });
    doc.font('Bold').fontSize(23).fillColor('#ffffff').text(t.title, x0, y + P + logoH + 16, { width: INNER, align: 'center', lineGap: 1 });
    doc.font('Medium').fontSize(11.5).fillColor(C.greenLight).text(t.when, x0, y + P + logoH + 16 + titleH + 8, { width: INNER, align: 'center' });
  }
  y += headH;

  // The tear line: cream notches on both sides and a dashed rule.
  const bodyTop = y;
  const lines = [];
  let by = bodyTop + 22;

  // Ticket number and QR.
  const qrSize = 116;
  const numTop = by;
  lines.push(() => {
    label(doc, 'Ticket', x0, numTop, 150);
    doc.font('Bold').fontSize(24).fillColor(C.green).text(t.ticketNumber, x0, numTop + 12, { width: INNER - qrSize - 12, lineBreak: false });
    if (t.name) {
      label(doc, 'Name', x0, numTop + 52, 150);
      doc.font('SemiBold').fontSize(13).fillColor(C.text).text(t.name, x0, numTop + 64, { width: INNER - qrSize - 12 });
    }
    const qx = W - M - P - qrSize;
    const cell = qrSize / qr.size;
    doc.save().fillColor(C.green);
    for (let r = 0; r < qr.size; r++) for (let c = 0; c < qr.size; c++) if (qr.data[r * qr.size + c]) doc.rect(qx + c * cell, numTop + r * cell, cell + 0.05, cell + 0.05);
    doc.fill().restore();
  });
  const afterNumber = by + Math.max(qrSize, t.name ? 64 + doc.font('SemiBold').fontSize(13).heightOfString(t.name, { width: INNER - qrSize - 12 }) : 40) + 22;
  by = afterNumber;

  // Detail rows, two to a line where they are short.
  const half = (INNER - 16) / 2;
  const rows = t.rows;
  for (let i = 0; i < rows.length; ) {
    const a = rows[i];
    const b = rows[i + 1];
    const pair = !a.wide && b && !b.wide;
    const items = pair ? [[a, x0, half], [b, x0 + half + 16, half]] : [[a, x0, INNER]];
    doc.font('Medium').fontSize(11.5);
    const h = Math.max(...items.map(([r, , w]) => doc.heightOfString(r.value, { width: w })));
    const top = by;
    lines.push(() => {
      doc.save().moveTo(x0, top - 10).lineTo(x0 + INNER, top - 10).lineWidth(0.6).strokeColor(C.line).stroke().restore();
      for (const [r, x, w] of items) {
        label(doc, r.label, x, top, w);
        doc.font('Medium').fontSize(11.5).fillColor(C.text).text(r.value, x, top + 12, { width: w });
      }
    });
    by += 12 + h + 20;
    i += pair ? 2 : 1;
  }

  // Dress code and the organisers' note.
  for (const box of t.boxes) {
    doc.font('Regular').fontSize(10.5);
    const h = doc.heightOfString(box.text, { width: INNER - 28, lineGap: 2 });
    const top = by;
    lines.push(() => {
      doc.save().roundedRect(x0, top, INNER, h + (box.title ? 42 : 28), 10).fill(box.title ? C.mint : C.cream).restore();
      if (box.title) label(doc, box.title, x0 + 14, top + 14, INNER - 28);
      doc.font('Regular').fontSize(10.5).fillColor(C.text).text(box.text, x0 + 14, top + (box.title ? 28 : 14), { width: INNER - 28, lineGap: 2 });
    });
    by += h + (box.title ? 42 : 28) + 12;
  }

  // Footer inside the ticket.
  const foot = [t.entryLine, t.contact].filter(Boolean).join('\n');
  doc.font('Regular').fontSize(9.5);
  const footH = doc.heightOfString(foot, { width: INNER, align: 'center', lineGap: 2 });
  const footTop = by + 4;
  lines.push(() => doc.font('Regular').fontSize(9.5).fillColor(C.soft).text(foot, x0, footTop, { width: INNER, align: 'center', lineGap: 2 }));
  by = footTop + footH + P;

  if (draw) {
    doc.save().roundedRect(M, bodyTop, W - 2 * M, by - bodyTop, 16).fill('#ffffff').restore();
    doc.save().rect(M, bodyTop, W - 2 * M, 16).fill('#ffffff').restore();
    for (const cx of [M, W - M]) doc.save().circle(cx, bodyTop, 11).fill(C.cream).restore();
    doc.save().moveTo(M + 16, bodyTop).lineTo(W - M - 16, bodyTop).dash(4, { space: 4 }).lineWidth(1).strokeColor(C.greenLight).stroke().undash().restore();
    for (const draw of lines) draw();
  }

  const end = by + 16;
  if (draw) doc.font('Medium').fontSize(9).fillColor(C.greenMid).text(t.site, M, end, { width: W - 2 * M, align: 'center', lineBreak: false });
  return end + 12 + M;
}

/** Renders the ticket to a Buffer. `t` comes from ticketPdfContent(). */
export async function renderTicketPdf(t) {
  const qr = QRCode.create(t.qrText, { errorCorrectionLevel: 'M' }).modules;

  const probe = new PDFDocument({ size: [W, 4000], margin: 0, autoFirstPage: true });
  fonts(probe);
  const height = Math.ceil(layout(probe, t, qr, { draw: false }));
  probe.end();

  const doc = new PDFDocument({
    size: [W, height],
    margin: 0,
    info: { Title: `${t.title} · ${t.ticketNumber}`, Author: 'She Shape Wellness', Subject: 'Event ticket' },
  });
  fonts(doc);
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve, reject) => {
    doc.on('end', resolve);
    doc.on('error', reject);
  });
  doc.rect(0, 0, W, height).fill(C.cream);
  layout(doc, t, qr, { draw: true });
  doc.end();
  await done;
  return Buffer.concat(chunks);
}

/** The kept copy: rebuilt when missing or older than the latest change to the ticket. */
export async function storedTicketPdf(token, changedAt, build) {
  const file = path.join(ticketsDir(), `${token}.pdf`);
  const stat = await fs.stat(file).catch(() => null);
  if (stat && stat.mtime >= changedAt) return fs.readFile(file);
  const pdf = await build();
  await fs.mkdir(ticketsDir(), { recursive: true });
  await fs.writeFile(file, pdf);
  return pdf;
}
