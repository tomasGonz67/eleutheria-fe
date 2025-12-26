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
      className="p-4 flex items-center justify-between border-b-4"
      style={{ borderColor: accentColor }}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={handleBack}
          className="text-gray-700 hover:text-gray-900 font-semibold"
        >
          ← Back
        </button>
        <div>
          <div className="text-xl font-bold text-gray-800">{title}</div>
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
