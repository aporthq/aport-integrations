export type DiagnosticSeverityName = "error" | "warning";

export interface PolicyDiagnostic {
  severity: DiagnosticSeverityName;
  message: string;
  line: number;
  column: number;
}

interface PolicyRule {
  id?: unknown;
  effect?: unknown;
  action?: unknown;
  conditions?: unknown;
}

interface PolicyPack {
  id?: unknown;
  name?: unknown;
  version?: unknown;
  description?: unknown;
  rules?: unknown;
  defaults?: unknown;
  metadata?: unknown;
}

const REQUIRED_ROOT_FIELDS = ["id", "name", "version", "description", "rules"] as const;
const POLICY_ID_PATTERN = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+\.v[0-9]+$/;
const SEMVER_PATTERN = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const VALID_EFFECTS = new Set(["allow", "deny", "review"]);

export const isAportPolicyFileName = (fileName: string): boolean => {
  return /\.(aport-policy|aport)\.json$/i.test(fileName) || /\.aport-policy\.ya?ml$/i.test(fileName);
};

export const validatePolicyDocument = (text: string, fileName = ""): PolicyDiagnostic[] => {
  const trimmed = text.trim();
  if (!trimmed) {
    return [diagnostic("error", "APort policy pack cannot be empty.")];
  }

  if (looksLikeJson(trimmed, fileName)) {
    return validateJsonPolicy(text);
  }

  return validateYamlPolicy(text);
};

const validateJsonPolicy = (text: string): PolicyDiagnostic[] => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return [
      diagnostic(
        "error",
        `Invalid JSON: ${error instanceof Error ? error.message : "Unable to parse policy pack."}`
      ),
    ];
  }

  if (!isRecord(parsed) || Array.isArray(parsed)) {
    return [diagnostic("error", "APort policy pack must be a JSON object.")];
  }

  const policy = parsed as PolicyPack;
  const diagnostics: PolicyDiagnostic[] = [];

  for (const field of REQUIRED_ROOT_FIELDS) {
    if (policy[field] === undefined) {
      diagnostics.push(
        diagnostic("error", `Missing required field "${field}".`, ...findJsonFieldPosition(text, field))
      );
    }
  }

  validateCommonPolicyShape(policy, text, diagnostics);
  return diagnostics;
};

const validateYamlPolicy = (text: string): PolicyDiagnostic[] => {
  const diagnostics: PolicyDiagnostic[] = [];
  const rootKeys = new Set<string>();
  const lines = text.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\t+/.test(line)) {
      diagnostics.push(diagnostic("warning", "Prefer spaces over tabs in APort policy YAML.", index, 0));
    }

    const match = /^([A-Za-z][A-Za-z0-9_-]*):/.exec(line);
    if (match) {
      rootKeys.add(match[1]);
    }
  }

  for (const field of REQUIRED_ROOT_FIELDS) {
    if (!rootKeys.has(field)) {
      diagnostics.push(
        diagnostic("error", `Missing required field "${field}".`, ...findYamlFieldPosition(text, field))
      );
    }
  }

  const idMatch = /^id:\s*["']?([^"'\s#]+)["']?/m.exec(text);
  if (idMatch && !POLICY_ID_PATTERN.test(idMatch[1])) {
    diagnostics.push(
      diagnostic(
        "warning",
        "Policy id should use a dotted versioned form such as finance.payment.refund.v1.",
        ...findYamlFieldPosition(text, "id")
      )
    );
  }

  const versionMatch = /^version:\s*["']?([^"'\s#]+)["']?/m.exec(text);
  if (versionMatch && !SEMVER_PATTERN.test(versionMatch[1])) {
    diagnostics.push(
      diagnostic("warning", "Policy pack version should use semantic versioning.", ...findYamlFieldPosition(text, "version"))
    );
  }

  if (/^rules:\s*$/m.test(text) && !yamlRulesSectionHasRuleId(lines)) {
    diagnostics.push(
      diagnostic("error", "Policy pack must define at least one rule with an id.", ...findYamlFieldPosition(text, "rules"))
    );
  }

  for (const match of text.matchAll(/^\s*effect:\s*["']?([^"'\s#]+)["']?/gm)) {
    if (!VALID_EFFECTS.has(match[1])) {
      diagnostics.push(
        diagnostic("error", 'Rule effect must be one of "allow", "deny", or "review".', ...offsetToPosition(text, match.index ?? 0))
      );
    }
  }

  return diagnostics;
};

const validateCommonPolicyShape = (
  policy: PolicyPack,
  text: string,
  diagnostics: PolicyDiagnostic[]
): void => {
  if (typeof policy.id === "string" && !POLICY_ID_PATTERN.test(policy.id)) {
    diagnostics.push(
      diagnostic(
        "warning",
        "Policy id should use a dotted versioned form such as finance.payment.refund.v1.",
        ...findJsonFieldPosition(text, "id")
      )
    );
  }

  if (typeof policy.version === "string" && !SEMVER_PATTERN.test(policy.version)) {
    diagnostics.push(
      diagnostic("warning", "Policy pack version should use semantic versioning.", ...findJsonFieldPosition(text, "version"))
    );
  }

  if (policy.rules !== undefined && !Array.isArray(policy.rules)) {
    diagnostics.push(diagnostic("error", 'Field "rules" must be an array.', ...findJsonFieldPosition(text, "rules")));
    return;
  }

  if (Array.isArray(policy.rules)) {
    if (policy.rules.length === 0) {
      diagnostics.push(
        diagnostic("error", "Policy pack must define at least one rule.", ...findJsonFieldPosition(text, "rules"))
      );
    }

    policy.rules.forEach((rule, index) => {
      if (!isRecord(rule)) {
        diagnostics.push(diagnostic("error", `Rule ${index + 1} must be an object.`, ...findJsonFieldPosition(text, "rules")));
        return;
      }

      validateRule(rule as PolicyRule, index, text, diagnostics);
    });
  }
};

const validateRule = (
  rule: PolicyRule,
  index: number,
  text: string,
  diagnostics: PolicyDiagnostic[]
): void => {
  for (const field of ["id", "effect", "action"] as const) {
    if (rule[field] === undefined) {
      diagnostics.push(
        diagnostic("error", `Rule ${index + 1} is missing required field "${field}".`, ...findJsonFieldPosition(text, "rules"))
      );
    }
  }

  if (rule.effect !== undefined && (typeof rule.effect !== "string" || !VALID_EFFECTS.has(rule.effect))) {
    diagnostics.push(
      diagnostic("error", 'Rule effect must be one of "allow", "deny", or "review".', ...findJsonFieldPosition(text, "effect"))
    );
  }

  if (rule.conditions !== undefined && !isRecord(rule.conditions) && !Array.isArray(rule.conditions)) {
    diagnostics.push(
      diagnostic("warning", "Rule conditions should be an object or array.", ...findJsonFieldPosition(text, "conditions"))
    );
  }
};

const looksLikeJson = (trimmed: string, fileName: string): boolean => {
  return /\.json$/i.test(fileName) || trimmed.startsWith("{") || trimmed.startsWith("[");
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const yamlRulesSectionHasRuleId = (lines: string[]): boolean => {
  let inRulesSection = false;

  for (const line of lines) {
    if (/^rules:\s*$/.test(line)) {
      inRulesSection = true;
      continue;
    }

    if (inRulesSection && /^[A-Za-z][A-Za-z0-9_-]*:/.test(line)) {
      return false;
    }

    if (inRulesSection && /^\s*-\s+id:/.test(line)) {
      return true;
    }
  }

  return false;
};

const diagnostic = (
  severity: DiagnosticSeverityName,
  message: string,
  line = 0,
  column = 0
): PolicyDiagnostic => ({
  severity,
  message,
  line,
  column,
});

const findJsonFieldPosition = (text: string, field: string): [number, number] => {
  const index = text.indexOf(`"${field}"`);
  return index >= 0 ? offsetToPosition(text, index) : [0, 0];
};

const findYamlFieldPosition = (text: string, field: string): [number, number] => {
  const pattern = new RegExp(`^${field}:`, "m");
  const match = pattern.exec(text);
  return match?.index !== undefined ? offsetToPosition(text, match.index) : [0, 0];
};

const offsetToPosition = (text: string, offset: number): [number, number] => {
  const prefix = text.slice(0, offset);
  const lines = prefix.split(/\r?\n/);
  return [lines.length - 1, lines[lines.length - 1].length];
};
