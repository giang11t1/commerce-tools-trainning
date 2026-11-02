import fs from "node:fs";

let input = "";

for await (const chunk of process.stdin) {
    input += chunk;
}

let event;

try {
    event = JSON.parse(input);
} catch {
    process.exit(0);
}

const toolName = event.tool_name;
const toolInput = event.tool_input ?? {};

if (!["Edit", "Write"].includes(toolName)) {
    process.exit(0);
}

const filePath =
    toolInput.file_path ??
    toolInput.path ??
    "";

if (!filePath) {
    process.exit(0);
}

if (!/\.(tsx?|jsx?)$/i.test(filePath)) {
    process.exit(0);
}

if (!fs.existsSync(filePath)) {
    process.exit(0);
}

console.log(`[agent-hook] File changed: ${filePath}`);
