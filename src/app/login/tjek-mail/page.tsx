export const metadata = { title: "Tjek din mail" };

export default function CheckEmail() {
  return (
    <>
      <h1>Tjek din mail</h1>
      <p>Vi har sendt dig et link. Klik på det for at logge ind. Linket virker i 24 timer.</p>
      <p className="muted">Kan du ikke finde mailen, så kig i spam-mappen.</p>
    </>
  );
}
