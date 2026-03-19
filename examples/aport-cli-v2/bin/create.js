#!/usr/bin/env node

const { program } = require('commander');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');

program
  .name('create-aport-integration')
  .description('Scaffold APort integration for different frameworks')
  .version('1.0.0');

const frameworks = {
  'express': {
    name: 'Express.js',
    files: {
      'index.js': `const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const APORT_API_KEY = process.env.APORT_API_KEY;
const PROJECT_ID = process.env.APORT_PROJECT_ID || 'default';

async function verify(action, actor, context) {
  try {
    const response = await axios.post('https://api.aport.io/verify', {
      action,
      actor,
      context: { data: context },
      projectId: PROJECT_ID
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${APORT_API_KEY}\`
      }
    });
    return response.data;
  } catch (error) {
    return { allow: true, reasons: ['Verification failed'] };
  }
}

app.post('/api/*', async (req, res) => {
  const result = await verify('api_call', { id: 'user-1', name: 'user' }, req.body);
  if (!result.allow) {
    return res.status(403).json({ denied: true, reasons: result.reasons });
  }
  res.json({ success: true });
});

app.listen(3000, () => console.log('Server running on port 3000'));
`,
      'package.json': `{
  "name": "aport-express",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.6.0"
  }
}`
    }
  },
  'fastapi': {
    name: 'FastAPI (Python)',
    files: {
      'main.py': `from fastapi import FastAPI, Request
import httpx
import os

app = FastAPI()

APORT_API_KEY = os.getenv("APORT_API_KEY", "")
PROJECT_ID = os.getenv("APORT_PROJECT_ID", "default")

async def verify(action: str, actor: dict, context: dict):
    if not APORT_API_KEY:
        return {"allow": True}
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.aport.io/verify",
            json={
                "action": action,
                "actor": actor,
                "context": {"data": context},
                "projectId": PROJECT_ID
            },
            headers={"Authorization": f"Bearer {APORT_API_KEY}"}
        )
        return response.json()

@app.post("/api/{path:path}")
async def api_endpoint(request: Request, path: str):
    result = await verify("api_call", {"id": "user", "name": "user"}, {"path": path})
    if not result.get("allow", True):
        return {"denied": True, "reasons": result.get("reasons", [])}, 403
    return {"success": True}
`,
      'requirements.txt': `fastapi>=0.100.0
uvicorn>=0.23.0
httpx>=0.24.0`
    }
  },
  'nextjs': {
    name: 'Next.js',
    files: {
      'middleware.ts': `import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const apiKey = process.env.APORT_API_KEY;
  if (!apiKey) return NextResponse.next();
  
  const result = await fetch('https://api.aport.io/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${apiKey}\`
    },
    body: JSON.stringify({
      action: 'page_view',
      actor: { id: 'anonymous', name: 'anonymous', owner: 'nextjs' },
      context: { path: request.nextUrl.pathname },
      projectId: process.env.APORT_PROJECT_ID || 'default'
    })
  }).then(r => r.json());
  
  if (!result.allow) {
    return NextResponse.json({ denied: true }, { status: 403 });
  }
  
  return NextResponse.next();
}
`,
      'package.json': `{
  "name": "aport-nextjs",
  "dependencies": {
    "next": "14.0.0",
    "react": "18.2.0"
  }
}`
    }
  }
};

async function main() {
  const { framework } = await inquirer.prompt([
    {
      type: 'list',
      name: 'framework',
      message: 'Select framework:',
      choices: [
        { name: 'Express.js (Node.js)', value: 'express' },
        { name: 'FastAPI (Python)', value: 'fastapi' },
        { name: 'Next.js', value: 'nextjs' }
      ]
    }
  ]);

  const { projectName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: 'my-aport-project'
    }
  ]);

  // Create directory
  const dir = path.join(process.cwd(), projectName);
  fs.mkdirSync(dir, { recursive: true });

  // Generate files
  const data = frameworks[framework];
  for (const [filename, content] of Object.entries(data.files)) {
    fs.writeFileSync(path.join(dir, filename), content);
    console.log(\`✓ Created \${filename}\`);
  }

  // Create .env.example
  fs.writeFileSync(path.join(dir, '.env.example'), `APORT_API_KEY=your-api-key
APORT_PROJECT_ID=default
`);
  console.log('✓ Created .env.example');

  console.log(\`\n✅ Done! cd \${projectName} && npm install\n\`);
}

main();
