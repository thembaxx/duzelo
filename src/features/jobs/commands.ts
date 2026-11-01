import "server-only";
import { z } from "zod";
import { jobCommand, ownerJob } from "./boundary";
import {
  createSchema,
  saveSchema,
  submitSchema,
  idSchema,
  readyToSubmit,
  preferenceSchema,
  timeBlockSchema,
  blockSchema,
  workerBlockSchema,
  matchSchema,
} from "./schema";
import { saveJobLocation } from "./locations";
import { storedDraft } from "./stored-draft";
import { dispatchWave } from "./dispatch";
export async function jobsCommand(action: string, input: unknown, key: string | null) {
  if (action === "create") {
    const data = createSchema.parse(input);
    return jobCommand(action, data, key, false, async (sql, actor) => {
      const [count] =
        await sql`select count(*)::int as count from public.job_requests where client_id=${actor.id}::uuid and created_at>now()-interval '1 day'`;
      if (count!.count >= 20) throw new Error("JOB_LIMIT");
      if (
        data.categoryId &&
        !(
          await sql`select id from public.service_categories where id=${data.categoryId}::uuid and active`
        ).length
      )
        throw new Error("INVALID");
      const [worker] = data.workerSlug
        ? await sql`select c.worker_id,w.user_id from public.worker_cards c join public.worker_profiles w on w.id=c.worker_id where c.slug=${data.workerSlug} and c.safe_until>now() and cardinality(private.eligible_worker_categories(w.id))>0`
        : [];
      if (data.workerSlug && (!worker || worker.user_id === actor.id)) throw new Error("FORBIDDEN");
      const [job] =
        await sql`insert into public.job_requests(client_id,category_id,requested_worker_id,title,description,public_town,urgency,visibility) values (${actor.id}::uuid,${data.categoryId}::uuid,${worker?.worker_id ?? null}::uuid,'','','','flexible',${worker ? "direct" : "matched"}) returning id,version`;
      await sql`insert into private.job_dispatch(job_id) values (${job!.id}::uuid)`;
      return { jobId: String(job!.id), version: Number(job!.version) };
    });
  }
  if (action === "save") {
    const data = saveSchema.parse(input);
    return jobCommand(action, data, key, false, async (sql, actor) => {
      const job = await ownerJob(sql, data.jobId, actor);
      if (job.status !== "draft" || job.version !== data.expectedVersion)
        throw new Error("CONFLICT");
      if (
        data.data.budgetMin !== null &&
        data.data.budgetMax !== null &&
        data.data.budgetMin > data.data.budgetMax
      )
        throw new Error("INVALID");
      if (data.data.slots.some((s) => Date.parse(s.end) <= Date.parse(s.start)))
        throw new Error("TIMING");
      if (
        data.data.categoryId &&
        !(
          await sql`select id from public.service_categories where id=${data.data.categoryId}::uuid and active`
        ).length
      )
        throw new Error("INVALID");
      const town = await saveJobLocation(sql, data.jobId, actor.id, data.data.location),
        d = data.data;
      await sql`update public.job_requests set category_id=${d.categoryId}::uuid,title=${d.title},description=${d.description},public_town=${town},urgency=${d.urgency},time_slots=${sql.json(d.slots)},preferred_start=${d.slots[0]?.start ?? null}::timestamptz,preferred_end=${d.slots[0]?.end ?? null}::timestamptz,contact_window=${d.contactWindow},budget_min_cents=${d.budgetMin},budget_max_cents=${d.budgetMax},draft_step=${data.step},version=version+1,updated_at=now() where id=${data.jobId}::uuid`;
      return {
        jobId: data.jobId,
        version: data.expectedVersion + 1,
        message: "Draft saved privately.",
      };
    });
  }
  if (action === "submit") {
    const data = submitSchema.parse(input);
    return jobCommand(action, data, key, false, async (sql, actor) => {
      const job = await ownerJob(sql, data.jobId, actor);
      if (["open", "matching"].includes(job.status))
        return { jobId: data.jobId, message: "This request was already submitted." };
      if (job.status !== "draft" || job.version !== data.expectedVersion)
        throw new Error("CONFLICT");
      const draft = readyToSubmit(await storedDraft(sql, job));
      if (
        !(
          await sql`select id from public.service_categories where id=${draft.categoryId}::uuid and active`
        ).length
      )
        throw new Error("INCOMPLETE");
      const [area] =
        await sql`select a.id from private.job_dispatch d join public.service_areas a on a.id=d.area_id and a.active where d.job_id=${data.jobId}::uuid`;
      if (!area) throw new Error("UNKNOWN_TOWN");
      const [count] =
        await sql`select count(*)::int as count from private.job_dispatch d join public.job_requests j on j.id=d.job_id where j.client_id=${actor.id}::uuid and d.submitted_at>now()-interval '1 day'`;
      if (count!.count >= 5) throw new Error("SUBMIT_LIMIT");
      if (
        (
          await sql`select id from private.job_assets where job_id=${data.jobId}::uuid and (state='pending' or (state='stored' and retain_until<=now()))`
        ).length
      )
        throw new Error("INCOMPLETE");
      await sql`update private.job_dispatch set submitted_at=now(),expires_at=now()+case when ${draft.urgency}='urgent' then interval '2 hours' else interval '24 hours' end where job_id=${data.jobId}::uuid`;
      await sql`update public.job_requests set status='open',time_slots=${sql.json(draft.slots)},preferred_start=${draft.slots[0]?.start ?? null}::timestamptz,preferred_end=${draft.slots[0]?.end ?? null}::timestamptz,quote_deadline=now()+case when ${draft.urgency}='urgent' then interval '2 hours' else interval '24 hours' end where id=${data.jobId}::uuid`;
      return dispatchWave(sql, data.jobId);
    });
  }
  if (action === "dispatch" || action === "cancel") {
    const data = idSchema.parse(input);
    return jobCommand(action, data, key, false, async (sql, actor) => {
      const job = await ownerJob(sql, data.jobId, actor);
      if (action === "dispatch") return dispatchWave(sql, data.jobId);
      if (
        !["draft", "open", "matching"].includes(job.status) ||
        (
          await sql`select id from public.quotes where job_id=${data.jobId}::uuid and status in ('submitted','accepted')`
        ).length
      )
        throw new Error("CONFLICT");
      await sql`update public.job_requests set status='cancelled',version=version+1,updated_at=now() where id=${data.jobId}::uuid`;
      await sql`update public.job_matches set status='expired' where job_id=${data.jobId}::uuid and status in ('invited','viewed')`;
      await sql`update private.notification_outbox set status='dead_letter' where payload->>'jobId'=${data.jobId} and status='pending' and template='job-invitation'`;
      return {
        jobId: data.jobId,
        message: "Request cancelled. No further invitations will be sent.",
      };
    });
  }
  if (["view", "decline", "worker-block"].includes(action)) {
    const data =
      action === "worker-block" ? workerBlockSchema.parse(input) : matchSchema.parse(input);
    return jobCommand(action, data, key, true, async (sql, actor) => {
      const [match] =
        await sql`select m.id,m.job_id,m.worker_id,m.status,m.expires_at>now() as live,j.client_id from public.job_matches m join public.worker_profiles w on w.id=m.worker_id join public.job_requests j on j.id=m.job_id where m.id=${data.matchId}::uuid and w.user_id=${actor.id}::uuid for update of m`;
      if (!match) throw new Error("FORBIDDEN");
      if (action === "worker-block") {
        const blocked = workerBlockSchema.parse(data).blocked;
        if (blocked)
          await sql`insert into private.user_blocks(owner_id,subject_id) values (${actor.id}::uuid,${match.client_id}::uuid) on conflict do nothing`;
        else
          await sql`delete from private.user_blocks where owner_id=${actor.id}::uuid and subject_id=${match.client_id}::uuid`;
        if (blocked)
          await sql`update public.job_matches set status='declined' where id=${match.id}::uuid and status in ('invited','viewed')`;
        return {
          jobId: String(match.job_id),
          message: blocked
            ? "Requests from this client are blocked."
            : "Client unblocked. Existing invitations are not restored.",
        };
      }
      if (
        !match.live ||
        !["invited", "viewed"].includes(match.status) ||
        !(
          await sql`select worker_id from private.job_candidates(${match.job_id}::uuid,${match.worker_id}::uuid,true)`
        ).length
      )
        throw new Error("FORBIDDEN");
      await sql`update public.job_matches set status=${action === "view" ? "viewed" : "declined"} where id=${match.id}::uuid`;
      return {
        jobId: String(match.job_id),
        message:
          action === "view"
            ? "Opportunity marked viewed. No booking was accepted."
            : "Invitation declined.",
      };
    });
  }
  if (action === "client-block") {
    const data = blockSchema.parse(input);
    return jobCommand(action, data, key, false, async (sql, actor) => {
      await ownerJob(sql, data.jobId, actor);
      const [match] =
        await sql`select w.user_id from public.job_matches m join public.worker_profiles w on w.id=m.worker_id where m.job_id=${data.jobId}::uuid and m.worker_id=${data.workerId}::uuid`;
      if (!match) throw new Error("FORBIDDEN");
      if (data.blocked) {
        await sql`insert into private.user_blocks(owner_id,subject_id) values (${actor.id}::uuid,${match.user_id}::uuid) on conflict do nothing`;
        await sql`update public.job_matches m set status='expired' from public.job_requests j where m.job_id=j.id and j.client_id=${actor.id}::uuid and m.worker_id=${data.workerId}::uuid and m.status in ('invited','viewed')`;
      } else
        await sql`delete from private.user_blocks where owner_id=${actor.id}::uuid and subject_id=${match.user_id}::uuid`;
      return {
        jobId: data.jobId,
        message: data.blocked
          ? "Worker blocked for your requests."
          : "Worker unblocked. Expired invitations are not restored.",
      };
    });
  }
  if (action === "preferences" || action === "time-block" || action === "remove-time-block") {
    const data =
      action === "preferences"
        ? preferenceSchema.parse(input)
        : action === "time-block"
          ? timeBlockSchema.parse(input)
          : z.object({ id: z.guid() }).strict().parse(input);
    return jobCommand(action, data, key, true, async (sql, actor) => {
      const [worker] =
        await sql`select id from public.worker_profiles where user_id=${actor.id}::uuid for update`;
      if (!worker) throw new Error("FORBIDDEN");
      if (action === "preferences") {
        const d = preferenceSchema.parse(data);
        await sql`insert into private.worker_match_settings(worker_id,urgent_ready,daily_limit) values (${worker.id}::uuid,${d.urgentReady},${d.dailyLimit}) on conflict(worker_id) do update set urgent_ready=excluded.urgent_ready,daily_limit=excluded.daily_limit`;
      } else if (action === "time-block") {
        const d = timeBlockSchema.parse(data),
          start = Date.parse(d.start),
          end = Date.parse(d.end);
        if (
          start < Date.now() - 60000 ||
          end <= start ||
          end - start > 31 * 86400000 ||
          start > Date.now() + 90 * 86400000
        )
          throw new Error("TIMING");
        const [count] =
          await sql`select count(*)::int as count from private.worker_schedule_blocks where worker_id=${worker.id}::uuid and ends_at>now()`;
        if (count!.count >= 20) throw new Error("LIMITED");
        await sql`insert into private.worker_schedule_blocks(worker_id,starts_at,ends_at) values (${worker.id}::uuid,${d.start}::timestamptz,${d.end}::timestamptz)`;
      } else {
        const d = z.object({ id: z.guid() }).parse(data);
        await sql`delete from private.worker_schedule_blocks where id=${d.id}::uuid and worker_id=${worker.id}::uuid`;
      }
      return { message: "Opportunity preferences saved." };
    });
  }
  throw new Error("INVALID");
}
