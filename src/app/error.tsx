"use client";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="empty-panel" role="alert">
      <h1>Something interrupted this page.</h1>
      <p>Please try again. No action has been confirmed by this message.</p>
      <div className="inline-actions">
        <Button onClick={reset}>Try again</Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Go home
        </Link>
      </div>
    </section>
  );
}
