import { useEffect } from 'react';
import { useAppSettings } from '../hooks/useAppSettings';

export function AppGlobalSettings() {
  useAppSettings(); // This calls the hook which then updates doc.title and favicon
  return null;
}
