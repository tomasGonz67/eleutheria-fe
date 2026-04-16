import { useEffect } from 'react';

type LegalType = 'terms' | 'privacy' | 'rules';

interface LegalModalProps {
  type: LegalType;
  onClose: () => void;
}

const TERMS_CONTENT = `
Last Updated: February 2025

1. Acceptance of Terms
By accessing or using Eleutheria ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.

2. Eligibility
You must be at least 18 years of age to use this Platform. By using Eleutheria, you represent that you meet this age requirement.

3. User Conduct
You agree not to:
- Post content that is illegal, threatening, or harassing
- Impersonate any person or entity
- Upload malware, viruses, or other harmful code
- Attempt to gain unauthorized access to the Platform or other users' accounts
- Use the Platform for any unlawful purpose
- Spam, flood, or otherwise disrupt the Platform
- Attempt to exploit, attack, or disrupt the Platform's infrastructure

4. User-Generated Content
You retain ownership of content you post. By posting content, you grant Eleutheria a non-exclusive, royalty-free license to display and distribute that content on the Platform. You are solely responsible for the content you post.

5. Sessions and Cookies
Your identity on the Platform is maintained through an anonymous session cookie. This cookie persists for 1 year and is automatically renewed each time you use the Platform, so your session will not expire as long as you remain active. If you clear your cookies or do not visit the Platform for over a year, your session will end and you will receive a new anonymous identity.

6. Content Moderation
We reserve the right to remove any content and suspend or terminate any user at our sole discretion, without prior notice, for any reason including violation of these Terms.

7. DMCA / Copyright
If you believe content on the Platform infringes your copyright, please contact us with a description of the copyrighted work, the infringing material, and your contact information. We will respond to valid takedown requests in accordance with the DMCA.

8. Disclaimer of Warranties
The Platform is provided "as is" without warranties of any kind, express or implied. We do not guarantee that the Platform will be uninterrupted, secure, or error-free.

9. Limitation of Liability
To the maximum extent permitted by law, Eleutheria shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform.

10. Privacy
Your use of the Platform is also governed by our Privacy Policy, which describes how we collect, use, and protect your information.

11. Indemnification
You agree to indemnify and hold harmless Eleutheria and its operators from any claims, damages, or expenses arising from your use of the Platform or your violation of these Terms.

12. Governing Law
These Terms shall be governed by and construed in accordance with the laws of the State of New Jersey, United States, without regard to its conflict of law provisions.

13. Platform Availability
We reserve the right to modify, suspend, or discontinue the Platform at any time, with or without notice, for any reason. We shall not be liable to you or any third party for any such modification, suspension, or discontinuation.

14. Changes to Terms
We may update these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the updated Terms.

15. Contact
For questions about these Terms, please reach out through the Platform.
`;

const PRIVACY_CONTENT = `
Last Updated: February 2025

1. Information We Collect

Session Data: We use anonymous session tokens to identify users. No email, password, or personal account information is required.

Device Information: We collect IP addresses and browser fingerprints for the purpose of session management, abuse prevention, and platform security.

Usage Data: We collect timestamps associated with your session activity, content you post, and messages you send.

2. How We Use Your Information
- To provide and maintain the Platform
- To identify and prevent abuse, spam, and unauthorized access
- To manage user sessions
- To improve the Platform

3. Data Sharing
We do not sell your data. We may share information only:
- When required by law or legal process
- To protect the rights and safety of the Platform and its users

4. Data Retention
Session data and associated content are retained as long as necessary to provide the Platform. IP addresses and fingerprints are retained for security and abuse prevention purposes.

5. Cookies and Tracking
We use session cookies to maintain your session on the Platform. These are essential for the Platform to function.

6. Your Rights
You may request deletion of your content by contacting us. Note that anonymous session-based data may not be individually identifiable.

For users in the EU (GDPR): You have the right to access, rectify, or erase your personal data, and to object to or restrict processing. Our lawful basis for processing is legitimate interest (platform security and abuse prevention).

For users in California (CCPA): You have the right to know what personal information we collect, to request deletion, and to opt out of the sale of personal information. We do not sell personal information.

7. Children's Privacy
The Platform is not intended for children under 18. We do not knowingly collect information from children under 18. If we learn we have collected such information, we will delete it.

8. Security
We implement reasonable security measures to protect your information. However, no method of transmission over the Internet is 100% secure.

9. Changes to This Policy
We may update this Privacy Policy at any time. Continued use of the Platform after changes constitutes acceptance.

10. Contact
For privacy-related questions or requests, please reach out through the Platform.
`;

const RULES_CONTENT = `
Community Rules

Eleutheria is an anonymous platform built on free expression. That said, I dont give a fuck what you do, say, or post, just as long as its not illegal. 

1. No Spam or Flooding

2. No Illegal Content
Do not post content that violates any applicable law. This includes but is not limited to: CSAM, doxxing, credible threats of violence, and distribution of stolen data.

3. No Malicious Links or Code
Do not share links to malware, phishing sites, or any content designed to harm other users' devices or accounts.

4. Respect the Platform
Do not attempt to exploit, attack, or disrupt the Platform's infrastructure or other users' sessions.

Consequences
Violations may result in content removal, temporary suspension, or permanent ban at our discretion. Bans are applied by IP and browser fingerprint. You can appeal via the contact us button. Well I guess its just me at this time lol.

These rules may be updated at any time. Use common sense.
`;

export default function LegalModal({ type, onClose }: LegalModalProps) {
  const titles = { terms: 'Terms of Service', privacy: 'Privacy Policy', rules: 'Community Rules' };
  const contents = { terms: TERMS_CONTENT, privacy: PRIVACY_CONTENT, rules: RULES_CONTENT };
  const title = titles[type];
  const content = contents[type];

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface rounded-lg max-w-2xl w-full p-6 border-4 border-accent-chat max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-text-primary" style={{ fontFamily: 'var(--font-cinzel)' }}>{title}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary text-2xl">
            &times;
          </button>
        </div>
        <div className="overflow-y-auto flex-1 text-text-secondary whitespace-pre-line text-sm leading-relaxed">
          {content}
        </div>
      </div>
    </div>
  );
}
