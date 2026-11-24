import NextAuth, { type DefaultSession } from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { redirect } from "next/navigation";
import type { AthleteGroup, Role } from "@prisma/client";
import { hasRole } from "@/lib/roles";
import { prisma } from "@/lib/db";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role; athleteGroup: AthleteGroup | null } & DefaultSession["user"];
  }
}

// Login med engangslink på mail – ingen adgangskoder at glemme eller lække.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Nodemailer(
      process.env.EMAIL_SERVER
        ? { server: process.env.EMAIL_SERVER, from: process.env.EMAIL_FROM }
        : {
            // Ingen mailserver sat op endnu (fx testversion): login-linket skrives i serverloggen
            // (Vercel → Logs), så man stadig kan logge ind. Sæt EMAIL_SERVER før rigtig brug.
            server: "smtp://localhost:25",
            from: process.env.EMAIL_FROM ?? "noreply@nyborgtri.dk",
            async sendVerificationRequest({ identifier, url }) {
              console.warn(`[login] EMAIL_SERVER mangler – login-link til ${identifier}: ${url}`);
            },
          },
    ),
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
