/**
 * Ambient declarations for the DSH peer packages this plugin consumes.
 *
 * The DSH host supplies these at runtime (via `peerDependencies`), but they are
 * not present in this checkout, so we declare only the members we use. This
 * keeps `tsc --noEmit` and vitest self-contained without linking a `../dsh`.
 * @module @wwskills/dsh-long-memory/dsh-shims
 */

declare module '@deepseek-ai/schemastery' {
  export interface Schema<T = unknown> {
    default(value: T): Schema<T>
    required(text?: string): Schema<T>
    description(text: string): Schema<T>
    role(name: string): Schema<T>
  }
  interface SchemaStatic {
    object<T extends Record<string, Schema>>(shape: T): Schema<T>
    union<T extends string>(values: ReadonlyArray<T>): Schema<T>
    const<T>(value: T): Schema<T>
    string(): Schema<string>
    number(): Schema<number>
    boolean(): Schema<boolean>
    natural(): Schema<number>
    any(): Schema<unknown>
    array<T>(inner: Schema<T>): Schema<T[]>
  }
  const Schema: SchemaStatic
  export default Schema
}

declare module '@deepseek-ai/dsh-tools' {
  /** Rendered content block of a tool's output. */
  export interface ToolRenderBlock {
    type: string
    text: string
  }

  /** The definition shape accepted by defineTool. */
  export interface ToolDefinition<A = Record<string, unknown>, R = unknown> {
    name: string
    description: string
    parameters: unknown
    output?: {
      schema?: unknown
      render?(args: A, value: R): ToolRenderBlock[]
    }
    execute(args: A, exec: unknown): R | Promise<R>
  }

  /** Register a mem_* tool with the host. */
  export function defineTool<A = Record<string, unknown>, R = unknown>(definition: ToolDefinition<A, R>): unknown
}
