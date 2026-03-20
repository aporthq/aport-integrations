'use strict';

const ENV = (key) => `APORT_API_KEY=${key || 'your_key_here'}\n`;

// ─── FastAPI ─────────────────────────────────────────────
function fastAPI(apiKey) {
  return {
    'app.py': `from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx, os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="APort Demo")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

APORT_API_KEY = os.getenv("APORT_API_KEY")

async def verify_aport(token: str) -> dict:
    """Verify APort token via API."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://aport.example.com/api/verify",
            headers={"Authorization": f"Bearer {APORT_API_KEY}"},
            json={"token": token},
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="APort verification failed")
        return resp.json()

@app.get("/")
async def root():
    return {"message": "APort + FastAPI demo"}

@app.get("/protected")
async def protected(request: Request):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")
    user = await verify_aport(token)
    return {"message": f"Hello {user.get('sub', 'user')}", "claims": user}
`,
    'requirements.txt': 'fastapi\nuvicorn[standard]\nhttpx\npython-dotenv\n',
    '.env.example': ENV(apiKey),
    'README.md': `# APort + FastAPI Demo

Quick-start project with APort authentication.

## Setup
\`\`\`bash
cp .env.example .env   # then edit APORT_API_KEY
pip install -r requirements.txt
uvicorn app:app --reload
\`\`\`

## Endpoints
- \`GET /\` — public health check
- \`GET /protected\` — requires APort token in Authorization header
`,
  };
}

// ─── Flask ───────────────────────────────────────────────
function flask(apiKey) {
  return {
    'app.py': `from flask import Flask, request, jsonify
import httpx, os
from functools import wraps
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
APORT_API_KEY = os.getenv("APORT_API_KEY")

def aport_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not token:
            return jsonify({"error": "Missing token"}), 401
        try:
            resp = httpx.post(
                "https://aport.example.com/api/verify",
                headers={"Authorization": f"Bearer {APORT_API_KEY}"},
                json={"token": token},
            )
            resp.raise_for_status()
        except Exception:
            return jsonify({"error": "APort verification failed"}), 401
        return f(user=resp.json(), *args, **kwargs)
    return decorated

@app.route("/")
def root():
    return jsonify({"message": "APort + Flask demo"})

@app.route("/protected")
@aport_required
def protected(user):
    return jsonify({"message": f"Hello {user.get('sub', 'user')}", "claims": user})

if __name__ == "__main__":
    app.run(debug=True)
`,
    'requirements.txt': 'flask\nhttpx\npython-dotenv\n',
    '.env.example': ENV(apiKey),
    'README.md': `# APort + Flask Demo

Quick-start project with APort authentication.

## Setup
\`\`\`bash
cp .env.example .env   # then edit APORT_API_KEY
pip install -r requirements.txt
python app.py
\`\`\`

## Endpoints
- \`GET /\` — public health check
- \`GET /protected\` — requires APort token in Authorization header
`,
  };
}

// ─── Django ──────────────────────────────────────────────
function django(apiKey) {
  return {
    'manage.py': `#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os, sys
def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "myproject.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError("Couldn't import Django.") from exc
    execute_from_command_line(sys.argv)
if __name__ == "__main__":
    main()
`,
    'myproject/__init__.py': '',
    'myproject/settings.py': `import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
DEBUG = True
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = ["myapp"]
MIDDLEWARE = ["django.middleware.common.CommonMiddleware"]
ROOT_URLCONF = "myproject.urls"
`,
    'myproject/urls.py': `from django.urls import path, include
urlpatterns = [path("", include("myapp.urls"))]
`,
    'myapp/__init__.py': '',
    'myapp/views.py': `import httpx, os
from django.conf import settings
from django.http import JsonResponse
from functools import wraps

APORT_API_KEY = os.getenv("APORT_API_KEY")

def aport_required(view):
    @wraps(view)
    def wrapper(request, *args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not token:
            return JsonResponse({"error": "Missing token"}, status=401)
        try:
            resp = httpx.post(
                "https://aport.example.com/api/verify",
                headers={"Authorization": f"Bearer {APORT_API_KEY}"},
                json={"token": token},
            )
            resp.raise_for_status()
        except Exception:
            return JsonResponse({"error": "APort verification failed"}, status=401)
        request.aport_user = resp.json()
        return view(request, *args, **kwargs)
    return wrapper

def root(request):
    return JsonResponse({"message": "APort + Django demo"})

@aport_required
def protected(request):
    user = request.aport_user
    return JsonResponse({"message": f"Hello {user.get('sub', 'user')}", "claims": user})
`,
    'myapp/urls.py': `from django.urls import path
from . import views
urlpatterns = [
    path("", views.root),
    path("protected/", views.protected),
]
`,
    'requirements.txt': 'django\nhttpx\npython-dotenv\n',
    '.env.example': ENV(apiKey) + 'SECRET_KEY=change-me-in-production\n',
    'README.md': `# APort + Django Demo

Quick-start project with APort authentication.

## Setup
\`\`\`bash
cp .env.example .env   # then edit APORT_API_KEY
pip install -r requirements.txt
python manage.py runserver
\`\`\`

## Endpoints
- \`GET /\` — public health check
- \`GET /protected/\` — requires APort token in Authorization header
`,
  };
}

// ─── Express ─────────────────────────────────────────────
function express(apiKey) {
  return {
    'package.json': `{
  "name": "my-aport-app",
  "version": "1.0.0",
  "private": true,
  "scripts": { "start": "node index.js" },
  "dependencies": { "express": "^4.18.2", "node-fetch": "^2.7.0", "dotenv": "^16.3.1" }
}
`,
    'index.js': `require("dotenv").config();
const express = require("express");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;
const APORT_API_KEY = process.env.APORT_API_KEY;

const aportAuth = async (req, res, next) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    const resp = await fetch("https://aport.example.com/api/verify", {
      method: "POST",
      headers: { Authorization: \`Bearer \${APORT_API_KEY}\`, "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!resp.ok) return res.status(401).json({ error: "APort verification failed" });
    req.user = await resp.json();
    next();
  } catch {
    res.status(401).json({ error: "APort verification failed" });
  }
};

app.get("/", (req, res) => res.json({ message: "APort + Express demo" }));
app.get("/protected", aportAuth, (req, res) => res.json({ message: \`Hello \${req.user?.sub || "user"}\`, claims: req.user }));

app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));
`,
    '.env.example': ENV(apiKey) + 'PORT=3000\n',
    'README.md': `# APort + Express Demo

Quick-start project with APort authentication.

## Setup
\`\`\`bash
cp .env.example .env   # then edit APORT_API_KEY
npm install
npm start
\`\`\`

## Endpoints
- \`GET /\` — public health check
- \`GET /protected\` — requires APort token in Authorization header
`,
  };
}

// ─── Next.js ─────────────────────────────────────────────
function nextjs(apiKey) {
  return {
    'package.json': `{
  "name": "my-aport-app",
  "version": "1.0.0",
  "private": true,
  "scripts": { "dev": "next dev", "build": "next build", "start": "next start" },
  "dependencies": { "next": "^14.1.0", "react": "^18.2.0", "react-dom": "^18.2.0" }
}
`,
    'pages/_app.js': `export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
`,
    'pages/index.js': `import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head><title>APort + Next.js Demo</title></Head>
      <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
        <h1>🚀 APort + Next.js Demo</h1>
        <p>This is the public home page.</p>
        <a href="/protected">Go to protected page →</a>
      </main>
    </>
  );
}
`,
    'pages/protected.js': `import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function Protected() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("aport_token");
    if (!token) { setError("No token found. Please login first."); return; }
    fetch("/api/verify", { headers: { Authorization: \`Bearer \${token}\` } })
      .then((r) => r.json())
      .then(setUser)
      .catch(() => setError("Verification failed"));
  }, []);

  return (
    <>
      <Head><title>Protected — APort Demo</title></Head>
      <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
        <h1>🔒 Protected Page</h1>
        {error && <p style={{ color: "red" }}>{error}</p>}
        {user && <pre>{JSON.stringify(user, null, 2)}</pre>}
        <br /><a href="/">← Back</a>
      </main>
    </>
  );
}
`,
    'pages/api/verify.js': `export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    const r = await fetch("https://aport.example.com/api/verify", {
      method: "POST",
      headers: { Authorization: \`Bearer \${process.env.APORT_API_KEY}\`, "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!r.ok) return res.status(401).json({ error: "Verification failed" });
    const user = await r.json();
    return res.status(200).json(user);
  } catch {
    return res.status(500).json({ error: "Internal error" });
  }
}
`,
    '.env.example': ENV(apiKey) + '.env.local\n',
    'README.md': `# APort + Next.js Demo

Quick-start project with APort authentication.

## Setup
\`\`\`bash
cp .env.example .env.local   # then edit APORT_API_KEY
npm install
npm run dev
\`\`\`

## Pages
- \`/\` — public home page
- \`/protected\` — requires APort token (passes through \`/api/verify\`)
`,
  };
}

module.exports = {
  getTemplate(name, apiKey) {
    const map = { fastapi, flask, django, express, nextjs };
    if (!map[name]) throw new Error(`Unknown template: ${name}`);
    return map[name](apiKey);
  },
};
