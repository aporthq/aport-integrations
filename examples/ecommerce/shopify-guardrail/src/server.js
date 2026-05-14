import { createApp } from './app.js';
import { assertRequiredConfig, loadConfig } from './config.js';

const config = loadConfig();
assertRequiredConfig(config);

const app = createApp(config);

app.listen(config.port, () => {
  console.log(`APort Shopify refund guardrail listening on port ${config.port}`);
});
