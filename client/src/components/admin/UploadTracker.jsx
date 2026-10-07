import { createContext, useContext } from 'react';
import { uploadsApi } from '../../services/endpoints.js';

export const createTracker = () => {
  const ids = new Set();
  return {
    add: (id) => ids.add(id),
    has: (id) => ids.has(id),
    discard: (id) => ids.delete(id),
    clear: () => ids.clear(), // called after a successful save: these images are now in use
    // Called when the editor is abandoned: delete uploads that never got saved (best effort)
    cleanup: () => {
      const pending = [...ids];
      ids.clear();
      pending.forEach((id) => uploadsApi.remove(id).catch(() => {}));
    },
  };
};

export const UploadTrackerContext = createContext(null);
export const useUploadTracker = () => useContext(UploadTrackerContext) || createTracker();
