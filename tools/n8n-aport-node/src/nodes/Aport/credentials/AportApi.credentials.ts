import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentials,
	NodeApiError,
} from 'n8n-workflow';

export class AportApi implements ICredentials {
	name = 'aportApi';
	displayName = 'APort API';
	documentationUrl = 'https://github.com/APort-Protocol/aport-integrations';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'APort API Key for authentication',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'http://localhost:8000',
			description: 'Base URL of the APort API server',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/v1/health',
		},
	};
}
