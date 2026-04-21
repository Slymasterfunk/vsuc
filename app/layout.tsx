import type { Metadata } from "next";
import { Inter, Caveat } from "next/font/google";
import Script from "next/script";
import "../assets/styles/globals.scss";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Veteran Services United",
  description: "Veteran-founded consulting. We sit with you until the paperwork makes sense.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-palette="navy"
      className={`${inter.variable} ${caveat.variable}`}
      suppressHydrationWarning
    >
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('vsuc_mode');if(m!=='light'&&m!=='dark'){m=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.mode=m;}catch(e){document.documentElement.dataset.mode='light';}})();`,
          }}
        />
        <Script
          src="https://kit.fontawesome.com/32686f6332.js"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  );
}
