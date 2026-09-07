// Test stub for the @deepseek-ai/dsh-tools peer dependency.
//
// The real defineTool registers the tool with the host's tools service; under
// vitest we just hand the definition back so tool factories can be exercised.

export function defineTool(definition) {
  return definition
}
