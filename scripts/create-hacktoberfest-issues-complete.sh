#!/bin/bash

# APort Integrations - Complete Interactive Hacktoberfest 2025 Issue Creation Script
# This script creates all 20 Hacktoberfest issues with preview and edit capabilities
# Based on the HACKTOBERFEST-STRATEGY.md document

set -e

echo "🎉 APort Integrations - Complete Interactive Hacktoberfest 2025 Issue Creator"
echo "=========================================================================="
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
    
    while true; do
        read -p "Do you want to (c)reate, (e)dit, or (s)kip this issue? [c/e/s]: " choice
        case $choice in
            [Cc]* )
                echo "Creating issue..."
                gh issue create --title "$title" --body "$body" --label "$labels" --assignee ""
                echo "✅ Issue created successfully!"
                break
                ;;
            [Ee]* )
                echo "Opening editor to modify the issue..."
                echo "Title: $title" > /tmp/issue_edit.txt
                echo "Labels: $labels" >> /tmp/issue_edit.txt
                echo "Bounty: $bounty" >> /tmp/issue_edit.txt
                echo "" >> /tmp/issue_edit.txt
                echo "Description:" >> /tmp/issue_edit.txt
                echo "$body" >> /tmp/issue_edit.txt
                
                ${EDITOR:-nano} /tmp/issue_edit.txt
                
                # Parse the edited file
                local edited_title=$(grep "^Title:" /tmp/issue_edit.txt | cut -d' ' -f2-)
                local edited_labels=$(grep "^Labels:" /tmp/issue_edit.txt | cut -d' ' -f2-)
                local edited_body=$(sed -n '/^Description:/,$p' /tmp/issue_edit.txt | tail -n +2)
                
                echo "📋 Updated Issue Preview:"
                echo "========================"
                echo "Title: $edited_title"
                echo "Labels: $edited_labels"
                echo ""
                echo "Description:"
                echo "$edited_body"
                echo "========================"
                echo ""
                
                read -p "Create this updated issue? [y/n]: " confirm
                if [[ $confirm =~ ^[Yy]$ ]]; then
                    gh issue create --title "$edited_title" --body "$edited_body" --label "$edited_labels" --assignee ""
                    echo "✅ Updated issue created successfully!"
                    break
                fi
                ;;
            [Ss]* )
                echo "⏭️  Skipping this issue..."
                break
                ;;
            * )
                echo "Please enter c, e, or s"
                ;;
        esac
    done
    
    echo ""
    echo "Press Enter to continue to the next issue..."
    read
    echo ""
}

echo "🚀 Starting interactive issue creation process..."
echo "This will create all 20 issues from the HACKTOBERFEST-STRATEGY.md document"
echo ""

# =============================================================================
# CATEGORY 1: AGENT FRAMEWORK INTEGRATIONS (Highest Strategic Priority)
# =============================================================================

echo "🤖 CATEGORY 1: AGENT FRAMEWORK INTEGRATIONS"
echo "==========================================="
echo ""

# Issue 1: LangChain Tool Guard
create_issue_interactive \
    "[Hacktoberfest] Create a LangChain Tool Guard" \
    "Create an APortToolGuard class that wraps LangChain Tool objects. Before execution, it calls APort /verify to check the agent's passport.

## Success Criteria
- Working class in /examples/langchain with README and example agent using protected tools
- APortToolGuard class that wraps LangChain tools
- Verification before tool execution
- Comprehensive tests and documentation
- Example usage with different tool types

## Technology Stack
- Python, LangChain, aporthq-sdk-python

## Acceptance Criteria
- Must include working example
- Must have proper error handling
- Must include documentation
- Must support all LangChain tool types

## Bounty
\$50 USD" \
    "hacktoberfest,integration,agent-framework,python,langchain,high-impact" \
    "Agent Framework Integrations" \
    "\$50 USD"

# Issue 2: CrewAI Task Verification Decorator
create_issue_interactive \
    "[Hacktoberfest] Build a CrewAI Task Verification Decorator" \
    "Create @aport_verify decorator for CrewAI tasks. Performs APort verification before task execution.

## Success Criteria
- Working decorator in /examples/crewai with crew example using protected tasks
- @aport_verify decorator for CrewAI tasks
- Verification before task execution
- Comprehensive tests and documentation
- Example usage with different task types

## Technology Stack
- Python, CrewAI, aporthq-sdk-python

## Acceptance Criteria
- Must include working example
- Must have proper error handling
- Must include documentation
- Must support all CrewAI task types

## Bounty
\$50 USD" \
    "hacktoberfest,integration,agent-framework,python,crewai,high-impact" \
    "Agent Framework Integrations" \
    "\$50 USD"

# Issue 3: n8n APort Verification Node
create_issue_interactive \
    "[Hacktoberfest] Create a Custom n8n Node for APort Verification" \
    "Build custom n8n node that takes Passport ID and context, routes workflow based on APort response.

## Success Criteria
- Published custom node with installation instructions and example workflow
- Custom n8n node for APort verification
- Node configuration and execution
- Comprehensive tests and documentation
- Example workflows

## Technology Stack
- JavaScript, n8n, @aporthq/sdk-node

## Acceptance Criteria
- Must include working example
- Must have proper error handling
- Must include documentation
- Must support n8n node development standards

## Bounty
\$50 USD" \
    "hacktoberfest,integration,agent-framework,low-code,n8n,high-impact" \
    "Agent Framework Integrations" \
    "\$50 USD"

# Issue 4: LangGraph Checkpoint Guardrails
create_issue_interactive \
    "[Hacktoberfest] LangGraph Checkpoint Guardrails" \
    "Integrate APort verification into LangGraph state machine checkpoints to approve/deny state transitions.

## Success Criteria
- Working integration in /examples/langgraph with state machine example
- LangGraph checkpoint integration
- State machine verification
- Comprehensive tests and documentation
- Example state machines

## Technology Stack
- Python, LangGraph, aporthq-sdk-python

## Acceptance Criteria
- Must include working example
- Must have proper error handling
- Must include documentation
- Must support LangGraph checkpoint system

## Bounty
\$50 USD" \
    "hacktoberfest,integration,agent-framework,python,langgraph" \
    "Agent Framework Integrations" \
    "\$50 USD"

# Issue 5: Zapier Custom App
create_issue_interactive \
    "[Hacktoberfest] Zapier Custom App for APort Verification" \
    "Build private/public Zapier app providing \"APort Verify\" action for Zaps.

## Success Criteria
- Published Zapier app with working verification action and documentation
- Zapier custom app for APort verification
- App configuration and execution
- Comprehensive tests and documentation
- Example Zaps

## Technology Stack
- JavaScript, Zapier, @aporthq/sdk-node

## Acceptance Criteria
- Must include working example
- Must have proper error handling
- Must include documentation
- Must support Zapier app development standards

## Bounty
\$50 USD" \
    "hacktoberfest,integration,agent-framework,zapier,low-code" \
    "Agent Framework Integrations" \
    "\$50 USD"

# =============================================================================
# CATEGORY 2: E-COMMERCE & PAYMENTS GUARDRAILS
# =============================================================================

echo "🛒 CATEGORY 2: E-COMMERCE & PAYMENTS GUARDRAILS"
echo "=============================================="
echo ""

# Issue 6: Shopify App Refund Guardrail
create_issue_interactive \
    "[Hacktoberfest] Build a Shopify App Refund Guardrail" \
    "Complete production-ready Shopify app using APort to verify refund requests via webhooks.

## Success Criteria
- Deployable app in /examples/shopify-guardrail using payments.refund.v1 policy
- Complete Shopify app with APort verification
- Refund processing with policy checks
- Comprehensive tests and documentation
- Example Shopify app setup

## Technology Stack
- JavaScript, Shopify API, @aporthq/sdk-node

## Acceptance Criteria
- Must include working example
- Must have proper error handling
- Must include documentation
- Must follow Shopify app development standards

## Bounty
\$50 USD" \
    "hacktoberfest,integration,ecommerce-demo,shopify,high-impact" \
    "E-commerce & Payments Guardrails" \
    "\$50 USD"

# Issue 7: WooCommerce Verification Plugin
create_issue_interactive \
    "[Hacktoberfest] WooCommerce Verification Plugin" \
    "WordPress plugin integrating WooCommerce with APort for order/refund verification.

## Success Criteria
- Working WordPress plugin with APort integration and admin interface
- WordPress plugin for WooCommerce
- Order and refund verification
- Comprehensive tests and documentation
- Example plugin setup

## Technology Stack
- PHP, WordPress, WooCommerce, aporthq-sdk-php

## Acceptance Criteria
- Must include working example
- Must have proper error handling
- Must include documentation
- Must follow WordPress plugin development standards

## Bounty
\$50 USD" \
    "hacktoberfest,integration,ecommerce-demo,woocommerce,wordpress" \
    "E-commerce & Payments Guardrails" \
    "\$50 USD"

# Issue 8: Stripe Connect Payout Verification
create_issue_interactive \
    "[Hacktoberfest] Stripe Connect Payout Verification" \
    "Webhook handler verifying Stripe Connect payouts against APort policies before finalization.

## Success Criteria
- Working webhook handler with APort integration and example implementation
- Stripe Connect webhook handler
- Payout verification with APort
- Comprehensive tests and documentation
- Example webhook setup

## Technology Stack
- JavaScript, Stripe API, @aporthq/sdk-node

## Acceptance Criteria
- Must include working example
- Must have proper error handling
- Must include documentation
- Must follow Stripe webhook development standards

## Bounty
\$50 USD" \
    "hacktoberfest,integration,ecommerce-demo,stripe,payments" \
    "E-commerce & Payments Guardrails" \
    "\$50 USD"

# =============================================================================
# CATEGORY 3: DEVELOPER EXPERIENCE TOOLS
# =============================================================================

echo "🔧 CATEGORY 3: DEVELOPER EXPERIENCE TOOLS"
echo "========================================="
echo ""

# Issue 9: APort CLI & Scaffolding
create_issue_interactive \
    "[Hacktoberfest] Build a CLI to Bootstrap APort Integrations" \
    "Create npx create-aport-integration CLI tool that scaffolds boilerplate for different frameworks.

## Success Criteria
- Published NPM package with templates for 3+ frameworks (Next.js, Express, FastAPI)
- CLI tool for APort integration
- Development and management commands
- Comprehensive tests and documentation
- Example CLI usage

## Technology Stack
- JavaScript, Node.js, Commander.js, @aporthq/sdk-node

## Acceptance Criteria
- Must include working example
- Must have proper error handling
- Must include documentation
- Must follow CLI development best practices

## Bounty
\$50 USD" \
    "hacktoberfest,developer-experience,devex-tool,cli,high-impact" \
    "Developer Experience Tools" \
    "\$50 USD"

# Issue 10: Comprehensive Postman Collection
create_issue_interactive \
    "[Hacktoberfest] Create a Comprehensive Postman Collection" \
    "Complete Postman collection for all APort API endpoints with authentication and examples.

## Success Criteria
- Postman collection with pre-request scripts, \"Run in Postman\" button in docs
- Complete API testing suite
- Comprehensive tests and documentation
- Example collection usage

## Technology Stack
- Postman, APort API

## Acceptance Criteria
- Must include working example
- Must have proper error handling
- Must include documentation
- Must follow Postman collection best practices

## Bounty
\$50 USD" \
    "hacktoberfest,developer-experience,devex-tool,postman,testing" \
    "Developer Experience Tools" \
    "\$50 USD"

# Issue 11: VS Code Extension for Policy Development
create_issue_interactive \
    "[Hacktoberfest] VS Code Extension for Policy Development" \
    "VS Code extension with schema validation, IntelliSense, and syntax highlighting for APort Policy Packs.

## Success Criteria
- Published VS Code extension with policy validation and IntelliSense features
- VS Code extension for APort
- Policy development with IntelliSense
- Comprehensive tests and documentation
- Example extension usage

## Technology Stack
- TypeScript, VS Code API, @aporthq/sdk-node

## Acceptance Criteria
- Must include working example
- Must have proper error handling
- Must include documentation
- Must follow VS Code extension development standards

## Bounty
\$50 USD" \
    "hacktoberfest,developer-experience,devex-tool,vscode,extension" \
    "Developer Experience Tools" \
    "\$50 USD"

# =============================================================================
# CATEGORY 4: PROTOCOL BRIDGES & STANDARDS
# =============================================================================

echo "🌉 CATEGORY 4: PROTOCOL BRIDGES & STANDARDS"
echo "==========================================="
echo ""

# Issue 12: OpenAPI 3.1 Specification
create_issue_interactive \
    "[Hacktoberfest] Create a full OpenAPI 3.1 Specification for the APort API" \
    "Complete OpenAPI 3.1 spec for APort API to enable auto-generation of client SDKs.

## Success Criteria
- Valid openapi.yml file passing OpenAPI 3.1 validation with all endpoints documented
- OpenAPI 3.1 specification for APort API
- Complete API documentation
- Comprehensive tests and documentation
- Example API usage

## Technology Stack
- OpenAPI 3.1, YAML, APort API

## Acceptance Criteria
- Must include working example
- Must have proper error handling
- Must include documentation
- Must follow OpenAPI 3.1 standards

## Bounty
\$50 USD" \
    "hacktoberfest,integration,protocol-bridge,openapi,spec,high-impact" \
    "Protocol Bridges & Standards" \
    "\$50 USD"

# Issue 13: AP2 Bridge for Payment Authorization
create_issue_interactive \
    "[Hacktoberfest] AP2 Bridge for Payment Authorization" \
    "Proof-of-concept using APort Passport to authorize AP2 payment intents.

## Success Criteria
- Working bridge implementation demonstrating APort + AP2 integration
- AP2 payment integration
- APort passport authorization
- Comprehensive tests and documentation
- Example payment flow

## Technology Stack
- JavaScript, AP2 API, @aporthq/sdk-node

## Acceptance Criteria
- Must include working example
- Must have proper error handling
- Must include documentation
- Must follow AP2 integration standards

## Bounty
\$50 USD" \
    "hacktoberfest,integration,protocol-bridge,ap2,payments" \
    "Protocol Bridges & Standards" \
    "\$50 USD"

# Issue 14: SPIFFE/SPIRE Integration
create_issue_interactive \
    "[Hacktoberfest] SPIFFE/SPIRE Integration Bridge" \
    "Create bridge for federating identity between APort and SPIFFE/SPIRE for enterprise adoption.

## Success Criteria
- Working integration demonstrating APort + SPIFFE/SPIRE identity federation
- SPIFFE/SPIRE integration
- Enterprise identity federation
- Comprehensive tests and documentation
- Example federation setup

## Technology Stack
- Go, SPIFFE/SPIRE, aporthq-sdk-go

## Acceptance Criteria
- Must include working example
- Must have proper error handling
- Must include documentation
- Must follow SPIFFE/SPIRE integration standards

## Bounty
\$50 USD" \
    "hacktoberfest,integration,protocol-bridge,spiffe,spire,enterprise" \
    "Protocol Bridges & Standards" \
    "\$50 USD"

# =============================================================================
# CATEGORY 5: CORE FRAMEWORK SDKs & MIDDLEWARE
# =============================================================================

echo "🛠️ CATEGORY 5: CORE FRAMEWORK SDKs & MIDDLEWARE"
echo "=============================================="
echo ""

# Issue 15: Next.js Middleware Integration
create_issue_interactive \
    "[Hacktoberfest] Next.js Middleware Integration" \
    "Build Next.js middleware for APort verification supporting both App Router and Pages Router.

## Success Criteria
- NPM package with Next.js middleware, working with both routing systems
- Next.js middleware package
- APort verification integration
- Comprehensive tests and documentation
- Example Next.js app

## Technology Stack
- TypeScript, Next.js, @aporthq/sdk-node

## Acceptance Criteria
- Must include working example
- Must have proper error handling
- Must include documentation
- Must follow Next.js middleware development standards

## Bounty
\$50 USD" \
    "hacktoberfest,integration,nextjs,middleware" \
    "Core Framework SDKs & Middleware" \
    "\$50 USD"

# Issue 16: Django Middleware Package
create_issue_interactive \
    "[Hacktoberfest] Django Middleware Package" \
    "Create PyPI package for adding APort verification to Django applications.

## Success Criteria
- Published PyPI package with Django middleware and documentation
- Django middleware package
- APort verification integration
- Comprehensive tests and documentation
- Example Django app

## Technology Stack
- Python, Django, aporthq-sdk-python

## Acceptance Criteria
- Must include working example
- Must have proper error handling
- Must include documentation
- Must follow Django middleware development standards

## Bounty
\$50 USD" \
    "hacktoberfest,integration,django,python,middleware" \
    "Core Framework SDKs & Middleware" \
    "\$50 USD"

# Issue 17: Laravel Middleware Package
create_issue_interactive \
    "[Hacktoberfest] Laravel Middleware Package" \
    "Create Composer package for integrating APort into Laravel applications.

## Success Criteria
- Published Composer package with Laravel middleware and Artisan commands
- Laravel Composer package
- APort verification integration
- Comprehensive tests and documentation
- Example Laravel app

## Technology Stack
- PHP, Laravel, Composer, aporthq-sdk-php

## Acceptance Criteria
- Must include working example
- Must have proper error handling
- Must include documentation
- Must follow Laravel package development standards

## Bounty
\$50 USD" \
    "hacktoberfest,integration,laravel,php,middleware" \
    "Core Framework SDKs & Middleware" \
    "\$50 USD"

# Issue 18: Rails Gem Integration
create_issue_interactive \
    "[Hacktoberfest] Rails Gem Integration" \
    "Build Ruby gem for adding APort to Ruby on Rails applications.

## Success Criteria
- Published Ruby gem with Rails generators and helpers
- Ruby gem for APort verification
- Rails integration
- Comprehensive tests and documentation
- Example Rails app

## Technology Stack
- Ruby, Rails, aporthq-sdk-ruby

## Acceptance Criteria
- Must include working example
- Must have proper error handling
- Must include documentation
- Must follow Ruby gem development standards

## Bounty
\$50 USD" \
    "hacktoberfest,integration,rails,ruby,middleware" \
    "Core Framework SDKs & Middleware" \
    "\$50 USD"

# Issue 19: Go (Golang) SDK
create_issue_interactive \
    "[Hacktoberfest] Go (Golang) SDK" \
    "Create official Go SDK for the APort API with middleware for popular Go frameworks.

## Success Criteria
- Go module with SDK and middleware for Gin, Echo, Fiber frameworks
- Go SDK for APort
- Complete API client
- Comprehensive tests and documentation
- Example Go applications

## Technology Stack
- Go, aporthq-sdk-go

## Acceptance Criteria
- Must include working example
- Must have proper error handling
- Must include documentation
- Must follow Go SDK development standards

## Bounty
\$50 USD" \
    "hacktoberfest,integration,golang,sdk,middleware" \
    "Core Framework SDKs & Middleware" \
    "\$50 USD"

# Issue 20: Express.js Middleware Package
create_issue_interactive \
    "[Hacktoberfest] Express.js Middleware Package" \
    "Build an Express.js middleware package for APort verification.

## Success Criteria
- NPM package with Express.js middleware and documentation
- Express.js middleware package
- APort verification integration
- Comprehensive tests and documentation
- Example Express.js app

## Technology Stack
- JavaScript, Express.js, @aporthq/sdk-node

## Acceptance Criteria
- Must include working example
- Must have proper error handling
- Must include documentation
- Must follow Express.js middleware development standards

## Bounty
\$50 USD" \
    "hacktoberfest,integration,express,middleware" \
    "Core Framework SDKs & Middleware" \
    "\$50 USD"

echo "🎉 All 20 Hacktoberfest issues have been processed!"
echo "Check your repository for the created issues."
echo ""
echo "📊 Summary:"
echo "- Agent Framework Integrations: 5 issues"
echo "- E-commerce & Payments Guardrails: 3 issues"
echo "- Developer Experience Tools: 3 issues"
echo "- Protocol Bridges & Standards: 3 issues"
echo "- Core Framework SDKs & Middleware: 6 issues"
echo "- Total: 20 issues"
echo ""
echo "🚀 Happy coding and good luck with your contributions!"
