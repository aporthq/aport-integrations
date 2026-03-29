import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';

interface APortCredentials {
  apiKey: string;
  baseUrl?: string;
}

interface APortVerificationContext {
  source?: string;
  [key: string]: unknown;
}

interface APortVerificationResponse {
  verified: boolean;
  passport?: {
    agentId: string;
    capabilities?: string[];
    limits?: {
      requests: number;
      period: string;
    };
    level?: string;
    issuedAt?: string;
  };
  policy: string;
  message?: string;
  details?: Record<string, unknown>;
}

export class APortNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'APort Verify',
    name: 'aportVerify',
    icon: 'file:aport.svg',
    group: ['utility', 'security'],
    version: 1,
    subtitle: 'Verify agent identity',
    description: 'Verify agent identity using APort policies',
    defaults: {
      name: 'APort Verify',
      color: '#06b6d4',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'aportApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        default: 'verify',
        options: [
          {
            name: 'Verify',
            value: 'verify',
            description: 'Verify an agent against a policy',
            action: 'Verify agent',
          },
          {
            name: 'Status',
            value: 'status',
            description: 'Get agent verification status',
            action: 'Get agent status',
          },
          {
            name: 'List Policies',
            value: 'listPolicies',
            description: 'List all available policies',
            action: 'List policies',
          },
        ],
      },
      {
        displayName: 'Agent ID',
        name: 'agentId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            operation: ['verify', 'status'],
          },
        },
        description: 'The agent ID to verify or check',
      },
      {
        displayName: 'Policy',
        name: 'policy',
        type: 'string',
        default: 'default-policy',
        required: true,
        displayOptions: {
          show: {
            operation: ['verify'],
          },
        },
        description: 'The policy ID to verify against',
      },
      {
        displayName: 'Additional Context',
        name: 'contextUi',
        type: 'collection',
        placeholder: 'Add Context Field',
        displayOptions: {
          show: {
            operation: ['verify'],
          },
        },
        default: {},
        options: [
          {
            displayName: 'Source',
            name: 'source',
            type: 'string',
            default: 'n8n',
            description: 'Source identifier for the verification request',
          },
          {
            displayName: 'Custom Context (JSON)',
            name: 'customContext',
            type: 'string',
            typeOptions: {
              rows: 4,
            },
            default: '{}',
            description: 'Additional context as JSON object',
          },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const credentials = await this.getCredentials('aportApi') as APortCredentials;
    const operation = this.getNodeParameter('operation', 0) as string;

    const baseUrl = credentials.baseUrl || 'https://api.aport.io';
    const apiKey = credentials.apiKey;

    let responseData: unknown;

    if (operation === 'verify') {
      const agentId = this.getNodeParameter('agentId', 0) as string;
      const policy = this.getNodeParameter('policy', 0) as string;
      const contextUi = this.getNodeParameter('contextUi', 0) as {
        source?: string;
        customContext?: string;
      };

      if (!agentId) {
        throw new NodeOperationError(this.getNode(), 'Agent ID is required');
      }

      let customContext: Record<string, unknown> = {};
      if (contextUi?.customContext) {
        try {
          customContext = JSON.parse(contextUi.customContext);
        } catch {
          throw new NodeOperationError(this.getNode(), 'Invalid JSON in custom context');
        }
      }

      const context: APortVerificationContext = {
        source: contextUi?.source || 'n8n',
        workflowId: this.getWorkflow().id,
        nodeName: this.getNode().name,
        ...customContext,
      };

      // Mock verification for template - replace with actual API call in production
      // const response = await fetch(`${baseUrl}/verify`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${apiKey}`,
      //   },
      //   body: JSON.stringify({ policy, agent_id: agentId, context }),
      // });
      // responseData = await response.json();

      // Mock response for template
      responseData = {
        verified: true,
        passport: {
          agentId,
          capabilities: ['read', 'write'],
          limits: { requests: 1000, period: '1h' },
          level: 'github_verified',
          issuedAt: new Date().toISOString(),
        },
        policy,
        message: 'Verification successful (mock)',
        details: {
          source: 'n8n-node',
          context,
        },
      } as APortVerificationResponse;

    } else if (operation === 'status') {
      const agentId = this.getNodeParameter('agentId', 0) as string;

      if (!agentId) {
        throw new NodeOperationError(this.getNode(), 'Agent ID is required');
      }

      // Mock status check
      responseData = {
        agentId,
        status: 'active',
        passport: {
          agentId,
          capabilities: ['read', 'write'],
          limits: { requests: 800, period: '1h' },
          level: 'github_verified',
        },
        lastVerified: new Date(Date.now() - 3600000).toISOString(),
      };

    } else if (operation === 'listPolicies') {
      // Mock policy list
      responseData = {
        policies: [
          { id: 'deploy-policy', name: 'Deploy Policy', description: 'Required for deployment actions' },
          { id: 'data-export-policy', name: 'Data Export Policy', description: 'Required for data export' },
          { id: 'refund-policy', name: 'Refund Policy', description: 'Required for processing refunds' },
          { id: 'pr-merge-policy', name: 'PR Merge Policy', description: 'Required for merging PRs' },
        ],
      };

    } else {
      throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
    }

    return [this.helpers.returnJsonArray(responseData)];
  }
}
