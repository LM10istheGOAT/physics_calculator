'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  loadChaptersIndex,
  loadTypesForChapter,
  loadFormulasForChapter,
  solveFormula,
  exprToLatex,
  formatResult,
  type ChapterInfo,
  type Formula,
  type TypeInfo,
} from '@/utils/formulaEngine';
import { usePhysicsStore } from '@/store/physicsStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  BookOpen,
  Beaker,
  Zap,
  Atom,
  Thermometer,
  Magnet,
  Waves,
  Star,
  Satellite,
  Cpu,
  Lightbulb,
  Gauge,
  FlaskConical,
  BarChart3,
  Search,
  Heart,
  History,
  ChevronRight,
  Info,
  RotateCcw,
  Check,
  AlertTriangle,
  X,
  Sparkles,
  BookMarked,
} from 'lucide-react';
import Katex from 'katex';
import { evaluate } from 'mathjs';
import ScientificCalculator from '@/components/physics/ScientificCalculator';

// --- Chapter Icon Map ---
const chapterIconMap: Record<string, React.ReactNode> = {
  physical_world: <BookOpen className="w-5 h-5" />,
  vectors: <ArrowRight className="w-5 h-5" />,
  kinematics: <Gauge className="w-5 h-5" />,
  newtonian_mechanics: <Zap className="w-5 h-5" />,
  work_energy_power: <Zap className="w-5 h-5" />,
  gravitation: <Satellite className="w-5 h-5" />,
  structural_properties: <BarChart3 className="w-5 h-5" />,
  thermodynamics: <Thermometer className="w-5 h-5" />,
  gas_laws: <FlaskConical className="w-5 h-5" />,
  electrostatics: <Atom className="w-5 h-5" />,
  current_electricity: <Cpu className="w-5 h-5" />,
  electromagnetism: <Magnet className="w-5 h-5" />,
  electromagnetic_induction: <Magnet className="w-5 h-5" />,
  geometrical_optics: <Lightbulb className="w-5 h-5" />,
  physical_optics: <Waves className="w-5 h-5" />,
  modern_physics: <Atom className="w-5 h-5" />,
  nuclear_physics: <Atom className="w-5 h-5" />,
  semiconductor: <Cpu className="w-5 h-5" />,
  waves: <Waves className="w-5 h-5" />,
  astronomy: <Star className="w-5 h-5" />,
};

const chapterColorMap: Record<string, string> = {
  physical_world: 'from-emerald-500 to-teal-500',
  vectors: 'from-blue-500 to-indigo-500',
  kinematics: 'from-orange-500 to-red-500',
  newtonian_mechanics: 'from-red-500 to-rose-500',
  work_energy_power: 'from-yellow-500 to-amber-500',
  gravitation: 'from-purple-500 to-violet-500',
  structural_properties: 'from-cyan-500 to-sky-500',
  thermodynamics: 'from-rose-500 to-pink-500',
  gas_laws: 'from-lime-500 to-green-500',
  electrostatics: 'from-amber-500 to-yellow-500',
  current_electricity: 'from-sky-500 to-blue-500',
  electromagnetism: 'from-indigo-500 to-purple-500',
  electromagnetic_induction: 'from-violet-500 to-fuchsia-500',
  geometrical_optics: 'from-yellow-400 to-orange-400',
  physical_optics: 'from-teal-500 to-emerald-500',
  modern_physics: 'from-fuchsia-500 to-pink-500',
  nuclear_physics: 'from-red-600 to-orange-600',
  semiconductor: 'from-green-600 to-teal-600',
  waves: 'from-blue-400 to-cyan-400',
  astronomy: 'from-purple-600 to-indigo-600',
};

function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'basic': return 'bg-green-100 text-green-700 border-green-200';
    case 'intermediate': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'advanced': return 'bg-red-100 text-red-700 border-red-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function getCategoryIcon(category: string): React.ReactNode {
  switch (category) {
    case 'algebraic': return <Calculator className="w-3.5 h-3.5" />;
    case 'trigonometric': return <Waves className="w-3.5 h-3.5" />;
    case 'vector': return <ArrowRight className="w-3.5 h-3.5" />;
    case 'calculus': return <Beaker className="w-3.5 h-3.5" />;
    default: return <Calculator className="w-3.5 h-3.5" />;
  }
}

// --- LaTeX Renderer Component ---
function LatexRenderer({ expression, displayMode = true }: { expression: string; displayMode?: boolean }) {
  const html = useMemo(() => {
    try {
      return Katex.renderToString(expression, {
        displayMode,
        throwOnError: false,
        trust: true,
      });
    } catch {
      return null;
    }
  }, [expression, displayMode]);

  if (!html) {
    return <code className="text-sm font-mono">{expression}</code>;
  }

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

// Custom hook for async data loading without setState in effects
function useAsyncData<T>(fetcher: () => Promise<T>, deps: unknown[]): { data: T | null; loading: boolean } {
  const [state, setState] = useState<{ data: T | null; loading: boolean }>({ data: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const result = await fetcher();
        if (!cancelled) {
          setState({ data: result, loading: false });
        }
      } catch {
        if (!cancelled) {
          setState({ data: null, loading: false });
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, deps);

  return state;
}

// =====================
// CHAPTER SELECTION PAGE
// =====================
function ChaptersPage() {
  const { data: chaptersIndex, loading } = useAsyncData(() => loadChaptersIndex(), []);
  const chapters = chaptersIndex?.chapters ?? [];
  const [searchQuery, setSearchQuery] = useState('');
  const navigateToChapter = usePhysicsStore((s) => s.navigateToChapter);

  const filteredChapters = useMemo(() => {
    if (!searchQuery) return chapters;
    const q = searchQuery.toLowerCase();
    return chapters.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        (c.name_bn && c.name_bn.includes(q))
    );
  }, [chapters, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading chapters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-3">
          <Atom className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Physics Calculator</h1>
        </div>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Advanced physics problem-solving engine with multi-directional formula solving.
          Select a chapter to begin.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md mx-auto mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search chapters..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      {/* Chapter Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredChapters.map((chapter) => (
          <Card
            key={chapter.id}
            className="group cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 border-0 shadow-sm overflow-hidden"
            onClick={() => navigateToChapter(chapter)}
          >
            <div className={`h-1.5 bg-gradient-to-r ${chapterColorMap[chapter.id] || 'from-gray-500 to-gray-600'}`} />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg bg-gradient-to-br ${chapterColorMap[chapter.id] || 'from-gray-500 to-gray-600'} text-white`}>
                    {chapterIconMap[chapter.id] || <BookOpen className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm leading-tight">{chapter.name}</h3>
                    {chapter.name_bn && (
                      <p className="text-xs text-muted-foreground mt-0.5">{chapter.name_bn}</p>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
              </div>
              <div className="flex gap-2 mt-4">
                <Badge variant="secondary" className="text-xs">
                  {chapter.formula_count} formulas
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {chapter.type_count} types
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// =====================
// TYPES PAGE
// =====================
function TypesPage() {
  const selectedChapter = usePhysicsStore((s) => s.selectedChapter);
  const navigateToType = usePhysicsStore((s) => s.navigateToType);
  const navigateBack = usePhysicsStore((s) => s.navigateBack);

  const { data: typesData, loading } = useAsyncData(
    () => selectedChapter ? loadTypesForChapter(selectedChapter.id) : Promise.resolve({ types: [], chapter_id: '', chapter_name: '', chapter_name_bn: '' }),
    [selectedChapter?.id]
  );
  const types = typesData?.types ?? [];

  if (!selectedChapter) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={navigateBack} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Chapters
        </Button>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">{selectedChapter.name}</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2.5 rounded-lg bg-gradient-to-br ${chapterColorMap[selectedChapter.id] || 'from-gray-500 to-gray-600'} text-white`}>
            {chapterIconMap[selectedChapter.id] || <BookOpen className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{selectedChapter.name}</h2>
            {selectedChapter.name_bn && (
              <p className="text-sm text-muted-foreground">{selectedChapter.name_bn}</p>
            )}
          </div>
        </div>
      </div>

      {/* Types List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {types.map((type) => (
          <Card
            key={type.id}
            className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-0 shadow-sm"
            onClick={() => navigateToType(selectedChapter, type.id)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-sm">{type.name}</h3>
                {type.name_bn && (
                  <p className="text-xs text-muted-foreground mt-0.5">{type.name_bn}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {type.formulas.length}
                </Badge>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// =====================
// FORMULAS LIST PAGE
// =====================
function FormulasPage() {
  const selectedChapter = usePhysicsStore((s) => s.selectedChapter);
  const selectedTypeId = usePhysicsStore((s) => s.selectedTypeId);
  const navigateToFormula = usePhysicsStore((s) => s.navigateToFormula);
  const navigateBack = usePhysicsStore((s) => s.navigateBack);
  const isFavorite = usePhysicsStore((s) => s.isFavorite);
  const toggleFavorite = usePhysicsStore((s) => s.toggleFavorite);
  const [showAll, setShowAll] = useState(false);

  const { data: formulasData, loading } = useAsyncData(
    () => selectedChapter ? loadFormulasForChapter(selectedChapter.id) : Promise.resolve({ formulas: [], total_formulas: 0 }),
    [selectedChapter?.id]
  );

  const allChapterFormulas = formulasData?.formulas ?? [];
  const typeFormulas = useMemo(() => {
    if (!selectedTypeId || !allChapterFormulas.length) return allChapterFormulas;
    return allChapterFormulas.filter((f) => f.type === selectedTypeId);
  }, [allChapterFormulas, selectedTypeId]);

  const displayedFormulas = showAll ? allChapterFormulas : typeFormulas;

  if (!selectedChapter) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Button variant="ghost" size="sm" onClick={navigateBack} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> {selectedChapter.name}
        </Button>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {selectedTypeId ? typeFormulas[0]?.type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Type' : 'All Formulas'}
        </span>
      </div>

      {/* Toggle All/Type */}
      {selectedTypeId && (
        <div className="flex gap-2 mb-4">
          <Button
            variant={!showAll ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowAll(false)}
          >
            This Type ({typeFormulas.length})
          </Button>
          <Button
            variant={showAll ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowAll(true)}
          >
            All in Chapter ({allChapterFormulas.length})
          </Button>
        </div>
      )}

      {/* Formula Cards */}
      <div className="space-y-3">
        {displayedFormulas.map((formula) => (
          <Card
            key={formula.id}
            className="cursor-pointer hover:shadow-md transition-all duration-200 border-0 shadow-sm"
            onClick={() => navigateToFormula(formula)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-sm">{formula.name}</h3>
                    {isFavorite(formula.id) && (
                      <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                    )}
                  </div>
                  {formula.name_bn && (
                    <p className="text-xs text-muted-foreground mb-2">{formula.name_bn}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-xs ${getDifficultyColor(formula.difficulty)}`} variant="outline">
                      {formula.difficulty}
                    </Badge>
                    <Badge variant="outline" className="text-xs gap-1">
                      {getCategoryIcon(formula.category)}
                      {formula.category}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {Object.keys(formula.variables).length} vars
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {Object.keys(formula.solve_for).filter(v => formula.solve_for[v].solvable).length} solvable
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(formula.id);
                          }}
                        >
                          <Heart className={`w-4 h-4 ${isFavorite(formula.id) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{isFavorite(formula.id) ? 'Remove from favorites' : 'Add to favorites'}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// =====================
// FORMULA SOLVER PAGE
// =====================

// Inner solver that remounts on formula change via key prop
function SolverInner({ formula }: { formula: Formula }) {
  const navigateBack = usePhysicsStore((s) => s.navigateBack);
  const saveToMemory = usePhysicsStore((s) => s.saveToMemory);
  const getFromMemory = usePhysicsStore((s) => s.getFromMemory);
  const addToHistory = usePhysicsStore((s) => s.addToHistory);
  const memory = usePhysicsStore((s) => s.memory);
  const toggleFavorite = usePhysicsStore((s) => s.toggleFavorite);
  const isFavorite = usePhysicsStore((s) => s.isFavorite);
  const history = usePhysicsStore((s) => s.history);

  // Derive the default unknown variable
  const solvableVars = useMemo(() => {
    return Object.entries(formula.solve_for)
      .filter(([, entry]) => entry.solvable)
      .map(([varName]) => varName);
  }, [formula]);

  // Compute initial memory suggestions for the default unknown
  const initialUnknown = solvableVars[0] || '';
  const initialMemoryInputs = useMemo(() => {
    const suggestions: Record<string, string> = {};
    const vars = Object.keys(formula.variables).filter((v) => v !== initialUnknown);
    for (const v of vars) {
      const memEntry = memory[v];
      if (memEntry) {
        suggestions[v] = String(memEntry.value);
      }
    }
    return suggestions;
  }, [formula, initialUnknown, memory]);

  const [unknownVar, setUnknownVar] = useState(initialUnknown);
  const [inputValues, setInputValues] = useState<Record<string, string>>(initialMemoryInputs);
  const [result, setResult] = useState<{ success: boolean; value?: number; error?: string; unit?: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const handleCalculate = useCallback(() => {
    if (!formula || !unknownVar) return;

    const numericValues: Record<string, number> = {};
    const vars = Object.keys(formula.variables).filter((v) => v !== unknownVar);

    for (const v of vars) {
      const rawVal = (inputValues[v] || '').trim();
      if (!rawVal) {
        setResult({
          success: false,
          error: `Missing value for ${v} (${formula.variables[v]?.label || v})`,
        });
        return;
      }
      // Try direct parse first (handles numbers like "6.67e-11")
      let val = parseFloat(rawVal);
      // If direct parse fails, try evaluating as expression
      if (isNaN(val)) {
        try {
          const evaluated = evaluate(rawVal.replace(/×/g, '*'));
          if (typeof evaluated === 'number' && isFinite(evaluated)) {
            val = evaluated;
          }
        } catch {
          // fall through to error
        }
      }
      if (isNaN(val)) {
        setResult({
          success: false,
          error: `Invalid value for ${v} (${formula.variables[v]?.label || v}): "${rawVal}"`,
        });
        return;
      }
      numericValues[v] = val;
    }

    const calcResult = solveFormula(formula, unknownVar, numericValues);
    setResult(calcResult);

    if (calcResult.success && calcResult.value !== undefined) {
      saveToMemory({
        variable: unknownVar,
        value: calcResult.value,
        unit: calcResult.unit || formula.variables[unknownVar]?.unit || '',
        label: formula.variables[unknownVar]?.label || unknownVar,
        formulaId: formula.id,
        formulaName: formula.name,
        chapterId: formula.chapter,
      });

      for (const [v, val] of Object.entries(numericValues)) {
        saveToMemory({
          variable: v,
          value: val,
          unit: formula.variables[v]?.unit || '',
          label: formula.variables[v]?.label || v,
          formulaId: formula.id,
          formulaName: formula.name,
          chapterId: formula.chapter,
        });
      }

      addToHistory({
        formulaId: formula.id,
        formulaName: formula.name,
        chapterId: formula.chapter,
        unknownVar,
        result: calcResult.value,
        unit: calcResult.unit || formula.variables[unknownVar]?.unit || '',
        inputs: numericValues,
      });
    }
  }, [formula, unknownVar, inputValues, saveToMemory, addToHistory]);

  const handleReset = useCallback(() => {
    setInputValues({});
    setResult(null);
  }, []);

  const inputVars = useMemo(() => {
    if (!formula || !unknownVar) return [];
    return Object.keys(formula.variables).filter((v) => v !== unknownVar);
  }, [formula, unknownVar]);

  const latexExpressions = useMemo(() => {
    if (!formula) return [];
    const expressions: { variable: string; latex: string }[] = [];
    for (const [varName, entry] of Object.entries(formula.solve_for)) {
      if (entry.solvable) {
        expressions.push({
          variable: varName,
          latex: `${varName} = ${exprToLatex(entry.expr)}`,
        });
      }
    }
    return expressions;
  }, [formula]);

  // Related formulas from memory
  const relatedMemory = useMemo(() => {
    if (!formula) return [];
    return Object.entries(memory)
      .filter(([varName]) => formula.variables[varName])
      .map(([varName, entry]) => ({ varName, ...entry }))
      .slice(0, 5);
  }, [memory, formula]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Button variant="ghost" size="sm" onClick={navigateBack} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium truncate max-w-[200px]">{formula.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Solver Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Formula Header Card */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {formula.name}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => toggleFavorite(formula.id)}
                    >
                      <Heart className={`w-4 h-4 ${isFavorite(formula.id) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                    </Button>
                  </CardTitle>
                  {formula.name_bn && (
                    <CardDescription>{formula.name_bn}</CardDescription>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <Badge className={`text-xs ${getDifficultyColor(formula.difficulty)}`} variant="outline">
                    {formula.difficulty}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {formula.category}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* LaTeX Expressions */}
              <div className="bg-muted/50 rounded-lg p-4 mb-2">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Solve Expressions:</p>
                <div className="space-y-2">
                  {latexExpressions.map(({ variable, latex }) => (
                    <div
                      key={variable}
                      className={`flex items-center gap-2 p-2 rounded-md transition-colors ${
                        variable === unknownVar
                          ? 'bg-primary/10 border border-primary/20'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <LatexRenderer expression={latex} displayMode={false} />
                      {variable === unknownVar && (
                        <Badge variant="default" className="text-xs ml-auto">solving</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Solver Card */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Formula Solver
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Unknown Variable Selector */}
              <div>
                <label className="text-sm font-medium mb-2 block">Solve for (unknown variable):</label>
                <div className="flex flex-wrap gap-2">
                  {solvableVars.map((varName) => (
                    <Button
                      key={varName}
                      variant={unknownVar === varName ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setUnknownVar(varName);
                        setResult(null);
                      }}
                      className="gap-1.5"
                    >
                      <span className="font-mono">{varName}</span>
                      <span className="text-xs opacity-70">
                        ({formula.variables[varName]?.unit})
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Input Fields */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Known values:</label>
                  <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1 text-xs h-7">
                    <RotateCcw className="w-3 h-3" /> Reset
                  </Button>
                </div>
                <div className="space-y-3">
                  {inputVars.map((varName) => {
                    const varInfo = formula.variables[varName];
                    const memEntry = getFromMemory(varName);
                    return (
                      <div key={varName} className="flex items-center gap-2">
                        <div className="w-20 shrink-0">
                          <span className="text-sm font-mono font-medium">{varName}</span>
                          {varInfo && (
                            <span className="text-xs text-muted-foreground block truncate">
                              {varInfo.label}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 relative">
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="e.g. 6.67e-11"
                            value={inputValues[varName] || ''}
                            onChange={(e) => {
                              setInputValues((prev) => ({
                                ...prev,
                                [varName]: e.target.value,
                              }));
                              setResult(null);
                            }}
                            className="pr-14 h-10 font-mono text-sm"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono pointer-events-none">
                            {varInfo?.unit || ''}
                          </span>
                        </div>
                        {/* Scientific Calculator Popup */}
                        <ScientificCalculator
                          currentValue={inputValues[varName] || ''}
                          onValueChange={(val) => {
                            setInputValues((prev) => ({
                              ...prev,
                              [varName]: val,
                            }));
                            setResult(null);
                          }}
                          variableName={varName}
                          variableUnit={varInfo?.unit}
                        />
                        {memEntry && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-xs gap-1 shrink-0"
                                  onClick={() => {
                                    setInputValues((prev) => ({
                                      ...prev,
                                      [varName]: String(memEntry.value),
                                    }));
                                    setResult(null);
                                  }}
                                >
                                  <Sparkles className="w-3 h-3 text-amber-500" />
                                  {formatResult(memEntry.value)}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                From memory: {memEntry.formulaName} ({memEntry.value} {memEntry.unit})
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Calculate Button */}
              <Button
                onClick={handleCalculate}
                className="w-full h-12 text-base gap-2"
                size="lg"
              >
                <Calculator className="w-5 h-5" />
                Calculate {unknownVar}
              </Button>

              {/* Result */}
              {result && (
                <div
                  className={`rounded-lg p-4 ${
                    result.success
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  {result.success ? (
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-green-100 rounded-full">
                        <Check className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-green-800">
                          {unknownVar} = {formatResult(result.value!)} {result.unit || ''}
                        </p>
                        {result.error && (
                          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {result.error}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-red-100 rounded-full">
                        <X className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-red-800">Calculation Error</p>
                        <p className="text-sm text-red-600 mt-0.5">{result.error}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Constraints */}
              {formula.constraints.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-amber-700 mb-1 flex items-center gap-1">
                    <Info className="w-3 h-3" /> Constraints
                  </p>
                  <ul className="text-xs text-amber-600 space-y-0.5">
                    {formula.constraints.map((c, i) => (
                      <li key={i} className="font-mono">{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Variable Reference */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookMarked className="w-4 h-4" />
                Variable Reference
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {Object.entries(formula.variables).map(([varName, varInfo]) => (
                    <div key={varName} className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-medium">{varName}</span>
                        <span className="text-muted-foreground ml-1">— {varInfo.label}</span>
                      </div>
                      <Badge variant="outline" className="text-xs font-mono">
                        {varInfo.unit}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Memory Suggestions */}
          {relatedMemory.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Memory Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {relatedMemory.map((entry) => (
                    <div key={entry.varName} className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-medium">{entry.varName}</span>
                        <span className="text-muted-foreground ml-1">= {formatResult(entry.value)} {entry.unit}</span>
                      </div>
                      <span className="text-muted-foreground truncate max-w-[100px]">
                        {entry.formulaName}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick History */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Recent Calculations
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  {showHistory ? 'Hide' : 'Show All'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className={showHistory ? 'max-h-64' : 'max-h-32'}>
                <div className="space-y-2">
                  {history.slice(0, showHistory ? 20 : 3).map((entry) => (
                    <div key={entry.id} className="text-xs space-y-0.5">
                      <div className="font-medium truncate">{entry.formulaName}</div>
                      <div className="text-muted-foreground">
                        <span className="font-mono">{entry.unknownVar}</span> = {formatResult(entry.result)} {entry.unit}
                      </div>
                    </div>
                  ))}
                  {history.length === 0 && (
                    <p className="text-xs text-muted-foreground">No calculations yet</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Dependencies */}
          {formula.depends_on.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Dependencies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {formula.depends_on.map((dep) => (
                    <Badge key={dep} variant="outline" className="text-xs font-mono">
                      {dep}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Wrapper that uses key to force remount when formula changes
function SolverPage() {
  const selectedFormula = usePhysicsStore((s) => s.selectedFormula);

  if (!selectedFormula) return null;
  return <SolverInner key={selectedFormula.id} formula={selectedFormula} />;
}

// =====================
// MAIN PAGE
// =====================
export default function PhysicsCalculatorApp() {
  const currentView = usePhysicsStore((s) => s.currentView);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav Bar */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Atom className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm">PhyCalc</span>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="text-xs">
              HSC Physics
            </Badge>
          </div>
        </div>
      </header>

      {/* Content */}
      <main>
        {currentView === 'chapters' && <ChaptersPage />}
        {currentView === 'types' && <TypesPage />}
        {currentView === 'formulas' && <FormulasPage />}
        {currentView === 'solver' && <SolverPage />}
      </main>
    </div>
  );
}
