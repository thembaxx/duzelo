import { WorkspacePage } from "@/features/auth/workspace";
export const dynamic = "force-dynamic";
export default function Page() {
  return <WorkspacePage mode="worker" />;
}
