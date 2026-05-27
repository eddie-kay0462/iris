// ===========================================================================
// 1NRI ALLIES — Onboarding screens (two directions × 4 steps)
// ---------------------------------------------------------------------------
// Direction A — "Editorial Light":  paper/ink, full-bleed photography,
//                                   Helvetica Light, sharp CTAs.
// Direction B — "Cinematic Ink":    deep ink background, image-led, dramatic
//                                   typography, warm accent metrics.
// Each screen is rendered inside an IOSDevice (390×844) artboard.
// ===========================================================================

const { useState } = React;

const IMG = {
  hero:    "img/lookbook-1.jpeg",
  hero2:   "img/lookbook-2.jpeg",
  detail:  "img/lookbook-3.png",
  product: "img/product-3.png",
  burgundy: "img/product-1.png",
  logoB:   "img/1nri-logo-black.png",
  logoW:   "img/1nri-logo-white.png",
  uaB:     "img/ua-logo-black.png",
  uaW:     "img/ua-logo-white.png",
};

// Sample ally data — what page.tsx loads from Supabase
const ALLY = {
  full_name: "Kwame Mensah",
  location: "University of Ghana, Legon",
  location_type: "campus",
  commission_rate: 0.12,
};
const firstName = (n) => n.split(" ")[0];
const initials = (n) => {
  const p = n.trim().split(/\s+/);
  return p.length === 1 ? p[0].slice(0,2).toUpperCase() : (p[0][0] + p[p.length-1][0]).toUpperCase();
};

// ===========================================================================
// SHARED ATOMS
// ===========================================================================

// Eyebrow — tracked-out caps, used everywhere
function Eyebrow({ children, dark, style }) {
  return (
    <div style={{
      fontFamily: "'Inter', 'HelveticaWorld', sans-serif",
      fontSize: 10, fontWeight: 500, letterSpacing: "0.28em",
      textTransform: "uppercase",
      color: dark ? "rgba(255,255,255,0.6)" : "#000",
      ...style,
    }}>{children}</div>
  );
}

// Step indicator — 4 ticks of varying width
function StepTicks({ step, total = 4, dark }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          height: 2,
          width: i === step ? 22 : 8,
          background: i <= step
            ? (dark ? "#fff" : "#000")
            : (dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)"),
          transition: "width 240ms cubic-bezier(0.2,0.7,0.2,1)",
        }}/>
      ))}
    </div>
  );
}

// Sharp ink CTA (Direction A)
function InkCTA({ children, onClick, arrow = true, secondary = false }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", height: 56,
      background: secondary ? "transparent" : "#000",
      color: secondary ? "#000" : "#F4F3F1",
      border: secondary ? "1px solid #000" : "none",
      fontFamily: "'Inter', 'HelveticaWorld', sans-serif",
      fontSize: 12, fontWeight: 700, letterSpacing: "0.22em",
      textTransform: "uppercase",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 22px", cursor: "pointer",
    }}>
      <span>{children}</span>
      {arrow && <span style={{ fontFamily: "'HelveticaWorld', sans-serif", fontSize: 18, fontWeight: 300, letterSpacing: 0 }}>→</span>}
    </button>
  );
}

// Glow CTA (Direction B) — translucent with hairline border
function GlowCTA({ children, onClick, arrow = true, secondary = false }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", height: 56,
      background: secondary ? "transparent" : "#F4F3F1",
      color: secondary ? "#F4F3F1" : "#0A0A0A",
      border: secondary ? "1px solid rgba(255,255,255,0.25)" : "none",
      fontFamily: "'Inter', 'HelveticaWorld', sans-serif",
      fontSize: 12, fontWeight: 700, letterSpacing: "0.22em",
      textTransform: "uppercase",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 22px", cursor: "pointer",
    }}>
      <span>{children}</span>
      {arrow && <span style={{ fontFamily: "'HelveticaWorld', sans-serif", fontSize: 18, fontWeight: 300, letterSpacing: 0 }}>→</span>}
    </button>
  );
}

// Co-brand lockup: 1NRI ✕ ua. for the top of each phone.
// Two wordmarks separated by a thin vertical hairline — signals that allies
// represent both houses without subordinating either.
function LogoMark({ dark }) {
  const rule = dark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.25)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <img
        src={dark ? IMG.logoW : IMG.logoB}
        alt="1NRI"
        style={{ height: 14, width: "auto", opacity: dark ? 0.9 : 1, display: "block" }}
      />
      <div style={{ width: 1, height: 14, background: rule }}/>
      <img
        src={dark ? IMG.uaW : IMG.uaB}
        alt="Unlikely Alliances"
        style={{ height: 13, width: "auto", opacity: dark ? 0.9 : 1, display: "block" }}
      />
    </div>
  );
}

// ===========================================================================
// DIRECTION A — EDITORIAL LIGHT
// ===========================================================================
// All four screens share the same chassis: paper background, ink type,
// full-bleed image at top, content stacked below.

const AStyles = {
  bg: "#F4F3F1",         // bone
  ink: "#000",
  body: "#3B414A",       // slate
  meta: "#59626E",       // steel
};

function ATopBar({ step }) {
  return (
    <div style={{
      padding: "70px 24px 0", display: "flex",
      alignItems: "center", justifyContent: "space-between",
      position: "relative", zIndex: 5,
    }}>
      <LogoMark/>
      <StepTicks step={step}/>
    </div>
  );
}

// ─── A1 · Welcome ──────────────────────────────────────────────────────────
function AWelcome() {
  return (
    <div style={{ background: AStyles.bg, height: "100%", width: "100%", display: "flex", flexDirection: "column" }}>
      <ATopBar step={0}/>

      {/* Full-bleed hero image */}
      <div style={{
        margin: "30px 0 0", height: 420, width: "100%",
        backgroundImage: `url(${IMG.hero})`,
        backgroundSize: "cover", backgroundPosition: "center 18%",
        position: "relative",
      }}>
        {/* overlay eyebrow lower-left */}
        <div style={{
          position: "absolute", left: 22, bottom: 22,
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          <Eyebrow dark style={{ color: "rgba(255,255,255,0.85)" }}>FW'26 · CLASS 04</Eyebrow>
          <div style={{
            fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 700,
            color: "#fff", fontSize: 11, letterSpacing: "0.06em",
          }}>TWO HOUSES · 24 ALLiES · 12 LOCATIONS</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "32px 24px 0", flex: 1, display: "flex", flexDirection: "column" }}>
        <Eyebrow style={{ marginBottom: 14 }}>Chapter 01 · Welcome</Eyebrow>
        <h1 style={{
          fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300,
          fontSize: 38, lineHeight: 1, color: AStyles.ink, margin: 0,
          letterSpacing: "-0.01em",
        }}>
          Welcome,<br/>{firstName(ALLY.full_name)}.
        </h1>
        <p style={{
          fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300,
          fontSize: 14, lineHeight: 1.5, color: AStyles.body,
          margin: "18px 0 0", maxWidth: 320,
        }}>
          You've joined a small network of allies carrying both 1NRi and
          Unlikely Alliances forward in your city. Three minutes to set up.
          Then the work begins.
        </p>
        <div style={{ flex: 1 }}/>
        <div style={{ padding: "0 0 28px" }}>
          <InkCTA>Begin</InkCTA>
        </div>
      </div>
    </div>
  );
}

// ─── A2 · Territory ────────────────────────────────────────────────────────
function ATerritory() {
  const pct = (ALLY.commission_rate * 100).toFixed(0);
  return (
    <div style={{ background: AStyles.bg, height: "100%", width: "100%", display: "flex", flexDirection: "column" }}>
      <ATopBar step={1}/>

      <div style={{ padding: "44px 24px 0", flex: 1, display: "flex", flexDirection: "column" }}>
        <Eyebrow style={{ marginBottom: 14 }}>Chapter 02 · Your post</Eyebrow>
        <h1 style={{
          fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300,
          fontSize: 38, lineHeight: 1, color: AStyles.ink, margin: 0,
          letterSpacing: "-0.01em",
        }}>
          Where you'll<br/>carry both<br/>houses.
        </h1>

        {/* Editorial location card with image-strip + meta column */}
        <div style={{ marginTop: 32, border: "1px solid #000", background: "#fff" }}>
          {/* Top: image */}
          <div style={{
            height: 160, width: "100%",
            backgroundImage: `url(${IMG.hero2})`,
            backgroundSize: "cover", backgroundPosition: "center 30%",
            filter: "grayscale(0.15) contrast(0.95)",
          }}/>

          {/* Double hairline divider */}
          <div style={{ height: 6, borderTop: "1px solid #000", borderBottom: "1px solid #000" }}/>

          {/* Meta rows */}
          <div style={{ padding: "18px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <Eyebrow style={{ fontSize: 9 }}>Location</Eyebrow>
              <div style={{
                fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300, fontSize: 13,
                color: AStyles.ink, textAlign: "right", maxWidth: 200,
              }}>{ALLY.location}</div>
            </div>
            <div style={{ height: 1, background: "rgba(0,0,0,0.12)", margin: "14px 0" }}/>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <Eyebrow style={{ fontSize: 9 }}>Type</Eyebrow>
              <div style={{
                fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300, fontSize: 13,
                color: AStyles.ink, textTransform: "lowercase",
              }}>{ALLY.location_type === "campus" ? "Campus chapter" : "City chapter"}</div>
            </div>
          </div>
        </div>

        {/* Commission — featured number */}
        <div style={{
          marginTop: 18, padding: "20px 18px",
          background: "#000", color: "#F4F3F1",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <Eyebrow style={{ color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>Your commission</Eyebrow>
            <div style={{
              fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300,
              fontSize: 11, color: "rgba(255,255,255,0.7)", letterSpacing: "0.02em",
            }}>on every 1NRi & ua. sale, paid monthly</div>
          </div>
          <div style={{
            fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300,
            fontSize: 56, lineHeight: 1, color: "#fff", letterSpacing: "-0.02em",
          }}>{pct}<span style={{ fontSize: 28, marginLeft: 2 }}>%</span></div>
        </div>

        <div style={{ flex: 1 }}/>
        <div style={{ padding: "20px 0 28px" }}>
          <InkCTA>Continue</InkCTA>
        </div>
      </div>
    </div>
  );
}

// ─── A3 · Profile photo ────────────────────────────────────────────────────
function APhoto() {
  return (
    <div style={{ background: AStyles.bg, height: "100%", width: "100%", display: "flex", flexDirection: "column" }}>
      <ATopBar step={2}/>

      <div style={{ padding: "44px 24px 0", flex: 1, display: "flex", flexDirection: "column" }}>
        <Eyebrow style={{ marginBottom: 14 }}>Chapter 03 · Your face</Eyebrow>
        <h1 style={{
          fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300,
          fontSize: 38, lineHeight: 1, color: AStyles.ink, margin: 0,
          letterSpacing: "-0.01em",
        }}>
          Show your<br/>face.
        </h1>
        <p style={{
          fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300,
          fontSize: 14, lineHeight: 1.5, color: AStyles.body,
          margin: "16px 0 0", maxWidth: 300,
        }}>
          So customers know who they're buying from. The Allies team will see
          it too.
        </p>

        {/* Photo block — large circle with initials, framed by a thin square */}
        <div style={{ marginTop: 36, display: "flex", justifyContent: "center" }}>
          <div style={{
            width: 220, height: 220, position: "relative",
            border: "1px solid #000",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {/* corner ticks */}
            {[
              { top: -1, left: -1, borderTop: "1px solid #000", borderLeft: "1px solid #000" },
              { top: -1, right: -1, borderTop: "1px solid #000", borderRight: "1px solid #000" },
              { bottom: -1, left: -1, borderBottom: "1px solid #000", borderLeft: "1px solid #000" },
              { bottom: -1, right: -1, borderBottom: "1px solid #000", borderRight: "1px solid #000" },
            ].map((s,i) => (
              <div key={i} style={{ position: "absolute", width: 12, height: 12, ...s, background: "transparent" }}/>
            ))}
            {/* circle plate */}
            <div style={{
              width: 168, height: 168, borderRadius: "50%",
              background: "#E7E2D8", display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative", overflow: "hidden",
            }}>
              <span style={{
                fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300, fontSize: 64,
                color: "#000", letterSpacing: "-0.02em",
              }}>{initials(ALLY.full_name)}</span>
              {/* small camera + chip in lower-right */}
              <div style={{
                position: "absolute", bottom: 8, right: 8,
                width: 36, height: 36, borderRadius: "50%", background: "#000",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "2px solid #E7E2D8",
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F4F3F1" strokeWidth="1.5">
                  <path d="M3 8h3l2-3h8l2 3h3v11H3z"/><circle cx="12" cy="13" r="3.5"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, textAlign: "center" }}>
          <Eyebrow style={{ fontSize: 9, color: AStyles.meta }}>JPG · PNG · UP TO 5MB</Eyebrow>
        </div>

        <div style={{ flex: 1 }}/>
        <div style={{ padding: "20px 0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <InkCTA>Choose Photo</InkCTA>
          <button style={{
            background: "transparent", border: "none", cursor: "pointer",
            padding: "10px 0",
            fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300,
            fontSize: 13, color: AStyles.body,
            textDecoration: "underline", textUnderlineOffset: 4,
          }}>Skip for now</button>
        </div>
      </div>
    </div>
  );
}

// ─── A4 · Ready ────────────────────────────────────────────────────────────
function AReady() {
  return (
    <div style={{ background: AStyles.bg, height: "100%", width: "100%", display: "flex", flexDirection: "column" }}>
      <ATopBar step={3}/>

      {/* Hero with detail product image */}
      <div style={{
        margin: "30px 0 0", height: 360, width: "100%",
        backgroundImage: `url(${IMG.detail})`,
        backgroundSize: "cover", backgroundPosition: "center",
        position: "relative",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, transparent 50%, rgba(244,243,241,1) 100%)",
        }}/>
        {/* Avatar overlapping bottom of hero */}
        <div style={{
          position: "absolute", left: "50%", bottom: -38, transform: "translateX(-50%)",
          width: 76, height: 76, borderRadius: "50%",
          background: "#000", border: "4px solid #F4F3F1",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300, fontSize: 26,
            color: "#F4F3F1",
          }}>{initials(ALLY.full_name)}</span>
        </div>
      </div>

      <div style={{ padding: "60px 24px 0", textAlign: "center", flex: 1, display: "flex", flexDirection: "column" }}>
        <Eyebrow style={{ marginBottom: 14 }}>Chapter 04 · Ready</Eyebrow>
        <h1 style={{
          fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300,
          fontSize: 36, lineHeight: 1, color: AStyles.ink, margin: 0,
          letterSpacing: "-0.01em",
        }}>
          The post is<br/>yours, {firstName(ALLY.full_name)}.
        </h1>
        <p style={{
          fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300,
          fontSize: 14, lineHeight: 1.5, color: AStyles.body,
          margin: "16px auto 0", maxWidth: 280,
        }}>
          Go make it count at <span style={{ color: "#000" }}>Legon</span>. The
          dashboard tracks every sale.
        </p>

        <div style={{ flex: 1 }}/>
        <div style={{ padding: "20px 0 28px" }}>
          <InkCTA>Enter the dashboard</InkCTA>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// DIRECTION B — CINEMATIC INK
// ===========================================================================

const BStyles = {
  bg: "#0A0A0A",
  ink: "#F4F3F1",
  body: "rgba(255,255,255,0.65)",
  meta: "rgba(255,255,255,0.45)",
  accent: "#D6763C",     // brick — for emphasis numbers
};

function BTopBar({ step, white = true }) {
  return (
    <div style={{
      padding: "70px 24px 0", display: "flex",
      alignItems: "center", justifyContent: "space-between",
      position: "relative", zIndex: 5,
    }}>
      <LogoMark dark/>
      <StepTicks step={step} dark/>
    </div>
  );
}

// ─── B1 · Welcome ──────────────────────────────────────────────────────────
function BWelcome() {
  return (
    <div style={{ background: BStyles.bg, height: "100%", width: "100%", position: "relative", overflow: "hidden" }}>
      {/* Full-bleed cinematic hero */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `url(${IMG.hero})`,
        backgroundSize: "cover", backgroundPosition: "center 20%",
      }}/>
      {/* Layered gradient: dark from top + bottom, lighter middle */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(10,10,10,0.6) 0%, rgba(10,10,10,0.1) 35%, rgba(10,10,10,0.4) 60%, rgba(10,10,10,0.96) 90%)",
      }}/>

      <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
        <BTopBar step={0}/>

        <div style={{ flex: 1 }}/>

        {/* Bottom content */}
        <div style={{ padding: "0 24px 28px" }}>
          <Eyebrow dark style={{ marginBottom: 14, color: "rgba(255,255,255,0.55)" }}>
            1NRi ✕ ua. · ALLiES · FW'26
          </Eyebrow>
          <h1 style={{
            fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300,
            fontSize: 46, lineHeight: 0.96, color: "#fff", margin: 0,
            letterSpacing: "-0.02em",
          }}>
            Welcome,<br/>{firstName(ALLY.full_name)}.
          </h1>

          {/* Hairline + numbered intro */}
          <div style={{
            margin: "26px 0 22px", display: "flex", gap: 18,
            paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.18)",
          }}>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300,
                fontSize: 26, color: "#fff", lineHeight: 1,
              }}>24</div>
              <Eyebrow dark style={{ marginTop: 6, fontSize: 9 }}>Allies in class</Eyebrow>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.18)" }}/>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300,
                fontSize: 26, color: "#fff", lineHeight: 1,
              }}>12</div>
              <Eyebrow dark style={{ marginTop: 6, fontSize: 9 }}>Cities & campuses</Eyebrow>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.18)" }}/>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300,
                fontSize: 26, color: "#fff", lineHeight: 1,
              }}>03</div>
              <Eyebrow dark style={{ marginTop: 6, fontSize: 9 }}>Minute setup</Eyebrow>
            </div>
          </div>

          <p style={{
            fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300,
            fontSize: 14, lineHeight: 1.55, color: BStyles.body,
            margin: "0 0 22px", maxWidth: 320,
          }}>
            You're one of twenty-four carrying both houses forward this
            season — 1NRi and Unlikely Alliances, under one post.
          </p>

          <GlowCTA>Begin</GlowCTA>
        </div>
      </div>
    </div>
  );
}

// ─── B2 · Territory ────────────────────────────────────────────────────────
function BTerritory() {
  const pct = (ALLY.commission_rate * 100).toFixed(0);
  return (
    <div style={{ background: BStyles.bg, height: "100%", width: "100%", position: "relative", overflow: "hidden" }}>
      {/* Subtle photographic backdrop, very dim */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `url(${IMG.hero2})`,
        backgroundSize: "cover", backgroundPosition: "center",
        opacity: 0.18, filter: "grayscale(1)",
      }}/>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(10,10,10,0.4) 0%, rgba(10,10,10,0.85) 60%, rgba(10,10,10,1) 100%)",
      }}/>

      <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
        <BTopBar step={1}/>

        <div style={{ padding: "60px 24px 0", flex: 1, display: "flex", flexDirection: "column" }}>
          <Eyebrow dark style={{ marginBottom: 14 }}>Chapter 02 · Your post</Eyebrow>
          <h1 style={{
            fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300,
            fontSize: 42, lineHeight: 0.96, color: "#fff", margin: 0,
            letterSpacing: "-0.02em",
          }}>
            You're posted<br/>at Legon.
          </h1>

          {/* Coordinates / location detail block */}
          <div style={{
            marginTop: 28, padding: "20px 0",
            borderTop: "1px solid rgba(255,255,255,0.18)",
            borderBottom: "1px solid rgba(255,255,255,0.18)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <Eyebrow dark style={{ fontSize: 9 }}>Location</Eyebrow>
              <div style={{
                fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300, fontSize: 13,
                color: "#fff", textAlign: "right",
              }}>{ALLY.location}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <Eyebrow dark style={{ fontSize: 9 }}>Coordinates</Eyebrow>
              <div style={{
                fontFamily: "'Inter', monospace", fontWeight: 500, fontSize: 11,
                color: "rgba(255,255,255,0.7)", letterSpacing: "0.04em",
              }}>5.6502° N · 0.1864° W</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <Eyebrow dark style={{ fontSize: 9 }}>Chapter type</Eyebrow>
              <div style={{
                fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300, fontSize: 13,
                color: "#fff",
              }}>Campus</div>
            </div>
          </div>

          {/* Commission — huge */}
          <div style={{ marginTop: 28 }}>
            <Eyebrow dark style={{ marginBottom: 10 }}>Your commission</Eyebrow>
            <div style={{
              display: "flex", alignItems: "baseline", gap: 14,
            }}>
              <div style={{
                fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300,
                fontSize: 116, lineHeight: 0.85, color: "#fff", letterSpacing: "-0.04em",
              }}>{pct}</div>
              <div>
                <div style={{
                  fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300,
                  fontSize: 36, color: BStyles.accent, lineHeight: 1, letterSpacing: "-0.02em",
                }}>%</div>
              <div style={{
                fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300,
                fontSize: 11, color: BStyles.meta, marginTop: 4, maxWidth: 110, lineHeight: 1.3,
              }}>on every 1NRi<br/>& ua. sale</div>
              </div>
            </div>
          </div>

          <div style={{ flex: 1 }}/>
          <div style={{ padding: "20px 0 28px" }}>
            <GlowCTA>Continue</GlowCTA>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── B3 · Profile photo ────────────────────────────────────────────────────
function BPhoto() {
  return (
    <div style={{ background: BStyles.bg, height: "100%", width: "100%", position: "relative", overflow: "hidden" }}>
      {/* Soft radial light at center to spotlight the upload circle */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(circle at 50% 42%, rgba(214,118,60,0.10) 0%, rgba(10,10,10,0) 50%)",
      }}/>

      <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
        <BTopBar step={2}/>

        <div style={{ padding: "44px 24px 0", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <Eyebrow dark style={{ marginBottom: 14 }}>Chapter 03 · Your face</Eyebrow>
          <h1 style={{
            fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300,
            fontSize: 38, lineHeight: 0.96, color: "#fff", margin: 0,
            letterSpacing: "-0.02em",
          }}>
            Show your face.
          </h1>
          <p style={{
            fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300,
            fontSize: 13.5, lineHeight: 1.55, color: BStyles.body,
            margin: "14px 0 0", maxWidth: 280,
          }}>
            Customers buy from people, not handles. Make it the same one you'd
            put on a passport.
          </p>

          {/* Concentric circles with avatar in the middle, mimicking a portal */}
          <div style={{ marginTop: 36, position: "relative", width: 232, height: 232 }}>
            {/* outer ring */}
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.12)",
            }}/>
            <div style={{
              position: "absolute", inset: 18, borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.18)",
            }}/>
            <div style={{
              position: "absolute", inset: 36, borderRadius: "50%",
              background: "rgba(255,255,255,0.04)",
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
              border: "1px solid rgba(255,255,255,0.18)",
            }}>
              <span style={{
                fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300, fontSize: 62,
                color: "#fff", letterSpacing: "-0.02em",
              }}>{initials(ALLY.full_name)}</span>
            </div>
            {/* corner camera button */}
            <div style={{
              position: "absolute", right: 22, bottom: 22,
              width: 44, height: 44, borderRadius: "50%", background: "#F4F3F1",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="1.5">
                <path d="M3 8h3l2-3h8l2 3h3v11H3z"/><circle cx="12" cy="13" r="3.5"/>
              </svg>
            </div>
          </div>

          <Eyebrow dark style={{ marginTop: 20, fontSize: 9 }}>JPG · PNG · UP TO 5MB</Eyebrow>

          <div style={{ flex: 1 }}/>
          <div style={{ padding: "20px 0 16px", display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
            <GlowCTA>Choose Photo</GlowCTA>
            <button style={{
              background: "transparent", border: "none", cursor: "pointer",
              padding: "10px 0",
              fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300,
              fontSize: 13, color: BStyles.body,
              textDecoration: "underline", textUnderlineOffset: 4,
            }}>Skip for now</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── B4 · Ready ────────────────────────────────────────────────────────────
function BReady() {
  return (
    <div style={{ background: BStyles.bg, height: "100%", width: "100%", position: "relative", overflow: "hidden" }}>
      {/* Full-bleed cinematic image */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `url(${IMG.detail})`,
        backgroundSize: "cover", backgroundPosition: "center 25%",
      }}/>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.15) 28%, rgba(10,10,10,0.6) 65%, rgba(10,10,10,0.98) 92%)",
      }}/>

      <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
        <BTopBar step={3}/>

        <div style={{ flex: 1 }}/>

        <div style={{ padding: "0 24px 28px" }}>
          {/* Avatar (now circular, w/ checkmark) */}
          <div style={{
            display: "flex", alignItems: "center", gap: 14, marginBottom: 22,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative",
            }}>
              <span style={{
                fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300, fontSize: 20,
                color: "#fff",
              }}>{initials(ALLY.full_name)}</span>
              {/* check pip */}
              <div style={{
                position: "absolute", right: -3, bottom: -3,
                width: 20, height: 20, borderRadius: "50%",
                background: "#9AF16E", border: "2px solid #0A0A0A",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#0A0A0A" strokeWidth="1.8" strokeLinecap="square">
                  <path d="M2 6.2 4.8 9 10 3.4"/>
                </svg>
              </div>
            </div>
            <div>
              <Eyebrow dark style={{ marginBottom: 4 }}>Setup complete</Eyebrow>
              <div style={{
                fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300,
                fontSize: 14, color: "#fff",
              }}>{ALLY.full_name} · Legon</div>
            </div>
          </div>

          <h1 style={{
            fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300,
            fontSize: 46, lineHeight: 0.96, color: "#fff", margin: 0,
            letterSpacing: "-0.02em",
          }}>
            Go make<br/>it count.
          </h1>

          <p style={{
            fontFamily: "'HelveticaWorld', sans-serif", fontWeight: 300,
            fontSize: 14, lineHeight: 1.55, color: BStyles.body,
            margin: "18px 0 22px", maxWidth: 320,
          }}>
            Every sale you log lands in the leaderboard. We're rooting for you
            from Accra.
          </p>

          <GlowCTA>Enter the dashboard</GlowCTA>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// EXPORTS
// ===========================================================================
Object.assign(window, {
  AWelcome, ATerritory, APhoto, AReady,
  BWelcome, BTerritory, BPhoto, BReady,
});
