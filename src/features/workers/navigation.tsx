import Link from "next/link";
export function WorkerNavigation({ step }: { step: "profile" | "evidence" | "status" }) {
  return (
    <nav aria-label="Worker application" className="worker-steps">
      <Link
        href="/app/worker/onboarding?edit=1"
        aria-current={step === "profile" ? "page" : undefined}
      >
        1 · Profile & coverage
      </Link>
      <Link href="/app/worker/onboarding" aria-current={step === "evidence" ? "page" : undefined}>
        2 · Evidence & submit
      </Link>
      <Link href="/app/worker/verification" aria-current={step === "status" ? "page" : undefined}>
        3 · Review status
      </Link>
    </nav>
  );
}
