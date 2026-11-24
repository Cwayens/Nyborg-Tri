// Offentlig menu: kun det, der informerer nye medlemmer. Alt andet ligger bag login (se MEMBER_INFO).
export type NavItem = { label: string; href: string };

export const navigation: NavItem[] = [
  { label: "Træning", href: "/traening" },
  { label: "Atleter", href: "/atleter" },
  { label: "Priser", href: "/#priser" },
  { label: "Om klubben", href: "/om" },
];

// Klubinfo for medlemmer – vises på /klubben
export const MEMBER_INFO: { title: string; links: NavItem[] }[] = [
  {
    title: "Træning",
    links: [
      { label: "Træningstider", href: "/traeningstider" },
      { label: "Indoor bike", href: "/indoor-bike" },
      { label: "Lånecykler", href: "/laanecykler" },
      { label: "Ruter og kort", href: "/ruter" },
    ],
  },
  {
    title: "Klubben",
    links: [
      { label: "Klubtøj", href: "/klubtoej" },
      { label: "Bestyrelse", href: "/om/bestyrelse" },
      { label: "Vedtægter og regler", href: "/om/vedtaegter" },
      { label: "Generalforsamlinger", href: "/om/generalforsamlinger" },
    ],
  },
  {
    title: "Stævner",
    links: [
      { label: "NyborgTri Cup 2027", href: "/nyborgtri-cup-2027" },
      { label: "Arkiv og resultater", href: "/arkiv" },
      { label: "Sponsorer", href: "/sponsorer" },
    ],
  },
];

// Indholdssider, der kun vises for indloggede
export const MEMBER_ONLY_PATHS = [
  "traeningstider", "indoor-bike", "laanecykler", "klubtoej",
  "om/bestyrelse", "om/vedtaegter", "om/generalforsamlinger", "arkiv",
];

export function isMemberOnlyPath(path: string): boolean {
  return MEMBER_ONLY_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}
