# OpenCode Integration Guide

How to install and configure the Governance Framework as an OpenCode plugin.

## Quick Install

```bash
# 1. Install the bridge package
npm install @framework/bridge-opencode @framework/core

# 2. Copy the plugin to your OpenCode plugins directory
cp packages/bridge-opencode/opencode-plugin.js ~/.config/opencode/plugins/governance.js
```

On Windows:
```powershell
Copy-Item packages\bridge-opencode\opencode-plugin.js $env:USERPROFILE\.config\opencode\plugins\governance.js
```

## How It Works

The plugin translates OpenCode lifecycle events into Governance Kernel events:

| OpenCode Hook | Governance Event | Purpose |
|---|---|---|
| `tool.execute.before` | `governance:tool:before` | Validate tool calls before execution |
| `tool.execute.after` | `governance:tool:after` | Audit tool results |
| `permission.ask` | `governance:permission:request` | Gate permission requests |
| `chat.message` | `governance:message:received` | Govern message flow |
| `experimental.chat.system.transform` | `governance:system:transform` | Transform system prompts |
| `experimental.session.compacting` | `governance:compaction:transform` | Govern context compaction |

## Configuration

### Default Behavior

By default, the plugin operates in **passthrough mode** — all events are allowed. This is safe for initial testing.

### Custom Governance Handler

Replace the default handler with your governance logic:

```javascript
// In the plugin source, replace getGovernanceHandler():
async function getGovernanceHandler() {
  if (!governanceHandler) {
    const { GovernorPipeline } = await import("@framework/core")
    const governor = new GovernorPipeline()
    governanceHandler = async (event) => governor.evaluate(event)
  }
  return governanceHandler
}
```

### Event-Based Configuration

Use the bridge's `onEvent()` API for more granular control:

```javascript
const bridge = await getBridge()

bridge.onEvent('governance:permission:request', async (event) => {
  // Deny all write operations
  if (event.payload.permissionType === 'write') {
    return { action: 'deny', reason: 'writes disabled' }
  }
  return { action: 'allow' }
})
```

## Diagnostic Tools

The plugin registers two diagnostic tools:

- **`governance_test`** — Verify the plugin is loaded and active
- **`governance_status`** — Full status report (bridge state, handler state, version)

## Architecture

```
OpenCode ──→ Plugin (hooks) ──→ Bridge (translate) ──→ Governance Kernel
                                                        │
                                                        ▼
                                                  Decision (allow/deny/transform)
                                                        │
OpenCode ←── Output modified ←── Bridge (processDecision) ←──┘
```

**Key principles:**
- The bridge contains zero governance logic — it only translates events
- The bridge contains zero provider logic — it only maps between OpenCode and Kernel types
- The bridge is replaceable — swap it for any other host integration
- The framework must run without OpenCode
- OpenCode must run without the framework

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `governance_test` not found | Plugin not loaded | Check plugin file path in `~/.config/opencode/plugins/` |
| `@framework/bridge-opencode` not found | Package not installed | Run `npm install @framework/bridge-opencode` |
| All events allowed | Default passthrough mode | Implement a custom governance handler |
