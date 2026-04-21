import Image from "next/image";
import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="foot">
      <div className="foot-inner">
        <div className="foot-top">
          <div className="foot-col">
            <div className="foot-brand">
              <Image src="/color_logo.png" alt="" width={42} height={42} style={{ height: 42, width: "auto" }} />
              <span>VSUC</span>
            </div>
            <p className="blurb">Veteran-founded consulting. We sit with you until the paperwork makes sense.</p>
          </div>
          <div className="foot-col">
            <h4>Site</h4>
            <Link href="/">Home</Link>
            <Link href="/about">About</Link>
            <Link href="/rating">Disability Calculator</Link>
            <Link href="/contact">Contact</Link>
          </div>
          <div className="foot-col">
            <h4>Contact</h4>
            <a href="tel:6195508735">(619) 550-8735</a>
            <a href="mailto:info@vsunited.org">info@vsunited.org</a>
            <p>
              401 Edwards Street Ste 830 #1024
              <br />
              Shreveport, LA 71101
            </p>
          </div>
          <div className="foot-col">
            <h4>Good to know</h4>
            <p style={{ fontSize: 13, lineHeight: 1.6 }}>
              VSUC is a consulting organization. Not VA-accredited. Not a law firm.
            </p>
            <p className="foot-state">Cannot serve: NY · NJ · ME · CO</p>
          </div>
        </div>
        <details className="foot-disc">
          <summary>Full VA non-accreditation disclaimer</summary>
          <p>
            Veteran Services United (VSU) provides pre- and post-filing consulting but does not represent veterans in
            the preparation, presentation, or prosecution of VA claims. VSU is not recognized by the Department of
            Veterans Affairs as an accredited agent or entity and does not operate as a law firm.
          </p>
          <p>
            Federal law (38 U.S.C. 5901) stipulates that only VA-recognized individuals or entities may act as agents
            or attorneys in the preparation, presentation, or prosecution of claims. Veterans have access to completely
            free VA claims assistance through National Service Organizations (e.g., VFW, DAV), state and local veteran
            service officers, or VA-accredited attorneys and agents.
          </p>
          <p>
            New York, New Jersey, Maine, &amp; Colorado residents: under state laws, our fees may not be collected for
            advising, assisting or consulting veterans on their VA benefits claims; therefore we cannot take on clients
            that reside in these states.
          </p>
        </details>
        <div className="foot-legal">
          <span>© Veteran Services United Consulting, LLC</span>
          <span>Shreveport, LA · Est. 2024</span>
        </div>
      </div>
    </footer>
  );
}
