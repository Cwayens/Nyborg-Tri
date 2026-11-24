// Offentlig menu: få, tydelige valg. Indloggede får app-menuen i stedet (se AppNav).
export type NavItem = { label: string; href?: string; children?: NavItem[] };

export const navigation: NavItem[] = [
  {
    label: "Træning",
    children: [
      { label: "Kalender", href: "/kalender" },
      { label: "Træningstider", href: "/traeningstider" },
      { label: "Indoor bike", href: "/indoor-bike" },
      { label: "Lånecykler", href: "/laanecykler" },
    ],
  },
  {
    label: "Klubben",
    children: [
      { label: "Om NyborgTri", href: "/om" },
      { label: "NyborgTri Cup 2027", href: "/nyborgtri-cup-2027" },
      { label: "Bestyrelse", href: "/om/bestyrelse" },
      { label: "Klubtøj", href: "/klubtoej" },
      { label: "Sponsorer", href: "/sponsorer" },
      { label: "Vedtægter og regler", href: "/om/vedtaegter" },
      { label: "Generalforsamlinger", href: "/om/generalforsamlinger" },
      { label: "Arkiv og resultater", href: "/arkiv" },
      { label: "Kontakt", href: "/om/kontakt" },
    ],
  },
  { label: "Nyheder", href: "/nyheder" },
];
