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
    // Build a scope with parsed numeric values
    const scope: Record<string, number> = {};

    for (const [varName, rawValue] of Object.entries(variableValues)) {
      if (varName === solveFor) continue;
      const trimmed = rawValue.trim();
      if (trimmed === "") continue;

      try {
        scope[varName] = evaluate(trimmed) as number;
      } catch {
        return {
          success: false,
          error: `Invalid value for ${varName}: "${trimmed}"`,
        };
      }

      if (typeof scope[varName] !== "number" || !isFinite(scope[varName])) {
        return {
          success: false,
          error: `Non-numeric value for ${varName}: "${trimmed}"`,
        };
      }
    }

    // Check that all required variables (except solveFor) are provided
    const requiredVars = Object.keys(allVariables).filter((v) => v !== solveFor);
    const missing = requiredVars.filter((v) => !(v in scope));
    if (missing.length > 0) {
      return {
        success: false,
        error: `Missing values for: ${missing.join(", ")}`,
      };
    }

    // Evaluate the expression
    let result: number;
    try {
      result = evaluate(solveExpr, scope) as number;
    } catch (err: any) {
      return {
        success: false,
        error: `Calculation error: ${err.message || "Could not evaluate expression"}`,
      };
    }

    if (typeof result !== "number" || !isFinite(result)) {
      return {
        success: false,
        error: "Result is not a valid number (division by zero or overflow?)",
      };
    }

    // Check constraints
    const violated: string[] = [];
    for (const constraint of constraints) {
      try {
        const constraintScope = { ...scope, [solveFor]: result };
        const valid = evaluate(constraint, constraintScope);
        if (!valid) {
          violated.push(constraint);
        }
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
    return {
      success: false,
      error: `Unexpected error: ${err.message || "Unknown error"}`,
    };
  }
}

/**
 * Convert a math expression to a simple LaTeX string for KaTeX rendering.
 */
export function exprToLatex(expr: string, solveFor?: string): string {
  let latex = expr;

  // Replace common patterns
  // Handle fractions: (a)/(b) → \frac{a}{b}
  latex = latex.replace(
    /\(([^)]+)\)\/\(([^)]+)\)/g,
    "\\frac{$1}{$2}"
  );
  // Handle simple division: a/b → \frac{a}{b} when no parens
  latex = latex.replace(
    /([a-zA-Z_]\w*)\/([a-zA-Z_]\w*)/g,
    "\\frac{$1}{$2}"
  );

  // Replace * with space (implied multiplication)
  latex = latex.replace(/\*/g, " \\cdot ");

  // Greek letters
  const greekMap: Record<string, string> = {
    alpha: "\\alpha",
    beta: "\\beta",
    gamma: "\\gamma",
    delta: "\\delta",
    epsilon: "\\epsilon",
    theta: "\\theta",
    lambda: "\\lambda",
    mu: "\\mu",
    sigma: "\\sigma",
    omega: "\\omega",
    pi: "\\pi",
    rho: "\\rho",
    tau: "\\tau",
    phi: "\\phi",
    psi: "\\psi",
  };
  for (const [name, symbol] of Object.entries(greekMap)) {
    latex = latex.replace(new RegExp(`\\b${name}\\b`, "g"), symbol);
  }

  // Superscripts: ^2 → ^{2}, ^(expr) → ^{expr}
  latex = latex.replace(/\^(\d+)/g, "^{$1}");
  latex = latex.replace(/\^\(([^)]+)\)/g, "^{$1}");

  // sqrt
  latex = latex.replace(/sqrt\(([^)]+)\)/g, "\\sqrt{$1}");

  if (solveFor) {
    latex = `${solveFor} = ${latex}`;
  }

  return latex;
}

/**
 * Format a number for display.
 */
export function formatResult(value: number): string {
  if (Math.abs(value) >= 1e6 || (Math.abs(value) < 1e-3 && value !== 0)) {
    return value.toExponential(4);
  }
  // Check if integer
  if (Number.isInteger(value)) {
    return value.toString();
  }
  // Round to reasonable precision
  const rounded = parseFloat(value.toPrecision(8));
  return rounded.toString();
}
