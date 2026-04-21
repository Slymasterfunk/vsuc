"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import SiteNav from "../components/SiteNav";
import SiteFooter from "../components/SiteFooter";
import {
  VA_COMP,
  SPOUSE_BUMP,
  PARENT_EACH,
  CHILD_UNDER_18,
  CHILD_SCHOOL,
  SPOUSE_AA,
  ALONE_WITH_1_CHILD,
  SPOUSE_WITH_1_CHILD,
  ALONE_WITH_1_SCHOOL_CHILD,
  SPOUSE_WITH_1_SCHOOL_CHILD,
  RATE_YEAR,
  EFFECTIVE_DATE,
} from "./rates";
import "./rating.scss";

/* VA combined-rating math.
   efficiency = product of (1 - r_i/100), ordered high to low.
   Combined rating = round((1 - efficiency) * 100) to nearest 10.
   Bilateral factor: 10% of (combined of bilateral group) added before combining with others.

   Pay rates live in ./rates.ts — update them there when the VA publishes a new year. */

type Condition = {
  id: number;
  name: string;
  pct: number;
  bilateral: boolean;
};

const PCT_OPTIONS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

function combinedRating(rs: number[]): number {
  if (!rs.length) return 0;
  const sorted = [...rs].sort((a, b) => b - a);
  let eff = 1;
  sorted.forEach((r) => {
    eff *= 1 - r / 100;
  });
  return (1 - eff) * 100;
}

function roundToTen(n: number): number {
  return Math.round(n / 10) * 10;
}

const MONEY_FMT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatMoney(n: number): string {
  return MONEY_FMT.format(n);
}

function clampInt(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, Math.floor(v)));
}

/* Native <input type="number"> accepts "e", "+", "-", "." via the keyboard,
   which can smuggle scientific notation (e.g. "1e5") or signed values past
   our clamp. Block those keys at source; number pads still work. */
const BLOCKED_NUMBER_KEYS = new Set(["e", "E", "+", "-", ".", ","]);

type SaveableState = {
  conditions: Condition[];
  dependents: { spouse: boolean; childrenUnder18: number; childrenSchool: number; parents: number };
  special: { spouseAidAndAttendance: boolean };
};

/* URL format: c=<pct>[b].<name>~<pct>[b].<name>&s=1&cu=2&cs=1&p=1&saa=1
   Kept readable so shared links are inspectable and debuggable. */
function serializeState(state: SaveableState): string {
  const parts: string[] = [];
  if (state.conditions.length) {
    const c = state.conditions
      .map((cond) => `${cond.pct}${cond.bilateral ? "b" : ""}.${encodeURIComponent(cond.name)}`)
      .join("~");
    parts.push(`c=${c}`);
  }
  if (state.dependents.spouse) parts.push("s=1");
  if (state.dependents.childrenUnder18) parts.push(`cu=${state.dependents.childrenUnder18}`);
  if (state.dependents.childrenSchool) parts.push(`cs=${state.dependents.childrenSchool}`);
  if (state.dependents.parents) parts.push(`p=${state.dependents.parents}`);
  if (state.special.spouseAidAndAttendance) parts.push("saa=1");
  return parts.join("&");
}

function hydrateFromSearch(search: string): SaveableState | null {
  const params = new URLSearchParams(search);
  if (!params.has("c") && !params.has("s") && !params.has("cu") && !params.has("cs") && !params.has("p") && !params.has("saa")) {
    return null;
  }
  const c = params.get("c");
  const conditions: Condition[] = [];
  if (c) {
    c.split("~").forEach((part, i) => {
      const match = part.match(/^(\d+)(b)?\.(.+)$/);
      if (!match) return;
      const pct = Number(match[1]);
      if (!PCT_OPTIONS.includes(pct)) return;
      conditions.push({
        id: i + 1,
        pct,
        bilateral: !!match[2],
        name: decodeURIComponent(match[3]),
      });
    });
  }
  return {
    conditions,
    dependents: {
      spouse: params.get("s") === "1",
      childrenUnder18: clampInt(Number(params.get("cu")), 0, 20),
      childrenSchool: clampInt(Number(params.get("cs")), 0, 20),
      parents: clampInt(Number(params.get("p")), 0, 2),
    },
    special: {
      spouseAidAndAttendance: params.get("saa") === "1",
    },
  };
}

export default function RatingPage() {
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [conditionName, setConditionName] = useState("");
  const [conditionPct, setConditionPct] = useState<number>(10);
  const [dependents, setDependents] = useState({
    spouse: false,
    childrenUnder18: 0,
    childrenSchool: 0,
    parents: 0,
  });
  const [special, setSpecial] = useState({
    spouseAidAndAttendance: false,
  });
  const [copied, setCopied] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const nextIdRef = useRef(1);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const hydrated = hydrateFromSearch(window.location.search);
    if (!hydrated) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot URL hydration on mount.
    setConditions(hydrated.conditions);
    setDependents(hydrated.dependents);
    setSpecial(hydrated.special);
    nextIdRef.current = hydrated.conditions.length + 1;
  }, []);

  const addCondition = (name: string, pct: number, bilateral = false): boolean => {
    const normalized = name.trim().toLowerCase();
    if (conditions.some((c) => c.name.trim().toLowerCase() === normalized)) return false;
    setConditions((prev) => [...prev, { id: nextIdRef.current++, name, pct, bilateral }]);
    return true;
  };

  const removeCondition = (id: number) => {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCondition = (id: number, patch: Partial<Condition>) => {
    setConditions((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const { final, mathSteps } = useMemo(() => {
    // Per 38 CFR 4.26, the bilateral factor applies only when ≥2 ratings exist
    // for paired disabilities. A single "bilateral" rating is just a regular rating.
    const bilatItems = conditions.filter((c) => c.bilateral);
    const soloItems = conditions.filter((c) => !c.bilateral);
    const applyBilatFactor = bilatItems.length >= 2;

    type VItem = { label: string; pct: number };
    type Step = {
      kind: "combine" | "bilateral-pair" | "bilateral-combine" | "bilateral-factor" | "round";
      label: string;
      formula: string;
      cumulative: number | null;
    };

    const subSteps: Step[] = [];
    const virtual: VItem[] = soloItems.map((c) => ({ label: c.name, pct: c.pct }));

    if (applyBilatFactor) {
      bilatItems.forEach((c) => {
        subSteps.push({
          kind: "bilateral-pair",
          label: c.name,
          formula: `paired rating — ${c.pct}%`,
          cumulative: null,
        });
      });
      const bc = combinedRating(bilatItems.map((c) => c.pct));
      const sortedBilat = [...bilatItems].sort((a, b) => b.pct - a.pct);
      const combineExpr = sortedBilat.map((c) => `(1−${c.pct}%)`).join(" × ");
      subSteps.push({
        kind: "bilateral-combine",
        label: "Combine paired ratings",
        formula: `${combineExpr} → ${bc.toFixed(1)}%`,
        cumulative: null,
      });
      const afterFactor = bc * 1.1;
      subSteps.push({
        kind: "bilateral-factor",
        label: "+ 10% bilateral factor",
        formula: `${bc.toFixed(1)}% × 1.1 = ${afterFactor.toFixed(1)}%`,
        cumulative: null,
      });
      virtual.push({
        label: `Bilateral group (×${bilatItems.length})`,
        pct: afterFactor,
      });
    } else {
      // Single or zero bilateral entries — include them as regular ratings.
      bilatItems.forEach((c) => virtual.push({ label: c.name, pct: c.pct }));
    }

    virtual.sort((a, b) => b.pct - a.pct);

    const raw = combinedRating(virtual.map((v) => v.pct));
    const finalRating = Math.min(100, roundToTen(raw));

    const fmtPct = (n: number) =>
      Number.isInteger(n) ? n.toFixed(0) : n.toFixed(1);

    let eff = 1;
    const combineSteps: Step[] = virtual.map((item, i) => {
      const before = eff * 100;
      eff *= 1 - item.pct / 100;
      const after = eff * 100;
      const formula =
        i === 0
          ? `100 × (1 − ${fmtPct(item.pct)}%) = ${after.toFixed(1)}`
          : `${before.toFixed(1)} × (1 − ${fmtPct(item.pct)}%) = ${after.toFixed(1)}`;
      return {
        kind: "combine",
        label: item.label,
        formula,
        cumulative: 100 - after,
      };
    });

    const steps: Step[] = [...subSteps, ...combineSteps];

    if (steps.length > 0) {
      steps.push({
        kind: "round",
        label: "Round to nearest 10%",
        formula: `${raw.toFixed(1)}% → ${finalRating}%`,
        cumulative: finalRating,
      });
    }

    return { final: finalRating, mathSteps: steps };
  }, [conditions]);

  /* Pay composition follows VA.gov 2026 table structure:
     - When ≥1 child is claimed, use a "with 1 child" base row. An under-18 child fills the
       first-child slot preferentially (the VA's published row uses the under-18 premium).
       If only school-age children are claimed, use the derived school-age first-child row.
     - Remaining children stack at their per-additional rate (CHILD_UNDER_18 / CHILD_SCHOOL). */

  const base = VA_COMP[final] || 0;

  const depAmount = useMemo(() => {
    if (final < 30) return 0;
    let amt = 0;
    const totalChildren = dependents.childrenUnder18 + dependents.childrenSchool;

    if (totalChildren >= 1) {
      const firstIsUnder18 = dependents.childrenUnder18 >= 1;
      const additionalUnder18 = dependents.childrenUnder18 - (firstIsUnder18 ? 1 : 0);
      const additionalSchool = dependents.childrenSchool - (firstIsUnder18 ? 0 : 1);

      const firstChildRow = firstIsUnder18
        ? (dependents.spouse ? SPOUSE_WITH_1_CHILD[final] : ALONE_WITH_1_CHILD[final])
        : (dependents.spouse ? SPOUSE_WITH_1_SCHOOL_CHILD[final] : ALONE_WITH_1_SCHOOL_CHILD[final]);

      amt += (firstChildRow || 0) - (VA_COMP[final] || 0);
      amt += additionalUnder18 * (CHILD_UNDER_18[final] || 0);
      amt += additionalSchool * (CHILD_SCHOOL[final] || 0);
    } else {
      if (dependents.spouse) amt += SPOUSE_BUMP[final] || 0;
    }

    amt += dependents.parents * (PARENT_EACH[final] || 0);
    return amt;
  }, [final, dependents]);

  const specAmount = useMemo(() => {
    if (final < 30) return 0;
    // Spouse A&A only applies when a spouse is claimed.
    if (special.spouseAidAndAttendance && dependents.spouse) {
      return SPOUSE_AA[final] || 0;
    }
    return 0;
  }, [final, special, dependents.spouse]);

  const monthly = base + depAmount + specAmount;
  const annual = monthly * 12;

  const handleCustomAdd = (e: FormEvent) => {
    e.preventDefault();
    const name = conditionName.trim();
    if (!name) return;
    if (!addCondition(name, conditionPct)) {
      setAddError(`"${name}" is already on your list.`);
      return;
    }
    setAddError(null);
    setConditionName("");
    setConditionPct(10);
    nameInputRef.current?.focus();
  };

  const handleSave = async () => {
    const qs = serializeState({ conditions, dependents, special });
    const url = `${window.location.origin}${window.location.pathname}${qs ? `?${qs}` : ""}`;
    window.history.replaceState(null, "", url);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied — URL is still updated in the address bar.
    }
  };

  const hasData =
    conditions.length > 0 ||
    dependents.spouse ||
    dependents.childrenUnder18 > 0 ||
    dependents.childrenSchool > 0 ||
    dependents.parents > 0 ||
    special.spouseAidAndAttendance ||
    conditionName.length > 0;

  const resetAll = () => {
    if (hasData && !window.confirm("Clear all conditions, dependents, and special status?")) return;
    setConditions([]);
    setDependents({ spouse: false, childrenUnder18: 0, childrenSchool: 0, parents: 0 });
    setSpecial({ spouseAidAndAttendance: false });
    setConditionName("");
    setConditionPct(10);
    setAddError(null);
    window.history.replaceState(null, "", window.location.pathname);
  };

  const subThirty = final < 30;

  return (
    <>
      <SiteNav active="rating" />

      <main className="rate-wrap">
        <div className="rate-head">
          <div>
            <div className="kicker">Disability rating calculator</div>
            <h1>Estimate your VA combined rating.</h1>
            <p>
              Add your conditions, dependents, and any special status. Results utilize{' '}
               <strong>{RATE_YEAR} VA compensation rates</strong> (effective {EFFECTIVE_DATE}).
            </p>
          </div>
          <button type="button" className="btn reset-btn" onClick={resetAll}>
            <i className="fa-duotone fa-rotate-left" aria-hidden="true" /> Reset
          </button>
        </div>

        <div className="calc-shell">
          <div className="calc-form">
            {/* Conditions */}
            <section className="calc-section">
              <header>
                <div className="kicker">
                  <i className="fa-duotone fa-list-check" aria-hidden="true" /> Conditions
                </div>
                <h2>What&apos;s on your claim?</h2>
                <p>
                  Add each rated condition with its percentage. You can adjust anytime.
                  {" "}
                  <span className="pct-note">0% (service-connected, non-compensable) doesn&apos;t move the combined rating, so it&apos;s not listed.</span>
                </p>
              </header>

              <div className="conditions-table">
                {conditions.length === 0 ? (
                  <div className="empty">No conditions yet, add one above.</div>
                ) : (
                  conditions.map((c) => (
                    <div className="condition-row" key={c.id}>
                      <div className="c-name">
                        {c.name}
                        {c.bilateral && (
                          <span className="c-bilat" title="Paired body part — contributes to the bilateral factor (38 CFR 4.26) when at least two are claimed">
                            <i className="fa-duotone fa-arrows-left-right" aria-hidden="true" />
                            <span>Bilateral</span>
                          </span>
                        )}
                      </div>
                      <div className="c-controls">
                        <select
                          value={c.pct}
                          onChange={(e) => updateCondition(c.id, { pct: Number(e.target.value) })}
                          aria-label={`${c.name} rating`}
                        >
                          {PCT_OPTIONS.map((v) => (
                            <option key={v} value={v}>
                              {v}%
                            </option>
                          ))}
                        </select>
                        <label
                          className="bilat-chk"
                          title="Mark as a paired body part. Activates the bilateral factor when two or more are checked."
                        >
                          <input
                            type="checkbox"
                            checked={c.bilateral}
                            onChange={(e) => updateCondition(c.id, { bilateral: e.target.checked })}
                            aria-label={`Mark ${c.name} as bilateral`}
                          />
                          <span>Bilat.</span>
                        </label>
                      </div>
                      <button
                        type="button"
                        className="c-remove"
                        title="Remove"
                        aria-label={`Remove ${c.name}`}
                        onClick={() => removeCondition(c.id)}
                      >
                        <i className="fa-duotone fa-xmark" aria-hidden="true" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <form className="add-custom" onSubmit={handleCustomAdd} noValidate>
                <input
                  ref={nameInputRef}
                  className="name-input"
                  value={conditionName}
                  onChange={(e) => {
                    setConditionName(e.target.value);
                    if (addError) setAddError(null);
                  }}
                  placeholder="Condition name, e.g. Hearing loss"
                  aria-label="Condition name"
                  aria-invalid={addError ? true : undefined}
                  aria-describedby={addError ? "add-error" : undefined}
                />
                <select
                  className="pct-input"
                  value={conditionPct}
                  onChange={(e) => setConditionPct(Number(e.target.value))}
                  aria-label="Rating percentage"
                >
                  {PCT_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}%
                    </option>
                  ))}
                </select>
                <button type="submit">
                  Add <i className="fa-duotone fa-plus" aria-hidden="true" />
                </button>
              </form>
              {addError && (
                <p id="add-error" className="add-error" role="alert">
                  <i className="fa-duotone fa-circle-exclamation" aria-hidden="true" /> {addError}
                </p>
              )}
            </section>

            {/* Dependents */}
            <section className={`calc-section${subThirty ? " is-locked" : ""}`}>
              <header>
                <div className="kicker">
                  <i className="fa-duotone fa-user-group" aria-hidden="true" /> Dependents
                </div>
                <h2>Who else is at home?</h2>
                <p>
                  Dependents only affect pay at a combined rating of 30% or higher.
                  {subThirty && <span className="lock-note"> Locked until you cross 30%.</span>}
                </p>
              </header>

              <fieldset className="dep-fields" disabled={subThirty}>
                <label className="toggle-row">
                  <span>Married — spouse</span>
                  <input
                    type="checkbox"
                    checked={dependents.spouse}
                    onChange={(e) => setDependents((d) => ({ ...d, spouse: e.target.checked }))}
                  />
                </label>
                <label className="count-row">
                  <span>Children under 18</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={20}
                    step={1}
                    value={dependents.childrenUnder18}
                    onKeyDown={(e) => {
                      if (BLOCKED_NUMBER_KEYS.has(e.key)) e.preventDefault();
                    }}
                    onChange={(e) =>
                      setDependents((d) => ({ ...d, childrenUnder18: clampInt(Number(e.target.value), 0, 20) }))
                    }
                  />
                </label>
                <label className="count-row">
                  <span>Children 18–24 in school</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={20}
                    step={1}
                    value={dependents.childrenSchool}
                    onKeyDown={(e) => {
                      if (BLOCKED_NUMBER_KEYS.has(e.key)) e.preventDefault();
                    }}
                    onChange={(e) =>
                      setDependents((d) => ({ ...d, childrenSchool: clampInt(Number(e.target.value), 0, 20) }))
                    }
                  />
                </label>
                <label className="count-row">
                  <span>
                    Dependent parents <em className="field-hint">up to 2</em>
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={2}
                    step={1}
                    value={dependents.parents}
                    onKeyDown={(e) => {
                      if (BLOCKED_NUMBER_KEYS.has(e.key)) e.preventDefault();
                    }}
                    onChange={(e) =>
                      setDependents((d) => ({ ...d, parents: clampInt(Number(e.target.value), 0, 2) }))
                    }
                  />
                </label>
              </fieldset>
            </section>

            {/* Special status */}
            <section className={`calc-section${subThirty ? " is-locked" : ""}`}>
              <header>
                <div className="kicker">
                  <i className="fa-duotone fa-star" aria-hidden="true" /> Special status
                </div>
                <h2>Any of these apply?</h2>
                <p>
                  Additional compensation that stacks on top of the base rating.
                  {subThirty && <span className="lock-note"> Locked until you cross 30%.</span>}
                </p>
              </header>

              <fieldset className="special-fields" disabled={subThirty}>
                <label className={!dependents.spouse ? "disabled" : undefined}>
                  <input
                    type="checkbox"
                    checked={special.spouseAidAndAttendance && dependents.spouse}
                    disabled={!dependents.spouse}
                    onChange={(e) => setSpecial((s) => ({ ...s, spouseAidAndAttendance: e.target.checked }))}
                  />
                  <span>
                    Spouse needs Aid &amp; Attendance
                    {!dependents.spouse && <em>, requires a spouse</em>}
                  </span>
                </label>
              </fieldset>

              <p className="smc-note">
                <i className="fa-duotone fa-circle-info" aria-hidden="true" />
                Veteran-level SMC (Aid &amp; Attendance, Housebound, loss-of-use) replaces the base
                rating with a separate rate schedule and requires individual evaluation.
                <br />
                <Link href="/contact">Book a call</Link> and we&apos;ll walk through it.
              </p>
            </section>
          </div>

          {/* Results panel */}
          <aside className="calc-results" aria-label="Your estimate">
            {conditions.length === 0 ? (
              <div className="results-empty">
                <i className="fa-duotone fa-list-check" aria-hidden="true" />
                <h3>Your estimate appears here.</h3>
                <p>Add a condition on the left to see your combined rating and monthly pay.</p>
                <Link href="/contact" className="btn primary">
                  <i className="fa-duotone fa-phone" aria-hidden="true" /> Or book a call
                </Link>
              </div>
            ) : (
            <>
            <div role="status" aria-live="polite" aria-atomic="true" className="results-live">
              <span className="sr-only">
                Combined rating {final}%. Monthly estimate {formatMoney(monthly)}.
              </span>
              <div className="big-rating">
                <div className="kicker">Combined rating</div>
                <div className="val">{final}%</div>
              </div>

              <div className="money-line">
                <div>
                  <div className="kicker">Monthly</div>
                  <div className="val">{formatMoney(monthly)}</div>
                </div>
                <div>
                  <div className="kicker">Annual</div>
                  <div className="val">{formatMoney(annual)}</div>
                </div>
              </div>
            </div>

            <div className="breakdown">
              <div className="row">
                <span>Base</span>
                <strong>{formatMoney(base)}</strong>
              </div>
              <div className="row">
                <span>+ Dependents</span>
                <strong>{formatMoney(depAmount)}</strong>
              </div>
              <div className="row">
                <span>+ Special</span>
                <strong>{formatMoney(specAmount)}</strong>
              </div>
              <div className="row total">
                <span>Monthly total</span>
                <strong>{formatMoney(monthly)}</strong>
              </div>
            </div>

            {mathSteps.length > 0 && (
              <details className="math-details">
                <summary>
                  <span>
                    <i className="fa-duotone fa-calculator" aria-hidden="true" /> How the rating combines
                  </span>
                  <i className="fa-duotone fa-chevron-down caret" aria-hidden="true" />
                </summary>
                <div className="math-steps">
                  {mathSteps.map((s, i) => (
                    <div className={`math-step is-${s.kind}`} key={i}>
                      <div>
                        <div className="label">{s.label}</div>
                        <div className="formula">{s.formula}</div>
                      </div>
                      {s.cumulative !== null && (
                        <div className="eff">{s.cumulative.toFixed(0)}%</div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="math-note">
                  VA combined-rating math, ordered high to low, each condition reduces the remaining &ldquo;healthy&rdquo; efficiency.
                </p>
              </details>
            )}

            <div className="result-cta">
              <button
                type="button"
                className="btn"
                onClick={handleSave}
                disabled={conditions.length === 0}
                aria-live="polite"
              >
                <i
                  className={`fa-duotone ${copied ? "fa-check" : "fa-link"}`}
                  aria-hidden="true"
                />{" "}
                {copied ? "Link copied" : "Copy link"}
              </button>
              <Link href="/contact" className="btn primary">
                <i className="fa-duotone fa-phone" aria-hidden="true" /> Book a call
              </Link>
            </div>

            <p className="disclaimer">Estimate only · VA sets actual awards</p>
            </>
            )}
          </aside>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
