import React from 'react';

const ConfirmModal = ({
  open,
  title = 'Notice',
  message,
  onClose,
  onConfirm,
  confirmText = 'Yes',
  cancelText = 'No',
  singleButton = false,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-lg max-w-md w-full mx-4 p-6 z-10 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-700 mb-6">{message}</p>
        <div className={`flex ${singleButton ? 'justify-center' : 'justify-end gap-3'}`}>
          {singleButton ? (
            <button
              onClick={onClose}
              className="bg-brand-purple text-white font-semibold px-5 py-2 rounded-lg hover:bg-purple-800 transition-colors"
            >
              {confirmText || 'OK'}
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="bg-white border border-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={() => { onConfirm?.(); }}
                className="bg-brand-purple text-white font-semibold px-4 py-2 rounded-lg hover:bg-purple-800 transition-colors"
              >
                {confirmText}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
