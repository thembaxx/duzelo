import { requireWorkspace } from "@/features/auth/guard";
export const dynamic = "force-dynamic";
export default async function AdminLayout() {
  return requireWorkspace("admin");
}
