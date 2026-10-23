/**
 * Brevo contacts API: keeps the newsletter list in Brevo in sync so campaigns
 * can be sent from the Brevo dashboard. Every function is a no-op when the
 * API key or list id is missing, so the site works without Brevo.
 */
const BASE = 'https://api.brevo.com/v3';

function configured() {
  return Boolean(process.env.BREVO_API_KEY && Number(process.env.BREVO_LIST_ID));
}

async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok && response.status !== 204) {
    const detail = await response.text().catch(() => '');
    const error = new Error(`Brevo ${method} ${path} failed (${response.status}): ${detail.slice(0, 300)}`);
    error.status = response.status;
    throw error;
  }

  return response.status === 204 ? null : response.json().catch(() => null);
}

export function brevoListConfigured() {
  return configured();
}

/** Create or update a contact and put them on the newsletter list. */
export async function addSubscriberToBrevo({ email, name }) {
  if (!configured()) return false;

  const [firstName = '', ...rest] = String(name ?? '').trim().split(/\s+/);

  await request('/contacts', {
    method: 'POST',
    body: {
      email,
      updateEnabled: true,
      listIds: [Number(process.env.BREVO_LIST_ID)],
      attributes: firstName ? { FIRSTNAME: firstName, LASTNAME: rest.join(' ') } : undefined,
    },
  });

  return true;
}

/** Take a contact off the newsletter list without deleting them. */
export async function removeSubscriberFromBrevo({ email }) {
  if (!configured()) return false;

  const listId = Number(process.env.BREVO_LIST_ID);

  try {
    await request(`/contacts/lists/${listId}/contacts/remove`, {
      method: 'POST',
      body: { emails: [email] },
    });
  } catch (error) {
    // Already gone from the list is fine.
    if (error.status !== 404) throw error;
  }

  return true;
}
