import { useEffect } from 'react';
import AdminPanel from './AdminPanel';

export default function AdminAuditLogs() {
  useEffect(() => {
    document.title = 'Admin — Audit Logs';
  }, []);

  return <AdminPanel initialTab="audit" />;
}
