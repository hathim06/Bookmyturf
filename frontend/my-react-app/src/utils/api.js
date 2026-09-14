const REQUEST_TIMEOUT_MS = 15000;

export async function requestJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || 'The server could not complete your request.');
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('The server took too long to respond. Please try again.');
    }
    if (error instanceof TypeError) {
      throw new Error('Cannot reach the server. Make sure the backend is running.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
