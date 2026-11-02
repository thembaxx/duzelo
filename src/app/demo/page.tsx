import { Suspense } from "react";
import { DemoDiscover } from "@/features/demo/discover.client";
export default function DemoPage() {
  return (
    <Suspense
      fallback={<p className="demo-shell demo-page-loading">Opening your sample neighbourhood…</p>}
    >
      <DemoDiscover />
    </Suspense>
  );
}
