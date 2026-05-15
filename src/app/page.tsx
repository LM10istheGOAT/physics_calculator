"use client";

import { useState, useEffect, useCallback } from "react";
import katex from "katex";
import { useStore } from "@/store/useStore";
import { solveFormula, exprToLatex, formatResult } from "@/utils/formulaEngine";
import ScientificCalculator from "@/components/physics/ScientificCalculator";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Chapter {
  id: string;
  name: string;
  name_bn: string;
  order: number;
  types: string[];
  formula_count: number;
  type_count: number;
}

interface FormulaVariable {
  label: string;
  label_bn: string;
  unit: string;
  si_unit: string;
}

interface SolveForEntry {
  expr: string;
  solvable: boolean;
}

interface Formula {
  id: string;
  name: string;
  name_bn: string;
  type: string;
  chapter: string;
  variables: Record<string, FormulaVariable>;
  solve_for: Record<string, SolveForEntry>;
  constraints: string[];
  errors: string[];
  depends_on: string[];
  memory_keys: string[];
  category: string;
  difficulty: string;
}

interface TypeInfo {
  id: string;
  name: string;
  name_bn: string;
  formulas: string[];
}

// ─── Chapter Icons ───────────────────────────────────────────────────────────

const CHAPTER_ICONS: Record<string, string> = {
  physical_world: "📏",
  vectors: "➡️",
  kinematics: "🚀",
  newtonian_mechanics: "🍎",
  circular_motion: "🔄",
  work_energy_power: "⚡",
  gravitation: "🌍",
  structural_properties: "🏗️",
  thermodynamics: "🌡️",
  gas_laws: "💨",
  oscillations: "〰️",
  waves: "🌊",
  electrostatics: "🔋",
  current_electricity: "🔌",
  electromagnetism: "🧲",
  electromagnetic_induction: "🔁",
  geometrical_optics: "🔍",
  physical_optics: "🌈",
  modern_physics: "⚛️",
  nuclear_physics: "☢️",
  semiconductor: "💻",
  astronomy: "🔭",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  basic: "bg-green-500/20 text-green-400",
  intermediate: "bg-amber-500/20 text-amber-400",
  advanced: "bg-red-500/20 text-red-400",
};

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function HomePage() {
  const {
    currentView,
    selectedChapter,
    selectedType,
    selectedFormula,
    setView,
    selectChapter,
    selectType,
    selectFormula,
    goBack,
    memory,
    history,
    favorites,
    saveToMemory,
    toggleFavorite,
  } = useStore();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-physics-900/80 backdrop-blur-xl border-b border-physics-700/50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentView !== "chapters" && (
              <button
                onClick={goBack}
                className="text-physics-400 hover:text-white transition-colors text-lg mr-1"
              >
                ←
              </button>
            )}
            <h1 className="text-xl font-bold bg-gradient-to-r from-accent-400 to-purple-400 bg-clip-text text-transparent">
              Physics Calculator
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-physics-400">
            <span>21 Chapters</span>
            <span className="text-physics-600">|</span>
            <span>205 Formulas</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {currentView === "chapters" && <ChapterSelection onSelect={selectChapter} />}
        {currentView === "types" && selectedChapter && (
          <TypesPage chapterId={selectedChapter} onSelect={selectType} />
        )}
        {currentView === "formulas" && selectedChapter && selectedType && (
          <FormulasPage
            chapterId={selectedChapter}
            typeId={selectedType}
            onSelect={selectFormula}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
          />
        )}
        {currentView === "solver" && selectedChapter && selectedFormula && (
          <SolverPage
            chapterId={selectedChapter}
            formulaId={selectedFormula}
            memory={memory}
            onSaveToMemory={saveToMemory}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            history={history}
          />
        )}
      </main>
    </div>
  );
}

// ─── Chapter Selection ───────────────────────────────────────────────────────

function ChapterSelection({ onSelect }: { onSelect: (id: string) => void }) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/data/chapters_index.json")
      .then((r) => r.json())
      .then((data) => {
        setChapters(data.chapters);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = chapters.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.id.replace(/_/g, " ").includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search chapters..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="physics-input max-w-md"
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-physics-400">Loading chapters...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((chapter) => (
            <div
              key={chapter.id}
              onClick={() => onSelect(chapter.id)}
              className="physics-card animate-fade-in"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{CHAPTER_ICONS[chapter.id] || "📘"}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm leading-tight">{chapter.name}</h3>
                  <p className="text-physics-400 text-xs mt-0.5">{chapter.name_bn}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="physics-badge bg-accent-500/20 text-accent-300">
                      {chapter.formula_count} formulas
                    </span>
                    <span className="physics-badge bg-purple-500/20 text-purple-300">
                      {chapter.type_count} types
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Types Page ──────────────────────────────────────────────────────────────

function TypesPage({ chapterId, onSelect }: { chapterId: string; onSelect: (id: string) => void }) {
  const [types, setTypes] = useState<TypeInfo[]>([]);
  const [chapterName, setChapterName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/data/types_${chapterId}.json`)
      .then((r) => r.json())
      .then((data) => {
        setChapterName(data.chapter_name || "");
        setTypes(data.types || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [chapterId]);

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-6">{chapterName}</h2>
      {loading ? (
        <div className="text-center py-20 text-physics-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {types.map((type) => (
            <div
              key={type.id}
              onClick={() => onSelect(type.id)}
              className="physics-card"
            >
              <h3 className="font-semibold text-white">{type.name}</h3>
              <p className="text-physics-400 text-sm mt-0.5">{type.name_bn}</p>
              <div className="mt-2">
                <span className="physics-badge bg-accent-500/20 text-accent-300">
                  {type.formulas.length} formulas
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Formulas Page ───────────────────────────────────────────────────────────

function FormulasPage({
  chapterId,
  typeId,
  onSelect,
  favorites,
  onToggleFavorite,
}: {
  chapterId: string;
  typeId: string;
  onSelect: (id: string) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}) {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [typeName, setTypeName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/data/formulas_${chapterId}.json`)
      .then((r) => r.json())
      .then((data) => {
        const allFormulas: Formula[] = data.formulas || [];
        const filtered = allFormulas.filter((f) => f.type === typeId);
        setFormulas(filtered);
        // Get type name
        const firstFormula = filtered[0];
        if (firstFormula) {
          setTypeName(firstFormula.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [chapterId, typeId]);

  const renderKatex = (latex: string) => {
    try {
      return katex.renderToString(latex, { throwOnError: false, displayMode: false });
    } catch {
      return latex;
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-6">{typeName}</h2>
      {loading ? (
        <div className="text-center py-20 text-physics-400">Loading...</div>
      ) : (
        <div className="space-y-3">
          {formulas.map((formula) => {
            const isFav = favorites.includes(formula.id);
            const firstSolve = Object.values(formula.solve_for)[0];
            const latexStr = firstSolve
              ? exprToLatex(firstSolve.expr, Object.keys(formula.solve_for)[0])
              : "";

            return (
              <div
                key={formula.id}
                onClick={() => onSelect(formula.id)}
                className="physics-card"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{formula.name}</h3>
                      {formula.difficulty && (
                        <span
                          className={`physics-badge ${DIFFICULTY_COLORS[formula.difficulty] || "bg-physics-600/30 text-physics-300"}`}
                        >
                          {formula.difficulty}
                        </span>
                      )}
                    </div>
                    <p className="text-physics-400 text-sm">{formula.name_bn}</p>
                    {latexStr && (
                      <div
                        className="mt-2 text-physics-300 text-sm overflow-x-auto"
                        dangerouslySetInnerHTML={{ __html: renderKatex(latexStr) }}
                      />
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {Object.keys(formula.variables).map((v) => (
                        <span
                          key={v}
                          className="physics-badge bg-physics-700/60 text-physics-300 text-xs"
                        >
                          {v} ({formula.variables[v].unit})
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(formula.id);
                    }}
                    className={`text-lg ml-2 transition-colors ${isFav ? "text-amber-400" : "text-physics-600 hover:text-physics-400"}`}
                  >
                    {isFav ? "★" : "☆"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Solver Page ─────────────────────────────────────────────────────────────

function SolverPage({
  chapterId,
  formulaId,
  memory,
  onSaveToMemory,
  favorites,
  onToggleFavorite,
  history,
}: {
  chapterId: string;
  formulaId: string;
  memory: Record<string, { value: number; unit: string; formulaName: string; timestamp: number }>;
  onSaveToMemory: (key: string, value: number, unit: string, formulaName: string) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  history: any[];
}) {
  const [formula, setFormula] = useState<Formula | null>(null);
  const [solveFor, setSolveFor] = useState<string>("");
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcTarget, setCalcTarget] = useState<string>("");

  useEffect(() => {
    fetch(`/data/formulas_${chapterId}.json`)
      .then((r) => r.json())
      .then((data) => {
        const f = data.formulas.find((f: Formula) => f.id === formulaId);
        if (f) {
          setFormula(f);
          const firstVar = Object.keys(f.solve_for)[0];
          if (firstVar) setSolveFor(firstVar);
          // Pre-fill from memory
          const initial: Record<string, string> = {};
          for (const key of Object.keys(f.variables)) {
            if (memory[key]) {
              initial[key] = String(memory[key].value);
            }
          }
          setInputValues(initial);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [chapterId, formulaId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCalculate = useCallback(() => {
    if (!formula || !solveFor) return;
    const solveEntry = formula.solve_for[solveFor];
    if (!solveEntry) return;

    const res = solveFormula(
      solveEntry.expr,
      solveFor,
      inputValues,
      formula.variables,
      formula.constraints
    );
    setResult(res);

    if (res.success && res.value !== undefined) {
      onSaveToMemory(solveFor, res.value, res.unit || "", formula.name);
    }
  }, [formula, solveFor, inputValues, onSaveToMemory]);

  const openCalc = (varName: string) => {
    setCalcTarget(varName);
    setCalcOpen(true);
  };

  const applyCalcValue = (value: string) => {
    setInputValues((prev) => ({ ...prev, [calcTarget]: value }));
    setCalcOpen(false);
  };

  const renderKatex = (latex: string) => {
    try {
      return katex.renderToString(latex, { throwOnError: false, displayMode: true });
    } catch {
      return latex;
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-physics-400">Loading formula...</div>;
  }

  if (!formula) {
    return <div className="text-center py-20 text-red-400">Formula not found</div>;
  }

  const isFav = favorites.includes(formula.id);
  const solveExpr = formula.solve_for[solveFor]?.expr || "";
  const latexStr = exprToLatex(solveExpr, solveFor);
  const variableKeys = Object.keys(formula.variables);

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      {/* Formula Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">{formula.name}</h2>
          <p className="text-physics-400 text-sm">{formula.name_bn}</p>
        </div>
        <button
          type="button"
          onClick={() => onToggleFavorite(formula.id)}
          className={`text-xl transition-colors ${isFav ? "text-amber-400" : "text-physics-600 hover:text-physics-400"}`}
        >
          {isFav ? "★" : "☆"}
        </button>
      </div>

      {/* KaTeX Display */}
      <div className="formula-display mb-5">
        <div dangerouslySetInnerHTML={{ __html: renderKatex(latexStr) }} />
      </div>

      {/* Solve For Dropdown */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-physics-300 mb-1.5">Solve For</label>
        <select
          value={solveFor}
          onChange={(e) => {
            setSolveFor(e.target.value);
            setResult(null);
          }}
          className="physics-input cursor-pointer"
        >
          {Object.entries(formula.solve_for).map(([varName, entry]) => (
            <option key={varName} value={varName} disabled={!entry.solvable}>
              {varName} — {formula.variables[varName]?.label || varName}
              {!entry.solvable ? " (not solvable)" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Variable Inputs */}
      <div className="space-y-3 mb-5">
        {variableKeys.map((varName) => {
          const varInfo = formula.variables[varName];
          const isTarget = varName === solveFor;
          return (
            <div key={varName}>
              <label className="block text-sm font-medium text-physics-300 mb-1">
                <span className="font-mono text-accent-400 mr-1">{varName}</span>
                <span className="text-physics-400">— {varInfo.label}</span>
                <span className="text-physics-500 ml-1">({varInfo.unit})</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={isTarget ? "" : inputValues[varName] || ""}
                  onChange={(e) =>
                    setInputValues((prev) => ({ ...prev, [varName]: e.target.value }))
                  }
                  placeholder={isTarget ? "Will be calculated" : `Enter ${varName}`}
                  disabled={isTarget}
                  className="physics-input flex-1"
                />
                {!isTarget && (
                  <button
                    type="button"
                    onClick={() => openCalc(varName)}
                    className="px-3 py-2 bg-physics-700 hover:bg-physics-600 text-accent-400 rounded-lg transition-colors text-sm font-semibold"
                    title="Scientific Calculator"
                  >
                    🔬
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Calculate Button */}
      <button
        type="button"
        onClick={handleCalculate}
        className="physics-btn w-full text-lg py-3 mb-4"
      >
        Calculate
      </button>

      {/* Result */}
      {result && (
        <div
          className={`rounded-lg p-4 mb-4 border ${
            result.success
              ? "bg-green-500/10 border-green-500/30"
              : "bg-red-500/10 border-red-500/30"
          }`}
        >
          {result.success ? (
            <div>
              <div className="text-sm text-physics-400 mb-1">
                {result.variable} = {formula.variables[result.variable]?.label}
              </div>
              <div className="text-2xl font-bold text-green-400 font-mono">
                {formatResult(result.value)}{" "}
                <span className="text-lg text-green-300">{result.unit}</span>
              </div>
              {result.constraintsViolated && result.constraintsViolated.length > 0 && (
                <div className="mt-2 text-amber-400 text-sm">
                  ⚠️ Constraint warnings: {result.constraintsViolated.join(", ")}
                </div>
              )}
            </div>
          ) : (
            <div className="text-red-400">
              <span className="font-semibold">Error:</span> {result.error}
            </div>
          )}
        </div>
      )}

      {/* Constraints */}
      {formula.constraints.length > 0 && (
        <div className="mb-4 p-3 bg-physics-800/50 rounded-lg border border-physics-700/50">
          <div className="text-xs text-physics-400 font-semibold mb-1">Constraints</div>
          {formula.constraints.map((c, i) => (
            <div key={i} className="text-xs text-amber-400 font-mono">{c}</div>
          ))}
        </div>
      )}

      {/* Memory */}
      {Object.keys(memory).length > 0 && (
        <div className="mb-4 p-3 bg-physics-800/50 rounded-lg border border-physics-700/50">
          <div className="text-xs text-physics-400 font-semibold mb-2">Memory</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(memory).map(([key, entry]) => (
              <button
                key={key}
                type="button"
                onClick={() => setInputValues((prev) => ({ ...prev, [key]: String(entry.value) }))}
                className="physics-badge bg-accent-500/20 text-accent-300 hover:bg-accent-500/30 cursor-pointer transition-colors"
                title={`${entry.formulaName} — ${new Date(entry.timestamp).toLocaleString()}`}
              >
                {key} = {formatResult(entry.value)} {entry.unit}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent History */}
      {history.length > 0 && (
        <div className="p-3 bg-physics-800/50 rounded-lg border border-physics-700/50">
          <div className="text-xs text-physics-400 font-semibold mb-2">Recent Calculations</div>
          <div className="space-y-1">
            {history.slice(0, 5).map((h, i) => (
              <div key={i} className="text-xs text-physics-300 flex items-center gap-2">
                <span className="text-physics-500">{new Date(h.timestamp).toLocaleTimeString()}</span>
                <span className="font-mono text-accent-400">{h.solveFor}</span>
                <span>=</span>
                <span className="font-mono text-green-400">{formatResult(h.result)}</span>
                <span className="text-physics-500">{h.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scientific Calculator Popup */}
      <ScientificCalculator
        open={calcOpen}
        onClose={() => setCalcOpen(false)}
        onApply={applyCalcValue}
      />
    </div>
  );
}
