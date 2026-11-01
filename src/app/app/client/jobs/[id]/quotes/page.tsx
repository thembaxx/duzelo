import { z } from "zod";
import { QuotesPage } from "@/features/quotes/pages";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ history?: string }>;
}) {
  const { id } = await params,
    { history } = await searchParams;
  return (
    <QuotesPage
      jobId={id}
      history={z.coerce
        .number()
        .int()
        .min(0)
        .max(15)
        .catch(0)
        .parse(history ?? 0)}
    />
  );
}
