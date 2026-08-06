# Minimal Quick Start

A minimal example demonstrating how to install, configure, and run the Governance Framework with an adapter.

## Setup

```bash
npm init -y
npm install @framework/core
npm install @framework/adapter-openai openai   # or any other adapter
```

## Usage

```bash
npx tsx quick-start.ts
```

## What this does

1. Creates an OpenAI adapter with your API key
2. Sends a reasoning request
3. Prints the result
