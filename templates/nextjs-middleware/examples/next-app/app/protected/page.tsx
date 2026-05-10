import { headers } from "next/headers";

export default function ProtectedPage() {
  const headerList = headers();
  const agentId = headerList.get("x-aport-agent-id");
  const verified = headerList.get("x-aport-verified");
  const decisionId = headerList.get("x-aport-decision-id");

  return (
    <main>
      <h1>Protected by APort</h1>
      <dl>
        <dt>Verified</dt>
        <dd>{verified ?? "unknown"}</dd>
        <dt>Agent ID</dt>
        <dd>{agentId ?? "not provided"}</dd>
        <dt>Decision ID</dt>
        <dd>{decisionId ?? "not available"}</dd>
      </dl>
    </main>
  );
}
