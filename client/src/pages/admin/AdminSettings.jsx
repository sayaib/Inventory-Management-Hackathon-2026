import { useEffect } from 'react';
import AdminPanel from './AdminPanel';

export default function AdminSettings() {
  useEffect(() => {
    document.title = 'Admin — Settings';
  }, []);

  return <AdminPanel initialTab="settings" />;
}
