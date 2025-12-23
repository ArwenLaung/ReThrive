import React, { useEffect } from 'react';

const Notification = ({ message, type = 'info', duration = 3000, onClose }) => {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => {
      onClose?.();
    }, duration);
    return () => clearTimeout(t);
  }, [message, duration, onClose]);

  if (!message) return null;

  const bg = type === 'error' ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200';
  const text = type === 'error' ? 'text-red-700' : 'text-gray-800';

  return (
    <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 ${bg} border px-6 py-3 rounded-2xl shadow-md max-w-xl w-full sm:w-auto`}>
      <div className={`flex items-center gap-3 ${text} font-medium`}>{message}</div>
    </div>
  );
};

export default Notification;
