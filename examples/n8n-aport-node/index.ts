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
    version: 1,
    description: 'Verify actions with APort',
    defaults: {
      name: 'APort Verify',
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
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const credentials = await this.getCredentials('aportApi');

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
          projectId: projectId || credentials.projectId || 'default',
        };

        const response = await this.helpers.request({
          method: 'POST',
          url: 'https://api.aport.io/verify',
          body,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${credentials.apiKey}`,
          },
          json: true,
        });

        returnData.push({
          json: {
            success: true,
            allow: response.allow,
            reasons: response.reasons || [],
            ...response,
          },
        });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              success: false,
              error: error.message,
            },
          });
          continue;
        }
        throw new NodeOperationError(this.getNode(), error.message);
      }
    }

    return [returnData];
  }
}
