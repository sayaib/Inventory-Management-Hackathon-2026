import { useEffect } from 'react';
import AdminPanel from './AdminPanel';

export default function AdminReports() {
  useEffect(() => {
    document.title = 'Admin — Reports';
  }, []);

  return <AdminPanel initialTab="reports" />;
}
