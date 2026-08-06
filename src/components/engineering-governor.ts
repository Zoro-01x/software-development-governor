import { EngineeringArchitecture } from './experience-compiler.js';

export type EngDecision = 'APPROVED' | 'REVISE' | 'REJECT';

export interface EngGovernorResult {
  decision: EngDecision;
  issues: string[];
  warnings: string[];
  summary: string;
}

export class EngineeringGovernor {
  evaluate(arch: EngineeringArchitecture): EngGovernorResult {
    const issues: string[] = [];
    const warnings: string[] = [];

    this.checkStateMachines(arch, issues, warnings);
    this.checkEvents(arch, issues, warnings);
    this.checkComponents(arch, issues, warnings);
    this.checkDataFlow(arch, issues, warnings);
    this.checkMotion(arch, issues, warnings);
    this.checkPerformance(arch, issues, warnings);
    this.checkQualityGates(arch, issues, warnings);

    if (issues.length > 0) {
      return {
        decision: 'REJECT',
        issues,
        warnings,
        summary: `REJECTED — ${issues.length} issue(s) found. ${issues[0]}`,
      };
    }

    if (warnings.length > 0) {
      return {
        decision: 'REVISE',
        issues,
        warnings,
        summary: `REVISE — ${warnings.length} warning(s). ${warnings[0]}`,
      };
    }

    return {
      decision: 'APPROVED',
      issues: [],
      warnings: [],
      summary: `APPROVED — ${arch.stateMachines.length} state machines, ${arch.events.length} events, ${arch.components.length} components, ${arch.qualityGates.length} quality gates`,
    };
  }

  private checkStateMachines(arch: EngineeringArchitecture, issues: string[], warnings: string[]): void {
    if (arch.stateMachines.length === 0) {
      issues.push('No state machines defined');
      return;
    }

    for (const sm of arch.stateMachines) {
      if (!sm.states.includes(sm.initialState)) {
        issues.push(`State machine "${sm.name}": initialState "${sm.initialState}" not in states list`);
      }
      for (const t of sm.transitions) {
        if (!sm.states.includes(t.from)) {
          issues.push(`State machine "${sm.name}": transition from "${t.from}" but "${t.from}" is not a declared state`);
        }
        if (!sm.states.includes(t.to)) {
          issues.push(`State machine "${sm.name}": transition to "${t.to}" but "${t.to}" is not a declared state`);
        }
        if (!t.on || t.on.trim().length === 0) {
          warnings.push(`State machine "${sm.name}": transition "${t.from} → ${t.to}" has no trigger event`);
        }
      }
    }
  }

  private checkEvents(arch: EngineeringArchitecture, issues: string[], warnings: string[]): void {
    if (arch.events.length === 0) {
      warnings.push('No events defined — system may be unresponsive');
    }

    const allStates = new Set(arch.stateMachines.flatMap(sm => sm.states));

    for (const evt of arch.events) {
      if (!evt.name || evt.name.trim().length === 0) {
        issues.push('Event with empty name');
      }
      if (evt.consumers.length === 0) {
        warnings.push(`Event "${evt.name}" has no consumers`);
      }
    }

    const allEvents = new Set(arch.events.map(e => e.name));
    const usedEvents = new Set<string>();
    for (const sm of arch.stateMachines) {
      for (const t of sm.transitions) {
        if (t.on) usedEvents.add(t.on);
      }
    }

    for (const used of usedEvents) {
      if (!allEvents.has(used)) {
        warnings.push(`Event "${used}" is referenced in state machine transitions but not defined in events list`);
      }
    }
  }

  private checkComponents(arch: EngineeringArchitecture, issues: string[], warnings: string[]): void {
    if (arch.components.length === 0) {
      issues.push('No components defined');
      return;
    }

    const allComponentNames = new Set(arch.components.map(c => c.name));

    for (const c of arch.components) {
      if (!c.name || c.name.trim().length === 0) {
        issues.push('Component with empty name');
      }
      for (const child of c.children) {
        if (!allComponentNames.has(child) && child !== c.name) {
          warnings.push(`Component "${c.name}": child "${child}" is not a defined component`);
        }
      }
    }
  }

  private checkDataFlow(arch: EngineeringArchitecture, _issues: string[], warnings: string[]): void {
    if (!arch.dataFlow.strategy || arch.dataFlow.strategy.trim().length === 0) {
      warnings.push('Data flow strategy not defined');
    }
    if (arch.dataFlow.stores.length === 0) {
      warnings.push('No data stores defined');
    }
  }

  private checkMotion(arch: EngineeringArchitecture, _issues: string[], warnings: string[]): void {
    const validEasings = arch.motion.easingDefaults.enter.startsWith('cubic-bezier') ||
                         arch.motion.easingDefaults.enter === 'linear' ||
                         arch.motion.easingDefaults.enter === 'ease';
    if (!validEasings) {
      warnings.push(`Motion easing "${arch.motion.easingDefaults.enter}" may not be a valid CSS easing`);
    }

    const durMatch = /^\d+ms$/.test(arch.motion.durationDefaults.micro);
    if (!durMatch) {
      warnings.push(`Motion duration "${arch.motion.durationDefaults.micro}" is not a valid CSS duration`);
    }
  }

  private checkPerformance(arch: EngineeringArchitecture, _issues: string[], warnings: string[]): void {
    const loadMatch = /^[\d.]+s$/.test(arch.performance.loadTime);
    if (!loadMatch) {
      warnings.push(`Load time "${arch.performance.loadTime}" is not a valid duration`);
    }

    const bundleMatch = /^\d+KB$/.test(arch.performance.bundleSize);
    if (!bundleMatch) {
      warnings.push(`Bundle size "${arch.performance.bundleSize}" is not a valid size`);
    }
  }

  private checkQualityGates(arch: EngineeringArchitecture, issues: string[], warnings: string[]): void {
    if (arch.qualityGates.length === 0) {
      issues.push('No quality gates defined — cannot verify implementation');
      return;
    }

    const ids = new Set<string>();
    for (const g of arch.qualityGates) {
      if (ids.has(g.id)) {
        issues.push(`Duplicate quality gate id: ${g.id}`);
      }
      ids.add(g.id);

      if (!g.passCondition || g.passCondition.trim().length === 0) {
        warnings.push(`Quality gate ${g.id}: no pass condition defined`);
      }
    }
  }
}
