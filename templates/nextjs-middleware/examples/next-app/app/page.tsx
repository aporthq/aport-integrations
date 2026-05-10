export default function HomePage() {
  return (
    <main>
      <h1>APort Next.js Middleware Example</h1>
      <p>
        Use the protected page, App Router API route, and Pages Router API route
        to verify agent policy checks.
      </p>
      <ul>
        <li>
          <a href="/protected">Protected middleware page</a>
        </li>
        <li>
          <code>POST /api/refund</code> for App Router route handler coverage
        </li>
        <li>
          <code>GET /api/admin</code> for Pages Router API route coverage
        </li>
      </ul>
    </main>
  );
}
