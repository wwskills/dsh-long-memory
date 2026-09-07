// Test stub for the @deepseek-ai/schemastery peer dependency.
//
// The real package is supplied by the DSH host at runtime; under vitest we
// only need the chainable schema-builder surface so importing src/index.ts
// (which builds its Config schema at module scope) does not throw. None of
// the unit tests assert on schemastery semantics.

function node() {
  const self = {
    default(value) { self.__default = value; return self },
    required(text) { self.__required = text; return self },
    description(text) { self.__description = text; return self },
    role(name) { self.__role = name; return self },
  }
  return self
}

const Schema = {
  object(shape) { return node() },
  union(values) { return node() },
  const(value) { return node() },
  string() { return node() },
  number() { return node() },
  boolean() { return node() },
  natural() { return node() },
  any() { return node() },
  array(inner) { return node() },
}

export default Schema
