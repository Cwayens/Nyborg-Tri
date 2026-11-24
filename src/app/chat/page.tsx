import Link from "next/link";
import type { ChatChannel, ChatRoom } from "@prisma/client";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { CHANNELS, CHANNEL_LABEL, ROOM_LABEL, canDeleteMessage, canPost, isChannel, MAX_LENGTH, roomsFor } from "@/lib/chat";
import { formatDay, formatTime } from "@/lib/time";
import { ChatIcon, DisciplineIcon, initials } from "@/components/Icons";
import { AutoRefresh } from "./AutoRefresh";
import { deleteMessage, postMessage } from "./actions";

export const metadata = { title: "Chat" };

type Props = { searchParams: Promise<{ rum?: string; kanal?: string }> };

export default async function Chat({ searchParams }: Props) {
  const user = await requireUser("/chat");
  const sp = await searchParams;
  const rooms = roomsFor(user);

  if (rooms.length === 0) {
    return (
      <>
        <h1>Chat</h1>
        <div className="card empty">Du er ikke i en gruppe endnu. Når klubben har sat dig i Elite, Bredde eller Børn, kan du skrive med din gruppe her.</div>
      </>
    );
  }

  const room: ChatRoom = rooms.includes(sp.rum as ChatRoom) ? (sp.rum as ChatRoom) : rooms[0];
  const channel: ChatChannel = isChannel(sp.kanal) ? sp.kanal : "SOCIAL";

  const [messages, latest] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { room, channel },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.chatMessage.groupBy({ by: ["channel"], where: { room, deletedAt: null }, _max: { createdAt: true } }),
  ]);
  messages.reverse();
  const lastAt = Object.fromEntries(latest.map((l) => [l.channel, l._max.createdAt]));
  const url = (r: ChatRoom, c: string) => `/chat?rum=${r}&kanal=${c}`;

  let lastDay = "";
  return (
    <div className="chat">
      <AutoRefresh />
      <h1>Chat</h1>
      {rooms.length > 1 && (
        <nav className="filters" aria-label="Chatrum">
          {rooms.map((r) => (
            <Link key={r} href={url(r, channel)} className={r === room ? "active" : undefined} aria-current={r === room ? "page" : undefined}>{ROOM_LABEL[r]}</Link>
          ))}
        </nav>
      )}
      <nav className="chat-channels" aria-label="Kanal">
        {CHANNELS.map((c) => (
          <Link key={c} href={url(room, c)} className={`disc disc-${c === "SOCIAL" ? "OTHER" : c}${c === channel ? " active" : ""}`} aria-current={c === channel ? "page" : undefined}>
            {c === "SOCIAL" ? <span className="disc disc-OTHER disc-icon"><ChatIcon size={18} /></span> : <DisciplineIcon discipline={c} size={18} />}
            <span>{CHANNEL_LABEL[c]}</span>
            {lastAt[c] && c !== channel && <small className="muted">{formatTime(lastAt[c]!)}</small>}
          </Link>
        ))}
      </nav>

      <section className="card chat-log" aria-label={`${ROOM_LABEL[room]} · ${CHANNEL_LABEL[channel]}`}>
        {messages.length === 0 && (
          <p className="empty">{channel === "SOCIAL" ? "Ingen beskeder endnu. Sig hej, del et billede fra weekendens løb eller foreslå en klubaften." : "Ingen beskeder endnu. Skriv den første, fx om en tur, en aflysning eller et godt råd."}</p>
        )}
        {messages.map((m) => {
          const day = formatDay(m.createdAt);
          const showDay = day !== lastDay;
          lastDay = day;
          const mine = m.userId === user.id;
          return (
            <div key={m.id}>
              {showDay && <div className="chat-day">{day}</div>}
              <div className={`chat-msg${mine ? " mine" : ""}`}>
                {!mine && <span className="avatar">{initials(m.user.name)}</span>}
                <div className="chat-bubble">
                  {!mine && <b>{m.user.name ?? "Medlem"}</b>}
                  {m.deletedAt ? <em className="muted">Beskeden er slettet</em> : <p>{m.body}</p>}
                  <span className="chat-meta">
                    {formatTime(m.createdAt)}
                    {!m.deletedAt && canDeleteMessage(user, m) && (
                      <form action={deleteMessage}>
                        <input type="hidden" name="id" value={m.id} />
                        <button type="submit" className="linklike">Slet</button>
                      </form>
                    )}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div id="bund" />
      </section>

      {canPost(user, room) ? (
      <form action={postMessage} className="chat-form">
        <input type="hidden" name="room" value={room} />
        <input type="hidden" name="channel" value={channel} />
        <label className="sr-only" htmlFor="besked">Besked til {ROOM_LABEL[room]} · {CHANNEL_LABEL[channel]}</label>
        <textarea id="besked" name="body" rows={2} maxLength={MAX_LENGTH} required placeholder={`Skriv til ${CHANNEL_LABEL[channel]} · ${ROOM_LABEL[room]}`} />
        <button className="button" type="submit">Send</button>
      </form>
      ) : (
        <p className="notice chat-readonly">Kun børnene kan skrive her. Som træner eller admin kan du læse med og slette beskeder.</p>
      )}
      {room === "BOERN" && canPost(user, room) && <p className="muted" style={{ fontSize: "0.88rem" }}>Kun børnene kan skrive her. Trænerne læser med og kan slette beskeder.</p>}
    </div>
  );
}
