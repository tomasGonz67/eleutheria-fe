import { useEffect } from 'react';
import { useRouter } from 'next/router';

export type NotificationType = 'error' | 'success' | 'info';

interface NotificationBannerProps {
  type: NotificationType;
  message: string;
  onDismiss: () => void;
  autoDismiss?: boolean;
  autoDismissDelay?: number;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export default function NotificationBanner({
  type,
  message,
  onDismiss,
  autoDismiss = false,
  autoDismissDelay = 5000,
  actionLabel,
  actionHref,
  onAction,
}: NotificationBannerProps) {
  const router = useRouter();
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
          bg: 'bg-error',
          textColor: 'text-text-on-color',
          buttonBg: 'bg-surface',
          buttonText: 'text-error-text',
          buttonHover: 'hover:bg-surface-tertiary',
          icon: '⚠️',
        };
      case 'success':
        return {
          bg: 'bg-success',
          textColor: 'text-text-on-color',
          buttonBg: 'bg-surface',
          buttonText: 'text-success-text',
          buttonHover: 'hover:bg-surface-tertiary',
          icon: '✓',
        };
      case 'info':
        return {
          bg: 'bg-disabled',
          textColor: 'text-text-on-color',
          buttonBg: 'bg-surface',
          buttonText: 'text-text-tertiary',
          buttonHover: 'hover:bg-surface-tertiary',
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
        <div className="flex items-center gap-2">
          {actionLabel && actionHref && (
            <button
              onClick={() => { if (onAction) onAction(); onDismiss(); router.push(actionHref); }}
              className={`px-4 py-2 ${styles.buttonBg} ${styles.buttonText} rounded-lg ${styles.buttonHover} transition font-semibold`}
            >
              {actionLabel}
            </button>
          )}
          <button
            onClick={onDismiss}
            className={`px-4 py-2 ${styles.buttonBg} ${styles.buttonText} rounded-lg ${styles.buttonHover} transition font-semibold`}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
