// mcp-server/tools/_toolRegistry.js
// SAFE VERSION — prevents invalid tools from loading

const fs = require("fs");
const path = require("path");

const toolsDir = __dirname;
const registry = {};

const isToolFile = (file) => {
  return file.endsWith(".js") && file !== "_toolRegistry.js";
};

fs.readdirSync(toolsDir)
  .filter(isToolFile)
  .forEach((file) => {
    const toolModule = require(path.join(toolsDir, file));

    // Expecting: module.exports = { toolName: {...} }
    if (!toolModule || typeof toolModule !== "object") {
      console.warn(`[MCP] Skipping invalid tool file: ${file}`);
      return;
    }

    const entries = Object.entries(toolModule);

    entries.forEach(([name, def]) => {
      if (!name || typeof name !== "string") {
        console.warn(`[MCP] Skipping tool with invalid name in ${file}`);
        return;
      }
      if (!def || typeof def !== "object") {
        console.warn(`[MCP] Skipping tool ${name}, invalid definition`);
        return;
      }
      if (!def.run || typeof def.run !== "function") {
        console.warn(`[MCP] Tool ${name} missing run() function`);
        return;
      }

      registry[name] = def;
    });
  });

module.exports = registry;
console.log("[DEBUG] Loaded tools:", Object.keys(registry));
