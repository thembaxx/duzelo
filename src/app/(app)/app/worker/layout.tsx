import { requireWorkspace } from "@/features/auth/guard";
export const dynamic = "force-dynamic";
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireWorkspace("worker");
  return children;
}
