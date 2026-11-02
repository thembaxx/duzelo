import { ThreadPage } from "@/features/messages/pages";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ThreadPage id={(await params).id} />;
}
