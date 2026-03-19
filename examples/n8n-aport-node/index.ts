import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';

export class APortVerify implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'APort Verify',
    name: 'aportVerify',
    icon: 'file:aport.svg',
    group: ['security'],
    version: 2,
    description: 'Verify actions with APort - with conditional routing',
    defaults: {
      name: 'APort Verify',
    },
    inputs: ['main'],
    outputs: ['main', 'main'], // Output 0: Allowed, Output 1: Denied
    outputNames: ['Allowed', 'Denied'],
    credentials: [
      {
        name: 'aportApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Action',
        name: 'action',
        type: 'string',
        default: 'verify',
        description: 'The action to verify',
      },
      {
        displayName: 'Actor ID',
        name: 'actorId',
        type: 'string',
        default: '',
        description: 'ID of the actor performing the action',
      },
      {
        displayName: 'Actor Name',
        name: 'actorName',
        type: 'string',
        default: '',
        description: 'Name of the actor',
      },
      {
        displayName: 'Context (JSON)',
        name: 'context',
        type: 'json',
        default: '{}',
        description: 'Additional context for verification',
      },
      {
        displayName: 'Project ID',
        name: 'projectId',
        type: 'string',
        default: '',
        description: 'APort project ID (optional)',
      },
      {
        displayName: 'Fail on Error',
        name: 'failOnError',
        type: 'boolean',
        default: true,
        description: 'Whether to route errors to the Denied output or throw an error',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const allowedResults: INodeExecutionData[] = [];
    const deniedResults: INodeExecutionData[] = [];

    const credentials = await this.getCredentials('aportApi');
    const failOnError = this.getNodeParameter('failOnError', 0) as boolean;

    for (let i = 0; i < items.length; i++) {
      try {
        const action = this.getNodeParameter('action', i) as string;
        const actorId = this.getNodeParameter('actorId', i) as string;
        const actorName = this.getNodeParameter('actorName', i) as string;
        const contextJson = this.getNodeParameter('context', i) as string;
        const projectId = this.getNodeParameter('projectId', i) as string;

        let context;
        try {
          context = typeof contextJson === 'string' ? JSON.parse(contextJson) : contextJson;
        } catch {
          context = { data: contextJson };
        }

        const body = {
          action,
          actor: {
            id: actorId || `user-${i}`,
            name: actorName || `user-${i}`,
            owner: 'n8n',
          },
          context: {
            data: context,
          },
          projectId: projectId || (credentials as any).projectId || 'default',
        };

        const response = await this.helpers.request({
          method: 'POST',
          url: 'https://api.aport.io/verify',
          body,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${(credentials as any).apiKey}`,
          },
          json: true,
        });

        const resultData: INodeExecutionData = {
          json: {
            success: true,
            allow: response.allow,
            reasons: response.reasons || [],
            ...response,
          },
        };

        // Route to appropriate output based on verification result
        if (response.allow === true) {
          allowedResults.push(resultData);
        } else {
          deniedResults.push(resultData);
        }
      } catch (error) {
        if (failOnError) {
          // Route errors to Denied output
          deniedResults.push({
            json: {
              success: false,
              allow: false,
              error: error.message,
            },
          });
        } else if (this.continueOnFail()) {
          deniedResults.push({
            json: {
              success: false,
              allow: false,
              error: error.message,
            },
          });
        } else {
          throw new NodeOperationError(this.getNode(), error.message);
        }
      }
    }

    return [allowedResults, deniedResults];
  }
}
