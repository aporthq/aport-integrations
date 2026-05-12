export type Severity = "error" | "warning";

export interface ValidationIssue {
  message: string;
  severity: Severity;
  path: string;
}

export interface PolicyRule {
  id?: unknown;
  effect?: unknown;
  condition?: unknown;
  reason?: unknown;
}

export interface PolicyDocument {
  policy?: {
    id?: unknown;
    version?: unknown;
    description?: unknown;
  };
  rules?: unknown;
  limits?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export const policyKeyCompletions = [
  "policy",
  "rules",
  "limits",
  "metadata",
  "id",
  "version",
  "description",
  "effect",
  "condition",
  "reason",
];

const policyIdPattern = /^[a-z]+(\.[a-z0-9_-]+)+\.v[0-9]+$/;

export function parsePolicyDocument(text: string): { document?: PolicyDocument; issues: ValidationIssue[] } {
  const trimmed = text.trim();

  if (!trimmed) {
    return {
      issues: [
        {
          message: "Policy document is empty.",
          severity: "error",
          path: "$",
        },
      ],
    };
  }

  if (trimmed.startsWith("{")) {
    try {
      return {
        document: JSON.parse(trimmed) as PolicyDocument,
        issues: [],
      };
    } catch (error) {
      return {
        issues: [
          {
            message: "Invalid JSON: " + (error instanceof Error ? error.message : String(error)),
            severity: "error",
            path: "$",
          },
        ],
      };
    }
  }

  return parseSimpleYaml(trimmed);
}

export function validatePolicyDocument(text: string): ValidationIssue[] {
  const parsed = parsePolicyDocument(text);

  if (!parsed.document) {
    return parsed.issues;
  }

  return [...parsed.issues, ...validatePolicyShape(parsed.document)];
}

export function validatePolicyShape(document: PolicyDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!document.policy || typeof document.policy !== "object") {
    issues.push({
      message: "Missing required object: policy.",
      severity: "error",
      path: "$.policy",
    });
  } else {
    if (typeof document.policy.id !== "string" || document.policy.id.trim() === "") {
      issues.push({
        message: "policy.id is required.",
        severity: "error",
        path: "$.policy.id",
      });
    } else if (!policyIdPattern.test(document.policy.id)) {
      issues.push({
        message: "policy.id should look like code.repository.merge.v1.",
        severity: "warning",
        path: "$.policy.id",
      });
    }

    if (typeof document.policy.version !== "string" || document.policy.version.trim() === "") {
      issues.push({
        message: "policy.version is required.",
        severity: "error",
        path: "$.policy.version",
      });
    }
  }

  if (!Array.isArray(document.rules)) {
    issues.push({
      message: "rules must be a non-empty array.",
      severity: "error",
      path: "$.rules",
    });
  } else if (document.rules.length === 0) {
    issues.push({
      message: "rules must contain at least one rule.",
      severity: "error",
      path: "$.rules",
    });
  } else {
    document.rules.forEach((rule, index) => {
      issues.push(...validateRule(rule as PolicyRule, index));
    });
  }

  return issues;
}

function validateRule(rule: PolicyRule, index: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const path = "$.rules[" + index + "]";

  if (!rule || typeof rule !== "object") {
    return [
      {
        message: "Rule must be an object.",
        severity: "error",
        path,
      },
    ];
  }

  if (typeof rule.id !== "string" || rule.id.trim() === "") {
    issues.push({
      message: "Rule id is required.",
      severity: "error",
      path: path + ".id",
    });
  }

  if (rule.effect !== "allow" && rule.effect !== "deny") {
    issues.push({
      message: "Rule effect must be either allow or deny.",
      severity: "error",
      path: path + ".effect",
    });
  }

  if (typeof rule.condition !== "string" || rule.condition.trim() === "") {
    issues.push({
      message: "Rule condition is required.",
      severity: "error",
      path: path + ".condition",
    });
  }

  if (rule.reason !== undefined && typeof rule.reason !== "string") {
    issues.push({
      message: "Rule reason must be a string when provided.",
      severity: "warning",
      path: path + ".reason",
    });
  }

  return issues;
}

function parseSimpleYaml(text: string): { document?: PolicyDocument; issues: ValidationIssue[] } {
  const document: PolicyDocument = {};
  const lines = text.split(/\r?\n/);
  let section = "";
  let currentRule: Record<string, unknown> | undefined;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+#.*$/, "");

    if (!line.trim() || line.trim().startsWith("#")) {
      continue;
    }

    const trimmed = line.trim();

    if (!line.startsWith(" ") && !trimmed.startsWith("-")) {
      const [key, rawValue] = splitKeyValue(trimmed);
      section = key;

      if (key === "policy") {
        document.policy = {};
      } else if (key === "rules") {
        document.rules = [];
      } else if (rawValue !== undefined) {
        (document as Record<string, unknown>)[key] = coerceValue(rawValue);
      }

      continue;
    }

    if (section === "policy" && document.policy) {
      const [key, rawValue] = splitKeyValue(trimmed);
      (document.policy as Record<string, unknown>)[key] = coerceValue(rawValue);
      continue;
    }

    if (section === "rules" && Array.isArray(document.rules)) {
      if (trimmed.startsWith("-")) {
        currentRule = {};
        document.rules.push(currentRule);
        const rest = trimmed.replace(/^-\s*/, "");
        if (rest) {
          const [key, rawValue] = splitKeyValue(rest);
          currentRule[key] = coerceValue(rawValue);
        }
      } else if (currentRule) {
        const [key, rawValue] = splitKeyValue(trimmed);
        currentRule[key] = coerceValue(rawValue);
      }
    }
  }

  return {
    document,
    issues: [],
  };
}

function splitKeyValue(line: string): [string, string | undefined] {
  const index = line.indexOf(":");

  if (index === -1) {
    return [line.trim(), undefined];
  }

  return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
}

function coerceValue(value: string | undefined): unknown {
  if (value === undefined || value === "") {
    return undefined;
  }

  const unquoted = value.replace(/^["']|["']$/g, "");

  if (unquoted === "true") {
    return true;
  }

  if (unquoted === "false") {
    return false;
  }

  if (/^-?\d+(\.\d+)?$/.test(unquoted)) {
    return Number(unquoted);
  }

  return unquoted;
}

export function createSamplePolicy(policyId: string): string {
  return JSON.stringify(
    {
      policy: {
        id: policyId,
        version: "1.0.0",
        description: "Require APort verification before repository changes",
      },
      rules: [
        {
          id: "require-repository-capability",
          effect: "allow",
          condition: "agent.capabilities.includes('repo.merge')",
          reason: "Agent must have repository merge capability",
        },
      ],
      limits: {
        max_files_changed: 25,
      },
    },
    null,
    2
  );
}
