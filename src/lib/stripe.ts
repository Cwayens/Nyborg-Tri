import Stripe from "stripe";
import { clubEnv } from "./club-secrets";

// Hver klub har sin egen Stripe-konto: pengene går direkte til klubben. Nøglen er klubbens (src/lib/club-secrets.ts).
const clients = new Map<string, Stripe>();

export async function stripe(): Promise<Stripe> {
  const key = await clubEnv("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY mangler for klubben");
  let c = clients.get(key);
  if (!c) clients.set(key, (c = new Stripe(key)));
  return c;
}
