require("dotenv").config();

const { createApp } = require("./app");

const port = Number(process.env.PORT || 3000);
const app = createApp();

app.listen(port, () => {
  console.log(`APort Shopify refund guardrail listening on ${port}`);
});
