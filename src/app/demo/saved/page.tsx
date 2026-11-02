import { Suspense } from "react";
import { DemoDiscover } from "@/features/demo/discover.client";
export default function SavedPage() {
  return (
    <Suspense
      fallback={<p className="demo-shell demo-page-loading">Opening saved sample providers…</p>}
    >
      <DemoDiscover savedOnly />
    </Suspense>
  );
}
