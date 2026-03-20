import {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import {
	IHttpRequestOptions,
	NodeApiError,
} from 'n8n-core';

export class AportVerify implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'APort Verify',
		name: 'aportVerify',
		icon: 'file:aport.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Execute APort policy verification in n8n workflows',
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
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{ name: 'Agent', value: 'agent' },
					{ name: 'Policy', value: 'policy' },
				],
				default: 'policy',
				description: 'Resource to operate on',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['policy'],
					},
				},
				options: [
					{ name: 'Verify', value: 'verify_policy' },
					{ name: 'Get Passport', value: 'get_passport_view' },
					{ name: 'Get Decision Token', value: 'get_decision_token' },
				],
				default: 'verify_policy',
				description: 'Operation to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['agent'],
					},
				},
				options: [
					{ name: 'Verify', value: 'verify_agent' },
					{ name: 'Get Passport', value: 'get_passport_view' },
				],
				default: 'verify_agent',
				description: 'Operation to perform',
			},
			{
				displayName: 'Agent ID',
				name: 'agentId',
				type: 'string',
				default: '',
				required: true,
				description: 'The agent identifier. Supports expressions like {{ $json.agent_id }}',
			},
			{
				displayName: 'Policy ID',
				name: 'policyId',
				type: 'string',
				default: '',
				required: false,
				displayOptions: {
					hide: {
						operation: ['verify_agent'],
					},
				},
				description: 'The policy identifier. Supports expressions like {{ $json.policy_id }}',
			},
			{
				displayName: 'Context',
				name: 'context',
				type: 'json',
				default: '{}',
				description: 'JSON context for policy evaluation. Supports expressions like {{ JSON.stringify($json) }}',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<unknown[]> {
		const items = this.getInputData();
		const returnData: unknown[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const agentId = this.getNodeParameter('agentId', 0) as string;
		const contextJson = this.getNodeParameter('context', 0, '{}') as string;

		const credentials = await this.getCredentials('aportApi');
		const baseUrl = (credentials.baseUrl as string) || 'http://localhost:8000';
		const apiKey = credentials.apiKey as string;

		let context: Record<string, unknown>;
		try {
			context = JSON.parse(contextJson);
		} catch {
			throw new NodeOperationError(this.getNode(), 'Invalid JSON in Context field');
		}

		for (let i = 0; i < items.length; i++) {
			const policyId = this.getNodeParameter('policyId', i, '') as string;
			const resolvedAgentId = this.evaluateExpression(agentId, i) as string;
			const resolvedPolicyId = policyId ? (this.evaluateExpression(policyId, i) as string) : '';

			const endpoint = this.buildEndpoint(resource, operation, resolvedAgentId, resolvedPolicyId);

			const options: IHttpRequestOptions = {
				method: 'POST',
				url: `${baseUrl.replace(/\/+$/, '')}${endpoint}`,
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${apiKey}`,
				},
				body: {
					agent_id: resolvedAgentId,
					policy_id: resolvedPolicyId,
					context,
				},
				json: true,
			};

			try {
				const response = await this.helpers.requestWithAuthentication.call(this, 'aportApi', options);
				returnData.push({
					json: response,
				});
			} catch (error) {
				if (error instanceof NodeApiError) {
					const errorBody = error.cause?.body || error.cause?.message || {};
					returnData.push({
						json: {
							allow: false,
							decision_id: null,
							reasons: [error.message],
							error: errorBody,
						},
					});
				} else {
					throw error;
				}
			}
		}

		return returnData;
	}

	private buildEndpoint(resource: string, operation: string, agentId: string, policyId: string): string {
		switch (operation) {
			case 'verify_policy':
				return `/v1/verify`;
			case 'verify_agent':
				return `/v1/agent/${encodeURIComponent(agentId)}/verify`;
			case 'get_passport_view':
				return `/v1/agent/${encodeURIComponent(agentId)}/passport`;
			case 'get_decision_token':
				return `/v1/policy/${encodeURIComponent(policyId)}/decision-token`;
			default:
				return `/v1/verify`;
		}
	}
}
