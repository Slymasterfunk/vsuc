import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "../components/SiteNav";
import SiteFooter from "../components/SiteFooter";
import "./about.scss";

export const metadata: Metadata = {
  title: "About — Matt Lasher, Founder · VSUC",
};

type TeamMember = {
  tpClass: string;
  role: string;
  name: string;
  branch: string;
  bio: string;
  tags: string[];
};

const TEAM: TeamMember[] = [
  {
    tpClass: "tp-1",
    role: "Claims lead",
    name: "Dani Ortega",
    branch: "US Army · 12 yrs",
    bio: "Medic turned paperwork translator. Dani has guided 300+ veterans through initial claims, she's the first voice most clients hear.",
    tags: ["Intake", "PTSD claims", "Español"],
  },
  {
    tpClass: "tp-2",
    role: "Appeals specialist",
    name: "Marcus Tate",
    branch: "US Navy · 8 yrs",
    bio: "Former corpsman with a knack for reading denial letters line by line. If your claim came back wrong, Marcus is the one digging into why.",
    tags: ["Appeals", "Supplemental", "HLR"],
  },
  {
    tpClass: "tp-3",
    role: "Evidence + records",
    name: "Priya Chandran",
    branch: "Civilian ally",
    bio: "Medical records librarian before she joined VSUC. Priya builds the evidence bundles that make the VA evaluator's job easy — and your award big.",
    tags: ["Records", "Nexus letters", "DBQs"],
  },
  {
    tpClass: "tp-4",
    role: "Increase & review",
    name: "Reggie Hayes",
    branch: "US Air Force · 22 yrs",
    bio: "Retired senior NCO who has been on both sides of the rating table. Reggie handles rating increases and secondary-condition reviews.",
    tags: ["Increases", "Secondaries", "TDIU"],
  },
  {
    tpClass: "tp-5",
    role: "Client care",
    name: "Sam Whitford",
    branch: "USMC · 6 yrs",
    bio: "Sam keeps the calendar, the callbacks, and the coffee. If you've scheduled an intro call, you've already met them.",
    tags: ["Scheduling", "Follow-ups", "Triage"],
  },
];

export default function AboutPage() {
  return (
    <>
      <SiteNav active="about" />

      <main className="about-wrap">
        <div className="about-kicker">A note from the founder</div>
        <h1 className="about-title">
          Hi, I&apos;m Matt. <em>Let me tell you why this exists.</em>
        </h1>

        <div className="portrait-row">
          <div className="portrait">Portrait · placeholder</div>
          <div style={{ flex: 1 }}>
            <p className="about-quote">
              <span className="mark">&ldquo;</span>My goal is a healthy and thriving veteran community, accomplished by helping our clients win claims.<span className="mark">&rdquo;</span>
            </p>
            <div className="about-badges">
              <span>USMC · 20 yrs</span>
              <span>Retired 2016</span>
              <span>Shreveport, LA</span>
              <span>Founder, VSUC</span>
            </div>
          </div>
        </div>

        <div className="about-letter">
          <p className="drop">
            I spent twenty years in the Corps. When I retired in 2016, I saw the same thing over and over, good people walking away from benefits they had clearly earned, because the VA process is built for bureaucrats, not for the veterans it&apos;s supposed to serve.
          </p>
          <p>
            Veteran Services United Consulting was founded on a stubborn idea: that service members deserve proper time and attention to make sure deserved disability benefits are actually awarded. The VA rating system is confusing. The claims process is complicated. And too many veterans are navigating it without the expert mentorship they need.
          </p>
          <p>
            VSU and our network of mentors set out to solve this. We listen, we translate your medical history into the language the VA evaluates, and we stay beside you for the whole process. We aren&apos;t lawyers. We aren&apos;t VA-accredited, and we&apos;ll tell you about the free options first. We&apos;re consultants, plain and simple, and we do this because we&apos;ve lived it.
          </p>
          <p>If any of that sounds like what you&apos;ve been looking for, I&apos;d like to hear from you.</p>
        </div>

        <div className="about-sign">
          <div className="label">Signed</div>
          <div className="sig">— Matt Lasher</div>
          <div className="role">Founder · Veteran Services United Consulting</div>
        </div>

        <section className="team" aria-labelledby="team-heading">
          <div className="team-head">
            <div>
              <div className="kicker">Meet the team</div>
              <h2 id="team-heading">
                The folks <em>walking with you.</em>
              </h2>
            </div>
            <p className="intro">
              Five veterans and one civilian ally. Different branches, same job, making sure you get what you earned.
            </p>
          </div>

          <div className="team-grid">
            {TEAM.map((m) => (
              <article key={m.name} className={`team-card ${m.tpClass}`}>
                <div className="tp-portrait">Portrait · placeholder</div>
                <div className="tp-role">{m.role}</div>
                <h3 className="tp-name">{m.name}</h3>
                <div className="tp-branch">{m.branch}</div>
                <p className="tp-bio">{m.bio}</p>
                <div className="tp-tags">
                  {m.tags.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="about-cta">
          <div>
            <h3>Ready when you are.</h3>
            <p>Ten-minute intro call, we&apos;ll tell you if we&apos;re the right fit.</p>
          </div>
          <div className="actions">
            <Link className="btn primary" href="/contact">
              Book a call
            </Link>
            <Link className="btn" href="/rating">
              Start the calculator →
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
