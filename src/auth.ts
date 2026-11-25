import NextAuth, { type DefaultSession } from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import type { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import type { AthleteGroup, Role } from "@prisma/client";
import { hasRole } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { canSignUp } from "@/lib/access";
import { sendMail } from "@/lib/mail";
import { getClub } from "@/lib/site";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role; athleteGroup: AthleteGroup | null } & DefaultSession["user"];
  }
}

/**
 * Auth.js' Prisma-adapter med klub-isolation. prisma er klub-begrænset (src/lib/db.ts), så brugere, login-sessioner og
 * login-links hører til klubben på domænet: en login-cookie fra én klub virker ikke på en anden klubs domæne, og samme
 * mail kan være medlem af flere klubber som to forskellige brugere. Mail er kun unik pr. klub, derfor findFirst.
 */
function clubAdapter(): Adapter {
  const base = PrismaAdapter(prisma as unknown as PrismaClient);
  return {
    ...base,
    async getUserByEmail(email) {
      return (await prisma.user.findFirst({ where: { email } })) as AdapterUser | null;
    },
    async getUserByAccount(account) {
      // Account har ingen klub (bruges ikke af mail-login); brugeren skal høre til denne klub
      const user = await base.getUserByAccount!(account);
      return user && (await prisma.user.findFirst({ where: { id: user.id }, select: { id: true } })) ? user : null;
    },
  };
}

// Login med engangslink på mail – ingen adgangskoder at glemme eller lække.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: clubAdapter(),
  // Alle klubber kører fra samme installation på hver sit domæne: adressen tages fra forespørgslen (sæt IKKE AUTH_URL)
  trustHost: true,
  providers: [
    Nodemailer({
      server: process.env.EMAIL_SERVER || "smtp://localhost:25",
      from: process.env.EMAIL_FROM ?? "noreply@localhost",
      // Mailen sendes med klubbens navn som afsender (src/lib/mail.ts). Uden EMAIL_SERVER (fx testversion) skrives
      // login-linket i serverloggen (Vercel → Logs), så man stadig kan logge ind. Sæt EMAIL_SERVER før rigtig brug.
      async sendVerificationRequest({ identifier, url }) {
        if (!process.env.EMAIL_SERVER) {
          console.warn(`[login] EMAIL_SERVER mangler – login-link til ${identifier}: ${url}`);
          return;
        }
        const club = await getClub();
        const ok = await sendMail(
          identifier,
          `Log ind på ${club.name}`,
          `Hej\n\nTryk på linket for at logge ind på ${club.name}:\n\n${url}\n\nLinket virker i 24 timer og kan kun bruges én gang. Har du ikke bedt om det, kan du se bort fra mailen.\n\n${club.name}`,
        );
        if (!ok) throw new Error("Login-mailen kunne ikke sendes");
      },
    }),
  ],
  session: { strategy: "database" },
  pages: { signIn: "/login", verifyRequest: "/login/tjek-mail" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      const u = user as unknown as { role: Role; athleteGroup: AthleteGroup | null };
      session.user.role = u.role;
      session.user.athleteGroup = u.athleteGroup;
      return session;
    },
  },
});

export async function requireUser(callbackUrl = "/min-side") {
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  return session.user;
}

export async function requireRole(min: Role, callbackUrl: string) {
  const user = await requireUser(callbackUrl);
  if (!hasRole(user.role, min)) redirect("/min-side");
  return user;
}

export const requireAdmin = () => requireRole("ADMIN", "/admin");
export const requireTrainer = () => requireRole("TRAINER", "/traener");

/**
 * Sider, der viser andre medlemmers navne, mails eller telefonnumre, kræver et aktivt medlemskab.
 * Alle kan oprette et login med en mail, så login alene er ikke nok. Trænere og admin har altid adgang.
 */
export async function isMember(user: { id: string; role: Role }): Promise<boolean> {
  return hasRole(user.role, "TRAINER") || (await canSignUp(user.id));
}

export async function requireMember(callbackUrl: string) {
  const user = await requireUser(callbackUrl);
  if (!(await isMember(user))) redirect("/bliv-medlem?fejl=" + encodeURIComponent("Siden er kun for medlemmer af klubben"));
  return user;
}
