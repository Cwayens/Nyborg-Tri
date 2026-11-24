// Menu – samme struktur som den gamle side, så medlemmerne kan finde rundt.
export type NavItem = { label: string; href?: string; children?: NavItem[] };

export const navigation: NavItem[] = [
  { label: "Forside", href: "/" },
  { label: "Bliv medlem", href: "/bliv-medlem" },
  {
    label: "Træning",
    children: [
      { label: "Træningstider", href: "/traeningstider" },
      { label: "Indoor bike", href: "/indoor-bike" },
      { label: "Lånecykler", href: "/laanecykler" },
      { label: "Klubtøj", href: "/klubtoej" },
    ],
  },
  {
    label: "Begivenheder",
    children: [
      { label: "NyborgTri Cup 2027", href: "/nyborgtri-cup-2027" },
      { label: "Hvad er NyborgTri Cup?", href: "/hvad-er-nyborgtri-cup" },
      { label: "Arkiv", href: "/arkiv" },
    ],
  },
  { label: "Nyheder", href: "/nyheder" },
  {
    label: "Om klubben",
    children: [
      { label: "Historien om NyborgTri", href: "/om" },
      { label: "Bestyrelse", href: "/om/bestyrelse" },
      { label: "Vedtægter", href: "/om/vedtaegter" },
      { label: "Ordensregler", href: "/ordensregler" },
      { label: "Generalforsamlinger", href: "/om/generalforsamlinger" },
      { label: "Sponsorer", href: "/sponsorer" },
      { label: "Privatlivspolitik", href: "/privatlivspolitik" },
      { label: "Kontakt", href: "/om/kontakt" },
    ],
  },
];
