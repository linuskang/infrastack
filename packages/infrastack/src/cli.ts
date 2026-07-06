#!/usr/bin/env node
import { version } from "./index.js";

const args = process.argv.slice(2);
const command = args[0] ?? "help";

function showHelp(): void {
  console.log(`infrastack v${version}`);
  console.log("");
  console.log("Usage: infrastack <command>");
  console.log("");
  console.log("Commands:");
  console.log("  hello     Print a hello-world message");
  console.log("  version   Print the current version");
  console.log("  help      Show this help message");
}

switch (command) {
  case "hello": {
    console.log("Hello from the Infrastack CLI");
    break;
  }
  case "version":
  case "--version":
  case "-v": {
    console.log(version);
    break;
  }
  case "help":
  case "--help":
  case "-h":
  default: {
    showHelp();
  }
}
