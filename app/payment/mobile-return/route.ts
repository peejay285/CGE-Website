function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function GET(request: Request) {
  const source = new URL(request.url);
  const target = new URL("cge://payment-return");
  for (const [key, value] of source.searchParams) {
    target.searchParams.set(key, value);
  }
  const deepLink = target.toString();
  const safeLink = escapeHtml(deepLink);
  const scriptLink = JSON.stringify(deepLink).replaceAll("<", "\\u003c");

  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Return to CGE App</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #09090b; color: #fafafa; font: 16px system-ui, sans-serif; }
      main { width: min(420px, calc(100% - 32px)); padding: 32px 24px; border: 1px solid #27272a; border-radius: 18px; background: #111113; text-align: center; }
      a { display: block; margin-top: 24px; padding: 14px 18px; border-radius: 12px; background: #72d3e7; color: #09090b; font-weight: 700; text-decoration: none; }
      p { color: #a1a1aa; line-height: 1.5; }
    </style>
  </head>
  <body>
    <main>
      <h1>Payment submitted</h1>
      <p>Return to CGE to refresh your payment status. The secure webhook remains the final confirmation.</p>
      <a href="${safeLink}">Open CGE App</a>
    </main>
    <script>window.setTimeout(function () { window.location.href = ${scriptLink}; }, 250);</script>
  </body>
</html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    }
  );
}
