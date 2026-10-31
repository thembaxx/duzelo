"use client";
import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { House, Wrench, ArrowLeftRight } from "lucide-react";
import Script from "next/script";
import { Button } from "@/components/ui/button";

const subscribe = () => () => {};
function useReady() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

async function command(action: string, body: unknown) {
  const response = await fetch(`/api/v1/auth/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message ?? "Please try again later.");
  return result as { redirect?: string; message?: string; factorId?: string; secret?: string };
}
export function SignInForm({ local, captchaSiteKey }: { local: boolean; captchaSiteKey?: string }) {
  const ready = useReady();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [captcha, setCaptcha] = useState("");
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const send = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await command("otp", { phone, ...(captcha ? { captchaToken: captcha } : {}) });
      setSent(true);
      setCooldown(60);
      setNotice(result.message ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setCaptcha("");
      window.hcaptcha?.reset();
      setBusy(false);
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!sent) {
      await send();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await command("verify", { phone, code });
      window.location.assign(result.redirect ?? "/onboarding");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form method="post" className="auth-form" onSubmit={submit}>
      <p className="auth-progress" aria-live="polite">
        {sent ? "02 · Verify your number" : "01 · Your mobile number"}
        <span>{sent ? "Step 2 of 2" : "Step 1 of 2"}</span>
      </p>
      {local && (
        <p className="test-notice">
          Local testing only. Use a configured test number; no SMS is sent.
        </p>
      )}
      <label htmlFor="phone">South African mobile number</label>
      <input
        id="phone"
        name="phone"
        type="tel"
        autoComplete="tel"
        placeholder="082 000 0001"
        required
        value={phone}
        readOnly={sent}
        onChange={(event) => setPhone(event.target.value)}
        aria-describedby="phone-help"
      />
      <p id="phone-help">We use your number to verify account access. It is not shown publicly.</p>
      {!local && captchaSiteKey && <Captcha siteKey={captchaSiteKey} onToken={setCaptcha} />}
      {sent && (
        <>
          <label htmlFor="otp">Six-digit verification code</label>
          <input
            id="otp"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {notice && <output aria-live="polite">{notice}</output>}
      <Button disabled={!ready || busy || (!local && !captcha && !sent)} type="submit">
        {busy ? "Please wait…" : sent ? "Verify and continue" : "Send verification code"}
      </Button>
      {sent && (
        <div className="inline-actions">
          <Button
            type="button"
            variant="outline"
            disabled={busy || cooldown > 0 || (!local && !captcha)}
            onClick={() => void send()}
          >
            {cooldown ? `Resend in ${cooldown}s` : "Resend code"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSent(false);
              setCode("");
              setNotice("");
            }}
          >
            Change number
          </Button>
        </div>
      )}
    </form>
  );
}
declare global {
  interface Window {
    hcaptcha?: {
      reset: () => void;
      render: (
        element: string,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
        },
      ) => string;
    };
  }
}
function Captcha({ siteKey, onToken }: { siteKey: string; onToken: (token: string) => void }) {
  const [failed, setFailed] = useState(false);
  return (
    <>
      <Script
        src="https://js.hcaptcha.com/1/api.js?render=explicit"
        onLoad={() => {
          window.hcaptcha?.render("account-captcha", {
            sitekey: siteKey,
            callback: onToken,
            "expired-callback": () => onToken(""),
            "error-callback": () => {
              onToken("");
              setFailed(true);
            },
          });
        }}
        onError={() => setFailed(true)}
      />
      <div id="account-captcha" aria-label="Security check" />
      {failed && (
        <p role="alert">The security check could not load. Reload the page before trying again.</p>
      )}
    </>
  );
}
export function ProfileForm({
  initial,
  onboarding,
}: {
  initial?: { displayName: string; emailNotifications: boolean; inAppNotifications: boolean };
  onboarding: boolean;
}) {
  const ready = useReady();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setNotice("");
    const data = {
      displayName: String(form.get("displayName") ?? ""),
      emailNotifications: form.get("emailNotifications") === "on",
      inAppNotifications: form.get("inAppNotifications") === "on",
    };
    try {
      const result = await command(
        onboarding ? "onboard" : "preferences",
        onboarding
          ? {
              ...data,
              mode: String(form.get("mode") ?? "client"),
              adultConsent: form.get("adultConsent") === "on",
              termsConsent: form.get("termsConsent") === "on",
            }
          : data,
      );
      if (result.redirect) window.location.assign(result.redirect);
      else setNotice(result.message ?? "Saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form method="post" className="auth-form" onSubmit={submit}>
      <label htmlFor="displayName">Your display name</label>
      <input
        id="displayName"
        name="displayName"
        minLength={2}
        maxLength={80}
        autoComplete="name"
        required
        defaultValue={initial?.displayName}
      />
      {onboarding && (
        <>
          <fieldset>
            <legend>How would you like to use your account?</legend>
            <label className="choice mode-choice">
              <input
                type="radio"
                name="mode"
                value="client"
                defaultChecked
                aria-label="Find help"
              />
              <House size={20} aria-hidden="true" />
              <span>
                <strong>Find help</strong>
                <small>For your home and everyday to-do list.</small>
              </span>
            </label>
            <label className="choice mode-choice">
              <input type="radio" name="mode" value="worker" aria-label="Offer a service" />
              <Wrench size={20} aria-hidden="true" />
              <span>
                <strong>Offer a service</strong>
                <small>A starting point for your skills or business.</small>
              </span>
            </label>
            <label className="choice mode-choice">
              <input type="radio" name="mode" value="both" aria-label="Both" />
              <ArrowLeftRight size={20} aria-hidden="true" />
              <span>
                <strong>Both</strong>
                <small>One account. Switch views when you need to.</small>
              </span>
            </label>
          </fieldset>
          <p>
            Offering services creates a draft profile. Identity and relevant trade review will be
            required before publication or job opportunities.
          </p>
          <label className="choice">
            <input name="adultConsent" type="checkbox" required />I am 18 or older.
          </label>
          <label className="choice">
            <input name="termsConsent" type="checkbox" required />
            <span>
              I have read the <Link href="/legal/terms">preview terms</Link> and{" "}
              <Link href="/legal/privacy">privacy notice</Link>.
            </span>
          </label>
        </>
      )}
      <fieldset>
        <legend>Notification preferences</legend>
        <p>Save your preferences for future notifications. Delivery is not active yet.</p>
        <label className="choice">
          <input
            type="checkbox"
            name="inAppNotifications"
            defaultChecked={initial?.inAppNotifications ?? true}
          />
          In-app updates
        </label>
        <label className="choice">
          <input
            type="checkbox"
            name="emailNotifications"
            defaultChecked={initial?.emailNotifications ?? false}
          />
          Email updates when an email is verified and delivery is available
        </label>
      </fieldset>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {notice && <output aria-live="polite">{notice}</output>}
      <Button disabled={!ready || busy}>
        {busy ? "Saving…" : onboarding ? "Save and continue" : "Save preferences"}
      </Button>
    </form>
  );
}
export function SignOutButton() {
  const [error, setError] = useState("");
  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          void command("sign-out", {})
            .then((result) => window.location.assign(result.redirect ?? "/"))
            .catch(() => setError("Sign-out could not complete. Please try again."));
        }}
      >
        Sign out on all devices
      </Button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
export function MfaForm({ factorId: existing }: { factorId?: string }) {
  const [factorId, setFactorId] = useState(existing ?? "");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function enroll() {
    setBusy(true);
    setError("");
    try {
      const result = await command("mfa-enroll", {});
      setFactorId(result.factorId ?? "");
      setSecret(result.secret ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function verify(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await command("mfa-verify", { factorId, code });
      window.location.assign(result.redirect ?? "/admin");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-form">
      {!factorId ? (
        <Button disabled={busy} onClick={() => void enroll()}>
          Set up authenticator
        </Button>
      ) : (
        <form method="post" onSubmit={verify}>
          {secret && (
            <>
              <p>Add this setup key to your authenticator app. Keep it private.</p>
              <code className="setup-key">{secret}</code>
            </>
          )}
          <label htmlFor="totp">Authenticator code</label>
          <input
            id="totp"
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <Button disabled={busy}>Verify administrator access</Button>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
