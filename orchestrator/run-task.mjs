import { Agent, run, MCPServerStdio } from "@openai/agents";

const PLANNER_PROMPT = `
You are the Planner.

You MUST:
- Create or use .agents/tasks/<task-id>/
- Ensure PLAN.md exists and is filled out (phases + checklist + acceptance criteria + risks + rollback)
- Do NOT modify production code.
- Stop after planning. Summarize what’s ready for implementation.
`.trim();

const IMPLEMENTER_PROMPT = `
You are the Implementer.

You MUST:
- Follow .agents/tasks/<task-id>/PLAN.md exactly.
- Update CHECKLIST.md and NOTES.md as you go.
- Run tests/commands specified in the plan.
- If the plan must change, update PLAN.md first, then continue.
- Finish with: what changed, how to test, and any remaining risks.
`.trim();

const REVIEWER_PROMPT = `
You are the Reviewer.

You MUST:
- Verify the implementation matches PLAN.md and acceptance criteria.
- Call out missing tests, edge cases, and risky changes.
- Produce a merge-ready review summary OR block with clear reasons.
- Avoid making code changes unless it’s tiny and strictly necessary.
`.trim();

async function main() {
  const taskId = "2026-01-09-example-task";
  const goal = "Add rate limiting to the login endpoint using existing middleware patterns.";

  // Run Codex CLI as a local stdio MCP server subprocess.
  // JS MCP docs show MCPServerStdio expects a `fullCommand` string and uses connect/close. :contentReference[oaicite:3]{index=3}
  // Codex docs show the server command is `codex mcp-server`. :contentReference[oaicite:4]{index=4}
  const codexServer = new MCPServerStdio({
    name: "Codex MCP Server (local)",
    fullCommand: "codex mcp-server",
    cacheToolsList: true
  });

  await codexServer.connect();

  try {
    const planner = new Agent({
      name: "Planner",
      instructions: PLANNER_PROMPT,
      mcpServers: [codexServer],
    });

    const implementer = new Agent({
      name: "Implementer",
      instructions: IMPLEMENTER_PROMPT,
      mcpServers: [codexServer],
    });

    const reviewer = new Agent({
      name: "Reviewer",
      instructions: REVIEWER_PROMPT,
      mcpServers: [codexServer],
    });

    // 1) Plan
    const plan = await run(
        planner,
        `Task id: ${taskId}\nGoal: ${goal}\n\nCreate/update planning files and stop after PLAN.md is ready.`
    );
    console.log("\n=== PLAN ===\n");
    console.log(plan.finalOutput);

    // 2) Implement
    const impl = await run(
        implementer,
        `Task id: ${taskId}\n\nProceed with implementation strictly according to PLAN.md.`
    );
    console.log("\n=== IMPLEMENTATION ===\n");
    console.log(impl.finalOutput);

    // 3) Review
    const rev = await run(
        reviewer,
        `Task id: ${taskId}\n\nReview the changes against acceptance criteria and provide a merge-ready summary or block reasons.`
    );
    console.log("\n=== REVIEW ===\n");
    console.log(rev.finalOutput);

  } finally {
    await codexServer.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
