const tools = require("../tools/_toolRegistry");

module.exports = async function invokeTool(toolName, args) {
  const tool = tools[toolName];

  if (!tool) {
    throw new Error(`Tool '${toolName}' not found in registry.`);
  }

  // NEW FORMAT — every tool uses .run()
  if (typeof tool.run !== "function") {
    throw new Error(`Tool '${toolName}' is missing a run handler.`);
  }

  try {
    const result = await tool.run(args || {});
    return result ?? null;
  } catch (err) {
    throw new Error(`Tool '${toolName}' failed: ${err.message}`);
  }
};
