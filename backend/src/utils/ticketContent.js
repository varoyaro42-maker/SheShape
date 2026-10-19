/**
 * What goes on a ticket, shared by the PDF and the email so both follow the
 * admin's choices (`view.show`, from the event's ticket settings).
 */
const numberFormat = new Intl.NumberFormat('en-US');
const money = (v) => `${numberFormat.format(v)} RWF`;

export function eventDate(value) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function eventTime(e) {
  if (!e.startTime) return null;
  return e.endTime ? `${e.startTime} to ${e.endTime}` : `From ${e.startTime}`;
}

/** Label/value rows; `wide` rows take the full width of the PDF. */
export function ticketRows(view, { includeHeader = false } = {}) {
  const e = view.event;
  const show = view.show ?? {};
  return [
    includeHeader && show.name ? { label: 'Name', value: view.name } : null,
    includeHeader && show.date ? { label: 'Date', value: eventDate(e.date) } : null,
    includeHeader && show.time && eventTime(e) ? { label: 'Time', value: eventTime(e) } : null,
    show.venue && e.venue ? { label: 'Venue', value: e.venue, wide: true } : null,
    show.activities && view.activities.length ? { label: view.activities.length > 1 ? 'Your activities' : 'Your activity', value: view.activities.join(', '), wide: true } : null,
    show.amount && view.amount ? { label: 'Paid', value: money(view.amount) } : null,
    show.paymentReference && view.paymentReference ? { label: 'Payment reference', value: view.paymentReference } : null,
  ].filter(Boolean);
}

export function ticketPdfContent(view, { qrText, site }) {
  const e = view.event;
  const show = view.show ?? {};
  return {
    title: e.title,
    when: [show.date ? eventDate(e.date) : null, show.time ? eventTime(e) : null].filter(Boolean).join(' · '),
    ticketNumber: view.ticketNumber,
    name: show.name ? view.name : null,
    rows: ticketRows(view),
    boxes: [
      show.dressCode && e.dressCode ? { title: 'Dress code', text: e.dressCode } : null,
      show.note && e.ticketNote ? { title: null, text: e.ticketNote } : null,
    ].filter(Boolean),
    entryLine: 'Show the QR code at the entrance. One ticket admits one person.',
    contact: show.contact && e.contactWhatsapp ? `Questions? WhatsApp ${e.contactWhatsapp}` : null,
    qrText,
    site,
  };
}
