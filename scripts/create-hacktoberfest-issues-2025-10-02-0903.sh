#!/bin/bash

# APort Integrations - Hacktoberfest 2025 Issue Creation Script (2025-10-02-0903)
# This script creates additional strategic Hacktoberfest issues with preview and edit capabilities
# Based on the HACKTOBERFEST-STRATEGY.md document

set -e

echo "🎉 APort Integrations - Hacktoberfest 2025 Issue Creator (2025-10-02-0903)"
echo "========================================================================"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed. Please install it first:"
    echo "   https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Please authenticate with GitHub CLI first:"
    echo "   gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is ready!"
echo ""

# Function to create an issue with preview and edit capability
create_issue_interactive() {
    local title="$1"
    local body="$2"
    local labels="$3"
    local category="$4"
    local bounty="$5"
    
    echo "📋 Issue Preview:"
    echo "================="
    echo "Title: $title"
    echo "Category: $category"
    echo "Bounty: $bounty"
    echo "Labels: $labels"
    echo ""
    echo "Description:"
    echo "$body"
    echo ""
    echo "================="
    echo ""
    
    read -p "Create this issue? (y/n/e for edit): " choice
    case $choice in
        y|Y|yes|YES)
            echo "🚀 Creating issue..."
            gh issue create --title "$title" --body "$body" --label "$labels"
            echo "✅ Issue created successfully!"
            ;;
        e|E|edit|EDIT)
            echo "📝 Opening editor for issue body..."
            # Create temporary file with issue body
            temp_file=$(mktemp)
            echo "$body" > "$temp_file"
            ${EDITOR:-nano} "$temp_file"
            
            read -p "Create issue with edited content? (y/n): " confirm
            if [[ $confirm =~ ^[Yy]$ ]]; then
                echo "🚀 Creating issue with edited content..."
                gh issue create --title "$title" --body-file "$temp_file" --label "$labels"
                echo "✅ Issue created successfully!"
            else
                echo "❌ Issue creation cancelled."
            fi
            rm "$temp_file"
            ;;
        *)
            echo "⏭️  Skipping this issue."
            ;;
    esac
    echo ""
}

# Function to create all issues
create_all_issues() {
    echo "🎯 Creating Strategic Hacktoberfest 2025 Issues..."
    echo "=================================================="
    echo ""
    
    # Issue 1: Add APort to an "Awesome" List
    create_issue_interactive \
        "[Hacktoberfest] Add APort to an \"Awesome\" List for AI or Security" \
        "## Description

Help developers discover APort! Find a popular and relevant \"Awesome List\" on GitHub and submit a pull request to add \`aport.io\`.

## Examples of relevant lists:
- \`awesome-ai-agents\`
- \`awesome-devsecops\`
- \`awesome-security\`
- \`awesome-serverless\`

## Success Criteria:
- You find a high-quality list (over 1,000 stars is a good benchmark).
- You submit a PR adding APort with a link and a one-sentence description.
- You post a link to your PR in the comments of this issue. The bounty is paid upon PR submission, not merge, as merging can take time.

## Technology Stack
- GitHub
- Markdown
- Community engagement

## Acceptance Criteria
- Must include working example
- Must have proper documentation
- Must follow the target repository's contribution guidelines

## Bounty
\$10 USD" \
        "hacktoberfest,good-first-issue,awareness,beginner" \
        "Awareness & Marketing" \
        "\$10 USD"

    # Issue 2: Create a "Hello, APort!" Example in Go
    create_issue_interactive \
        "[Hacktoberfest] Create a \"Hello, APort!\" Example in Go" \
        "## Description

Create a minimal, single-file Go script that demonstrates a basic call to the APort \`/verify\` endpoint. This will help Go developers get started with APort in seconds.

## Success Criteria:
- A single \`main.go\` file is created in a new \`/examples/hello-world/go\` directory in the \`aport-integrations\` repo.
- The script uses only the standard library (\`net/http\`) to make a POST request.
- It prints the \`allow\` status and any \`reasons\` from the JSON response.
- A simple \`README.md\` explains how to run the script.

## Technology Stack
- Go
- Standard library (net/http)
- APort API

## Acceptance Criteria
- Must include working example
- Must have proper documentation
- Must follow Go best practices

## Bounty
\$5 USD" \
        "hacktoberfest,good-first-issue,example,go,beginner" \
        "Examples & Tutorials" \
        "\$5 USD"

    # Issue 3: Add a "Deploy to Vercel" Button to the Next.js Example
    create_issue_interactive \
        "[Hacktoberfest] Add a \"Deploy to Vercel\" Button to the Next.js Example" \
        "## Description

Make our Next.js middleware example instantly deployable. Add the necessary configuration to allow anyone to deploy the example to their own Vercel account with a single click.

## Success Criteria:
- A \`vercel.json\` file is added to the \`/examples/nextjs-middleware\` directory.
- The \"Deploy to Vercel\" button is added to the top of the \`README.md\` in that directory.
- The one-click deployment successfully creates a working instance of the example app.

## Technology Stack
- Next.js
- Vercel
- APort middleware

## Acceptance Criteria
- Must include working example
- Must have proper documentation
- Must follow Vercel deployment best practices

## Bounty
\$5 USD" \
        "hacktoberfest,good-first-issue,dx,vercel,beginner" \
        "Developer Experience" \
        "\$5 USD"

    # Issue 4: Zapier Integration for APort Verification
    create_issue_interactive \
        "[Hacktoberfest] Zapier Integration for APort Verification" \
        "## Description

Build Zapier app that adds APort checks to automations. Strategic Value: 5M+ Zapier users, no-code adoption.

## Success Criteria:
- Create a Zapier custom app for APort verification
- Add APort verification as a step in Zapier workflows
- Provide clear documentation and examples
- Test the integration with real workflows

## Technology Stack
- Zapier
- Node.js
- APort API

## Acceptance Criteria
- Must include working example
- Must have proper documentation
- Must follow Zapier app development standards

## Bounty
\$15 USD" \
        "hacktoberfest,integration,agent-framework,zapier,low-code" \
        "Platform Integrations" \
        "\$15 USD"

    # Issue 5: GitHub App for PR/Merge Verification
    create_issue_interactive \
        "[Hacktoberfest] GitHub App for PR/Merge Verification" \
        "## Description

Create GitHub App that enforces APort checks on PRs. Strategic Value: Directly addresses code supply chain security.

## Success Criteria:
- Create a GitHub App that integrates with APort
- Add PR verification checks using APort
- Provide configuration for different policies
- Include proper error handling and logging

## Technology Stack
- GitHub API
- Node.js
- APort API

## Acceptance Criteria
- Must include working example
- Must have proper documentation
- Must follow GitHub App development standards

## Bounty
\$20 USD" \
        "hacktoberfest,integration,github,security,intermediate" \
        "Platform Integrations" \
        "\$20 USD"

    # Issue 6: Discord Bot for Team Verification
    create_issue_interactive \
        "[Hacktoberfest] Discord Bot for Team Verification" \
        "## Description

Build Discord bot that verifies agent actions in team workflows. Strategic Value: 150M+ Discord users, team collaboration focus.

## Success Criteria:
- Create a Discord bot that integrates with APort
- Add verification commands for team workflows
- Provide clear documentation and setup instructions
- Include proper error handling and user feedback

## Technology Stack
- Discord API
- Node.js
- APort API

## Acceptance Criteria
- Must include working example
- Must have proper documentation
- Must follow Discord bot development standards

## Bounty
\$10 USD" \
        "hacktoberfest,integration,discord,automation,intermediate" \
        "Platform Integrations" \
        "\$10 USD"

    # Issue 7: CrewAI Task Verification Decorator
    create_issue_interactive \
        "[Hacktoberfest] CrewAI Task Verification Decorator" \
        "## Description

Create @aport_verify decorator for CrewAI tasks. Strategic Value: 50K+ CrewAI developers, direct agent integration.

## Success Criteria:
- Create a Python decorator for CrewAI task verification
- Add APort verification before task execution
- Provide clear usage examples
- Include proper error handling

## Technology Stack
- Python
- CrewAI
- APort API

## Acceptance Criteria
- Must include working example
- Must have proper documentation
- Must follow Python decorator best practices

## Bounty
\$10 USD" \
        "hacktoberfest,integration,agent-framework,python,crewai" \
        "Agent Framework Bridges" \
        "\$10 USD"

    # Issue 8: n8n Workflow Node for Policy Checks
    create_issue_interactive \
        "[Hacktoberfest] n8n Workflow Node for Policy Checks" \
        "## Description

Build custom n8n node for APort verification. Strategic Value: 500K+ n8n users, visual automation appeal.

## Success Criteria:
- Create a custom n8n node for APort verification
- Add proper configuration options
- Provide clear usage examples
- Include proper error handling and validation

## Technology Stack
- n8n
- Node.js
- APort API

## Acceptance Criteria
- Must include working example
- Must have proper documentation
- Must follow n8n node development standards

## Bounty
\$10 USD" \
        "hacktoberfest,integration,agent-framework,low-code,n8n" \
        "Agent Framework Bridges" \
        "\$10 USD"

    # Issue 9: APort CLI for Quick Integration Setup
    create_issue_interactive \
        "[Hacktoberfest] APort CLI for Quick Integration Setup" \
        "## Description

Build \`npx create-aport-integration\` CLI tool. Strategic Value: Reduces integration time from days to minutes.

## Success Criteria:
- Create a CLI tool for quick APort integration setup
- Support multiple frameworks (Express, Next.js, Django, etc.)
- Provide interactive prompts for configuration
- Include proper error handling and validation

## Technology Stack
- Node.js
- CLI development
- APort API

## Acceptance Criteria
- Must include working example
- Must have proper documentation
- Must follow CLI development best practices

## Bounty
\$15 USD" \
        "hacktoberfest,developer-experience,devex-tool,cli" \
        "Developer Experience" \
        "\$15 USD"

    # Issue 10: Postman Collection for API Testing
    create_issue_interactive \
        "[Hacktoberfest] Postman Collection for API Testing" \
        "## Description

Create comprehensive Postman collection + Newman CI/CD. Strategic Value: Enterprise adoption enabler.

## Success Criteria:
- Create a comprehensive Postman collection for APort API
- Add Newman CI/CD integration
- Provide clear documentation and examples
- Include proper test scenarios and validation

## Technology Stack
- Postman
- Newman
- CI/CD

## Acceptance Criteria
- Must include working example
- Must have proper documentation
- Must follow Postman collection best practices

## Bounty
\$10 USD" \
        "hacktoberfest,developer-experience,devex-tool,postman,testing" \
        "Developer Experience" \
        "\$10 USD"

    # Issue 11: Create APort integration video tutorials
    create_issue_interactive \
        "[Hacktoberfest] Create APort integration video tutorials" \
        "## Description

Create 2-3 minute Loom videos for each major framework. Perfect for sales demos and developer onboarding.

## Success Criteria:
- Create 3-5 short video tutorials (2-3 minutes each)
- Cover major frameworks (Express, Next.js, Django, etc.)
- Include clear audio and visual quality
- Publish on YouTube and share links in issue comments

## Technology Stack
- Video creation
- Loom/YouTube
- APort integration

## Acceptance Criteria
- Must include working example
- Must have proper documentation
- Must be published and accessible

## Bounty
\$10 USD" \
        "hacktoberfest,content,video,tutorial,beginner" \
        "Content & Documentation" \
        "\$10 USD"

    # Issue 12: Create APort banking/fintech integration examples
    create_issue_interactive \
        "[Hacktoberfest] Create APort banking/fintech integration examples" \
        "## Description

Create real banking API integrations with compliance documentation. Appeals to financial services.

## Success Criteria:
- Create banking/fintech integration examples
- Include compliance documentation (PCI DSS, etc.)
- Provide real-world use cases
- Include proper security considerations

## Technology Stack
- Banking APIs
- Compliance frameworks
- APort integration

## Acceptance Criteria
- Must include working example
- Must have proper documentation
- Must follow financial compliance standards

## Bounty
\$15 USD" \
        "hacktoberfest,integration,fintech,banking,compliance" \
        "Financial Use Cases" \
        "\$15 USD"

    # Issue 13: Create APort integration for Microsoft Power Automate
    create_issue_interactive \
        "[Hacktoberfest] Create APort integration for Microsoft Power Automate" \
        "## Description

Tap into enterprise automation market. Similar to Zapier but enterprise-focused.

## Success Criteria:
- Create Microsoft Power Automate connector for APort
- Add verification steps to Power Automate workflows
- Provide clear documentation and examples
- Include proper error handling

## Technology Stack
- Microsoft Power Automate
- Connector development
- APort API

## Acceptance Criteria
- Must include working example
- Must have proper documentation
- Must follow Power Automate connector standards

## Bounty
\$10 USD" \
        "hacktoberfest,integration,power-automate,enterprise,low-code" \
        "Low-Code/No-Code" \
        "\$10 USD"

    # Issue 14: Create APort VS Code extension
    create_issue_interactive \
        "[Hacktoberfest] Create APort VS Code extension" \
        "## Description

Code snippets, syntax highlighting. Developer productivity tool.

## Success Criteria:
- Create VS Code extension for APort
- Add code snippets and syntax highlighting
- Provide IntelliSense support
- Include proper documentation

## Technology Stack
- VS Code API
- TypeScript
- APort integration

## Acceptance Criteria
- Must include working example
- Must have proper documentation
- Must follow VS Code extension standards

## Bounty
\$10 USD" \
        "hacktoberfest,developer-experience,devex-tool,vscode,extension" \
        "Developer Experience" \
        "\$10 USD"

    # Issue 15: Create APort enterprise security dashboard
    create_issue_interactive \
        "[Hacktoberfest] Create APort enterprise security dashboard" \
        "## Description

Real-time monitoring, alerting. Appeals to security teams.

## Success Criteria:
- Create enterprise security dashboard for APort
- Add real-time monitoring and alerting
- Include compliance reporting
- Provide proper authentication and authorization

## Technology Stack
- React/Vue.js
- Real-time updates
- APort API

## Acceptance Criteria
- Must include working example
- Must have proper documentation
- Must follow enterprise security standards

## Bounty
\$20 USD" \
        "hacktoberfest,integration,enterprise,security,dashboard" \
        "Enterprise Security" \
        "\$20 USD"
}

# Main execution
echo "🎯 Ready to create strategic Hacktoberfest 2025 issues!"
echo ""
echo "This script will create 15 new issues with the following categories:"
echo "• Awareness & Marketing (1 issue)"
echo "• Examples & Tutorials (1 issue)"
echo "• Developer Experience (3 issues)"
echo "• Platform Integrations (3 issues)"
echo "• Agent Framework Bridges (2 issues)"
echo "• Content & Documentation (1 issue)"
echo "• Financial Use Cases (1 issue)"
echo "• Low-Code/No-Code (1 issue)"
echo "• Enterprise Security (1 issue)"
echo "• Deploy & DX (1 issue)"
echo ""
echo "Total bounty pool: \$175 USD"
echo ""

read -p "Continue with issue creation? (y/n): " confirm
if [[ $confirm =~ ^[Yy]$ ]]; then
    create_all_issues
    echo "🎉 All strategic Hacktoberfest 2025 issues have been processed!"
    echo ""
    echo "📊 Summary:"
    echo "• Issues created: 15"
    echo "• Total bounty pool: \$375 USD"
    echo "• Categories covered: 10"
    echo ""
    echo "🚀 Ready for Hacktoberfest 2025!"
else
    echo "❌ Issue creation cancelled."
fi
