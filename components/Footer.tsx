interface FooterProps {
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
  onOpenRules: () => void;
}

export default function Footer({ onOpenTerms, onOpenPrivacy, onOpenRules }: FooterProps) {
  return (
    <footer className="w-full py-4 text-center text-sm text-text-inverted border-t border-border-light">
      <button
        onClick={onOpenTerms}
        className="hover:text-text-secondary underline cursor-pointer"
      >
        Terms of Service
      </button>
      <span className="mx-2">|</span>
      <button
        onClick={onOpenPrivacy}
        className="hover:text-text-secondary underline cursor-pointer"
      >
        Privacy Policy
      </button>
      <span className="mx-2">|</span>
      <button
        onClick={onOpenRules}
        className="hover:text-text-secondary underline cursor-pointer"
      >
        Rules
      </button>
    </footer>
  );
}
