'use client';

import { useState } from 'react';
import { AlertTriangle, Info, CheckCircle } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  detail?: string;
  confirmText: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
  // Email notification option
  showEmailOption?: boolean;
  emailOptionLabel?: string;
  emailOptionDefault?: boolean;
  onConfirm: (sendEmail: boolean) => void;
  onCancel: () => void;
}

const variantConfig: Record<ConfirmVariant, {
  icon: React.ElementType;
  iconColor: string;
  buttonBg: string;
  buttonHover: string;
}> = {
  danger: {
    icon: AlertTriangle,
    iconColor: 'text-red-400',
    buttonBg: 'bg-red-600',
    buttonHover: 'hover:bg-red-700',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
    buttonBg: 'bg-amber-600',
    buttonHover: 'hover:bg-amber-700',
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-400',
    buttonBg: 'bg-gradient-to-r from-purple-600 to-purple-500',
    buttonHover: 'hover:from-purple-500 hover:to-purple-400',
  },
};

export function ConfirmDialog({
  isOpen,
  title,
  message,
  detail,
  confirmText,
  cancelText = 'Cancel',
  variant = 'info',
  isLoading = false,
  showEmailOption = false,
  emailOptionLabel = 'Send email notification to studio',
  emailOptionDefault = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [sendEmail, setSendEmail] = useState(emailOptionDefault);

  if (!isOpen) return null;

  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && !isLoading && onCancel()}
    >
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-white/10 animate-in fade-in zoom-in duration-200">
        {/* Icon + Title */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`p-3 rounded-full bg-white/10 ${config.iconColor}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <p className="text-gray-400 text-sm mt-1">{message}</p>
          </div>
        </div>

        {/* Detail Box */}
        {detail && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
            <p className="text-white text-sm">{detail}</p>
          </div>
        )}

        {/* Email Option Checkbox */}
        {showEmailOption && (
          <label className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors mb-4">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="w-5 h-5 rounded border-2 border-purple-400/50 bg-white/10 checked:bg-purple-600 checked:border-purple-600 cursor-pointer"
            />
            <span className="text-gray-300 text-sm">{emailOptionLabel}</span>
          </label>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-5 py-3 bg-white/10 text-gray-300 font-semibold rounded-lg hover:bg-white/20 transition-all disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={() => onConfirm(showEmailOption ? sendEmail : true)}
            disabled={isLoading}
            className={`flex-1 px-5 py-3 ${config.buttonBg} ${config.buttonHover} text-white font-semibold rounded-lg transition-all disabled:opacity-50`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
