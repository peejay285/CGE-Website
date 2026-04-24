"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body
        style={{
          margin: 0,
          background: "#0A0A0B",
          color: "#FAFAFA",
          fontFamily:
            "'Sora', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            textAlign: "center",
          }}
        >
          {/* Error icon */}
          <div
            style={{
              marginBottom: "1.5rem",
              display: "flex",
              height: "5rem",
              width: "5rem",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "9999px",
              backgroundColor: "rgba(255, 68, 68, 0.1)",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              style={{ height: "2.5rem", width: "2.5rem", color: "#FF4444" }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>

          {/* Heading */}
          <h1
            style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#FAFAFA",
            }}
          >
            Something went wrong
          </h1>

          {/* Error message */}
          <div
            style={{
              marginTop: "1.25rem",
              maxWidth: "32rem",
              width: "100%",
              borderRadius: "0.5rem",
              backgroundColor: "#18181B",
              padding: "1rem 1.25rem",
            }}
          >
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.875rem",
                color: "#A1A1AA",
                wordBreak: "break-all",
                margin: 0,
              }}
            >
              {error.message || "A critical error occurred."}
            </p>
          </div>

          {/* Try Again */}
          <button
            onClick={reset}
            style={{
              marginTop: "2rem",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "0.5rem",
              background: "linear-gradient(135deg, #00F0FF, #00C8D4)",
              padding: "0.75rem 2rem",
              fontSize: "0.8125rem",
              fontWeight: 600,
              textTransform: "uppercase" as const,
              letterSpacing: "0.05em",
              color: "#0A0A0B",
              border: "none",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
