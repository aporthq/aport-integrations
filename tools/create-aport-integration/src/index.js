#!/usr/bin/env node
/**
 * APort Integration Bootstrap CLI
 *
 * Usage: npx create-aport-integration <name> [--template <template>]
 *
 * Scaffolds a new APort integration project from a template.
 */

const fs = require("fs");
const path = require("path");
const { program } = require("commander");

const VERSION = "1.0.0";

const TEMPLATES = {
  nextjs: {
    display: "Next.js Middleware",
    files: {
      "package.json": (name) => JSON.stringify({
        name,
        version: "1.0.0",
        private: true,
        scripts: {
          dev: "next dev",
          build: "next build",
          start: "next start",
        },
        dependencies: {
          next: "^14.0.0",
          react: "^18.0.0",
          "react-dom": "^18.0.0",
        },
      }, null, 2),

      "src/middleware.ts": () => `import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const APORT_API_KEY = process.env.APORT_API_KEY || "";
const APORT_POLICY = process.env.APORT_POLICY || "default.v1";

async function verifyAgent(agentId: string, context: Record<string, unknown>) {
  // Replace with: import { verify } from "@aporthq/sdk-node";
  console.log(\`[APort] Verifying \${agentId} against \${APORT_POLICY}\`);
  return { verified: true, passport: { agentId, capabilities: ["read"] } };
}

export async function middleware(request: NextRequest) {
  const agentId = request.headers.get("x-agent-id");
  if (!agentId) {
    return NextResponse.json({ error: "Agent ID required" }, { status: 400 });
  }

  const result = await verifyAgent(agentId, {
    path: request.nextUrl.pathname,
    method: request.method,
  });

  if (!result.verified) {
    return NextResponse.json({ error: "Verification failed" }, { status: 403 });
  }

  const response = NextResponse.next();
  response.headers.set("x-aport-verified", "true");
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
`,

      "src/pages/api/hello.ts": () => `import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ message: "APort-protected endpoint" });
}
`,

      ".env.example": () => `APORT_API_KEY=your_api_key_here
APORT_POLICY=default.v1
`,

      "README.md": (name) => `# ${name}

APort-protected Next.js integration.

## Getting Started

\`\`\`bash
cp .env.example .env
npm install
npm run dev
\`\`\`
`,
    },
  },

  express: {
    display: "Express.js Middleware",
    files: {
      "package.json": (name) => JSON.stringify({
        name,
        version: "1.0.0",
        main: "src/index.js",
        scripts: { start: "node src/index.js", dev: "node --watch src/index.js" },
        dependencies: { express: "^4.18.0" },
      }, null, 2),

      "src/index.js": () => `const express = require("express");

const APORT_API_KEY = process.env.APORT_API_KEY || "";
const APORT_POLICY = process.env.APORT_POLICY || "default.v1";

async function verifyAgent(agentId, context) {
  // Replace with: const { APortClient } = require("@aporthq/sdk-node");
  console.log(\`[APort] Verifying \${agentId} against \${APORT_POLICY}\`);
  return { verified: true, passport: { agentId, capabilities: ["read", "write"] } };
}

function createAPortMiddleware(policy = APORT_POLICY) {
  return async (req, res, next) => {
    const agentId = req.headers["x-agent-id"];
    if (!agentId) return res.status(400).json({ error: "Agent ID required" });

    try {
      const result = await verifyAgent(agentId, {
        method: req.method,
        path: req.path,
      });
      if (!result.verified) return res.status(403).json({ error: "Verification failed" });

      req.aport = result;
      next();
    } catch (err) {
      res.status(500).json({ error: "Verification error" });
    }
  };
}

const app = express();
app.use(express.json());

app.get("/api/protected", createAPortMiddleware(), (req, res) => {
  res.json({ message: "APort-protected response", passport: req.aport?.passport });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`Listening on :\${PORT}\`));
`,

      ".env.example": () => `APORT_API_KEY=your_api_key_here
APORT_POLICY=default.v1
PORT=3000
`,

      "README.md": (name) => `# ${name}

APort-protected Express.js integration.

## Getting Started

\`\`\`bash
cp .env.example .env
npm install
npm start
\`\`\`
`,
    },
  },

  fastapi: {
    display: "FastAPI (Python)",
    files: {
      "pyproject.toml": (name) => `\
[project]
name = "${name}"
version = "1.0.0"
requires-python = ">=3.9"
dependencies = ["fastapi>=0.100", "uvicorn>=0.23"]

[project.scripts]
dev = "uvicorn src.main:app --reload"
`,

      "src/__init__.py": () => "",

      "src/main.py": () => `import os
from fastapi import FastAPI, Request, HTTPException, Depends

APORT_API_KEY = os.getenv("APORT_API_KEY", "")
APORT_POLICY = os.getenv("APORT_POLICY", "default.v1")

async def verify_agent(agent_id: str, context: dict) -> dict:
    # Replace with: from aporthq_sdk import APortClient
    print(f"[APort] Verifying {agent_id} against {APORT_POLICY}")
    return {"verified": True, "passport": {"agentId": agent_id, "capabilities": ["read"]}}

async def aport_guard(request: Request):
    agent_id = request.headers.get("x-agent-id")
    if not agent_id:
        raise HTTPException(status_code=400, detail="Agent ID required")
    result = await verify_agent(agent_id, {"method": request.method, "path": request.url.path})
    if not result["verified"]:
        raise HTTPException(status_code=403, detail="Verification failed")
    return result

app = FastAPI(title="APort Integration")

@app.get("/api/protected")
async def protected(verification=Depends(aport_guard)):
    return {"message": "APort-protected response", "passport": verification["passport"]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
`,

      ".env.example": () => `APORT_API_KEY=your_api_key_here
APORT_POLICY=default.v1
`,

      "README.md": (name) => `# ${name}

APort-protected FastAPI integration.

## Getting Started

\`\`\`bash
cp .env.example .env
pip install -e .
python -m src.main
\`\`\`
`,
    },
  },
};

function scaffold(name, template) {
  const targetDir = path.resolve(process.cwd(), name);

  if (fs.existsSync(targetDir)) {
    console.error(`Error: Directory "${name}" already exists.`);
    process.exit(1);
  }

  const tpl = TEMPLATES[template];
  if (!tpl) {
    console.error(`Error: Unknown template "${template}". Available: ${Object.keys(TEMPLATES).join(", ")}`);
    process.exit(1);
  }

  fs.mkdirSync(targetDir, { recursive: true });

  for (const [filePath, contentFn] of Object.entries(tpl.files)) {
    const fullPath = path.join(targetDir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, contentFn(name), "utf-8");
  }

  console.log(`✅ Created ${name} using "${tpl.display}" template`);
  console.log(`\n  cd ${name}`);
  console.log(`  cp .env.example .env`);
  if (template === "fastapi") {
    console.log(`  pip install -e .`);
  } else {
    console.log(`  npm install`);
  }
}

program
  .name("create-aport-integration")
  .description("Scaffold a new APort integration project")
  .version(VERSION)
  .argument("<name>", "Project name")
  .option("-t, --template <template>", "Template to use (nextjs, express, fastapi)", "express")
  .action((name, opts) => {
    scaffold(name, opts.template);
  });

program.parse();
