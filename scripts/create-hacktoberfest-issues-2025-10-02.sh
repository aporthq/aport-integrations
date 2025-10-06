#!/bin/bash

# APort Integrations - Hacktoberfest 2025 Issue Creation Script (2025-10-02)
# This script creates additional Hacktoberfest issues with preview and edit capabilities
# Based on the HACKTOBERFEST-STRATEGY.md document

set -e

echo "🎉 APort Integrations - Hacktoberfest 2025 Issue Creator (2025-10-02)"
echo "=================================================================="
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
    echo "🎯 Creating Additional Hacktoberfest 2025 Issues..."
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
- Must follow the target repository's contribution guidelines" \
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
- Must follow Go best practices" \
        "hacktoberfest,good-first-issue,example,go,beginner" \
        "Examples & Tutorials" \
        "\$10 USD"

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
- Must follow Vercel deployment best practices" \
        "hacktoberfest,good-first-issue,dx,vercel,beginner" \
        "Developer Experience" \
        "\$10 USD"

    # Issue 4: Add APort verification to a Framework example
    create_issue_interactive \
        "[Hacktoberfest] Add APort verification to a [Framework] example" \
        "## Description

Builds vital integration assets; provides copy-paste code for your target audience, reducing integration friction.

## Success Criteria:
- Find an official example app for the framework (e.g., Next.js, Express, Django)
- Add APort middleware/check to the example
- Update README with a 1-2 line integration highlight
- Ensure the example works out of the box

## Technology Stack
- Any popular web framework
- APort SDK
- Example applications

## Acceptance Criteria
- Must include working example
- Must have proper documentation
- Must follow framework best practices" \
        "hacktoberfest,integration,framework,beginner" \
        "Ecosystem & Integration" \
        "\$15 USD"

    # Issue 5: Create a simple n8n node for an APort policy check
    create_issue_interactive \
        "[Hacktoberfest] Create a simple n8n node for an APort policy check" \
        "## Description

Taps into a large no-code/low-code audience; demonstrates practical utility in automation.

## Success Criteria:
- Create a custom n8n node that calls the APort verify endpoint
- Provide a clear usage example
- Include proper error handling
- Document the node configuration

## Technology Stack
- n8n
- Node.js
- APort API

## Acceptance Criteria
- Must include working example
- Must have proper documentation
- Must follow n8n node development standards" \
        "hacktoberfest,integration,n8n,automation,intermediate" \
        "Ecosystem & Integration" \
        "\$25 USD"

    # Issue 6: Create a 'Protect your AI Agent' tutorial blog post
    create_issue_interactive \
        "[Hacktoberfest] Create a 'Protect your AI Agent' tutorial blog post" \
        "## Description

Drives SEO and awareness; positions APort as a thought leader in AI agent safety.

## Success Criteria:
- Write a beginner-friendly tutorial (500-700 words) on securing an agent
- Include code snippets and link to APort docs
- Publish on a relevant platform (Dev.to, Medium, personal blog)
- Share the link in the issue comments

## Technology Stack
- Technical writing
- AI agents
- APort integration

## Acceptance Criteria
- Must include working example
- Must have proper documentation
- Must be published and accessible" \
        "hacktoberfest,content,blog,tutorial,beginner" \
        "Content & Documentation" \
        "\$20 USD"

    # Issue 7: Translate a key policy pack or the main README
    create_issue_interactive \
        "[Hacktoberfest] Translate a key policy pack or the main README" \
        "## Description

Expands global reach and accessibility, opening up new developer communities.

## Success Criteria:
- Accurately translate the chosen document into a target language (e.g., Spanish, Portuguese, Hindi)
- Maintain technical accuracy and formatting
- Create a new file with the translated content
- Include a note about the translation in the original document

## Technology Stack
- Translation
- Markdown
- Technical documentation

## Acceptance Criteria
- Must include working example
- Must have proper documentation
- Must maintain technical accuracy" \
        "hacktoberfest,content,translation,beginner" \
        "Content & Documentation" \
        "\$15 USD"

    # Issue 8: Build a simple 'APort Policy Pack Generator' CLI tool
    create_issue_interactive \
        "[Hacktoberfest] Build a simple 'APort Policy Pack Generator' CLI tool" \
        "## Description

Improves the onboarding experience; a tangible, shareable tool that adds clear value.

## Success Criteria:
- Create a simple CLI tool that prompts users for params and generates a valid policy pack JSON file
- Support common policy types (refund, data export, etc.)
- Include validation and error handling
- Provide clear usage instructions

## Technology Stack
- CLI development
- JSON generation
- APort policy format

## Acceptance Criteria
- Must include working example
- Must have proper documentation
- Must follow CLI best practices" \
        "hacktoberfest,tool,cli,intermediate" \
        "Developer Experience" \
        "\$30 USD"
}

# Main execution
echo "🎯 Ready to create additional Hacktoberfest 2025 issues!"
echo ""
echo "This script will create 8 new issues with the following categories:"
echo "• Awareness & Marketing (1 issue)"
echo "• Examples & Tutorials (1 issue)"
echo "• Developer Experience (2 issues)"
echo "• Ecosystem & Integration (2 issues)"
echo "• Content & Documentation (2 issues)"
echo ""
echo "Total bounty pool: \$145 USD"
echo ""

read -p "Continue with issue creation? (y/n): " confirm
if [[ $confirm =~ ^[Yy]$ ]]; then
    create_all_issues
    echo "🎉 All additional Hacktoberfest 2025 issues have been processed!"
    echo ""
    echo "📊 Summary:"
    echo "• Issues created: 8"
    echo "• Total bounty pool: \$145 USD"
    echo "• Categories covered: 5"
    echo ""
    echo "🚀 Ready for Hacktoberfest 2025!"
else
    echo "❌ Issue creation cancelled."
fi
