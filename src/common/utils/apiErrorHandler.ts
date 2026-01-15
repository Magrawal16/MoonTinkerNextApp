// Centralized API error handler for 404 errors across the application
// This utility provides automatic handling of 404 errors (session expired/unauthorized)
// and shows a popup asking users to login again.

import { APP_MESSAGES } from '@/common/constants/messages';

/**
 * Shows a modal popup indicating session has expired and redirects to login.
 * Called automatically by apiFetch on 404 errors.
 */
export function handle404Error() {
  if (typeof window !== 'undefined') {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in zoom-in-95">
        <h3 class="text-2xl font-bold text-red-600 mb-4">${APP_MESSAGES.ERRORS.SESSION_EXPIRED}</h3>
        <p class="text-gray-700 mb-6">
          ${APP_MESSAGES.ERRORS.SESSION_EXPIRED_MESSAGE}
        </p>
        <div class="flex gap-3 justify-end">
          <button
            onclick="this.closest('div').remove(); window.location.href='/login'"
            class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            ${APP_MESSAGES.BUTTONS.LOGIN_AGAIN}
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Also redirect after 3 seconds if user doesn't click
    setTimeout(() => {
      window.location.href = '/login';
    }, 3000);
  }
}

/**
 * Wrapper around fetch that automatically handles 404 errors.
 * 
 * Use this instead of fetch for all API calls that need automatic 404 error handling.
 * When a 404 is returned, it will:
 * 1. Show a modal popup asking the user to login again
 * 2. Redirect to /login after 3 seconds (or immediately if user clicks button)
 * 3. Throw an error so the caller knows the request failed
 * 
 * @example
 * // Instead of:
 * const response = await fetch(url, options);
 * 
 * // Use:
 * const response = await apiFetch(url, options);
 */
export async function apiFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const response = await fetch(url, options);
  
  if (response.status === 404) {
    handle404Error();
    throw new Error(`API Resource Not Found (404): ${url}`);
  }
  
  return response;
}

