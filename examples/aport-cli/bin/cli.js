#!/usr/bin/env node

import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'dirname';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supported frameworks
const FRAMEWORKS = {
  'express': {
    name: 'Express.js',
    files: {
      'index.js': `const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const APORT_API_KEY = process.env.APORT_API_KEY;
const PROJECT_ID = process.env.APORT_PROJECT_ID || 'default';

async function verifyWithAPort(action, actor, context) {
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
    console.error('APort verification error:', error.message);
    return { allow: true, reasons: ['Verification failed, allowing by default'] };
  }
}

// Example route with verification
app.post('/api/protected', async (req, res) => {
  const result = await verifyWithAPort(
    'api_call',
    { id: req.body.userId, name: req.body.username },
    req.body
  );
  
  if (!result.allow) {
    return res.status(403).json({ denied: true, reasons: result.reasons });
  }
  
  res.json({ success: true, data: 'Protected data' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));
`,
      'package.json': `{
  "name": "aport-express-example",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.6.0"
  }
}`
    }
  },
  'nextjs': {
    name: 'Next.js',
    files: {
      'middleware.js': `import { NextResponse } from 'next/server';

export async function middleware(request) {
  const aportApiKey = process.env.APORT_API_KEY;
  
  if (!aportApiKey) {
    return NextResponse.json(
      { error: 'APORT_API_KEY not configured' },
      { status: 500 }
    );
  }
  
  const body = await request.json();
  
  try {
    const response = await fetch('https://api.aport.io/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${aportApiKey}\`
      },
      body: JSON.stringify({
        action: body.action || 'page_view',
        actor: body.actor || { id: 'anonymous', name: 'anonymous' },
        context: { data: body.context || {} },
        projectId: process.env.APORT_PROJECT_ID || 'default'
      })
    });
    
    const result = await response.json();
    
    if (!result.allow) {
      return NextResponse.json(
        { denied: true, reasons: result.reasons },
        { status: 403 }
      );
    }
    
    return NextResponse.next();
  } catch (error) {
    console.error('APort error:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: '/api/:path*'
};
`,
      'package.json': `{
  "name": "aport-nextjs-example",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.0.0",
    "react": "18.2.0",
    "react-dom": "18.2.0"
  }
}`
    }
  },
  'django': {
    name: 'Django (Python)',
    files: {
      'views.py': `from django.http import JsonResponse
import requests
import os

APORT_API_KEY = os.environ.get('APORT_API_KEY')
PROJECT_ID = os.environ.get('APORT_PROJECT_ID', 'default')

def aport_verify(action, actor, context):
    """Verify action with APort"""
    if not APORT_API_KEY:
        return {'allow': True, 'reasons': ['No API key configured']}
    
    try:
        response = requests.post(
            'https://api.aport.io/verify',
            json={
                'action': action,
                'actor': actor,
                'context': {'data': context},
                'projectId': PROJECT_ID
            },
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {APORT_API_KEY}'
            }
        )
        return response.json()
    except Exception as e:
        print(f'APort error: {e}')
        return {'allow': True, 'reasons': ['Verification failed']}

def protected_view(request):
    result = aport_verify(
        action='django_view',
        actor={'id': 'user-1', 'name': 'django_user'},
        context={'path': request.path}
    )
    
    if not result.get('allow', True):
        return JsonResponse(
            {'denied': True, 'reasons': result.get('reasons', [])},
            status=403
        )
    
    return JsonResponse({'success': True, 'data': 'Protected data'})
`,
      'requirements.txt': `Django>=4.0
requests>=2.28.0`
    }
  },
  'flask': {
    name: 'Flask (Python)',
    files: {
      'app.py': `from flask import Flask, request, jsonify
import requests
import os

app = Flask(__name__)

APORT_API_KEY = os.environ.get('APORT_API_KEY')
PROJECT_ID = os.environ.get('APORT_PROJECT_ID', 'default')

def aport_verify(action, actor, context):
    """Verify action with APort"""
    if not APORT_API_KEY:
        return {'allow': True, 'reasons': ['No API key configured']}
    
    try:
        response = requests.post(
            'https://api.aport.io/verify',
            json={
                'action': action,
                'actor': actor,
                'context': {'data': context},
                'projectId': PROJECT_ID
            },
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {APORT_API_KEY}'
            }
        )
        return response.json()
    except Exception as e:
        print(f'APort error: {e}')
        return {'allow': True, 'reasons': ['Verification failed']}

@app.route('/api/protected', methods=['POST'])
def protected():
    result = aport_verify(
        action='api_call',
        actor={'id': 'user-1', 'name': 'flask_user'},
        context=request.json or {}
    )
    
    if not result.get('allow', True):
        return jsonify({'denied': True, 'reasons': result.get('reasons', [])}), 403
    
    return jsonify({'success': True, 'data': 'Protected data'})

if __name__ == '__main__':
    app.run(debug=True)
`,
      'requirements.txt': `Flask>=2.0
requests>=2.28.0`
    }
  }
};

// Banner
console.log(chalk.cyan(`
╔═══════════════════════════════════════════╗
║     APort Integration CLI v1.0.0         ║
║     Quick integration setup tool         ║
╚═══════════════════════════════════════════╝
`));

async function main() {
  try {
    // Select framework
    const { framework } = await inquirer.prompt([
      {
        type: 'list',
        name: 'framework',
        message: 'Select a framework:',
        choices: [
          { name: 'Express.js (Node.js)', value: 'express' },
          { name: 'Next.js (React)', value: 'nextjs' },
          { name: 'Django (Python)', value: 'django' },
          { name: 'Flask (Python)', value: 'flask' }
        ]
      }
    ]);

    // Project name
    const { projectName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'Enter project name:',
        default: 'my-aport-project',
        validate: (input) => {
          if (!input.match(/^[a-zA-Z0-9-_]+$/)) {
            return 'Use only letters, numbers, hyphens and underscores';
          }
          return true;
        }
      }
    ]);

    // Create project directory
    const projectPath = path.join(process.cwd(), projectName);
    
    if (fs.existsSync(projectPath)) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: 'Directory already exists. Overwrite?',
          default: false
        }
      ]);
      if (!overwrite) {
        console.log(chalk.red('Cancelled.'));
        process.exit(0);
      }
    }

    fs.mkdirSync(projectPath, { recursive: true });

    // Generate files
    const frameworkData = FRAMEWORKS[framework];
    for (const [filename, content] of Object.entries(frameworkData.files)) {
      const filePath = path.join(projectPath, filename);
      fs.writeFileSync(filePath, content);
      console.log(chalk.green(`✓ Created ${filename}`));
    }

    // Create .env.example
    const envContent = `# APort Configuration
APORT_API_KEY=your-api-key-here
APORT_PROJECT_ID=your-project-id
`;
    fs.writeFileSync(path.join(projectPath, '.env.example'), envContent);
    console.log(chalk.green('✓ Created .env.example'));

    // Create README
    const readmeContent = `# ${projectName}

Generated with APort CLI

## Setup

1. Install dependencies:
\`\`\`bash
${framework === 'express' || framework === 'nextjs' ? 'npm install' : 'pip install -r requirements.txt'}
\`\`\`

2. Copy environment variables:
\`\`\`bash
cp .env.example .env
\`\`\`

3. Add your APort API key to .env

4. Run the project:
\`\`\`bash
${framework === 'express' ? 'npm start' : framework === 'nextjs' ? 'npm run dev' : framework === 'django' ? 'python manage.py runserver' : 'python app.py'}
\`\`\`

## Learn More

- [APort Documentation](https://docs.aport.io)
- [APort Dashboard](https://aport.io/dashboard)
`;
    fs.writeFileSync(path.join(projectPath, 'README.md'), readmeContent);
    console.log(chalk.green('✓ Created README.md'));

    console.log(chalk.cyan(`
╔═══════════════════════════════════════════╗
║  ✅ Setup complete!                       ║
╚═══════════════════════════════════════════╝

Next steps:
1. cd ${projectName}
2. cp .env.example .env
3. Add your APort API key
4. Run the project

Happy coding! 🚀
`));

  } catch (error) {
    if (error.isTtyError) {
      console.log(chalk.red('Prompt could not be rendered in this environment'));
    } else {
      console.error(chalk.red('Error:'), error.message);
    }
    process.exit(1);
  }
}

main();
