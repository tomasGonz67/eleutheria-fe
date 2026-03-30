interface FooterProps {
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
  onOpenRules: () => void;
}

export default function Footer({ onOpenTerms, onOpenPrivacy, onOpenRules }: FooterProps) {
  return (
    <footer className="w-full py-4 text-center text-sm text-black border-t border-gray-200">
      <button
        onClick={onOpenTerms}
        className="hover:text-gray-700 underline cursor-pointer"
      >
        Terms of Service
      </button>
      <span className="mx-2">|</span>
      <button
        onClick={onOpenPrivacy}
        className="hover:text-gray-700 underline cursor-pointer"
      >
        Privacy Policy
      </button>
      <span className="mx-2">|</span>
      <button
        onClick={onOpenRules}
        className="hover:text-gray-700 underline cursor-pointer"
      >
        Rules
      </button>
    </footer>
  );
}
