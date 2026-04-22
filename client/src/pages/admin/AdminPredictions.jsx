import { useEffect } from 'react';
import AdminPanel from './AdminPanel';

export default function AdminPredictions() {
  useEffect(() => {
    document.title = 'Admin — Predictions';
  }, []);

  return <AdminPanel initialTab="prediction" />;
}
