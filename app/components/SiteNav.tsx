"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";

type NavKey = "home" | "about" | "rating" | "contact";

const LINKS: { href: string; key: NavKey; label: string; num: string }[] = [
  { href: "/", key: "home", label: "Home", num: "01" },
  { href: "/about", key: "about", label: "About", num: "02" },
  { href: "/rating", key: "rating", label: "Calculator", num: "03" },
  { href: "/contact", key: "contact", label: "Contact", num: "04" },
];

export default function SiteNav({ active }: { active?: NavKey }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="nav">
        <div className="nav-inner">
          <Link className="nav-brand" href="/">
            <Image src="/color_logo.png" alt="VSUC" width={38} height={38} style={{ height: 38, width: "auto" }} />
            <span className="title">Veteran Services United</span>
          </Link>
          <nav className="nav-links">
            {LINKS.map((l) => (
              <Link key={l.key} href={l.href} className={active === l.key ? "active" : undefined}>
                {l.label}
              </Link>
            ))}
          </nav>
          <ThemeToggle />
          <button className="nav-burger" aria-label="Menu" onClick={() => setOpen(true)}>
            <i className="fa-duotone fa-bars" aria-hidden="true" />
          </button>
        </div>
        <div className="nav-sub">
          <span>Shreveport · LA · Est. 2024</span>
          <span>No wrong door</span>
        </div>
      </header>

      <div className={`nav-sheet${open ? " open" : ""}`} aria-hidden={!open}>
        <div className="top">
          <Link className="nav-brand" href="/" onClick={() => setOpen(false)}>
            <Image src="/color_logo.png" alt="VSUC" width={38} height={38} style={{ height: 38, width: "auto" }} />
            <span className="title">VSUC</span>
          </Link>
          <button className="close" aria-label="Close" onClick={() => setOpen(false)}>
            <i className="fa-duotone fa-xmark" aria-hidden="true" />
          </button>
        </div>
        <nav>
          {LINKS.map((l) => (
            <Link
              key={l.key}
              href={l.href}
              className={active === l.key ? "active" : undefined}
              onClick={() => setOpen(false)}
            >
              {l.label} <em>{l.num}</em>
            </Link>
          ))}
        </nav>
        <div className="foot-cta">
          <div className="lbl">Rather just call?</div>
          <div className="phone-num">(619) 550-8735</div>
          <div style={{ fontSize: 12, color: "var(--ink-mute)", letterSpacing: "1.1px", textTransform: "uppercase" }}>
            Mon – Fri · 8a – 6p Central
          </div>
          <Link href="/contact" className="btn primary" style={{ marginTop: 14, justifyContent: "center", width: "100%" }}>
            Book a free intro call
          </Link>
        </div>
      </div>
    </>
  );
}
