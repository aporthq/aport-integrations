import {
  ICredentialType,
  NodePropertyTypes,
} from 'n8n-workflow';

export class APortApiCredential implements ICredentialType {
  name = 'aportApi';
  displayName = 'APort API';
  documentationUrl = 'https://aport.io/docs';
  properties = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string' as NodePropertyTypes,
      typeOptions: {
        password: true,
      },
      default: '',
      required: true,
      description: 'Your APort API key from aport.io/dashboard',
    },
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string' as NodePropertyTypes,
      default: 'https://api.aport.io',
      required: false,
      description: 'APort API base URL (default: https://api.aport.io)',
    },
  ];
}
