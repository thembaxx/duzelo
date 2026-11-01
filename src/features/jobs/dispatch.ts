import "server-only";
import type { TransactionSql } from "postgres";
export async function dispatchWave(sql: TransactionSql, jobId: string) {
  const [state] =
    await sql`select j.status,j.urgency,j.requested_worker_id,d.waves,d.next_wave_at,d.expires_at,d.expires_at>now() as live,d.next_wave_at<=now() as due from public.job_requests j join private.job_dispatch d on d.job_id=j.id where j.id=${jobId}::uuid for update of j,d`;
  if (!state || !["open", "matching"].includes(state.status)) throw new Error("CONFLICT");
  if (!state.live) {
    await sql`update public.job_requests set status='expired',version=version+1 where id=${jobId}::uuid`;
    await sql`update public.job_matches set status='expired' where job_id=${jobId}::uuid and status in ('invited','viewed')`;
    return {
      jobId,
      invited: 0,
      message: "This request has expired. No further invitations were sent.",
    };
  }
  if (state.waves >= 3 || (state.requested_worker_id && state.waves >= 1))
    throw new Error("WAVE_LIMIT");
  if (state.waves > 0 && !state.due) throw new Error("WAVE_NOT_DUE");
  const responses =
    await sql`select id from public.job_matches where job_id=${jobId}::uuid and status='responded' union all select id from public.quotes where job_id=${jobId}::uuid and status in ('submitted','accepted') limit 1`;
  if (responses.length) throw new Error("RESPONSE_RECEIVED");
  await sql`update public.job_matches set status='expired' where job_id=${jobId}::uuid and status in ('invited','viewed') and expires_at<=now()`;
  const candidates = await sql`select * from private.job_candidates(${jobId}::uuid,null,false)`;
  const wave = Number(state.waves) + 1,
    cap = state.requested_worker_id ? 1 : 5;
  let invited = 0;
  for (const candidate of candidates.slice(0, cap)) {
    const [match] =
      await sql`insert into public.job_matches(job_id,worker_id,match_score,status,dispatched_at,expires_at,wave,rationale) values (${jobId}::uuid,${candidate.worker_id}::uuid,${candidate.score},'invited',now(),least(${state.expires_at}::timestamptz,now()+case when ${state.urgency}='urgent' then interval '20 minutes' else interval '4 hours' end),${wave},${candidate.approximate ? "Reviewed category · Public town coverage · Accepting enquiries · Approximate match" : "Reviewed category · Within service radius · Accepting enquiries"}) on conflict(job_id,worker_id) do nothing returning id`;
    if (!match) continue;
    invited++;
    await sql`insert into private.notification_outbox(dedupe_key,user_id,channel,template,payload) values (${"job-invite:" + match.id},${candidate.user_id}::uuid,'in_app','job-invitation',${sql.json({ jobId, matchId: String(match.id) })}) on conflict(dedupe_key) do nothing`;
  }
  // In-app delivery is a database transaction. No SMS/email/push is contacted.
  // Recheck eligibility immediately before creating each recipient notification.
  const queued =
    await sql`select o.id,o.user_id,o.payload from private.notification_outbox o where o.template='job-invitation' and o.status='pending' and o.payload->>'jobId'=${jobId} for update`;
  for (const item of queued) {
    const [eligible] =
      await sql`select c.worker_id from public.job_matches m join lateral private.job_candidates(${jobId}::uuid,m.worker_id,true) c on c.worker_id=m.worker_id join public.user_profiles u on u.user_id=c.user_id and u.in_app_notifications where m.job_id=${jobId}::uuid and m.id=${item.payload.matchId}::uuid and m.status='invited' and m.expires_at>now() and c.user_id=${item.user_id}::uuid`;
    if (eligible) {
      await sql`insert into public.notifications(user_id,kind,title,body,href,source_outbox_id) values (${item.user_id}::uuid,'job-invitation','A service request may be available','Open opportunities to check current eligibility and expiry.','/app/worker/opportunities',${item.id}::uuid) on conflict(source_outbox_id) do nothing`;
      await sql`update private.notification_outbox set status='sent',attempts=attempts+1 where id=${item.id}::uuid`;
    } else {
      await sql`update private.notification_outbox set status='dead_letter',attempts=attempts+1 where id=${item.id}::uuid`;
    }
  }
  await sql`update private.job_dispatch set waves=${wave},next_wave_at=case when ${wave}<3 and ${state.requested_worker_id ?? null}::uuid is null then now()+case when ${state.urgency}='urgent' then interval '20 minutes' else interval '4 hours' end else null end where job_id=${jobId}::uuid`;
  await sql`update public.job_requests set status='matching',version=version+1,updated_at=now() where id=${jobId}::uuid`;
  return {
    jobId,
    invited,
    wave,
    message: invited
      ? "Eligible workers were invited. A response is not guaranteed."
      : "No eligible workers were found for this wave. No wider or unverified broadcast was made.",
  };
}
