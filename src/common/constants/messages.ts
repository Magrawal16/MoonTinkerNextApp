// Centralized messages for the entire application
// All user-facing messages should be defined here for consistency and easy translation

export const APP_MESSAGES = {
  // Error Messages
  ERRORS: {
    GENERIC: 'Something went wrong',
    CIRCUIT_SAVE_FAILED: 'Failed to save circuit',
    CIRCUIT_LOAD_FAILED: 'Failed to load circuits',
    CIRCUIT_DELETE_FAILED: 'Failed to delete circuit',
    CIRCUIT_UPDATE_FAILED: 'Failed to update circuit',
    CIRCUIT_DUPLICATE_FAILED: 'Failed to duplicate circuit',
    CIRCUIT_NOT_FOUND: 'Circuit not found',
    SESSION_EXPIRED: 'Session Expired',
    SESSION_EXPIRED_MESSAGE: 'Your session has expired or you no longer have access to this resource. Please login again to continue.',
    INVALID_LINK: 'Invalid link format.',
    NO_CIRCUIT_DATA: 'No circuit data found in link.',
    NETWORK_ERROR: 'Network error. Please try again.',
  },

  // Success Messages
  SUCCESS: {
    CIRCUIT_SAVED: 'Circuit saved successfully',
    CIRCUIT_DELETED: 'Circuit deleted successfully',
    CIRCUIT_RENAMED: 'Circuit renamed successfully',
    CIRCUIT_DUPLICATED: 'Circuit duplicated successfully',
    CIRCUIT_LOADED: 'Circuit loaded successfully',
  },

  // Info Messages
  INFO: {
    LOADING: 'Loading...',
    NO_CIRCUITS: 'No circuits saved yet',
    EMPTY_STATE: 'Create your first circuit to get started',
  },

  // Button Labels
  BUTTONS: {
    LOGIN_AGAIN: 'Login Again',
    SAVE: 'Save',
    CANCEL: 'Cancel',
    DELETE: 'Delete',
    CONFIRM_DELETE: 'Confirm Delete',
    LOAD: 'Load',
    CREATE: 'Create',
    IMPORT: 'Import',
  },

  // Prompts
  PROMPTS: {
    CONFIRM_DELETE_CIRCUIT: 'Are you sure you want to delete this circuit? This action cannot be undone.',
    DUPLICATE_CIRCUIT: 'Duplicate circuit name. Please choose a different name.',
  },
};
