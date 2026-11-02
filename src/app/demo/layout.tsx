import type { Metadata } from "next";
import { DemoStoreProvider } from "@/features/demo/store.client";
import { DemoFrame } from "@/features/demo/frame.client";
import "@/features/demo/demo.css";
export const metadata: Metadata = {
  title: "Interactive marketplace demo",
  description:
    "Explore fictional Mkhondo providers, a real neighbourhood map and a six-month sample booking workspace. No real bookings or charges.",
  robots: { index: false, follow: false },
};
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoStoreProvider>
      <DemoFrame>{children}</DemoFrame>
    </DemoStoreProvider>
  );
}
