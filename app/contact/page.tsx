"use client";

import { useRef, useState, type FormEvent } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import SiteNav from "../components/SiteNav";
import SiteFooter from "../components/SiteFooter";
import {
  EXCLUDED_STATES,
  STATUS_OPTIONS,
  US_STATES,
  isExcludedState,
} from "../api/contact/schema";
import "./contact.scss";

const SLOTS = [
  { day: "Tue", time: "10:00a" },
  { day: "Tue", time: "2:30p" },
  { day: "Wed", time: "9:00a" },
  { day: "Wed", time: "4:00p" },
  { day: "Thu", time: "11:00a" },
  { day: "Thu", time: "3:00p" },
  { day: "Fri", time: "10:00a" },
  { day: "Fri", time: "1:30p" },
];

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  state: string;
  message: string;
  website: string;
};

const INITIAL_FORM: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  state: "",
  message: "",
  website: "",
};

type SendState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "success" }
  | { kind: "error"; message: string; fieldErrors?: Record<string, string> };

export default function ContactPage() {
  const [selectedSlot, setSelectedSlot] = useState<string>("Tue 2:30p");
  const [status, setStatus] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [send, setSend] = useState<SendState>({ kind: "idle" });
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const stateExcluded = form.state !== "" && isExcludedState(form.state);
  const fieldErrors = send.kind === "error" ? send.fieldErrors ?? {} : {};

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (send.kind === "error") setSend({ kind: "idle" });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (send.kind === "sending") return;

    if (stateExcluded) {
      setSend({
        kind: "error",
        message: `Under state law we cannot take on clients in ${EXCLUDED_STATES.join(
          " · ",
        )}. Please call us or visit the VA Office of General Counsel.`,
        fieldErrors: { state: "Not served in this state" },
      });
      return;
    }

    if (siteKey && !turnstileToken) {
      setSend({
        kind: "error",
        message: "Please complete the verification below before sending.",
        fieldErrors: { turnstileToken: "Verification required" },
      });
      return;
    }

    setSend({ kind: "sending" });

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          status: status ?? undefined,
          turnstileToken,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        fieldErrors?: Record<string, string>;
      };
      if (res.ok && data.ok) {
        setSend({ kind: "success" });
      } else {
        setSend({
          kind: "error",
          message: data.error ?? "Couldn't send right now — please try again",
          fieldErrors: data.fieldErrors,
        });
        turnstileRef.current?.reset();
        setTurnstileToken("");
      }
    } catch {
      setSend({
        kind: "error",
        message: "Network error — please check your connection and try again",
      });
      turnstileRef.current?.reset();
      setTurnstileToken("");
    }
  };

  return (
    <>
      <SiteNav active="contact" />

      <main className="ct-wrap">
        <div className="contact-intro">
          <div className="kicker">Two ways in · pick whichever feels easier</div>
          <h2>Let&apos;s talk.</h2>
          <p>
            Whether you&apos;d rather hear a voice or type quietly at 2am, we&apos;re here. A person replies — not a
            ticket system.
          </p>
        </div>

        <div className="two-tracks">
          <section className="track call">
            <div className="kicker">Option A</div>
            <h3>Call us.</h3>
            <p className="sub">
              We answer. If we&apos;re on another line, leave a message — we always call back same day.
            </p>
            <div className="phone">
              <a href="tel:6195508735" style={{ color: "inherit", textDecoration: "none" }}>
                (619) 550-8735
              </a>
            </div>
            <div className="hours">Monday – Friday · 8a – 6p Central</div>

            <div className="book">
              <h4>Or pick a slot for a free 10-min intro call</h4>
              <div className="slots-grid">
                {SLOTS.map((s) => {
                  const key = `${s.day} ${s.time}`;
                  const active = key === selectedSlot;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`slot${active ? " active" : ""}`}
                      onClick={() => setSelectedSlot(key)}
                    >
                      <strong>{s.day}</strong>
                      <small>{s.time}</small>
                    </button>
                  );
                })}
              </div>
              <a className="btn primary confirm-btn" href="#">
                Confirm · {selectedSlot}
              </a>
            </div>
          </section>

          <section className="track write">
            {send.kind === "success" ? (
              <div
                className="send-success"
                role="status"
                aria-live="polite"
                data-testid="send-success"
              >
                <div className="kicker">Message sent</div>
                <h4>We got it.</h4>
                <p>
                  A real person will reply within one business day. We also dropped a quick
                  confirmation into your inbox.
                </p>
              </div>
            ) : (
              <>
                <div className="kicker">Option B</div>
                <h3>Write to us.</h3>
                <p className="sub">Rather type it out? Tell us where you&apos;re at and we&apos;ll reply with next steps.</p>
                <form onSubmit={handleSubmit} noValidate>
                <div className="field-row">
                  <div className={`fld${fieldErrors.firstName ? " has-error" : ""}`}>
                    <label htmlFor="ct-first">First name</label>
                    <input
                      id="ct-first"
                      name="firstName"
                      type="text"
                      placeholder="Jordan"
                      value={form.firstName}
                      onChange={(e) => setField("firstName", e.target.value)}
                      autoComplete="given-name"
                      required
                    />
                  </div>
                  <div className={`fld${fieldErrors.lastName ? " has-error" : ""}`}>
                    <label htmlFor="ct-last">Last name</label>
                    <input
                      id="ct-last"
                      name="lastName"
                      type="text"
                      placeholder="Reyes"
                      value={form.lastName}
                      onChange={(e) => setField("lastName", e.target.value)}
                      autoComplete="family-name"
                      required
                    />
                  </div>
                </div>
                <div className="field-row">
                  <div className={`fld${fieldErrors.email ? " has-error" : ""}`}>
                    <label htmlFor="ct-email">Email</label>
                    <input
                      id="ct-email"
                      name="email"
                      type="email"
                      placeholder="jordan@example.com"
                      value={form.email}
                      onChange={(e) => setField("email", e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div className={`fld${fieldErrors.phone ? " has-error" : ""}`}>
                    <label htmlFor="ct-phone">Phone · optional</label>
                    <input
                      id="ct-phone"
                      name="phone"
                      type="tel"
                      placeholder="(555) 555-5555"
                      value={form.phone}
                      onChange={(e) => setField("phone", e.target.value)}
                      autoComplete="tel"
                    />
                  </div>
                </div>
                <div className={`fld${fieldErrors.state ? " has-error" : ""}`}>
                  <label htmlFor="ct-state">State</label>
                  <select
                    id="ct-state"
                    name="state"
                    value={form.state}
                    onChange={(e) => setField("state", e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Select your state…
                    </option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                {stateExcluded ? (
                  <div className="excluded-note" role="alert" data-testid="excluded-note">
                    Under state law we cannot take on clients in{" "}
                    <strong>{EXCLUDED_STATES.join(" · ")}</strong>. Veterans in those states have
                    free assistance through the{" "}
                    <a href="#">VA Office of General Counsel</a>.
                  </div>
                ) : null}
                <div className="fld">
                  <label>Where are you at in the process?</label>
                  <div className="chips-row">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={status === opt ? "active" : undefined}
                        onClick={() => setStatus(opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={`fld${fieldErrors.message ? " has-error" : ""}`}>
                  <label htmlFor="ct-message">Tell us a bit</label>
                  <textarea
                    id="ct-message"
                    name="message"
                    placeholder="I separated last year and I've been stuck on where to start…"
                    value={form.message}
                    onChange={(e) => setField("message", e.target.value)}
                    required
                  />
                </div>

                <div
                  aria-hidden="true"
                  style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}
                >
                  <label>
                    Website
                    <input
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.website}
                      onChange={(e) => setField("website", e.target.value)}
                    />
                  </label>
                </div>

                {siteKey ? (
                  <div className="turnstile-row">
                    <Turnstile
                      ref={turnstileRef}
                      siteKey={siteKey}
                      onSuccess={setTurnstileToken}
                      onExpire={() => setTurnstileToken("")}
                      onError={() => setTurnstileToken("")}
                      options={{ theme: "auto" }}
                    />
                  </div>
                ) : (
                  <div className="turnstile-row turnstile-missing" role="note">
                    Turnstile site key missing — set{" "}
                    <code>NEXT_PUBLIC_TURNSTILE_SITE_KEY</code> in <code>.env.local</code>.
                  </div>
                )}

                {send.kind === "error" ? (
                  <div className="send-error" role="alert" data-testid="send-error">
                    {send.message}
                  </div>
                ) : null}

                <div className="send-row">
                  <div className="ccpa">
                    By sending, you agree to our CCPA notice. We only use this info to reply to you.
                  </div>
                  <button
                    type="submit"
                    className="btn primary"
                    disabled={send.kind === "sending" || stateExcluded}
                  >
                    {send.kind === "sending" ? "Sending…" : "Send note →"}
                  </button>
                </div>
              </form>
              </>
            )}
          </section>
        </div>

        <div className="state-notice">
          <strong>Please note:</strong> under state law we cannot take on clients residing in{" "}
          <strong>NY · NJ · ME · CO</strong>. Veterans in those states have free assistance through the{" "}
          <a href="#">VA Office of General Counsel</a>.
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
