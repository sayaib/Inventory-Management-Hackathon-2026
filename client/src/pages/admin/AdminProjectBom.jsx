import { useEffect } from 'react';
import AdminPanel from './AdminPanel';

export default function AdminProjectBom() {
  useEffect(() => {
    document.title = 'Admin — Project BOM';
  }, []);

  return <AdminPanel initialTab="projectBom" />;
}

