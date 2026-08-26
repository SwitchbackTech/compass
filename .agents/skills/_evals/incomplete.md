# Eval stub: incomplete

**Skill:** `/review`

**Input:** empty base-to-head diff, or missing base ref.

**Expected stop:**

- do not invent findings
- ask for the missing diff or base
- output is a clarify/stop, not `VERDICT: findings` with guessed paths

**Also:** `/ship` on a GitHub issue with no Goal / finish line stays
`waiting` on the human (one compact question). Do not invent package
scope or verify commands.
