import { evaluate } from "mathjs";

export interface SolveResult {
  success: boolean;
  value?: number;
  variable?: string;
  unit?: string;
  error?: string;
  constraintsViolated?: string[];
}

/**
 * Solve a formula for a specific variable given the other values.
 */
export function solveFormula(
  solveExpr: string,
  solveFor: string,
  variableValues: Record<string, string>,
  allVariables: Record<string, { label: string; unit: string; si_unit: string }>,
  constraints: string[]
): SolveResult {
  try {
    const scope: Record<string, number> = {};

    for (const [varName, rawValue] of Object.entries(variableValues)) {
      if (varName === solveFor) continue;
      const trimmed = rawValue.trim();
      if (trimmed === "") continue;

      try {
        scope[varName] = evaluate(trimmed) as number;
      } catch {
        return { success: false, error: `Invalid value for ${varName}: "${trimmed}"` };
      }

      if (typeof scope[varName] !== "number" || !isFinite(scope[varName])) {
        return { success: false, error: `Non-numeric value for ${varName}: "${trimmed}"` };
      }
    }

    const requiredVars = Object.keys(allVariables).filter((v) => v !== solveFor);
    const missing = requiredVars.filter((v) => !(v in scope));
    if (missing.length > 0) {
      return { success: false, error: `Missing values for: ${missing.join(", ")}` };
    }

    let result: number;
    try {
      result = evaluate(solveExpr, scope) as number;
    } catch (err: any) {
      return { success: false, error: `Calculation error: ${err.message || "Could not evaluate expression"}` };
    }

    if (typeof result !== "number" || !isFinite(result)) {
      return { success: false, error: "Result is not a valid number (division by zero or overflow?)" };
    }

    const violated: string[] = [];
    for (const constraint of constraints) {
      try {
        const constraintScope = { ...scope, [solveFor]: result };
        const valid = evaluate(constraint, constraintScope);
        if (!valid) violated.push(constraint);
      } catch {
        // Skip constraints that can't be evaluated
      }
    }

    const unit = allVariables[solveFor]?.si_unit || allVariables[solveFor]?.unit || "";

    return {
      success: true,
      value: result,
      variable: solveFor,
      unit,
      constraintsViolated: violated.length > 0 ? violated : undefined,
    };
  } catch (err: any) {
    return { success: false, error: `Unexpected error: ${err.message || "Unknown error"}` };
  }
}

// ─── LaTeX Conversion ────────────────────────────────────────────────────────

/**
 * Tokenize a math expression into variable names, operators, numbers, and functions.
 */
function tokenize(expr: string): string[] {
  const tokens: string[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];

    if (/\s/.test(ch)) { i++; continue; }

    if (ch === "(" || ch === ")") { tokens.push(ch); i++; continue; }

    if (["+", "-", "*", "/", "^", ","].includes(ch)) { tokens.push(ch); i++; continue; }

    if (/[0-9.]/.test(ch)) {
      let num = "";
      while (i < expr.length && /[0-9.eE]/.test(expr[i])) { num += expr[i]; i++; }
      tokens.push(num);
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      let ident = "";
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) { ident += expr[i]; i++; }
      tokens.push(ident);
      continue;
    }

    i++;
  }

  return tokens;
}

/**
 * Convert a variable name to LaTeX-friendly format.
 * v_rel → v_{rel}, L0 → L_{0}, KE_max → KE_{max}, lambda_db → \lambda_{db}
 */
function varToLatex(name: string): string {
  const singleGreek: Record<string, string> = {
    alpha: "\\alpha", beta: "\\beta", gamma: "\\gamma", delta: "\\delta",
    epsilon: "\\epsilon", theta: "\\theta", lambda: "\\lambda", mu: "\\mu",
    sigma: "\\sigma", omega: "\\omega", pi: "\\pi", rho: "\\rho",
    tau: "\\tau", phi: "\\phi", psi: "\\psi", eta: "\\eta", nu: "\\nu",
  };

  // Split on underscore to get base + subscript
  if (name.includes("_")) {
    const parts = name.split("_");
    const base = parts[0];
    const sub = parts.slice(1).join("_");
    const latexBase = singleGreek[base.toLowerCase()] || base;
    const latexSub = varToLatex(sub);
    return `${latexBase}_{${latexSub}}`;
  }

  // Trailing digits: L0 → L_{0}
  const match = name.match(/^([a-zA-Z]+?)(\d+)$/);
  if (match) {
    const base = match[1];
    const num = match[2];
    const latexBase = singleGreek[base.toLowerCase()] || base;
    return `${latexBase}_{${num}}`;
  }

  if (singleGreek[name.toLowerCase()]) {
    return singleGreek[name.toLowerCase()];
  }

  return name;
}

/**
 * Read a single "atom" from the token stream starting at position i.
 * An atom is: a number, a variable, a function+parens, or a parenthesized group.
 * Also consumes trailing ^exponent if present.
 * Returns [atomLatex, nextIndex].
 */
function readAtom(tokens: string[], i: number): [string, number] {
  if (i >= tokens.length) return ["", i];

  const token = tokens[i];
  const funcNames = ["sqrt", "sin", "cos", "tan", "log", "ln", "exp", "abs"];

  // Function call: func(...)
  if (funcNames.includes(token) && i + 1 < tokens.length && tokens[i + 1] === "(") {
    // Find matching close paren
    let depth = 1;
    let j = i + 2;
    const innerTokens: string[] = [];
    while (j < tokens.length && depth > 0) {
      if (tokens[j] === "(") depth++;
      if (tokens[j] === ")") depth--;
      if (depth > 0) innerTokens.push(tokens[j]);
      j++;
    }

    const innerExpr = innerTokens.join("");
    const innerLatex = exprToLatex(innerExpr);

    let atomLatex: string;
    if (token === "sqrt") {
      atomLatex = `\\sqrt{${innerLatex}}`;
    } else if (token === "abs") {
      atomLatex = `\\left|${innerLatex}\\right|`;
    } else {
      atomLatex = `\\${token}{${innerLatex}}`;
    }

    // Check for trailing exponent
    if (j < tokens.length && tokens[j] === "^") {
      const expLatex = tokens[j + 1] || "";
      atomLatex += `^{${/^[0-9.]+$/.test(expLatex) ? expLatex : varToLatex(expLatex)}}`;
      j += 2;
    }

    return [atomLatex, j];
  }

  // Parenthesized group: (...)
  if (token === "(") {
    let depth = 1;
    let j = i + 1;
    const innerTokens: string[] = [];
    while (j < tokens.length && depth > 0) {
      if (tokens[j] === "(") depth++;
      if (tokens[j] === ")") depth--;
      if (depth > 0) innerTokens.push(tokens[j]);
      j++;
    }

    const innerExpr = innerTokens.join("");
    const innerLatex = exprToLatex(innerExpr);
    let atomLatex = `\\left(${innerLatex}\\right)`;

    // Check for trailing exponent: (expr)^2
    if (j < tokens.length && tokens[j] === "^") {
      const expLatex = tokens[j + 1] || "";
      atomLatex += `^{${/^[0-9.]+$/.test(expLatex) ? expLatex : varToLatex(expLatex)}}`;
      j += 2;
    }

    return [atomLatex, j];
  }

  // Number
  if (/^[0-9.]/.test(token)) {
    let atomLatex = token;
    let nextI = i + 1;
    // Check for trailing exponent
    if (nextI < tokens.length && tokens[nextI] === "^") {
      const expLatex = tokens[nextI + 1] || "";
      atomLatex += `^{${/^[0-9.]+$/.test(expLatex) ? expLatex : varToLatex(expLatex)}}`;
      nextI += 2;
    }
    return [atomLatex, nextI];
  }

  // Variable
  let atomLatex = varToLatex(token);
  let nextI = i + 1;
  // Check for trailing exponent
  if (nextI < tokens.length && tokens[nextI] === "^") {
    const expLatex = tokens[nextI + 1] || "";
    atomLatex += `^{${/^[0-9.]+$/.test(expLatex) ? expLatex : varToLatex(expLatex)}}`;
    nextI += 2;
  }
  return [atomLatex, nextI];
}

/**
 * Parse a "term" — a sequence of atoms connected by * and /.
 * Handles fractions by reading numerator and denominator atoms properly.
 */
function parseTerm(tokens: string[], i: number): [string, number] {
  let [left, nextI] = readAtom(tokens, i);
  let parts: string[] = [left];

  while (nextI < tokens.length) {
    const op = tokens[nextI];

    if (op === "*") {
      nextI++;
      const [right, afterRight] = readAtom(tokens, nextI);
      parts.push(" \\cdot ", right);
      nextI = afterRight;
    } else if (op === "/") {
      nextI++;
      const [right, afterRight] = readAtom(tokens, nextI);

      // Merge numerator from parts, create a fraction
      const numerator = parts.join("");
      parts = [`\\frac{${numerator}}{${right}}`];
      nextI = afterRight;
    } else {
      // Not * or / — end of term
      break;
    }
  }

  return [parts.join(""), nextI];
}

/**
 * Convert a math expression string to proper LaTeX for KaTeX rendering.
 * Uses a proper recursive descent parser to handle precedence:
 *   - Addition/subtraction (lowest precedence)
 *   - Multiplication/division
 *   - Exponents
 *   - Atoms (numbers, variables, functions, parenthesized groups)
 */
export function exprToLatex(expr: string, solveFor?: string): string {
  const tokens = tokenize(expr);
  if (tokens.length === 0) return "";

  const parts: string[] = [];
  let i = 0;

  // Parse as a sum of terms
  while (i < tokens.length) {
    const token = tokens[i];

    if (token === "+") {
      parts.push(" + ");
      i++;
    } else if (token === "-") {
      // Check if unary minus
      if (parts.length === 0 || tokens[i - 1] === "(" || tokens[i - 1] === "+" || tokens[i - 1] === "-" || tokens[i - 1] === "*" || tokens[i - 1] === "/") {
        i++;
        const [termLatex, nextI] = parseTerm(tokens, i);
        parts.push(`- ${termLatex}`);
        i = nextI;
      } else {
        parts.push(" - ");
        i++;
      }
    } else {
      const [termLatex, nextI] = parseTerm(tokens, i);
      parts.push(termLatex);
      i = nextI;
    }
  }

  let result = parts.join("");

  if (solveFor) {
    result = `${varToLatex(solveFor)} = ${result}`;
  }

  return result;
}

/**
 * Format a number for display.
 */
export function formatResult(value: number): string {
  if (Math.abs(value) >= 1e6 || (Math.abs(value) < 1e-3 && value !== 0)) {
    return value.toExponential(4);
  }
  if (Number.isInteger(value)) {
    return value.toString();
  }
  const rounded = parseFloat(value.toPrecision(8));
  return rounded.toString();
}
