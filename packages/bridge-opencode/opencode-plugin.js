/**
 * Governance Framework — OpenCode Plugin
 *
 * Drop-in plugin for OpenCode that bridges lifecycle events to the Governance Kernel.
 *
 * Installation:
 *   Copy this file to ~/.config/opencode/plugins/governance.js
 *   Or: cp governance.js ~/.config/opencode/plugins/
 *
 * Requirements:
 *   npm install @framework/core @framework/bridge-opencode
 *
 * This plugin provides:
 *   - Tool execution governance (before/after hooks)
 *   - Permission request governance
 *   - Message governance
 *   - System prompt transformation
 *   - Session compaction governance
 *   - governance_status and governance_test diagnostic tools
 */

import { tool } from "@opencode-ai/plugin"

// Lazy-loaded bridge and governance engine
let bridge = null
let governanceHandler = null

async function getBridge() {
  if (!bridge) {
    const mod = await import("@framework/bridge-opencode")
    bridge = mod.createOpenCodeBridge()
  }
  return bridge
}

async function getGovernanceHandler() {
  if (!governanceHandler) {
    // Users should replace this with their actual governance handler.
    // The bridge translates events; the handler decides what to do with them.
    governanceHandler = async (event) => {
      // Default: allow everything (passthrough)
      // Replace with your governance logic:
      //   import { GovernorPipeline } from "@framework/core"
      //   const governor = new GovernorPipeline()
      //   return await governor.evaluate(event)
      return { action: 'allow', reason: 'default passthrough' }
    }
  }
  return governanceHandler
}

async function translateAndHandle(hookName, input, output, translateFn) {
  try {
    const b = await getBridge()
    const handler = await getGovernanceHandler()
    const event = await b[translateFn](input, output)
    const decision = await handler(event)
    await b.processDecision(event, decision, output)
  } catch (err) {
    // Never break the host — governance failures are logged, not thrown
    console.error(`[governance] ${hookName} error:`, err.message)
  }
}

export default (async function governancePlugin(ctx) {
  return {
    // ── Diagnostic Tools ──────────────────────────────────────────────
    tool: {
      governance_test: tool({
        description: "Verify governance plugin is active and responsive.",
        args: {},
        async execute() {
          return JSON.stringify({
            status: "active",
            plugin: "governance-framework",
            version: "1.0.0",
            hooks: [
              "tool.execute.before",
              "tool.execute.after",
              "permission.ask",
              "chat.message",
              "experimental.chat.system.transform",
              "experimental.session.compacting",
            ],
          })
        },
      }),

      governance_status: tool({
        description: "Full governance plugin status report.",
        args: {},
        async execute() {
          return JSON.stringify({
            plugin: "governance-framework",
            version: "1.0.0",
            bridgeLoaded: !!bridge,
            handlerLoaded: !!governanceHandler,
            note: "Configure your governance handler in the plugin source or via the bridge.onEvent() API.",
          }, null, 2)
        },
      }),
    },

    // ── Lifecycle Hooks ──────────────────────────────────────────────
    "tool.execute.before": async (input, output) => {
      await translateAndHandle(
        "tool.execute.before",
        input,
        output,
        "translateToolBefore"
      )
    },

    "tool.execute.after": async (input, output) => {
      await translateAndHandle(
        "tool.execute.after",
        input,
        output,
        "translateToolAfter"
      )
    },

    "permission.ask": async (input, output) => {
      await translateAndHandle(
        "permission.ask",
        input,
        output,
        "translatePermissionRequest"
      )
    },

    "chat.message": async (input, output) => {
      await translateAndHandle(
        "chat.message",
        input,
        output,
        "translateMessageReceived"
      )
    },

    "experimental.chat.system.transform": async (input, output) => {
      await translateAndHandle(
        "experimental.chat.system.transform",
        input,
        output,
        "translateSystemTransform"
      )
    },

    "experimental.session.compacting": async (input, output) => {
      await translateAndHandle(
        "experimental.session.compacting",
        input,
        output,
        "translateCompactionTransform"
      )
    },
  }
})
