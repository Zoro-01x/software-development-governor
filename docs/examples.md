# Examples

Example usage of the Governance Framework.

## Basic Memory Usage

```typescript
import { createInMemoryStore } from '@framework/core';

async function main() {
  const memory = createInMemoryStore();
  await memory.open();
  
  // Store data
  await memory.put('user:1', { name: 'Alice', age: 30 });
  await memory.put('user:2', { name: 'Bob', age: 25 });
  
  // Retrieve data
  const user1 = await memory.get('user:1');
  console.log(user1); // { name: 'Alice', age: 30 }
  
  // Query data
  const result = await memory.query({ limit: 10 });
  console.log(result.keys); // ['user:1', 'user:2']
  
  await memory.close();
}

main();
```

## Using an Adapter

```typescript
import { createOpenAIAdapter } from '@framework/adapter-openai';

async function main() {
  const adapter = createOpenAIAdapter({
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4',
  });
  
  const result = await adapter.reason({
    requirements: 'Build a personal portfolio website',
    projectName: 'Portfolio',
  });
  
  console.log(result.design);
  console.log(result.confidence);
  
  await adapter.close();
}

main();
```

## Using Knowledge Store

```typescript
import { createKnowledgeStore } from '@framework/core';

async function main() {
  const knowledge = createKnowledgeStore();
  await knowledge.open();
  
  // Add entities
  const alice = await knowledge.addEntity({
    type: 'person',
    properties: { name: 'Alice', age: 30 },
    facts: [],
    relations: [],
  });
  
  const bob = await knowledge.addEntity({
    type: 'person',
    properties: { name: 'Bob', age: 25 },
    facts: [],
    relations: [],
  });
  
  // Add relation
  await knowledge.addRelation({
    source: alice.id,
    target: bob.id,
    type: 'knows',
    properties: {},
  });
  
  // Query
  const people = await knowledge.queryEntities({ type: 'person' });
  console.log(people.length); // 2
  
  await knowledge.close();
}

main();
```

## Using Planning Store

```typescript
import { createPlanningStore } from '@framework/core';

async function main() {
  const planning = createPlanningStore();
  await planning.open();
  
  // Create plan
  const plan = await planning.createPlan({
    name: 'Build Portfolio',
    description: 'Create a personal portfolio website',
    tasks: [],
    status: 'draft',
    metadata: {},
  });
  
  // Add tasks
  await planning.addTask(plan.id, {
    name: 'Design Homepage',
    description: 'Design the homepage layout',
    status: 'pending',
    priority: 'high',
    dependencies: [],
    steps: [],
    metadata: {},
  });
  
  await planning.addTask(plan.id, {
    name: 'Implement Projects Page',
    description: 'Create the projects showcase page',
    status: 'pending',
    priority: 'medium',
    dependencies: [],
    steps: [],
    metadata: {},
  });
  
  // Query
  const planAgain = await planning.getPlan(plan.id);
  console.log(planAgain?.tasks.length); // 2
  
  await planning.close();
}

main();
```

## Using File Memory Backend

```typescript
import { createFileMemoryStore } from '@framework/memory-file';

async function main() {
  const memory = createFileMemoryStore('./data');
  await memory.open();
  
  // Store data (persists to files)
  await memory.put('config', { theme: 'dark', language: 'en' });
  
  // Retrieve data
  const config = await memory.get('config');
  console.log(config); // { theme: 'dark', language: 'en' }
  
  await memory.close();
}

main();
```

## Multi-Module Example

```typescript
import { 
  createInMemoryStore,
  createKnowledgeStore,
  createPlanningStore,
  createVerificationStore,
  createToolExecutionStore,
  createWorkflowStore,
  createMultiAgentStore,
  createSchedulingStore,
  createObservabilityStore
} from '@framework/core';

async function main() {
  // Open all modules
  const memory = createInMemoryStore();
  const knowledge = createKnowledgeStore();
  const planning = createPlanningStore();
  const verification = createVerificationStore();
  const tools = createToolExecutionStore();
  const workflows = createWorkflowStore();
  const multiAgent = createMultiAgentStore();
  const scheduling = createSchedulingStore();
  const observability = createObservabilityStore();
  
  await Promise.all([
    memory.open(),
    knowledge.open(),
    planning.open(),
    verification.open(),
    tools.open(),
    workflows.open(),
    multiAgent.open(),
    scheduling.open(),
    observability.open(),
  ]);
  
  // Use modules together
  await memory.put('key', 'value');
  await knowledge.addEntity({ type: 'test', properties: {}, facts: [], relations: [] });
  await planning.createPlan({ name: 'Test', description: '', tasks: [], status: 'draft', metadata: {} });
  
  // Close all modules
  await Promise.all([
    memory.close(),
    knowledge.close(),
    planning.close(),
    verification.close(),
    tools.close(),
    workflows.close(),
    multiAgent.close(),
    scheduling.close(),
    observability.close(),
  ]);
}

main();
```
