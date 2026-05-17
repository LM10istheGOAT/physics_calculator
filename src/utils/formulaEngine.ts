import { evaluate } from 'mathjs';

export interface VariableInfo {
  label: string;
  label_bn?: string;
  unit: string;
  si_unit: string;
}

export interface SolveForEntry {
  expr: string;
  solvable: boolean;
}

export interface Formula {
  id: string;
  name: string;
  name_bn?: string;
  type: string;
  chapter: string;
  variables: Record<string, VariableInfo>;
  solve_for: Record<string, SolveForEntry>;
  constraints: string[];
  errors: string[];
  depends_on: string[];
  memory_keys: string[];
  category: string;
  difficulty: string;
}

export interface TypeInfo {
  id: string;
  name: string;
  name_bn?: string;
  formulas: string[];
}

export interface TypesFile {
  chapter_id: string;
  chapter_name: string;
  chapter_name_bn?: string;
  types: TypeInfo[];
}

export interface ChapterInfo {
  id: string;
  name: string;
  name_bn?: string;
  order: number;
  types: string[];
  formula_count: number;
  type_count: number;
}

export interface ChaptersIndex {
  version: string;
  description: string;
  total_chapters: number;
  total_formulas: number;
  chapters: ChapterInfo[];
}

export interface VariableGlobal {
  label: string;
  label_bn?: string;
  unit: string;
  si_unit: string;
  used_in_chapters: string[];
  used_in_formulas: string[];
  total_uses: number;
}

export interface VariablesGlobalFile {
  version: string;
  description: string;
  total_variables: number;
  variables: Record<string, VariableGlobal>;
}

export interface CalcResult {
  success: boolean;
  value?: number;
  error?: string;
  variable?: string;
  unit?: string;
}

// Cache for loaded data
const cache: Record<string, unknown> = {};

async function fetchJSON<T>(url: string): Promise<T> {
  if (cache[url]) return cache[url] as T;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const data = await res.json();
  cache[url] = data;
  return data as T;
}

// --- Data Loaders (lazy) ---

export async function loadChaptersIndex(): Promise<ChaptersIndex> {
  return fetchJSON<ChaptersIndex>('/physics_data/chapters_index.json');
}

export async function loadTypesForChapter(chapterId: string): Promise<TypesFile> {
  return fetchJSON<TypesFile>(`/physics_data/types_${chapterId}.json`);
}

export async function loadFormulasForChapter(chapterId: string): Promise<{ formulas: Formula[]; total_formulas: number }> {
  return fetchJSON<{ formulas: Formula[]; total_formulas: number }>(`/physics_data/formulas_${chapterId}.json`);
}

export async function loadAllFormulas(): Promise<{ formulas: Formula[]; total_formulas: number }> {
  return fetchJSON<{ formulas: Formula[]; total_formulas: number }>('/physics_data/formulas_all.json');
}

export async function loadVariablesGlobal(): Promise<VariablesGlobalFile> {
  return fetchJSON<VariablesGlobalFile>('/physics_data/variables_global.json');
}

// --- Formula Solver ---

/**
 * Pre-process expression: replace ^ with ** for exponentiation,
 * and ensure math.js compatible syntax
 */
function preprocessExpression(expr: string): string {
  // math.js uses ^ for exponentiation natively, so no conversion needed
  // But we need to handle implicit multiplication like 2x -> 2*x
  let processed = expr.trim();

  // Handle implicit multiplication: number followed by variable
  // e.g., 2Ax -> 2*Ax, 3.14R -> 3.14*R
  processed = processed.replace(/(\d)([A-Za-z])/g, '$1*$2');

  // Handle closing paren followed by variable or number
  processed = processed.replace(/\)([A-Za-z0-9])/g, ')*$1');

  // Handle variable followed by opening paren
  processed = processed.replace(/([A-Za-z0-9])\(/g, '$1*(');

  return processed;
}

/**
 * Substitute variables in expression with their numeric values
 */
function substituteVariables(expr: string, values: Record<string, number>): string {
  let result = expr;

  // Sort variable names by length (longest first) to avoid partial replacements
  const sortedKeys = Object.keys(values).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    const val = values[key];
    // Replace whole word matches only
    const regex = new RegExp(`\\b${key}\\b`, 'g');
    result = result.replace(regex, `(${val})`);
  }

  return result;
}

/**
 * Check constraints for a formula evaluation
 */
export function checkConstraints(
  constraints: string[],
  values: Record<string, number>
): { valid: boolean; violated: string[] } {
  const violated: string[] = [];

  for (const constraint of constraints) {
    try {
      // Parse constraint like "A >= 0" or "Ax^2 + Ay^2 >= 0"
      const processed = preprocessExpression(constraint);
      const substituted = substituteVariables(processed, values);

      // Evaluate the comparison
      const result = evaluate(substituted);
      if (result === false || result === 0) {
        violated.push(constraint);
      }
    } catch {
      // If we can't evaluate, skip constraint check
    }
  }

  return { valid: violated.length === 0, violated };
}

/**
 * Solve a formula for a specific unknown variable
 */
export function solveFormula(
  formula: Formula,
  unknownVar: string,
  knownValues: Record<string, number>
): CalcResult {
  const solveEntry = formula.solve_for[unknownVar];

  if (!solveEntry) {
    return {
      success: false,
      error: `Cannot solve for "${unknownVar}" — no expression available.`,
      variable: unknownVar,
    };
  }

  if (!solveEntry.solvable) {
    return {
      success: false,
      error: `Variable "${unknownVar}" is marked as not solvable for this formula.`,
      variable: unknownVar,
    };
  }

  // Check all required variables are provided
  const requiredVars = Object.keys(formula.variables).filter(v => v !== unknownVar);
  const missingVars = requiredVars.filter(v => knownValues[v] === undefined || knownValues[v] === null || isNaN(knownValues[v]));

  if (missingVars.length > 0) {
    return {
      success: false,
      error: `Missing values for: ${missingVars.map(v => `${v} (${formula.variables[v]?.label || v})`).join(', ')}`,
      variable: unknownVar,
    };
  }

  try {
    const expr = solveEntry.expr;
    const processed = preprocessExpression(expr);
    const substituted = substituteVariables(processed, knownValues);

    // Check for potential issues before evaluating
    if (substituted.includes('/0)') || substituted.includes('/ 0)')) {
      // More thorough check
      const hasDivByZero = /\b0\b/.test(substituted.split('/').pop()?.split(/[\+\-\*]/)[0] || '');
      // We'll let math.js handle it and catch the error
    }

    const result = evaluate(substituted);

    if (typeof result !== 'number' || isNaN(result)) {
      return {
        success: false,
        error: 'Calculation resulted in an invalid number (NaN).',
        variable: unknownVar,
      };
    }

    if (!isFinite(result)) {
      return {
        success: false,
        error: 'Calculation resulted in Infinity (likely division by zero).',
        variable: unknownVar,
      };
    }

    // Check constraints
    const allValues = { ...knownValues, [unknownVar]: result };
    const constraintCheck = checkConstraints(formula.constraints, allValues);
    if (!constraintCheck.valid) {
      return {
        success: true,
        value: result,
        unit: formula.variables[unknownVar]?.unit,
        error: `Warning: Constraint(s) violated: ${constraintCheck.violated.join(', ')}`,
        variable: unknownVar,
      };
    }

    return {
      success: true,
      value: result,
      unit: formula.variables[unknownVar]?.unit,
      variable: unknownVar,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown calculation error';

    // Parse common error types
    if (message.includes('division by zero') || message.includes('divide by')) {
      return {
        success: false,
        error: 'Division by zero — check your input values.',
        variable: unknownVar,
      };
    }

    if (message.includes('square root') || message.includes('sqrt')) {
      return {
        success: false,
        error: 'Negative value under square root — check your input values.',
        variable: unknownVar,
      };
    }

    return {
      success: false,
      error: `Calculation error: ${message}`,
      variable: unknownVar,
    };
  }
}

/**
 * Convert expression to LaTeX for rendering
 */
export function exprToLatex(expr: string): string {
  let latex = expr;

  // Replace sqrt() with LaTeX sqrt
  latex = latex.replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}');

  // Replace ^ with superscript
  latex = latex.replace(/\^(\d+)/g, '^{$1}');
  latex = latex.replace(/\^([^ ])/g, '^{$1}');

  // Replace * with \cdot
  latex = latex.replace(/\*/g, ' \\cdot ');

  // Replace pi with \pi
  latex = latex.replace(/\bpi\b/g, '\\pi');

  // Handle Greek letters
  const greekMap: Record<string, string> = {
    theta: '\\theta',
    alpha: '\\alpha',
    beta: '\\beta',
    gamma: '\\gamma',
    delta: '\\delta',
    omega: '\\omega',
    sigma: '\\sigma',
    lambda: '\\lambda',
    mu: '\\mu',
    epsilon: '\\epsilon',
    phi: '\\phi',
    eta: '\\eta',
  };
  for (const [name, symbol] of Object.entries(greekMap)) {
    latex = latex.replace(new RegExp(`\\b${name}\\b`, 'g'), symbol);
  }

  return latex;
}

/**
 * Format number for display
 */
export function formatResult(value: number, precision: number = 6): string {
  if (Number.isInteger(value)) return value.toString();

  // For very small or very large numbers, use scientific notation
  if (Math.abs(value) >= 1e6 || (Math.abs(value) < 1e-3 && value !== 0)) {
    return value.toExponential(precision - 1);
  }

  return parseFloat(value.toPrecision(precision)).toString();
}
