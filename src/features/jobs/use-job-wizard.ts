"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useJobMutation, useJobsReady, loadOwnerJob, JobRequestError } from "./client-api";
import { draftSchema, readyToSubmit, type DraftData } from "./schema";
import type { OwnerJob } from "./types";
export function useJobWizard(initial: OwnerJob) {
  const router = useRouter(),
    mutation = useJobMutation(),
    ready = useJobsReady();
  const [job, setJob] = useState(initial),
    [data, setData] = useState(initial.data),
    [step, setStep] = useState(initial.step),
    [dirty, setDirty] = useState(false),
    [photoBusy, setPhotoBusy] = useState(false),
    [saving, setSaving] = useState(false),
    [direction, setDirection] = useState("forward"),
    [message, setMessage] = useState(""),
    [consent, setConsent] = useState(false),
    [submission, setSubmission] = useState<{
      jobId: string;
      expectedVersion: number;
      consent: true;
    } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [step]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    if (dirty) window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function update(patch: Partial<DraftData>) {
    setData((d) => ({ ...d, ...patch }));
    setDirty(true);
    setMessage("");
  }
  async function save(target = step) {
    setSaving(true);
    try {
      const clean = draftSchema.parse(data);
      const result = await mutation.run<{ version: number }>("save", {
        jobId: job.id,
        expectedVersion: job.version,
        step: target,
        data: clean,
      });
      const saved = await loadOwnerJob(job.id);
      setJob({ ...saved, version: result.version });
      setData(saved.data);
      setDirty(false);
      setMessage("Draft saved. You can safely return to it from My requests.");
      return saved;
    } finally {
      setSaving(false);
    }
  }
  async function move(next: number) {
    mutation.setError("");
    if (
      next > step &&
      ((step === 0 && !data.categoryId) ||
        (step === 1 && (data.title.trim().length < 5 || data.description.trim().length < 15)))
    ) {
      mutation.setError(
        step === 0
          ? "Choose a service category."
          : "Add a title of at least five characters and work details of at least fifteen characters.",
      );
      return;
    }
    try {
      await save(next);
      setDirection(next > step ? "forward" : "back");
      setStep(next);
      heading.current?.scrollIntoView({ block: "start" });
    } catch (e) {
      if (!(e instanceof JobRequestError))
        mutation.setError(
          e instanceof Error && e.message !== "INVALID"
            ? "Check the draft fields and reload the saved request if needed."
            : "Check the draft fields.",
        );
    }
  }
  async function submit() {
    let attempt = submission;
    try {
      if (!attempt) {
        readyToSubmit(draftSchema.parse(data));
        const saved = await save(5);
        attempt = { jobId: job.id, expectedVersion: saved.version, consent: true };
        setSubmission(attempt);
      }
      const result = await mutation.run("submit", attempt);
      setDirty(false);
      setMessage(String(result.message ?? "Request submitted."));
      router.refresh();
    } catch (e) {
      if (e instanceof JobRequestError) {
        if (e.status !== 0) setSubmission(null);
      } else {
        mutation.setError(
          e instanceof Error && e.message === "TIMING"
            ? "Review the requested time windows before submitting."
            : "Complete the service, details and private-location consent before submitting.",
        );
        setSubmission(null);
      }
    }
  }
  const busy = mutation.busy || photoBusy || saving;
  const locked = busy || submission !== null;
  return {
    job,
    data,
    step,
    dirty,
    direction,
    message,
    consent,
    setConsent,
    submission,
    mutation,
    ready,
    heading,
    save,
    move,
    submit,
    update,
    setJob,
    setPhotoBusy,
    locked,
    busy,
  };
}
