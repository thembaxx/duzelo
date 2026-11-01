import { QuotesPage } from "@/features/quotes/pages";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const { job } = await searchParams;
  return <QuotesPage worker jobId={job} />;
}
