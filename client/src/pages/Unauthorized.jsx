import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

const Unauthorized = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <ShieldAlert className="h-20 w-20 text-red-600 mx-auto" />
        <h1 className="text-4xl font-extrabold text-gray-900">Access Denied</h1>
        <p className="text-lg text-gray-600">You do not have the necessary permissions to access this page.</p>
        <div className="pt-4">
          <Link
            to="/login"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
