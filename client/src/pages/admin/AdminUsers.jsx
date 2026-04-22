import { useEffect } from 'react';
import AdminPanel from './AdminPanel';

export default function AdminUsers() {
  useEffect(() => {
    document.title = 'Admin — Users';
  }, []);

  return <AdminPanel initialTab="users" />;
}
