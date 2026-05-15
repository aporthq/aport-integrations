import { loadConfig } from "./config.js"
import { createServer } from "./app.js"

const config = loadConfig()
const server = createServer({ config })

server.listen(config.port, () => {
  console.log(`Shopify refund guardrail listening on :${config.port}`)
})
