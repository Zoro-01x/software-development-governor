# Requirement R-001

## Function: `isPalindrome`

Implement a function `isPalindrome(s: string): boolean` that returns `true` if
the input string reads the same forwards and backwards, and `false` otherwise.

### Rules

1. Case-insensitive: `"Racecar"` must return `true`.
2. Non-alphanumeric characters must be ignored: `"A man, a plan, a canal: Panama"` must return `true`.
3. An empty string must return `true`.
4. A single character must return `true`.

### Test Requirements

The implementation must include automated tests covering:

| Test Case | Input | Expected |
|---|---|---|
| Empty string | `""` | `true` |
| Single character | `"a"` | `true` |
| Simple palindrome | `"racecar"` | `true` |
| Non-palindrome | `"hello"` | `false` |
| Mixed case | `"RaceCar"` | `true` |
| With punctuation | `"A man, a plan, a canal: Panama"` | `true` |
| Numeric | `"12321"` | `true` |
| Only non-alphanumeric | `"!!!"` | `true` |

### Constraints

- Pure function — no I/O, no network, no persistence.
- Single source file, single test file.
- The implementation and test must compile with TypeScript and pass when run.
