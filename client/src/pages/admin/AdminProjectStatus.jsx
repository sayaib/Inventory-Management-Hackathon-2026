import { useEffect } from 'react';
import AdminPanel from './AdminPanel';

export default function AdminProjectStatus() {
  useEffect(() => {
    document.title = 'Admin — Project Status';
  }, []);

  return <AdminPanel initialTab="projectStatus" />;
}
