import { requireWorkspace } from "@/features/auth/guard";
export const dynamic = "force-dynamic";
export default async function WorkerLayout() {
  return requireWorkspace("worker");
}
