import Link from "next/link";
import SiteNav from "./components/SiteNav";
import SiteFooter from "./components/SiteFooter";
import "./home.scss";

export default function HomePage() {
  return (
    <>
      <SiteNav active="home" />

      <main className="home-wrap">
        <section className="home-hero">
          <div>
            <div className="kicker">You earned these benefits. We make sure you get them.</div>
            <h1>
              Wherever you are in the claim,<em>we&apos;ll meet you there.</em>
            </h1>
            <p className="lede">
              No intake maze. No upfront fee. Tell us where you&apos;re stuck and we&apos;ll walk the rest with you.
            </p>
          </div>
          <aside className="quote-card">
            <p>We built VSUC because the paperwork isn&apos;t built for you. It&apos;s built for them.</p>
            <cite>— Matt Lasher · USMC · Founder</cite>
          </aside>
        </section>

        <section className="doors" aria-label="Pick your path">
          <Link className="door door-a" href="/rating">
            <h3>I haven&apos;t filed yet.</h3>
            <div className="chips">
              <span>First claim</span>
              <span>Just separated</span>
            </div>
            <p>We&apos;ll map your service history and likely conditions before you touch a single form.</p>
            <span className="go">Start here</span>
          </Link>
          <Link className="door door-b" href="/rating">
            <h3>My claim was denied.</h3>
            <div className="chips">
              <span>Appeal</span>
              <span>Supplemental</span>
            </div>
            <p>Denials are routine, not final. We&apos;ll find the gap and prep the next round with you.</p>
            <span className="go">Appeal path</span>
          </Link>
          <Link className="door door-c" href="/rating">
            <h3>I want a higher rating.</h3>
            <div className="chips">
              <span>Increase</span>
              <span>New condition</span>
            </div>
            <p>
              If your condition has changed, your rating probably should too. We&apos;ll show you where you stand.
            </p>
            <span className="go">Increase path</span>
          </Link>
        </section>

        <section className="home-stats">
          <div className="stat">
            <div className="num">
              20<sup>yrs</sup>
            </div>
            <div className="lbl">Marines · Founder</div>
          </div>
          <div className="stat">
            <div className="num">
              200<sup>+</sup>
            </div>
            <div className="lbl">Conditions mapped</div>
          </div>
          <div className="stat">
            <div className="num">46</div>
            <div className="lbl">States served</div>
          </div>
          <div className="stat">
            <div className="num">
              24<sup>h</sup>
            </div>
            <div className="lbl">Avg. reply time</div>
          </div>
        </section>

        <section className="trust-row">
          <div className="left">
            <div className="kicker">Not sure which door fits?</div>
            <h3>Talk to a human first.</h3>
            <p>
              Ten minutes on the phone saves ten hours of guessing. No pressure — we&apos;ll tell you if we aren&apos;t
              the right fit.
            </p>
          </div>
          <div className="right">
            <Link className="btn primary" href="/contact">
              Book a free call
            </Link>
            <Link className="btn" href="/rating">
              Try the calculator →
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
