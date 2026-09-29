import { useEffect, useMemo, useRef, useState } from "react";

function App() {
  const [service, setService] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState(null);
  const [revealed, setRevealed] = useState({});
  const [activeMemory, setActiveMemory] = useState(null);

  const pageRef = useRef(null);

  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;

    const elements = root.querySelectorAll("[data-reveal]");

    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -35px 0px",
      }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [result]);

  const investigateIncident = async () => {
    if (!service.trim() || !symptoms.trim()) {
      setError("Enter the affected service and describe the incident symptoms.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setOutcome(null);
    setActiveMemory(null);
    setRevealed({});

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/incidents/investigate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            service,
            symptoms,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Investigation failed");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(
        "Unable to connect to the Incident Response Agent. Make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const recordOutcome = async (status) => {
    setOutcome(status);
    setError("");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/incidents/outcome",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            incident_id: "INC-002",
            service,
            action_taken: result?.recommendation || "Agent recommendation",
            outcome: status,
            notes:
              status === "successful"
                ? "Engineer confirmed that the recommended action worked."
                : "Engineer confirmed that the recommended action failed.",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save outcome");
      }
    } catch (err) {
      console.error(err);
      setError("Outcome was displayed, but could not be saved to memory.");
    }
  };

  const recommendationSections = useMemo(() => {
    if (!result?.recommendation) return {};

    const text = result.recommendation;

    const getSection = (title, nextTitles = []) => {
      const marker = `**${title}:**`;
      const start = text.indexOf(marker);

      if (start === -1) return "";

      let end = text.length;

      nextTitles.forEach((next) => {
        const index = text.indexOf(`**${next}:**`, start + marker.length);
        if (index !== -1 && index < end) {
          end = index;
        }
      });

      return text
        .slice(start + marker.length, end)
        .trim()
        .replace(/\*\*/g, "");
    };

    return {
      learnedPattern: getSection("LEARNED PATTERN", [
        "LIKELY ROOT CAUSE",
        "PREVIOUS FIXES THAT FAILED",
      ]),
      rootCause: getSection("LIKELY ROOT CAUSE", [
        "PREVIOUS FIXES THAT FAILED",
        "PREVIOUS FIXES THAT WORKED",
      ]),
      failedFixes: getSection("PREVIOUS FIXES THAT FAILED", [
        "PREVIOUS FIXES THAT WORKED",
        "RECOMMENDED ACTION",
      ]),
      workingFixes: getSection("PREVIOUS FIXES THAT WORKED", [
        "RECOMMENDED ACTION",
        "WHY",
      ]),
      recommendedAction: getSection("RECOMMENDED ACTION", [
        "WHY",
        "MEMORY EVIDENCE",
      ]),
      why: getSection("WHY", ["MEMORY EVIDENCE"]),
      evidence: getSection("MEMORY EVIDENCE"),
    };
  }, [result]);

  const revealReason = (key) => {
    setRevealed((current) => ({ ...current, [key]: true }));
  };

  const reasonCards = [
    {
      key: "pattern",
      number: "01",
      title: "Learned pattern",
      content:
        recommendationSections.learnedPattern || result?.recommendation,
      className: "primary",
    },
    {
      key: "root",
      number: "02",
      title: "Likely root cause",
      content:
        recommendationSections.rootCause ||
        "Analyzing historical evidence...",
    },
    {
      key: "failed",
      number: "03",
      title: "Failed before",
      content:
        recommendationSections.failedFixes || "No previous failed fix found.",
      className: "fix-bad",
    },
    {
      key: "working",
      number: "04",
      title: "Proven fixes",
      content:
        recommendationSections.workingFixes ||
        "No previous successful fix found.",
      className: "fix-good",
    },
    {
      key: "action",
      number: "05",
      title: "Recommended action",
      content:
        recommendationSections.recommendedAction || result?.recommendation,
      className: "primary action-card",
    },
    {
      key: "why",
      number: "06",
      title: "Why this recommendation",
      content:
        recommendationSections.why ||
        "Recommendation generated from current symptoms and recalled memory.",
    },
    {
      key: "evidence",
      number: "07",
      title: "Memory evidence",
      content:
        recommendationSections.evidence ||
        "Historical evidence retrieved from Hindsight.",
    },
  ];

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: #060911;
          color: #eef4ff;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        body,
        button,
        input,
        textarea {
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        button,
        input,
        textarea {
          font: inherit;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }

        ::selection {
          background: rgba(96,165,250,.24);
          color: #ffffff;
        }

        .app {
          min-height: 100vh;
          position: relative;
          overflow-x: clip;
          background:
            radial-gradient(
              circle at 15% 5%,
              rgba(37, 99, 235, 0.16),
              transparent 27%
            ),
            radial-gradient(
              circle at 88% 18%,
              rgba(124, 58, 237, 0.13),
              transparent 28%
            ),
            radial-gradient(
              circle at 50% 100%,
              rgba(6, 182, 212, 0.07),
              transparent 30%
            ),
            #060911;
        }

        .app::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          opacity: .26;
          background-image:
            linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px);
          background-size: 44px 44px;
          mask-image: linear-gradient(to bottom, black, transparent 82%);
          animation: gridDrift 22s linear infinite;
        }

        .app::after {
          content: "";
          position: fixed;
          width: 420px;
          height: 420px;
          left: 50%;
          top: 42%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          border: 1px solid rgba(96,165,250,.035);
          box-shadow:
            0 0 0 70px rgba(96,165,250,.018),
            0 0 0 140px rgba(139,92,246,.012);
          pointer-events: none;
          z-index: 0;
          animation: ambientOrbit 18s ease-in-out infinite;
        }

        @keyframes gridDrift {
          from { transform: translate3d(0,0,0); }
          to { transform: translate3d(22px,22px,0); }
        }

        @keyframes ambientOrbit {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: .55;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.06);
            opacity: .9;
          }
        }

        .shell {
          width: min(1380px, calc(100% - 42px));
          margin: auto;
          padding: 22px 0 70px;
          position: relative;
          z-index: 2;
        }

        /* NAVIGATION */

        .nav {
          height: 62px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 17px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 16px;
          background: rgba(9,14,25,.78);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          position: sticky;
          top: 14px;
          z-index: 20;
          box-shadow: 0 18px 45px rgba(0,0,0,.18);
          animation: navEnter .65s cubic-bezier(.2,.8,.2,1) both;
        }

        .nav::after {
          content: "";
          position: absolute;
          left: 16%;
          right: 16%;
          bottom: -1px;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(96,165,250,.42),
            rgba(167,139,250,.36),
            transparent
          );
          opacity: .7;
          pointer-events: none;
        }

        @keyframes navEnter {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .brand-mark {
          width: 37px;
          height: 37px;
          border-radius: 11px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg,#2563eb,#7c3aed);
          box-shadow: 0 8px 25px rgba(59,130,246,.25);
          font-size: 17px;
          transition:
            transform .35s cubic-bezier(.2,.8,.2,1),
            box-shadow .35s ease;
        }

        .brand:hover .brand-mark {
          transform: rotate(-5deg) translateY(-1px);
          box-shadow: 0 12px 30px rgba(59,130,246,.34);
        }

        .brand-name {
          font-size: 14px;
          font-weight: 800;
          letter-spacing: -.01em;
        }

        .brand-meta {
          color: #64748b;
          font-size: 10px;
          margin-top: 2px;
          letter-spacing: .04em;
        }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .memory-pill,
        .status-pill {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 8px 11px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.035);
          color: #aebbd0;
          font-size: 11px;
          font-weight: 700;
          transition:
            transform .25s ease,
            border-color .25s ease,
            background .25s ease;
        }

        .memory-pill:hover,
        .status-pill:hover {
          transform: translateY(-1px);
          border-color: rgba(255,255,255,.13);
          background: rgba(255,255,255,.05);
        }

        .memory-pill {
          color: #b9a9ff;
        }

        .online-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 0 5px rgba(34,197,94,.08);
          animation: onlinePulse 2.4s ease-in-out infinite;
        }

        @keyframes onlinePulse {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(34,197,94,.07);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(34,197,94,0);
          }
        }

        /* HERO */

        .hero {
          padding: 52px 5px 34px;
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: end;
          gap: 30px;
        }

        .hero-content {
          animation: heroEnter .8s .08s cubic-bezier(.2,.8,.2,1) both;
        }

        @keyframes heroEnter {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #7dd3fc;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .13em;
          text-transform: uppercase;
          margin-bottom: 13px;
        }

        .eyebrow-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #7dd3fc;
          box-shadow: 0 0 12px rgba(125,211,252,.65);
          animation: tinyPulse 2s ease-in-out infinite;
        }

        @keyframes tinyPulse {
          0%, 100% { transform: scale(1); opacity: .8; }
          50% { transform: scale(1.3); opacity: 1; }
        }

        .hero h1 {
          margin: 0;
          color: #f8fbff;
          font-size: clamp(34px,5vw,61px);
          line-height: .98;
          letter-spacing: -.065em;
          max-width: 820px;
        }

        .hero h1 span {
          background: linear-gradient(
            100deg,
            #60a5fa,
            #a78bfa 55%,
            #67e8f9
          );
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          background-size: 180% 100%;
          animation: gradientFlow 7s ease-in-out infinite;
        }

        @keyframes gradientFlow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .hero-copy {
          margin: 17px 0 0;
          max-width: 680px;
          color: #8290a6;
          font-size: 14px;
          line-height: 1.7;
        }

        .hero-metric {
          min-width: 205px;
          padding: 17px;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(15,23,42,.55);
          border-radius: 15px;
          animation:
            metricEnter .75s .25s cubic-bezier(.2,.8,.2,1) both,
            metricFloat 5s 1s ease-in-out infinite;
          transition:
            border-color .3s ease,
            background .3s ease,
            transform .3s ease;
        }

        .hero-metric:hover {
          border-color: rgba(96,165,250,.18);
          background: rgba(15,23,42,.72);
        }

        @keyframes metricEnter {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes metricFloat {
          0%, 100% { translate: 0 0; }
          50% { translate: 0 -4px; }
        }

        .metric-label {
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: .1em;
          font-size: 9px;
          font-weight: 800;
        }

        .metric-value {
          margin-top: 8px;
          font-size: 20px;
          font-weight: 850;
        }

        .metric-sub {
          margin-top: 4px;
          color: #64748b;
          font-size: 10px;
        }

        /* REVEAL SYSTEM */

        [data-reveal] {
          opacity: 0;
          transform: translateY(18px);
          transition:
            opacity .65s ease,
            transform .65s cubic-bezier(.2,.8,.2,1);
        }

        [data-reveal].is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .delay-1 { transition-delay: .05s; }
        .delay-2 { transition-delay: .1s; }
        .delay-3 { transition-delay: .15s; }

        /* MAIN GRID */

        .main-grid {
          display: grid;
          grid-template-columns: 430px 1fr;
          gap: 17px;
        }

        .panel {
          border: 1px solid rgba(255,255,255,.075);
          background: rgba(11,17,30,.82);
          border-radius: 19px;
          box-shadow: 0 20px 60px rgba(0,0,0,.18);
          overflow: hidden;
          position: relative;
          transition:
            transform .35s cubic-bezier(.2,.8,.2,1),
            border-color .35s ease,
            box-shadow .35s ease;
        }

        .panel::before,
        .result-panel::before,
        .learning::before {
          content: "";
          position: absolute;
          top: 0;
          left: 10%;
          width: 80%;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(96,165,250,.18),
            transparent
          );
          opacity: .65;
          pointer-events: none;
        }

        .panel:hover,
        .result-panel:hover,
        .learning:hover {
          border-color: rgba(255,255,255,.11);
          box-shadow: 0 25px 70px rgba(0,0,0,.24);
        }

        .panel-top {
          padding: 20px 21px;
          border-bottom: 1px solid rgba(255,255,255,.06);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
        }

        .panel-title {
          font-size: 14px;
          font-weight: 800;
        }

        .panel-subtitle {
          color: #66758b;
          font-size: 10px;
          margin-top: 4px;
        }

        .tag {
          padding: 6px 8px;
          border-radius: 7px;
          font-size: 9px;
          letter-spacing: .06em;
          font-weight: 800;
          color: #7dd3fc;
          background: rgba(56,189,248,.07);
          border: 1px solid rgba(56,189,248,.12);
          white-space: nowrap;
          transition:
            background .25s ease,
            border-color .25s ease,
            transform .25s ease;
        }

        .tag {
          position: relative;
          overflow: hidden;
        }

        .tag::after {
          content: "";
          position: absolute;
          top: -20%;
          bottom: -20%;
          left: -55%;
          width: 32%;
          transform: skewX(-18deg);
          background: linear-gradient(90deg, transparent, rgba(125,211,252,.35), transparent);
          opacity: 0;
          pointer-events: none;
        }

        .tag:hover {
          background: rgba(56,189,248,.1);
          border-color: rgba(56,189,248,.2);
          transform: translateY(-1px);
        }

        .tag:hover::after {
          opacity: 1;
          animation: tagSpark .75s ease forwards;
        }

        @keyframes tagSpark {
          from { left: -55%; }
          to { left: 125%; }
        }

        .panel-body {
          padding: 21px;
        }

        /* INCIDENT INPUT */

        .incident-header {
          display: flex;
          gap: 10px;
          padding: 12px;
          border-radius: 12px;
          background: rgba(248,113,113,.045);
          border: 1px solid rgba(248,113,113,.10);
          margin-bottom: 19px;
          transition:
            transform .25s ease,
            background .25s ease,
            border-color .25s ease;
        }

        .incident-header:hover {
          transform: translateX(2px);
          background: rgba(248,113,113,.06);
          border-color: rgba(248,113,113,.15);
        }

        .severity {
          width: 29px;
          height: 29px;
          border-radius: 8px;
          display: grid;
          place-items: center;
          background: rgba(248,113,113,.11);
          color: #fb7185;
          font-size: 13px;
          flex: 0 0 auto;
          animation: severityPulse 3s ease-in-out infinite;
        }

        @keyframes severityPulse {
          0%, 100% { box-shadow: 0 0 0 rgba(248,113,113,0); }
          50% { box-shadow: 0 0 20px rgba(248,113,113,.08); }
        }

        .severity-title {
          color: #e2e8f0;
          font-size: 11px;
          font-weight: 800;
        }

        .severity-sub {
          color: #64748b;
          font-size: 9px;
          margin-top: 3px;
        }

        .field {
          margin-bottom: 16px;
          position: relative;
        }

        /* Focus spark: a small light sweep appears around active form fields. */
        .field:hover::before {
          content: "";
          position: absolute;
          left: 1px;
          right: 1px;
          bottom: -1px;
          height: 1px;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent 0%, rgba(96,165,250,.05) 25%, rgba(125,211,252,.85) 50%, rgba(167,139,250,.3) 70%, transparent 100%);
          background-size: 220% 100%;
          pointer-events: none;
          animation: fieldSpark .95s ease-in-out infinite;
          filter: drop-shadow(0 0 6px rgba(96,165,250,.4));
        }

        .field:focus-within::after {
          content: "";
          position: absolute;
          left: 1px;
          right: 1px;
          bottom: -1px;
          height: 1px;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent 0%, rgba(125,211,252,.05) 25%, rgba(167,139,250,.95) 50%, rgba(103,232,249,.35) 70%, transparent 100%);
          background-size: 220% 100%;
          pointer-events: none;
          animation: fieldSpark 1.25s ease-in-out infinite;
          filter: drop-shadow(0 0 7px rgba(167,139,250,.45));
        }

        @keyframes fieldSpark {
          0% { background-position: 120% 0; opacity: 0; }
          18% { opacity: 1; }
          55% { opacity: 1; }
          100% { background-position: -120% 0; opacity: 0; }
        }

        .field label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 7px;
          color: #a9b5c7;
          font-size: 10px;
          font-weight: 750;
          text-transform: uppercase;
          letter-spacing: .07em;
        }

        .field-hint {
          color: #4f5d72;
          text-transform: none;
          letter-spacing: 0;
          font-weight: 500;
        }

        .input,
        .textarea {
          width: 100%;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(3,7,18,.68);
          color: #edf4ff;
          outline: none;
          border-radius: 10px;
          transition:
            border-color .25s ease,
            box-shadow .25s ease,
            background .25s ease,
            transform .25s ease;
        }

        .input {
          padding: 12px;
          font-size: 12px;
        }

        .textarea {
          min-height: 155px;
          resize: vertical;
          padding: 12px;
          line-height: 1.55;
          font-size: 11px;
        }

        .input::placeholder,
        .textarea::placeholder {
          color: #3f4c60;
          transition: opacity .2s ease;
        }

        .input:hover,
        .textarea:hover {
          border-color: rgba(96,165,250,.34);
          box-shadow: 0 0 16px rgba(96,165,250,.07);
        }

        .input:focus,
        .textarea:focus {
          border-color: rgba(167,139,250,.72);
          box-shadow:
            0 0 0 3px rgba(124,58,237,.09),
            0 0 22px rgba(96,165,250,.10),
            0 8px 30px rgba(37,99,235,.05);
          background: rgba(3,7,18,.8);
          transform: translateY(-1px);
        }

        .input:focus::placeholder,
        .textarea:focus::placeholder {
          opacity: .6;
        }

        .investigate {
          width: 100%;
          border: 0;
          border-radius: 10px;
          padding: 13px;
          background: linear-gradient(100deg,#2563eb,#6d4aff);
          color: white;
          cursor: pointer;
          font-size: 11px;
          font-weight: 800;
          box-shadow: 0 12px 30px rgba(37,99,235,.2);
          transition:
            transform .22s cubic-bezier(.2,.8,.2,1),
            box-shadow .25s ease,
            filter .25s ease;
          position: relative;
          overflow: hidden;
        }

        .investigate::before {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          left: -35%;
          width: 25%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255,255,255,.18),
            transparent
          );
          transform: skewX(-18deg);
          transition: left .55s ease;
        }

        .investigate::after {
          content: "";
          position: absolute;
          inset: 1px;
          border-radius: 9px;
          border: 1px solid transparent;
          background: linear-gradient(100deg, transparent 20%, rgba(255,255,255,.65) 50%, transparent 80%) border-box;
          background-size: 220% 100%;
          background-position: 120% 0;
          opacity: 0;
          pointer-events: none;
        }

        .investigate:hover:not(:disabled)::after {
          opacity: .7;
          animation: buttonSpark 1.15s ease-in-out infinite;
        }

        @keyframes buttonSpark {
          0% { background-position: 120% 0; }
          100% { background-position: -120% 0; }
        }

        .investigate:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 16px 35px rgba(37,99,235,.3);
          filter: brightness(1.04);
        }

        .investigate:hover:not(:disabled)::before {
          left: 120%;
        }

        .investigate:active:not(:disabled) {
          transform: translateY(0) scale(.99);
        }

        .investigate:disabled {
          opacity: .65;
          cursor: wait;
        }

        .button-inner {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          position: relative;
          z-index: 1;
        }

        .spinner {
          width: 13px;
          height: 13px;
          border: 2px solid rgba(255,255,255,.35);
          border-top-color: white;
          border-radius: 50%;
          animation: spin .7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error {
          margin-top: 12px;
          padding: 10px;
          border-radius: 9px;
          color: #fda4af;
          background: rgba(127,29,29,.14);
          border: 1px solid rgba(248,113,113,.15);
          font-size: 10px;
          line-height: 1.5;
          animation: errorIn .3s ease both;
        }

        @keyframes errorIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* MEMORY */

        .memory-status {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .memory-engine {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #9aa9bd;
          font-size: 10px;
        }

        .memory-engine-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #8b5cf6;
          box-shadow: 0 0 14px rgba(139,92,246,.8);
          animation: memoryPulse 2.2s ease-in-out infinite;
        }

        @keyframes memoryPulse {
          0%, 100% { opacity: .75; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.25); }
        }

        .memory-count {
          color: #a78bfa;
          font-size: 10px;
          font-weight: 800;
        }

        .memory-empty {
          min-height: 300px;
          border: 1px dashed rgba(255,255,255,.08);
          border-radius: 13px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 25px;
          background: rgba(3,7,18,.3);
          position: relative;
          overflow: hidden;
        }

        .memory-empty::before,
        .memory-empty::after {
          content: "";
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(139,92,246,.08);
          pointer-events: none;
        }

        .memory-empty::before {
          width: 170px;
          height: 170px;
          animation: memoryOrbit 8s linear infinite;
        }

        .memory-empty::after {
          width: 240px;
          height: 240px;
          opacity: .5;
          animation: memoryOrbit 12s linear infinite reverse;
        }

        @keyframes memoryOrbit {
          from { transform: rotate(0deg) scale(1); }
          to { transform: rotate(360deg) scale(1.03); }
        }

        .memory-icon {
          width: 62px;
          height: 62px;
          border-radius: 17px;
          display: grid;
          place-items: center;
          background: rgba(99,102,241,.08);
          border: 1px solid rgba(139,92,246,.16);
          color: #a78bfa;
          font-size: 25px;
          box-shadow: 0 0 40px rgba(99,102,241,.08);
          position: relative;
          z-index: 1;
          animation: iconFloat 4s ease-in-out infinite;
        }

        @keyframes iconFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }

        .memory-empty-title {
          margin-top: 17px;
          color: #cbd5e1;
          font-size: 12px;
          font-weight: 750;
          position: relative;
          z-index: 1;
        }

        .memory-empty-copy {
          max-width: 300px;
          margin-top: 7px;
          color: #536176;
          font-size: 10px;
          line-height: 1.6;
          position: relative;
          z-index: 1;
        }

        .memory-list {
          max-height: 365px;
          overflow-y: auto;
          padding-right: 3px;
          scroll-behavior: smooth;
        }

        .memory-list::-webkit-scrollbar {
          width: 4px;
        }

        .memory-list::-webkit-scrollbar-thumb {
          background: #26344a;
          border-radius: 20px;
        }

        .memory-item {
          position: relative;
          padding: 11px 12px 11px 31px;
          margin-bottom: 8px;
          border-radius: 10px;
          background: rgba(3,7,18,.55);
          border: 1px solid rgba(255,255,255,.055);
          color: #98a6ba;
          font-size: 10px;
          line-height: 1.55;
          cursor: default;
          opacity: 0;
          transform: translateX(-8px);
          animation: memoryIn .45s cubic-bezier(.2,.8,.2,1) forwards;
          transition:
            transform .25s ease,
            border-color .25s ease,
            background .25s ease,
            color .25s ease;
        }

        .memory-item:hover,
        .memory-item.active {
          transform: translateX(3px);
          border-color: rgba(139,92,246,.22);
          background: rgba(15,23,42,.68);
          color: #c0cad8;
        }

        .memory-item::before {
          content: "";
          position: absolute;
          left: 12px;
          top: 15px;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #8b5cf6;
          box-shadow: 0 0 12px rgba(139,92,246,.55);
          transition: transform .25s ease, box-shadow .25s ease;
        }

        .memory-item:hover::before,
        .memory-item.active::before {
          transform: scale(1.35);
          box-shadow: 0 0 16px rgba(139,92,246,.8);
        }

        @keyframes memoryIn {
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        /* LOADING */

        .loading {
          min-height: 300px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          position: relative;
        }

        .loading-ring {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: 2px solid rgba(96,165,250,.12);
          border-top-color: #60a5fa;
          border-right-color: #a78bfa;
          animation: spin 1s linear infinite;
          box-shadow: 0 0 28px rgba(96,165,250,.07);
        }

        .loading-ring::after {
          content: "";
          position: absolute;
          width: 78px;
          height: 78px;
          border-radius: 50%;
          border: 1px dashed rgba(167,139,250,.12);
          animation: spin 4s linear infinite reverse;
        }

        .loading-title {
          margin-top: 16px;
          color: #cbd5e1;
          font-size: 12px;
          font-weight: 750;
        }

        .loading-copy {
          margin-top: 6px;
          color: #536176;
          font-size: 10px;
          max-width: 360px;
          line-height: 1.5;
        }

        .loading-steps {
          display: flex;
          gap: 5px;
          margin-top: 12px;
        }

        .loading-step {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #60a5fa;
          animation: loadingDots 1.1s ease-in-out infinite;
        }

        .loading-step:nth-child(2) { animation-delay: .12s; }
        .loading-step:nth-child(3) { animation-delay: .24s; }

        @keyframes loadingDots {
          0%, 70%, 100% {
            transform: translateY(0);
            opacity: .35;
          }
          35% {
            transform: translateY(-4px);
            opacity: 1;
          }
        }

        /* RESULTS */

        .results {
          margin-top: 17px;
          display: grid;
          grid-template-columns: 1fr 1.7fr;
          gap: 17px;
        }

        .result-panel {
          border: 1px solid rgba(255,255,255,.075);
          background: rgba(11,17,30,.82);
          border-radius: 19px;
          overflow: hidden;
          position: relative;
          box-shadow: 0 20px 60px rgba(0,0,0,.18);
          transition:
            border-color .35s ease,
            box-shadow .35s ease;
        }

        .result-panel[data-reveal].is-visible {
          animation: resultSettle .7s cubic-bezier(.2,.8,.2,1) both;
        }

        .result-panel:nth-child(2)[data-reveal].is-visible {
          animation-delay: .08s;
        }

        @keyframes resultSettle {
          from {
            opacity: 0;
            transform: translateY(20px) scale(.992);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .result-content {
          padding: 20px;
        }

        .context-row {
          padding: 11px 0;
          border-bottom: 1px solid rgba(255,255,255,.055);
          transition: padding-left .25s ease;
        }

        .context-row:hover {
          padding-left: 3px;
        }

        .context-row:last-child {
          border-bottom: 0;
        }

        .context-label {
          color: #59677b;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: .08em;
          font-weight: 800;
        }

        .context-value {
          margin-top: 5px;
          color: #cbd5e1;
          font-size: 11px;
          line-height: 1.55;
        }

        /* REASONING */

        .reasoning-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .reason-card {
          padding: 14px;
          border-radius: 12px;
          background: rgba(3,7,18,.5);
          border: 1px solid rgba(255,255,255,.06);
          transition:
            transform .28s cubic-bezier(.2,.8,.2,1),
            border-color .28s ease,
            background .28s ease,
            box-shadow .28s ease;
        }

        .reason-card:hover {
          transform: translateY(-3px);
          border-color: rgba(255,255,255,.1);
          background: rgba(3,7,18,.64);
          box-shadow: 0 14px 30px rgba(0,0,0,.14);
        }

        .reason-card.primary {
          grid-column: span 2;
          background:
            linear-gradient(
              135deg,
              rgba(37,99,235,.10),
              rgba(124,58,237,.08)
            );
          border-color: rgba(96,165,250,.13);
        }

        .reason-card.action-card {
          position: relative;
          overflow: hidden;
        }

        .reason-card.action-card::after {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 2px;
          background: linear-gradient(
            to bottom,
            #60a5fa,
            #a78bfa,
            transparent
          );
          opacity: .9;
        }

        .reason-heading {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #8fa0b7;
          font-size: 9px;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: .09em;
        }

        .reason-number {
          width: 20px;
          height: 20px;
          display: grid;
          place-items: center;
          border-radius: 6px;
          background: rgba(96,165,250,.1);
          color: #60a5fa;
          font-size: 9px;
          transition:
            transform .25s ease,
            background .25s ease;
        }

        .reason-card:hover .reason-number {
          transform: translateY(-1px) scale(1.04);
          background: rgba(96,165,250,.15);
        }

        .reason-text {
          margin-top: 9px;
          color: #b6c2d2;
          font-size: 10px;
          line-height: 1.65;
          white-space: pre-wrap;
        }

        .fix-good {
          border-color: rgba(34,197,94,.13);
          background: rgba(34,197,94,.035);
        }

        .fix-bad {
          border-color: rgba(248,113,113,.13);
          background: rgba(248,113,113,.035);
        }

        .fix-good .reason-number {
          color: #4ade80;
          background: rgba(34,197,94,.08);
        }

        .fix-bad .reason-number {
          color: #fb7185;
          background: rgba(248,113,113,.08);
        }

        /* OUTCOME */

        .outcome-box {
          margin-top: 13px;
          padding: 14px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(3,7,18,.4);
          transition:
            border-color .3s ease,
            background .3s ease;
        }

        .outcome-box:hover {
          border-color: rgba(255,255,255,.1);
          background: rgba(3,7,18,.5);
        }

        .outcome-title {
          color: #aab7c9;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .08em;
        }

        .outcome-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 10px;
        }

        .outcome-button {
          padding: 11px;
          border-radius: 9px;
          position: relative;
          overflow: hidden;
          cursor: pointer;
          font-size: 10px;
          font-weight: 800;
          transition:
            transform .2s ease,
            box-shadow .25s ease,
            background .25s ease,
            border-color .25s ease;
        }

        .outcome-button::after {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          left: -45%;
          width: 30%;
          transform: skewX(-18deg);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.28), transparent);
          opacity: 0;
          pointer-events: none;
        }

        .outcome-button:hover {
          transform: translateY(-2px);
        }

        .outcome-button:hover::after {
          opacity: 1;
          animation: outcomeSpark .8s ease forwards;
        }

        @keyframes outcomeSpark {
          from { left: -45%; }
          to { left: 125%; }
        }

        .outcome-button:active {
          transform: translateY(0) scale(.985);
        }

        .worked {
          color: #86efac;
          border: 1px solid rgba(34,197,94,.2);
          background: rgba(34,197,94,.07);
        }

        .worked:hover {
          box-shadow: 0 10px 24px rgba(34,197,94,.08);
          border-color: rgba(34,197,94,.3);
        }

        .failed {
          color: #fda4af;
          border: 1px solid rgba(248,113,113,.2);
          background: rgba(248,113,113,.07);
        }

        .failed:hover {
          box-shadow: 0 10px 24px rgba(248,113,113,.08);
          border-color: rgba(248,113,113,.3);
        }

        .outcome-success {
          margin-top: 9px;
          padding: 8px;
          border-radius: 7px;
          text-align: center;
          color: #67e8f9;
          background: rgba(34,211,238,.05);
          font-size: 9px;
          font-weight: 750;
          animation: outcomeIn .35s ease both;
        }

        @keyframes outcomeIn {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* LEARNING LOOP */

        .learning {
          margin-top: 17px;
          padding: 18px 20px;
          border: 1px solid rgba(255,255,255,.075);
          background: rgba(11,17,30,.82);
          border-radius: 19px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,.16);
        }

        .learning-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 17px;
        }

        .learning-title {
          font-size: 12px;
          font-weight: 800;
        }

        .learning-active {
          color: #4ade80;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .08em;
        }

        .loop {
          display: grid;
          grid-template-columns: repeat(5,1fr);
          gap: 7px;
        }

        .loop-step {
          position: relative;
          padding: 12px 9px;
          border-radius: 10px;
          background: rgba(3,7,18,.5);
          border: 1px solid rgba(255,255,255,.055);
          text-align: center;
          transition:
            transform .28s cubic-bezier(.2,.8,.2,1),
            border-color .28s ease,
            background .28s ease;
        }

        .loop-step:hover {
          transform: translateY(-3px);
          border-color: rgba(96,165,250,.15);
          background: rgba(3,7,18,.65);
        }

        .loop-step:not(:last-child)::after {
          content: "→";
          position: absolute;
          right: -13px;
          top: 50%;
          transform: translateY(-50%);
          color: #435169;
          z-index: 2;
          transition: color .25s ease;
        }

        .loop-step:hover::after {
          color: #64748b;
        }

        .loop-icon {
          font-size: 14px;
          transition: transform .28s ease;
        }

        .loop-step:hover .loop-icon {
          transform: translateY(-2px) scale(1.08);
        }

        .loop-name {
          margin-top: 6px;
          color: #9aa8bb;
          font-size: 8px;
          font-weight: 750;
          text-transform: uppercase;
          letter-spacing: .05em;
        }

        /* FOOTER */

        .footer {
          margin-top: 25px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #46546a;
          font-size: 9px;
          transition: color .25s ease;
        }

        .footer:hover {
          color: #56657b;
        }

        .footer strong {
          color: #718096;
        }

        /* RESPONSIVE */

        @media (max-width: 1050px) {
          .main-grid {
            grid-template-columns: 1fr;
          }

          .results {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .shell {
            width: min(100% - 22px, 1380px);
            padding-top: 11px;
          }

          .nav {
            position: static;
          }

          .memory-pill {
            display: none;
          }

          .status-pill {
            padding: 8px 9px;
            font-size: 10px;
          }

          .hero {
            grid-template-columns: 1fr;
            padding-top: 38px;
            gap: 18px;
          }

          .hero h1 {
            font-size: clamp(34px, 12vw, 48px);
          }

          .hero-metric {
            min-width: 0;
          }

          .reasoning-grid {
            grid-template-columns: 1fr;
          }

          .reason-card.primary {
            grid-column: span 1;
          }

          .outcome-buttons {
            grid-template-columns: 1fr;
          }

          .loop {
            grid-template-columns: 1fr;
          }

          .loop-step:not(:last-child)::after {
            content: "↓";
            right: 50%;
            top: auto;
            bottom: -16px;
            transform: translateX(50%);
          }

          .footer {
            flex-direction: column;
            gap: 8px;
            text-align: center;
          }
        }

        @media (max-width: 430px) {
          .brand-meta {
            display: none;
          }

          .brand-name {
            font-size: 12px;
          }

          .brand-mark {
            width: 34px;
            height: 34px;
          }

          .status-pill {
            display: none;
          }

          .panel-top {
            padding: 17px;
          }

          .panel-body,
          .result-content {
            padding: 17px;
          }

          .hero-copy {
            font-size: 13px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }

          *,
          *::before,
          *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
            scroll-behavior: auto !important;
          }

          [data-reveal] {
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      <div className="app" ref={pageRef}>
        <div className="shell">
          {/* NAVIGATION */}
          <nav className="nav">
            <div className="brand">
              <div className="brand-mark">◈</div>

              <div>
                <div className="brand-name">
                  Hindsight Incident Intelligence
                </div>

                <div className="brand-meta">
                  INCIDENT COMMAND CENTER
                </div>
              </div>
            </div>

            <div className="nav-right">
              <div className="memory-pill">
                ◉ Hindsight Memory
              </div>

              <div className="status-pill">
                <span className="online-dot" />
                Systems Operational
              </div>
            </div>
          </nav>

          {/* HERO */}
          <section className="hero">
            <div className="hero-content">
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                Persistent AI Operations
              </div>

              <h1>
                Resolve incidents with
                <br />
                <span>organizational memory.</span>
              </h1>

              <p className="hero-copy">
                An AI incident-response agent that combines live production
                symptoms with historical incidents, failed fixes and proven
                remediations — then learns from every outcome.
              </p>
            </div>

            <div className="hero-metric">
              <div className="metric-label">Memory Architecture</div>
              <div className="metric-value">Persistent</div>
              <div className="metric-sub">
                Powered by Hindsight organizational memory
              </div>
            </div>
          </section>

          {/* WORKSPACE */}
          <section className="main-grid">
            {/* INCIDENT INPUT */}
            <div className="panel" data-reveal>
              <div className="panel-top">
                <div>
                  <div className="panel-title">New Incident</div>
                  <div className="panel-subtitle">
                    Start an investigation from current symptoms
                  </div>
                </div>

                <div className="tag">MEMORY ENABLED</div>
              </div>

              <div className="panel-body">
                <div className="incident-header">
                  <div className="severity">!</div>

                  <div>
                    <div className="severity-title">
                      Production incident
                    </div>

                    <div className="severity-sub">
                      Historical context will be automatically recalled
                    </div>
                  </div>
                </div>

                <div className="field">
                  <label>
                    Affected service
                    <span className="field-hint">Required</span>
                  </label>

                  <input
                    className="input"
                    value={service}
                    onChange={(e) => {
                      setService(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="e.g. payments"
                    autoComplete="off"
                  />
                </div>

                <div className="field">
                  <label>
                    Incident symptoms
                    <span className="field-hint">
                      Describe what you observe
                    </span>
                  </label>

                  <textarea
                    className="textarea"
                    value={symptoms}
                    onChange={(e) => {
                      setSymptoms(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="Connection timeouts, elevated latency, traffic spike, failed deployments..."
                  />
                </div>

                <button
                  className="investigate"
                  onClick={investigateIncident}
                  disabled={loading}
                >
                  <span className="button-inner">
                    {loading && <span className="spinner" />}

                    {loading
                      ? "Searching memory & investigating..."
                      : "Investigate Incident  →"}
                  </span>
                </button>

                {error && <div className="error">{error}</div>}
              </div>
            </div>

            {/* MEMORY PANEL */}
            <div className="panel" data-reveal>
              <div className="panel-top">
                <div>
                  <div className="panel-title">Hindsight Memory</div>

                  <div className="panel-subtitle">
                    Organizational knowledge recalled for this incident
                  </div>
                </div>

                <div className="tag">PERSISTENT</div>
              </div>

              <div className="panel-body">
                {!loading && (
                  <div className="memory-status">
                    <div className="memory-engine">
                      <span className="memory-engine-dot" />
                      Memory engine connected
                    </div>

                    {result && (
                      <div className="memory-count">
                        {result.historical_memories?.length || 0} memories
                        recalled
                      </div>
                    )}
                  </div>
                )}

                {loading ? (
                  <div className="loading">
                    <div className="loading-ring" />

                    <div className="loading-title">
                      Recalling organizational memory
                    </div>

                    <div className="loading-copy">
                      Searching similar incidents, failed fixes and proven
                      remediations...
                    </div>

                    <div className="loading-steps" aria-hidden="true">
                      <span className="loading-step" />
                      <span className="loading-step" />
                      <span className="loading-step" />
                    </div>
                  </div>
                ) : !result ? (
                  <div className="memory-empty">
                    <div className="memory-icon">◉</div>

                    <div className="memory-empty-title">
                      Memory layer ready
                    </div>

                    <div className="memory-empty-copy">
                      Run an investigation to retrieve historical incidents
                      and outcomes that can influence the current decision.
                    </div>
                  </div>
                ) : (
                  <div className="memory-list">
                    {result.historical_memories?.length ? (
                      result.historical_memories.map((memory, index) => (
                        <div
                          className={`memory-item ${
                            activeMemory === index ? "active" : ""
                          }`}
                          key={`${memory}-${index}`}
                          style={{ animationDelay: `${index * 70}ms` }}
                          onMouseEnter={() => setActiveMemory(index)}
                          onMouseLeave={() => setActiveMemory(null)}
                        >
                          {memory}
                        </div>
                      ))
                    ) : (
                      <div className="memory-empty">
                        <div className="memory-icon">◌</div>
                        <div className="memory-empty-title">
                          No matching memories found
                        </div>
                        <div className="memory-empty-copy">
                          The agent can still reason from the current incident
                          symptoms.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* RESULTS */}
          {result && (
            <>
              <section className="results">
                {/* CONTEXT */}
                <div className="result-panel" data-reveal>
                  <div className="panel-top">
                    <div>
                      <div className="panel-title">Incident Context</div>

                      <div className="panel-subtitle">
                        Current situation being investigated
                      </div>
                    </div>

                    <div className="tag">LIVE</div>
                  </div>

                  <div className="result-content">
                    <div className="context-row">
                      <div className="context-label">Service</div>

                      <div className="context-value">
                        {result.service}
                      </div>
                    </div>

                    <div className="context-row">
                      <div className="context-label">Current symptoms</div>

                      <div className="context-value">
                        {result.symptoms}
                      </div>
                    </div>

                    <div className="context-row">
                      <div className="context-label">Memory retrieved</div>

                      <div className="context-value">
                        {result.historical_memories?.length || 0} historical
                        records
                      </div>
                    </div>

                    <div className="outcome-box">
                      <div className="outcome-title">
                        Engineer validation
                      </div>

                      <div className="outcome-buttons">
                        <button
                          className="outcome-button worked"
                          onClick={() => recordOutcome("successful")}
                        >
                          ✓ Recommendation Worked
                        </button>

                        <button
                          className="outcome-button failed"
                          onClick={() => recordOutcome("failed")}
                        >
                          ✕ Recommendation Failed
                        </button>
                      </div>

                      {outcome && (
                        <div className="outcome-success">
                          ✓ Outcome recorded as: {outcome}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* REASONING */}
                <div className="result-panel" data-reveal>
                  <div className="panel-top">
                    <div>
                      <div className="panel-title">Agent Reasoning</div>

                      <div className="panel-subtitle">
                        Current evidence combined with organizational memory
                      </div>
                    </div>

                    <div className="tag">CONTEXT-AWARE</div>
                  </div>

                  <div className="result-content">
                    <div className="reasoning-grid">
                      {reasonCards.map((card) => (
                        <div
                          key={card.key}
                          className={`reason-card ${card.className || ""}`}
                          data-reveal
                          onMouseEnter={() => revealReason(card.key)}
                        >
                          <div className="reason-heading">
                            <span className="reason-number">
                              {card.number}
                            </span>
                            {card.title}
                          </div>

                          <div className="reason-text">
                            {revealed[card.key] || card.key === "pattern"
                              ? card.content
                              : card.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* LEARNING LOOP */}
              <section className="learning" data-reveal>
                <div className="learning-head">
                  <div className="learning-title">
                    Persistent Learning Loop
                  </div>

                  <div className="learning-active">● ACTIVE</div>
                </div>

                <div className="loop">
                  {[
                    ["◉", "Observe"],
                    ["⌁", "Recall"],
                    ["✦", "Reason"],
                    ["→", "Act"],
                    ["↻", "Learn"],
                  ].map(([icon, name], index) => (
                    <div
                      className="loop-step"
                      key={name}
                      data-reveal
                      style={{ transitionDelay: `${index * 70}ms` }}
                    >
                      <div className="loop-icon">{icon}</div>
                      <div className="loop-name">{name}</div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          <footer className="footer">
            <div>
              <strong>Incident Response Agent</strong> · Hindsight-powered
              organizational memory
            </div>

            <div>
              Memory → Reasoning → Action → Outcome → Learning
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}

export default App;
