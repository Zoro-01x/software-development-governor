export const ExperienceArchitectureSchema = `{
  "vision": "string — one sentence describing the future this creates",
  "mission": "string — one sentence describing what this builds",
  "audience": {
    "demographics": "string — age, profession, technical level",
    "psychographics": "string — values, motivations, attitudes",
    "scenario": "string — when and where they encounter this"
  },
  "experienceGoals": ["string — 3 to 5 measurable human outcomes"],
  "emotionalJourney": {
    "states": ["string — 3 to 5 emotional states in order"],
    "transitions": [
      {
        "from": "string — starting emotional state",
        "to": "string — target emotional state",
        "trigger": "string — what causes this emotional shift"
      }
    ]
  },
  "narrative": {
    "hook": "string — what captures attention in the first 3 seconds",
    "arc": "string — how the story unfolds",
    "pacing": "string — rhythm of tension and release",
    "resolution": "string — what the user walks away with"
  },
  "interactionModel": {
    "inputs": ["string — e.g. Click, Scroll, Keyboard input, Drag and drop"],
    "feedback": ["string — how the system responds to each input"],
    "stateTransitions": ["string — description of UI transitions between states"],
    "flow": "string — high-level user flow description"
  },
  "motionSystem": {
    "principles": ["string — easing philosophy, duration rules, sequencing"],
    "microInteractions": ["string — button presses, hovers, toggles"],
    "transitions": ["string — page/screen/view changes"],
    "ambientMotion": ["string — background animation, parallax, particles"]
  },
  "visualLanguage": {
    "color": "string — palette description, primary/accent/surface",
    "typography": "string — font choices, hierarchy, readability",
    "space": "string — layout grid, density, breathing room",
    "shape": "string — corners, borders, icon style",
    "light": "string — shadows, gradients, depth cues"
  },
  "successMetrics": [
    {
      "metric": "string — what to measure",
      "target": "string — measurable target value",
      "observable": true,
      "verifiable": true,
      "actionable": true
    }
  ],
  "rationale": [
    {
      "section": "string — which architecture section this explains",
      "decision": "string — what was decided",
      "reasoning": "string — why this decision was made"
    }
  ],
  "openQuestions": [
    {
      "question": "string — what needs clarification",
      "dimension": "string — which architecture dimension this affects",
      "suggestedApproach": "string — how to resolve the question"
    }
  ]
}`;
