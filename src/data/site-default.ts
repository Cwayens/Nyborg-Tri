// Standardindhold for forsiden og Om klubben (Nyborg Triathlon Klub). Admin kan rette alt under Admin → Klubben;
// det gemte ligger i databasen (Setting "site") og lægges oven på dette. Tekst kan indeholde **fed** og [links](/sti).

export type Fact = { value: string; label: string };
export type TeamCard = { label: string; title: string; text: string; img: string; alt: string };
export type Faq = { q: string; a: string };
export type TimelineItem = { year: string; title: string; text: string; img: string };
export type Partner = { name: string; what: string; url: string };
export type Pic = { src: string; alt: string };

export type HomeContent = {
  heroTitle: string; heroLead: string; heroImage: string; heroAlt: string; proof: Fact[];
  teamsTitle: string; teamsLead: string; teams: TeamCard[];
  moreTitle: string; moreImage: string; more: string[];
  athletesLead: string; faq: Faq[]; ctaTitle: string; ctaImage: string;
};
export type AboutContent = {
  title: string; lead: string; image: string; facts: Fact[]; timeline: TimelineItem[];
  archive: { show: boolean; image: string; title: string; text: string };
  partners: Partner[]; gallery: Pic[]; ctaTitle: string; ctaText: string;
};
export type PrivacyContent = { extra: string };

export const DEFAULT_HOME: HomeContent = {
  heroTitle: "Svøm, cykl og løb sammen med os på Østfyn",
  heroLead: "Uanset om du skal i mål på din første sprint eller jagter en ny rekord, så træner du bedre sammen med andre.",
  heroImage: "/billeder/faellesskab-strand.jpg",
  heroAlt: "Klubbens medlemmer i våddragt klar til open water",
  proof: [
    { value: "ca. 100", label: "medlemmer" },
    { value: "3", label: "hold: Bredde, Elite og Børn" },
    { value: "Hver uge", label: "fælles svøm, cykel og løb" },
  ],
  teamsTitle: "Find dit hold",
  teamsLead: "Alle træner med folk på samme niveau. Du kan altid skifte hold senere.",
  teams: [
    { label: "Bredde", title: "Motionist eller nybegynder", text: "Træn i dit eget tempo med andre, der også vil have det sjovt. Du behøver ikke kunne crawle eller eje en racercykel for at starte.", img: "/billeder/cykeltur.jpg", alt: "Medlemmer på fælles cykeltur" },
    { label: "Elite", title: "Du vil konkurrere", text: "Struktureret træning med trænere, tests og fælles mål mod sæsonens stævner, fra sprint til ironman.", img: "/billeder/enkeltstart.jpg", alt: "Klubbens atleter ved en enkeltstart" },
    { label: "Børn", title: "Børn og unge", text: "Leg, teknik og fællesskab i vand, på cykel og til fods. Og så er der Nyborg MiniTri hver sommer.", img: "/billeder/maalgang.jpg", alt: "Publikum heier på en triatlet ved målgang på stranden" },
  ],
  moreTitle: "Mere end træning",
  moreImage: "/billeder/storebaelt.jpg",
  more: [
    "Open water i Storebælt, lørdagsløb på Volden og fælles cykelture",
    "Klubbens egne stævner: NyborgTri Cup og Nyborg MiniTri",
    "Find nogen at træne med, også uden for de faste tider",
    "Se dine testresultater for 5 og 10 km, FTP og svøm, og følg din udvikling",
  ],
  athletesLead: "Klubbens elite kæmper om placeringer til DM og Ironman. Følg dem gennem sæsonen.",
  faq: [
    { q: "Skal jeg være i god form for at starte?", a: "Nej. Bredde-gruppen er for alle niveauer, og trænerne hjælper dig i gang med den disciplin, du er mindst tryg ved." },
    { q: "Hvad skal jeg have med første gang?", a: "Løbesko, badetøj og godt humør. Mangler du en cykel, kan du låne en af klubbens." },
    { q: "Hvordan fungerer de 14 gratis dage?", a: "Du opretter en profil og søger om prøveperiode. Når den er godkendt, kan du tilmelde dig alle din gruppes træninger i 14 dage uden at betale." },
  ],
  ctaTitle: "Klar til første træning?",
  ctaImage: "/billeder/open-water.jpg",
};

export const DEFAULT_ABOUT: AboutContent = {
  title: "Triathlon i Nyborg siden 2010",
  lead: "Nyborg Triathlon Klub er for alle med lyst til at svømme, cykle og løbe. Unge og gamle, begyndere og erfarne. Du er velkommen til at træne med, før du beslutter dig.",
  image: "/billeder/faellesskab-strand.jpg",
  facts: [
    { value: "2010", label: "stiftet 2. september" },
    { value: "3", label: "discipliner, hver uge" },
    { value: "4-18-4", label: "klubbens stævne i august" },
    { value: "DTriF", label: "medlem af forbundet" },
  ],
  timeline: [
    { year: "2007", title: "Et triathlonhold i svømmeklubben", text: "Nyborg Svømmeklub starter et triathlon-svømmehold i forbindelse med det årlige Nyborg Minitri. Holdet bliver det faste mødested for byens triathleter.", img: "" },
    { year: "2010", title: "Klubben stiftes den 2. september", text: "Svømmeholdet lukker, og i stedet stifter triathleterne deres egen klub: Nyborg Triathlon Klub, NyborgTri. Rolf Kjærby bliver den første formand og Michael Christensen næstformand.", img: "/billeder/historie/start-2010.webp" },
    { year: "Nov. 2010", title: "18 medlemmer og fast træning", text: "Efter to måneder er klubben på 18 medlemmer. Der svømmes om torsdagen, cykles om søndagen og løbes om mandagen, alt sammen i fælles flok.", img: "/billeder/historie/om-10.webp" },
    { year: "Hver august", title: "Stævnet NyborgTri 4-18-4", text: "Klubben arrangerer hvert år NyborgTri 4-18-4 (tidligere Nyborg Minitri), et stævne for både nye og erfarne triathleter.", img: "/billeder/historie/om-09.webp" },
    { year: "Hele året", title: "NyborgTri Cup og klubmesterskab", text: "En cup med flere afdelinger hen over året. Den med flest point bliver årets klubmester i klasserne kvinde, mand, pige og dreng. [Se NyborgTri Cup](/nyborgtri-cup-2027)", img: "" },
    { year: "I dag", title: "Plads til alle", text: "Børn, unge, motionister og elite træner sammen hver uge i svøm, cykel og løb. Se [træningskalenderen](/traening) eller mød [klubbens atleter](/atleter).", img: "" },
  ],
  archive: {
    show: true,
    image: "/billeder/historie/avisudklip-2010.webp",
    title: "\"Svøm, løb og cykel i nystartet klub\"",
    text: "Lokalavisen Nyborg skrev om den nye klub den 16. november 2010, to en halv måned efter stiftelsen.",
  },
  partners: [
    { name: "Dansk Triathlon Forbund", what: "NyborgTri er medlem af DTriF, så du kan få licens og stille op til danske stævner.", url: "https://www.triatlon.dk/" },
    { name: "Idrætsforeninger i Nyborg", what: "NyborgTri samarbejder med byens andre klubber om baner, bassin og arrangementer.", url: "" },
  ],
  gallery: [
    { src: "/billeder/open-water.jpg", alt: "Svømning i åbent vand" },
    { src: "/billeder/cykeltur.jpg", alt: "Fælles cykeltur" },
    { src: "/billeder/maalgang.jpg", alt: "Målgang ved stævne" },
    { src: "/billeder/enkeltstart.jpg", alt: "Enkeltstart på cykel" },
  ],
  ctaTitle: "Kom og prøv det",
  ctaText: "Træn gratis med i 14 dage. Du behøver ikke være i form eller have dyrt udstyr for at starte.",
};

export const DEFAULT_PRIVACY: PrivacyContent = { extra: "" };

/** Neutralt indhold til en ny klub (bruges af opstartsguiden). */
export function blankHome(clubName: string): HomeContent {
  return {
    ...DEFAULT_HOME,
    heroTitle: "Svøm, cykl og løb sammen med os",
    heroImage: "", heroAlt: "",
    proof: [{ value: "Hver uge", label: "fælles svøm, cykel og løb" }],
    teams: DEFAULT_HOME.teams.map((t) => ({ ...t, text: t.text.replace(/ Og så er der .*$/, ""), img: "", alt: "" })),
    moreImage: "",
    more: ["Træn sammen med andre på dit niveau", "Find nogen at træne med, også uden for de faste tider", "Se dine testresultater og følg din udvikling"],
    athletesLead: `Mød ${clubName}s atleter.`,
    ctaImage: "",
  };
}
export function blankAbout(clubName: string): AboutContent {
  return {
    ...DEFAULT_ABOUT,
    title: `Om ${clubName}`,
    lead: `${clubName} er for alle med lyst til at svømme, cykle og løbe. Du er velkommen til at træne med, før du beslutter dig.`,
    image: "", facts: [], timeline: [], archive: { ...DEFAULT_ABOUT.archive, show: false }, partners: [], gallery: [],
  };
}

// ---------- Engelsk standardindhold (bruges, når siden vises på engelsk, og klubben ikke selv har skrevet teksten) ----------

export const DEFAULT_HOME_EN: HomeContent = {
  ...DEFAULT_HOME,
  heroTitle: "Swim, bike and run with us on East Funen",
  heroLead: "Whether you're aiming to finish your first sprint or chasing a new record, you train better with others.",
  heroAlt: "Club members in wetsuits ready for open water",
  proof: [
    { value: "approx. 100", label: "members" },
    { value: "3", label: "teams: Open, Elite and Kids" },
    { value: "Every week", label: "group swims, rides and runs" },
  ],
  teamsTitle: "Find your team",
  teamsLead: "Everyone trains with people at their own level. You can always switch teams later.",
  teams: [
    { ...DEFAULT_HOME.teams[0], label: "Open", title: "Fitness or first-timer", text: "Train at your own pace with others who want to have fun too. You don't need to swim front crawl or own a road bike to start.", alt: "Members on a group ride" },
    { ...DEFAULT_HOME.teams[1], label: "Elite", title: "You want to race", text: "Structured training with coaches, tests and shared goals for the season's races, from sprint to Ironman.", alt: "Club athletes at a time trial" },
    { ...DEFAULT_HOME.teams[2], label: "Kids", title: "Kids and youth", text: "Play, technique and friendship in the water, on the bike and on foot. And there's Nyborg MiniTri every summer.", alt: "Spectators cheering a triathlete at the beach finish" },
  ],
  moreTitle: "More than training",
  more: [
    "Open water in the Great Belt, Saturday runs on the ramparts and group rides",
    "The club's own races: NyborgTri Cup and Nyborg MiniTri",
    "Find someone to train with, also outside the regular sessions",
    "See your test results for 5 and 10 km, FTP and swimming, and follow your progress",
  ],
  athletesLead: "The club's elite athletes compete for podiums at the Danish championships and Ironman. Follow them through the season.",
  faq: [
    { q: "Do I need to be fit to start?", a: "No. The open group is for all levels, and the coaches help you get started with the discipline you're least comfortable with." },
    { q: "What should I bring the first time?", a: "Running shoes, swimwear and a good mood. If you don't have a bike, you can borrow one from the club." },
    { q: "How do the 14 free days work?", a: "You create a profile and apply for a trial. Once it's approved, you can sign up for all your team's trainings for 14 days without paying." },
  ],
  ctaTitle: "Ready for your first session?",
};

export const DEFAULT_ABOUT_EN: AboutContent = {
  ...DEFAULT_ABOUT,
  title: "Triathlon in Nyborg since 2010",
  lead: "Nyborg Triathlon Klub is for everyone who wants to swim, bike and run. Young and old, beginners and experienced. You're welcome to train with us before you decide.",
  facts: [
    { value: "2010", label: "founded 2 September" },
    { value: "3", label: "disciplines, every week" },
    { value: "4-18-4", label: "the club's race in August" },
    { value: "DTriF", label: "member of the Danish federation" },
  ],
  timeline: [
    { ...DEFAULT_ABOUT.timeline[0], title: "A triathlon squad in the swimming club", text: "Nyborg Swimming Club starts a triathlon swim squad alongside the annual Nyborg Minitri. It becomes the regular meeting place for the town's triathletes." },
    { ...DEFAULT_ABOUT.timeline[1], year: "2010", title: "The club is founded on 2 September", text: "The swim squad closes, and the triathletes found their own club instead: Nyborg Triathlon Klub, NyborgTri. Rolf Kjærby becomes the first chair and Michael Christensen vice chair." },
    { ...DEFAULT_ABOUT.timeline[2], year: "Nov. 2010", title: "18 members and regular training", text: "After two months the club has 18 members. Swimming on Thursdays, cycling on Sundays and running on Mondays, all together." },
    { ...DEFAULT_ABOUT.timeline[3], year: "Every August", title: "The NyborgTri 4-18-4 race", text: "Every year the club organises NyborgTri 4-18-4 (formerly Nyborg Minitri), a race for both new and experienced triathletes." },
    { ...DEFAULT_ABOUT.timeline[4], year: "All year", title: "NyborgTri Cup and club championship", text: "A cup with several rounds through the year. The one with the most points becomes club champion in the women's, men's, girls' and boys' classes. [See NyborgTri Cup](/nyborgtri-cup-2027)" },
    { ...DEFAULT_ABOUT.timeline[5], year: "Today", title: "Room for everyone", text: "Kids, youth, fitness athletes and elite train every week in swim, bike and run. See the [training calendar](/traening) or meet [the club's athletes](/atleter)." },
  ],
  archive: { ...DEFAULT_ABOUT.archive, title: "\"Swim, run and bike in a new club\"", text: "The local paper Nyborg wrote about the new club on 16 November 2010, two and a half months after it was founded." },
  partners: [
    { ...DEFAULT_ABOUT.partners[0], name: "Danish Triathlon Federation", what: "NyborgTri is a member of DTriF, so you can get a licence and race in Danish events." },
    { ...DEFAULT_ABOUT.partners[1], name: "Sports clubs in Nyborg", what: "NyborgTri works with the town's other clubs on lanes, pool time and events." },
  ],
  gallery: [
    { src: "/billeder/open-water.jpg", alt: "Open water swimming" },
    { src: "/billeder/cykeltur.jpg", alt: "Group ride" },
    { src: "/billeder/maalgang.jpg", alt: "Finish at a race" },
    { src: "/billeder/enkeltstart.jpg", alt: "Time trial on the bike" },
  ],
  ctaTitle: "Come and try it",
  ctaText: "Train with us for free for 14 days. You don't need to be fit or have expensive gear to start.",
};
