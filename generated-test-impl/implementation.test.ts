// Tests driven by Engineering Architecture
// Quality gates: QG-001, QG-002, QG-003, QG-004, QG-005
import { describe, it, expect } from 'vitest';
import {
  EventBus,
  IllegalTransitionError,
  StateMachine,
  createMachines,
  eventBus,
  wireDefaultHandlers,
  components,
  performanceBudget,
  qualityGates,
  verifyArchitecture,
} from './implementation.js';

describe('Generated implementation — architecture-driven', () => {
  it('exposes 3 state machines', () => {
    expect(Object.keys(createMachines()).length).toBe(3);
  });


  it('machine "experience-flow" starts in "curiosity"', () => {
    const machine = createMachines()["experience-flow"];
    expect(machine.getState()).toBe("curiosity");
  });


  it('machine "experience-flow" follows a legal transition', () => {
    const machine = createMachines()["experience-flow"];
    const rule = machine.transitions[0];
    expect(machine.can(rule.on)).toBe(true);
    expect(machine.transition(rule.on)).toBe(rule.to);
  });


  it('machine "experience-flow" rejects an illegal event', () => {
    const machine = createMachines()["experience-flow"];
    expect(() => machine.transition('__never_emitted__')).toThrow(IllegalTransitionError);
  });


  it('machine "system-status" starts in "idle"', () => {
    const machine = createMachines()["system-status"];
    expect(machine.getState()).toBe("idle");
  });


  it('machine "system-status" follows a legal transition', () => {
    const machine = createMachines()["system-status"];
    const rule = machine.transitions[0];
    expect(machine.can(rule.on)).toBe(true);
    expect(machine.transition(rule.on)).toBe(rule.to);
  });


  it('machine "system-status" rejects an illegal event', () => {
    const machine = createMachines()["system-status"];
    expect(() => machine.transition('__never_emitted__')).toThrow(IllegalTransitionError);
  });


  it('machine "interaction-phase" starts in "passive"', () => {
    const machine = createMachines()["interaction-phase"];
    expect(machine.getState()).toBe("passive");
  });


  it('machine "interaction-phase" follows a legal transition', () => {
    const machine = createMachines()["interaction-phase"];
    const rule = machine.transitions[0];
    expect(machine.can(rule.on)).toBe(true);
    expect(machine.transition(rule.on)).toBe(rule.to);
  });


  it('machine "interaction-phase" rejects an illegal event', () => {
    const machine = createMachines()["interaction-phase"];
    expect(() => machine.transition('__never_emitted__')).toThrow(IllegalTransitionError);
  });


  it('event bus delivers events to subscribers', () => {
    const bus = new EventBus();
    let received = 0;
    bus.subscribe('test:event', () => {
      received += 1;
    });
    bus.emit('test:event');
    expect(received).toBe(1);
  });

  it('default handlers wire without errors', () => {
    expect(() => wireDefaultHandlers()).not.toThrow();
    expect(eventBus.listenerCount('app:init')).toBeGreaterThan(0);
  });

  it('declares 5 components including AppShell', () => {
    expect(components.length).toBe(5);
    expect(components.some(c => c.name === 'AppShell')).toBe(true);
  });

  it('declares 5 quality gates', () => {
    expect(qualityGates.length).toBe(5);
  });

  it('performance budget is defined', () => {
    expect(performanceBudget.loadTime).toBe("2s");
    expect(performanceBudget.bundleSize).toBe("250KB");
  });

  it('architecture verifies without errors', () => {
    const result = verifyArchitecture();
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
