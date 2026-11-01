// Refuse fixture writes and cleanup against any non-loopback database.
if (
  process.env.AUTH_MODE !== "local" ||
  !process.env.DATABASE_URL ||
  !["127.0.0.1", "localhost"].includes(new URL(process.env.DATABASE_URL).hostname)
)
  throw new Error("Discovery fixtures require isolated loopback Auth and database settings.");
import type postgres from "postgres";
import { area, cleaning } from "./worker-fixtures";
export async function discoveryFixtures(sql: ReturnType<typeof postgres>, tag: string) {
  const ids: string[] = [];
  for (let index = 0; index < 24; index++) {
    const user = crypto.randomUUID(),
      worker = crypto.randomUUID(),
      asset = crypto.randomUUID(),
      verification = crypto.randomUUID(),
      name = `Fictional discovery ${String(index).padStart(2, "0")} ${tag}`;
    ids.push(worker);
    await sql.begin(async (tx) => {
      await tx`insert into auth.users(id) values (${user}::uuid)`;
      await tx`insert into public.user_profiles(user_id,display_name,worker_enabled) values (${user}::uuid,${name},true)`;
      const status =
        index < 21
          ? "approved"
          : index === 21
            ? "pending_review"
            : index === 22
              ? "rejected"
              : "suspended";
      await tx`insert into public.worker_profiles(id,user_id,slug,display_name,bio,status,is_available) values (${worker}::uuid,${user}::uuid,${"provider-" + worker},${name},'A synthetic scope for isolated discovery acceptance.',${status}::public.worker_status,${index % 2 === 0})`;
      await tx`insert into public.worker_services(worker_id,category_id,title,description,price_model) values (${worker}::uuid,${cleaning}::uuid,'Fictional cleaning','A synthetic service scope.','quote')`;
      const draft = {
        kind: "individual",
        displayName: name,
        bio: "A synthetic scope for isolated discovery acceptance.",
        areaId: area,
        latitude: -27.123456,
        longitude: 30.654321,
        radiusKm: 30,
        townIds: [area],
        travelFee: "0",
        businessName: "",
        registrationNumber: "",
        services: [
          {
            categoryId: cleaning,
            title: "Fictional cleaning",
            description: "A synthetic service scope.",
            pricing: "quote",
            price: "",
          },
        ],
      };
      await tx`insert into private.worker_applications(worker_id,revision,state,area_id,draft_json) values (${worker}::uuid,1,'reviewed',${area}::uuid,${tx.json(draft)})`;
      await tx`insert into private.worker_coverage(worker_id,base_point,radius_km) values (${worker}::uuid,extensions.st_setsrid(extensions.st_makepoint(30.654321,-27.123456),4326)::extensions.geography,30)`;
      const path = "fixture/discovery-" + asset + ".jpg";
      await tx`insert into private.worker_assets(id,worker_id,application_revision,kind,storage_path,sha256,byte_size,state,scan_status,scanned_at,retain_until) values (${asset}::uuid,${worker}::uuid,1,'identity',${path},${"a".repeat(64)},100,'stored','clean',now(),now()+interval '1 day')`;
      await tx`insert into private.worker_verifications(id,worker_id,application_revision,kind) values (${verification}::uuid,${worker}::uuid,1,'identity')`;
      await tx`insert into private.verification_documents(verification_id,asset_id,storage_path) values (${verification}::uuid,${asset}::uuid,${path})`;
      await tx`update private.worker_verifications set status='approved',reviewed_by='10000000-0000-0000-0000-000000000004',reviewed_at=now() where id=${verification}::uuid`;
      if (index < 21)
        await tx`select private.publish_worker_card(${worker}::uuid,${area}::uuid,${name},'A synthetic scope for isolated discovery acceptance.')`;
    });
  }
  return ids;
}
