import { ReactNode } from 'react';
import { useRouter } from 'next/router';

interface ChatHeaderProps {
  title: string | ReactNode;
  subtitle?: string;
  backUrl?: string;
  onBack?: () => void;
  actions?: ReactNode;
  accentColor?: string;
}

export default function ChatHeader({
  title,
  subtitle,
  backUrl,
  onBack,
  actions,
  accentColor = '#4D89B0',
}: ChatHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backUrl) {
      router.push(backUrl);
    } else {
      router.back();
    }
  };

  return (
    <div
      className={`p-4 flex items-center justify-between border-b-4 ${
        accentColor === '#4D89B0' ? 'border-accent-forum' : 'border-accent-chat'
      }`}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={handleBack}
          className="text-text-secondary hover:text-text-primary font-semibold"
        >
          ← Back
        </button>
        <div>
          <div className="text-xl font-bold text-text-primary">{title}</div>
          {subtitle && <p className="text-sm text-text-tertiary">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
