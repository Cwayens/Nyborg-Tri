# Gennemgang: atlet, træner og bestyrelse

Gennemgået 24. nov. 2026 ved at gå siden igennem som hver af rollerne. Formålet var at finde ud af, hvad der giver værdi, og hvad der mangler.

## Som ny atlet

**Det der virker godt**
- Forsiden forklarer på 10 sekunder, hvad klubben er, og viser de næste træninger og et tydeligt "Kom i gang".
- Første login beder kun om navnet. Bagefter lander man på sit overblik.
- Tre veje til at komme i gang: betaling, 14 dages prøveperiode eller kode.
- Overblikket viser kun det, man skal bruge: næste træninger, egen gruppes uge, ugens træning og Træn sammen.
- På mobilen er der en fanebjælke i bunden som i en app, og siden kan lægges på hjemmeskærmen.

**Rettet under gennemgangen**
- Brugere uden navn blev vist som "Unavngivet" på deltagerlister. Nu skal man skrive sit navn først.
- Med en kode fik man medlemskab, men ingen gruppe, og kunne derfor ikke tilmelde sig. Nu får man Bredde, eller Børn ved ungdomskontingent.
- Forsiden lovede "første uge gratis", men prøveperioden er 14 dage og kræver godkendelse. Teksten er rettet.

**Mangler stadig (anbefalet)**
- Mails ved aflysning, godkendelse og udløb. Kræver mailudbyder (står på go-live-listen).
- Push-notifikationer på telefonen. Kan bygges oven på, at siden kan installeres.
- Venteliste, når en træning eller tur er fuld.

## Som atlet med ur

**Det der virker godt**
- Strava-forbindelsen dækker de fleste ure på én gang (Garmin, Wahoo, Coros, Suunto, Polar og Apple Watch synkroniserer til Strava).
- Aktiviteter kommer automatisk via webhook og vises med tempo pr. sport (/100 m, /km, km/t).
- Uden ur kan man registrere en træning på 10 sekunder.

**Vigtigt forbehold**
- Stravas API-vilkår (fra nov. 2024) tillader så vidt vides kun at vise Strava-data for brugeren selv. Derfor tæller Strava-aktiviteter i ens egen statistik, men ikke i klubstatistikken. Direkte Garmin-adgang (Garmin Connect Developer Program) vil løse det for de fleste i klubben og bør søges.
- TrainingPeaks (planlagte træninger og "hvem skal lave det samme i dag") kræver partneradgang.

## Som træner

**Det der virker godt**
- Opret en træning for én gruppe, gentag den ugentligt i op til 52 uger.
- Se deltagere med telefonnumre.
- Aflys med årsag: træningen bliver stående som aflyst i kalenderen og i medlemmernes telefon-kalender i stedet for at forsvinde.

**Mangler stadig (anbefalet)**
- Fremmøderegistrering (hvem kom faktisk), som kan bruges til statistik og NyborgTri Cup-point.
- Besked til alle tilmeldte på en træning.
- Skabeloner til faste træninger (fx "Torsdagssvøm, bane 4-6").

## Som bestyrelse

**Det der virker godt**
- Overblik over medlemmer, udløb, prøveperioder og koder på få klik.
- Kortbetaling og MobilePay via Stripe, CSV til kassereren.
- Nyheder og sider kan rettes uden at kende til kode.

**Mangler stadig (anbefalet)**
- Import af nuværende medlemmer fra Klubmodul.
- Automatisk påmindelse om fornyelse før udløb.
- Økonomi-integration (sat på pause efter ønske).
- NyborgTri Cup: pointtavle direkte i værktøjet i stedet for PDF'er.

## Vurdering

Det har størst værdi for klubben lige nu:
1. **Mailudbyder**: login, påmindelser og aflysninger hænger alle på den.
2. **Garmin-adgang**: gør klubstatistik og "træn sammen" levende for de fleste medlemmer.
3. **Import fra Klubmodul**: så alle medlemmer er med fra dag ét.
4. **Fremmøde og Cup-point**: giver trænere og bestyrelse data, de i dag samler manuelt.
