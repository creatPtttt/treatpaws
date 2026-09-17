interface PawLogoProps {
  size?: number;
}

/**
 * Hand-drawn TreatPaws logomark: a paw print holding a round chocolate-chip
 * cookie. Pure inline SVG (no external asset) so it stays crisp at any size
 * and can be recolored via the palette hex values used elsewhere on the page.
 */
export function PawLogo({ size = 36 }: PawLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      role="img"
    >
      {/* Cookie: honey-yellow disc + caramel chocolate chips */}
      <circle cx="24" cy="22" r="14" fill="#F7CD67" />
      <circle cx="24" cy="22" r="14" fill="none" stroke="#9A835A" strokeWidth="1.5" />
      <circle cx="18" cy="18" r="1.8" fill="#9A835A" />
      <circle cx="29" cy="17" r="1.6" fill="#9A835A" />
      <circle cx="30" cy="25" r="1.7" fill="#9A835A" />
      <circle cx="19" cy="27" r="1.5" fill="#9A835A" />
      <circle cx="24" cy="23" r="1.4" fill="#9A835A" />

      {/* Paw print: caramel-brown main pad + four toe beans, laid over the cookie's lower-right edge */}
      <ellipse cx="34" cy="34" rx="7" ry="6" fill="#B08655" />
      <circle cx="26" cy="28" r="3.1" fill="#B08655" />
      <circle cx="33" cy="24.5" r="3.1" fill="#B08655" />
      <circle cx="40" cy="26.5" r="2.9" fill="#B08655" />
      <circle cx="41.5" cy="33" r="2.7" fill="#B08655" />
    </svg>
  );
}
