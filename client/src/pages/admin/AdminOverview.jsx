import { useEffect } from 'react';
import AdminPanel from './AdminPanel';

export default function AdminOverview() {
  useEffect(() => {
    document.title = 'Admin — Overview';
  }, []);

  return <AdminPanel initialTab="overview" />;
}
