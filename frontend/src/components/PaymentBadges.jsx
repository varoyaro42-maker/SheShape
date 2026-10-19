/**
 * Small payment marks for the checkout choices: MTN MoMo and Airtel Money
 * (how most of Rwanda pays) and Visa / Mastercard. Drawn as simple SVG badges
 * in each brand's colours so they stay sharp and load instantly.
 */
export function MomoBadges() {
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }} aria-hidden="true">
      <svg width="54" height="30" viewBox="0 0 54 30" role="img">
        <rect width="54" height="30" rx="7" fill="#FFCC00" />
        <text x="27" y="12.5" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#004F71" fontFamily="inherit">MTN</text>
        <text x="27" y="23.5" textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#004F71" fontFamily="inherit">MoMo</text>
      </svg>
      <svg width="54" height="30" viewBox="0 0 54 30" role="img">
        <rect width="54" height="30" rx="7" fill="#E40000" />
        <text x="27" y="13" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#fff" fontFamily="inherit">airtel</text>
        <text x="27" y="23.5" textAnchor="middle" fontSize="7" fontWeight="600" fill="#fff" fontFamily="inherit">money</text>
      </svg>
    </span>
  )
}

export function CardBadges() {
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }} aria-hidden="true">
      <svg width="54" height="30" viewBox="0 0 54 30" role="img">
        <rect x="0.5" y="0.5" width="53" height="29" rx="6.5" fill="#fff" stroke="#E2E6DC" />
        <text x="27" y="20" textAnchor="middle" fontSize="13" fontWeight="800" fontStyle="italic" fill="#1A1F71" fontFamily="inherit" letterSpacing="0.5">VISA</text>
      </svg>
      <svg width="54" height="30" viewBox="0 0 54 30" role="img">
        <rect x="0.5" y="0.5" width="53" height="29" rx="6.5" fill="#fff" stroke="#E2E6DC" />
        <circle cx="22" cy="15" r="9" fill="#EB001B" />
        <circle cx="32" cy="15" r="9" fill="#F79E1B" />
        <path d="M27 7.6a9 9 0 0 1 0 14.8a9 9 0 0 1 0-14.8z" fill="#FF5F00" />
      </svg>
    </span>
  )
}
