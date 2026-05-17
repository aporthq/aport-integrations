import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>APort Next.js Middleware</h1>
      <p>
        This example protects a route with APort verification in Next.js
        middleware.
      </p>
      <Link href="/protected">Open protected route</Link>
    </main>
  );
}
