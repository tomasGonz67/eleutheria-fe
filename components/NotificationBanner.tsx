import { useEffect } from 'react';

export type NotificationType = 'error' | 'success' | 'info';

interface NotificationBannerProps {
  type: NotificationType;
  message: string;
  onDismiss: () => void;
  autoDismiss?: boolean;
  autoDismissDelay?: number;
}

export default function NotificationBanner({
  type,
  message,
  onDismiss,
  autoDismiss = false,
  autoDismissDelay = 5000,
}: NotificationBannerProps) {
  useEffect(() => {
    if (autoDismiss) {
      const timer = setTimeout(() => {
        onDismiss();
      }, autoDismissDelay);

      return () => clearTimeout(timer);
    }
  }, [autoDismiss, autoDismissDelay, onDismiss]);

  const getStyles = () => {
    switch (type) {
      case 'error':
        return {
          bg: 'bg-red-500',
          textColor: 'text-white',
          buttonBg: 'bg-white',
          buttonText: 'text-red-600',
          buttonHover: 'hover:bg-gray-100',
          icon: '⚠️',
        };
      case 'success':
        return {
          bg: 'bg-green-500',
          textColor: 'text-white',
          buttonBg: 'bg-white',
          buttonText: 'text-green-600',
          buttonHover: 'hover:bg-gray-100',
          icon: '✓',
        };
      case 'info':
        return {
          bg: 'bg-gray-500',
          textColor: 'text-white',
          buttonBg: 'bg-white',
          buttonText: 'text-gray-600',
          buttonHover: 'hover:bg-gray-100',
          icon: 'ℹ️',
        };
    }
  };

  const styles = getStyles();

  return (
    <div className="fixed top-16 left-0 right-0 z-50 px-6">
      <div className={`max-w-4xl mx-auto ${styles.bg} ${styles.textColor} px-6 py-4 shadow-lg rounded-lg flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{styles.icon}</span>
          <span className="font-semibold text-lg">{message}</span>
        </div>
        <button
          onClick={onDismiss}
          className={`px-4 py-2 ${styles.buttonBg} ${styles.buttonText} rounded-lg ${styles.buttonHover} transition font-semibold`}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
