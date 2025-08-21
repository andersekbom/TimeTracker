import { ValidationResult } from './configValidation';
// @ts-ignore: react-native buffer polyfill
import { Buffer } from 'buffer';

/**
 * Validate Toggl API token and workspace ID by making a test request to the Toggl API.
 */
export async function validateTogglCredentials(
  token: string,
  workspaceId: string
): Promise<ValidationResult> {
  const trimmedToken = token.trim();
  const trimmedWs = workspaceId.trim();
  if (!trimmedToken) {
    return { isValid: false, error: 'Toggl API token is required' };
  }
  if (!trimmedWs) {
    return { isValid: false, error: 'Workspace ID is required' };
  }
  const wsNum = parseInt(trimmedWs, 10);
  if (isNaN(wsNum)) {
    return { isValid: false, error: 'Workspace ID must be a number' };
  }

  // Build Basic auth header
  const auth = Buffer.from(`${trimmedToken}:api_token`).toString('base64');
  const url = `https://api.track.toggl.com/api/v9/workspaces/${wsNum}`;
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (response.ok) {
      return { isValid: true };
    }
    if (response.status === 403 || response.status === 404) {
      return { isValid: false, error: 'Invalid Toggl token or workspace ID' };
    }
    return { isValid: false, error: `Toggl API error: ${response.status}` };
  } catch (err: any) {
    return { isValid: false, error: `Network error: ${err.message || err}` };
  }
}
