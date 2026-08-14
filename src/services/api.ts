export const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export async function fetchHealth() {
  const response = await fetch(`${apiBaseUrl}/health`);
  return response.json();
}
