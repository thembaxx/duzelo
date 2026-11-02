import "server-only";
import { readCursor, writeCursor } from "@/features/collaboration/cursor";
import { database } from "@/lib/db/server";
import { lockActor } from "@/features/jobs/boundary";
import { collaborationActor } from "@/features/collaboration/boundary";
import { threadContext } from "./policy";
import type { MessagePage, ThreadView } from "./types";
export async function inbox(cursor?: string) {
  const position = readCursor(cursor);
  const actor = await collaborationActor();
  return database().begin(async (sql) => {
    await lockActor(sql, actor, "either");
    const rows =
      await sql`with threads as (select c.id,j.public_town,case when j.client_id=${actor.id}::uuid then j.title else 'Service conversation' end as title,coalesce((select max(sent_at) from public.messages m where m.conversation_id=c.id),c.created_at) as updated from public.conversations c join public.conversation_members m on m.conversation_id=c.id and m.user_id=${actor.id}::uuid join public.job_requests j on j.id=c.job_id join public.worker_profiles w on w.id=c.worker_id join public.user_profiles u on u.user_id=${actor.id}::uuid where ((j.client_id=u.user_id and u.client_enabled)or(w.user_id=u.user_id and u.worker_enabled)) ) select *,updated::text as cursor_at from threads where (${position?.at ?? null}::timestamptz is null or updated<${position?.at ?? null}::timestamptz or (updated=${position?.at ?? null}::timestamptz and id>${position?.id ?? null}::uuid)) order by updated desc,id limit 51`;
    const threads = rows.slice(0, 50).map((r) => ({
      id: String(r.id),
      title: String(r.title),
      town: String(r.public_town),
      at: new Date(r.updated).toISOString(),
    }));
    return {
      threads,
      nextCursor:
        rows.length > 50 ? writeCursor(String(rows[49]!.cursor_at), String(rows[49]!.id)) : null,
    };
  });
}
export async function threadView(
  id: string,
  before = 0,
  after = 0,
  floor = 1,
  removedAfter = 0,
): Promise<ThreadView> {
  const actor = await collaborationActor();
  return database().begin(async (sql) => {
    await lockActor(sql, actor, "either");
    const c = await threadContext(sql, id, actor);
    const rows = c.canRead
      ? await sql`select m.id,m.sequence,m.body,m.sender_id,m.deleted_at,m.sent_at from public.messages m where m.conversation_id=${id}::uuid and (${before}::bigint=0 or m.sequence<${before}::bigint) and (${after}::bigint=0 or m.sequence>${after}::bigint) order by case when ${after}::bigint>0 then m.sequence end asc,m.sequence desc limit 31`
      : [];
    const hasMore = rows.length > 30;
    const chosen = rows.slice(0, 30).sort((a, b) => Number(a.sequence) - Number(b.sequence));
    const page: MessagePage = {
      hasMore,
      next: chosen.length ? Number((after ? chosen.at(-1) : chosen[0])!.sequence) : after,
      messages: [],
    };
    for (const m of chosen) {
      const assets = m.deleted_at
        ? []
        : await sql`select a.id,(a.state='stored' and a.retain_until>clock_timestamp()) as available from private.message_assets x join private.collaboration_assets a on a.id=x.asset_id where x.message_id=${m.id}::uuid order by a.id`;
      page.messages.push({
        id: String(m.id),
        sequence: Number(m.sequence),
        body: m.deleted_at ? "Message removed by moderation." : String(m.body),
        sender:
          m.sender_id === actor.id ? "you" : m.sender_id === c.client_id ? "client" : "worker",
        at: new Date(m.sent_at).toISOString(),
        deleted: !!m.deleted_at,
        assets: assets.map((a) => ({ id: String(a.id), available: !!a.available })),
      });
    }
    const removed = c.canRead
      ? await sql`select id,sequence from public.messages where conversation_id=${id}::uuid and deleted_at is not null and sequence>=${floor}::bigint and sequence>${removedAfter}::bigint order by sequence limit 101`
      : [];
    return {
      tombstones: removed.slice(0, 100).map((r) => String(r.id)),
      removedCursor: removed.length > 100 ? Number(removed[99]!.sequence) : 0,
      id,
      jobId: String(c.job_id),
      title: c.title,
      town: String(c.public_town),
      client: c.client,
      canRead: c.canRead,
      canSend: c.canSend,
      blocked: !!c.blocked,
      ownBlocked: !!c.own_blocked,
      reported: !!c.reported,
      closed: c.closed,
      bookingId: c.bookingId,
      page,
    };
  }) as Promise<ThreadView>;
}
