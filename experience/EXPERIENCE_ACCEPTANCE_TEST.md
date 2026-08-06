# Experience Acceptance Test (EAT)

> The final validation layer — does the delivered experience match
> the intended experience?
>
> Engineering tests prove the *machine* is correct.
> EAT proves the *experience* is correct.
>
> A project is not complete until it passes both.

---

## The Question

Every EAT answers one question:

> **Did the delivered experience match the intended experience?**

Not "does the code work."

Not "are all tests green."

The experience either landed or it didn't.

---

## The Five Validations

### 1. Intent Match

Compare the final product against the Experience Architecture.

| Field | Score (0-10) | Evidence |
|-------|--------------|----------|
| Vision: does the product communicate the stated vision? | | |
| Emotional Journey: does the user feel the intended emotions? | | |
| Narrative: does the story unfold as designed? | | |
| Interaction Model: do interactions feel as specified? | | |
| Motion: does motion communicate the right meaning? | | |
| Visual Language: does the design match the spec? | | |

Threshold: average >= 7/10

---

### 2. Translation Fidelity

How much was lost between architecture and implementation.

For each experience dimension, estimate:

```
Experience Architecture
  ↓  (loss: ___%)
Final Implementation
```

Dimensions:

- Emotional Impact: ___% retained
- Interaction Quality: ___% retained
- Narrative Coherence: ___% retained
- Motion Expressiveness: ___% retained
- Visual Identity: ___% retained

Threshold: no dimension below 60% retention

---

### 3. User Experience Test

Give users the product with no context.

Then ask:

| Question | Measures |
|----------|----------|
| What did you feel? | Emotional alignment with architecture |
| What stood out? | Whether intended hooks landed |
| What do you remember? | Memorability of key moments |
| What is this trying to communicate? | Whether the mission was received |

Compare responses against the Experience Architecture:

- If users describe emotions listed in the Emotional Journey → PASS
- If users recall the Hook → PASS
- If users articulate the Mission → PASS
- If users can name 2+ Experience Goals → PASS

Threshold: >= 3/4 questions align

---

### 4. Blind Comparison

Two implementations, one question: which creates a better experience?

| Metric | Pipeline | Traditional | Result |
|--------|----------|-------------|--------|
| User preference | | | |
| Memorability (recall after 1 hour) | | | |
| Engagement (time spent / interaction count) | | | |
| Clarity (can explain the product) | | | |

Threshold: pipeline performs at least as well as traditional in all metrics

---

### 5. Outcome Validation

Measurable outcomes defined in the Experience Architecture.

| Metric | Target | Result | Status |
|--------|--------|--------|--------|
| From Success Metrics | From Architecture | Measured | PASS/FAIL |

Example:

```
Target:
80% of users describe the site as
"interactive", "alive", or "intelligent".

Result:
84%

PASS
```

Threshold: all metrics meet or exceed target

---

## EAT Result

```text
Project: ________________________
Date:    ________________________
Evaluator: ______________________

1. Intent Match:        ___/10  threshold: 7/10
2. Translation Fidelity: ___%   threshold: 60% per dimension
3. User Experience Test: ___/4  threshold: 3/4
4. Blind Comparison:    ___/4   threshold: 4/4 (no regression)
5. Outcome Validation:  ___/___ threshold: all pass

Final: PASS / FAIL / CONDITIONAL

If FAIL:

  Experience Architecture
    ↓ (revise)
  Experience Designer
    ↓
  Experience Governor
    ↓
  Experience Compiler
    ↓
  Implementation
    ↓
  EAT (retry)

Close the loop.
```

---

## Integration

EAT is the final gate in the governance pipeline:

```text
Implementation
    ↓
EAT ← ONLY IF EAT PASSES
    ↓
Human Approval
    ↓
Ship
```

If EAT fails, the project loops back to the Experience Designer,
not the code. The experience design was wrong, not the implementation.

---

*This specification is part of the Governance Stack.*
*See README.md for the full architecture.*
