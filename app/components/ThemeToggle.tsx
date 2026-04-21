"use client";

import { useEffect, useState } from "react";

type Mode = "light" | "dark";

export default function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("light");

  useEffect(() => {
    const current = document.documentElement.dataset.mode as Mode | undefined;
    if (current === "light" || current === "dark") setMode(current);
  }, []);

  const toggle = () => {
    const next: Mode = mode === "light" ? "dark" : "light";
    setMode(next);
    document.documentElement.dataset.mode = next;
    try {
      localStorage.setItem("vsuc_mode", next);
    } catch {}
  };

  const nextLabel = mode === "light" ? "dark" : "light";

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`Switch to ${nextLabel} mode`}
      title={`Switch to ${nextLabel} mode`}
      onClick={toggle}
    >
      <i className={mode === "light" ? "fa-duotone fa-moon" : "fa-duotone fa-sun"} aria-hidden="true" />
    </button>
  );
}
