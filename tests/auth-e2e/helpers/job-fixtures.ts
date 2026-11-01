import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { discoveryFixtures } from "./discovery-fixtures";
import { area, cleaning } from "./worker-fixtures";
if (
  process.env.AUTH_MODE !== "local" ||
  !process.env.DATABASE_URL ||
  !["127.0.0.1", "localhost"].includes(new URL(process.env.DATABASE_URL).hostname) ||
  !process.env.SUPABASE_URL ||
  !["127.0.0.1", "localhost"].includes(new URL(process.env.SUPABASE_URL).hostname)
)
  throw new Error("Job fixtures require unlinked loopback Auth, database and Storage.");
export async function prepareJobWorkers(
  sql: ReturnType<typeof postgres>,
  nativeUser: string,
  tag: string,
) {
  const ids = await discoveryFixtures(sql, "M05 " + tag);
  for (const id of ids.slice(0, 21)) {
    await sql`update public.user_profiles set onboarding_completed_at=now() where user_id=(select user_id from public.worker_profiles where id=${id}::uuid)`;
    await sql`update public.worker_profiles set is_available=true where id=${id}::uuid`;
    await sql`update private.worker_coverage set radius_km=1 where worker_id=${id}::uuid`;
    const [worker] =
      await sql`select display_name from public.worker_profiles where id=${id}::uuid`;
    await sql`select private.publish_worker_card(${id}::uuid,${area}::uuid,${worker!.display_name},'Synthetic M05 matching fixture.')`;
  }
  const [worker] =
    await sql`select id from public.worker_profiles where user_id=${nativeUser}::uuid`;
  if (!worker) throw new Error("Native worker setup must follow actual account onboarding.");
  const workerId = String(worker.id),
    name = "Fictional M05 provider " + tag;
  await sql.begin(async (tx) => {
    await tx`update public.user_profiles set worker_enabled=true,client_enabled=true,is_suspended=false,in_app_notifications=true where user_id=${nativeUser}::uuid`;
    await tx`update public.worker_profiles set status='approved',is_available=true,business_id=null,display_name=${name},bio='A fictional service scope for isolated matching acceptance.',slug=${"provider-" + workerId} where id=${workerId}::uuid`;
    await tx`update public.worker_services set active=false where worker_id=${workerId}::uuid`;
    await tx`insert into public.worker_services(worker_id,category_id,title,description,price_model,active) values (${workerId}::uuid,${cleaning}::uuid,'Fictional M05 cleaning','A synthetic cleaning service.','quote',true) on conflict(worker_id,category_id,title) do update set active=true`;
    const [app] =
      await tx`insert into private.worker_applications(worker_id,revision,state,area_id,draft_json) values (${workerId}::uuid,1,'reviewed',${area}::uuid,'{}') on conflict(worker_id) do update set revision=worker_applications.revision+1,state='reviewed',area_id=excluded.area_id returning revision`;
    const asset = crypto.randomUUID(),
      verification = crypto.randomUUID(),
      path = "fixture/jobs-" + asset + ".jpg";
    await tx`insert into private.worker_assets(id,worker_id,application_revision,kind,storage_path,sha256,byte_size,state,scan_status,scanned_at,retain_until) values (${asset}::uuid,${workerId}::uuid,${app!.revision},'identity',${path},${"c".repeat(64)},100,'stored','clean',now(),now()+interval '1 day')`;
    await tx`insert into private.worker_verifications(id,worker_id,application_revision,kind) values (${verification}::uuid,${workerId}::uuid,${app!.revision},'identity')`;
    await tx`insert into private.verification_documents(verification_id,asset_id,storage_path) values (${verification}::uuid,${asset}::uuid,${path})`;
    await tx`update private.worker_verifications set status='approved',reviewed_by='10000000-0000-0000-0000-000000000004',reviewed_at=now() where id=${verification}::uuid`;
    await tx`insert into private.worker_coverage(worker_id,base_point,radius_km) values (${workerId}::uuid,extensions.st_setsrid(extensions.st_makepoint(30.654321,-27.123456),4326)::extensions.geography,30) on conflict(worker_id) do update set base_point=excluded.base_point,radius_km=30,town_allowlist='{}'`;
    await tx`insert into private.worker_match_settings(worker_id,urgent_ready,daily_limit) values (${workerId}::uuid,false,12) on conflict(worker_id) do update set urgent_ready=false,daily_limit=12`;
    await tx`delete from private.worker_schedule_blocks where worker_id=${workerId}::uuid`;
    await tx`delete from private.user_blocks where owner_id=${nativeUser}::uuid or subject_id=${nativeUser}::uuid`;
    await tx`select private.publish_worker_card(${workerId}::uuid,${area}::uuid,${name},'A fictional service scope for isolated matching acceptance.')`;
  });
  return { workerId, ids: [...ids, workerId], name };
}
export async function cleanupJobFixtures(sql: ReturnType<typeof postgres>) {
  const rows =
    await sql`select a.storage_path from private.job_assets a join public.job_requests j on j.id=a.job_id join private.job_dispatch d on d.job_id=j.id join auth.users u on u.id=j.client_id where u.phone='27820000006'`;
  if (rows.length) {
    const storage = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    }).storage;
    const result = await storage
      .from("job-requests")
      .remove(rows.map((r) => String(r.storage_path)));
    if (result.error)
      throw new Error("Native job fixture Storage cleanup failed; values redacted.");
  }
  await sql`delete from public.job_requests j using private.job_dispatch d,auth.users u where d.job_id=j.id and u.id=j.client_id and u.phone='27820000006'`;
  await sql`delete from public.worker_cards where public_name like '% M05 %'`;
  await sql`delete from public.service_areas where label like 'Fictional M05 remote %'`;
}
export const privateJobPoint = { latitude: -27.120987, longitude: 30.650987 };
