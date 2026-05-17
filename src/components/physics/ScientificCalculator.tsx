'use client';

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { evaluate } from 'mathjs';

// --- Physics Constants ---
const PHYSICS_CONSTANTS: Record<string, { value: number; label: string; symbol: string }> = {
  G: { value: 6.674e-11, label: 'Gravitational Constant', symbol: 'G' },
  c: { value: 2.998e8, label: 'Speed of Light', symbol: 'c' },
  h: { value: 6.626e-34, label: "Planck's Constant", symbol: 'h' },
  k_B: { value: 1.381e-23, label: 'Boltzmann Constant', symbol: 'k_B' },
  e: { value: 1.602e-19, label: 'Elementary Charge', symbol: 'e' },
  m_e: { value: 9.109e-31, label: 'Electron Mass', symbol: 'm_e' },
  m_p: { value: 1.673e-27, label: 'Proton Mass', symbol: 'm_p' },
  N_A: { value: 6.022e23, label: 'Avogadro Number', symbol: 'N_A' },
  R: { value: 8.314, label: 'Gas Constant', symbol: 'R' },
  sigma: { value: 5.670e-8, label: 'Stefan-Boltzmann Constant', symbol: 'σ' },
  g: { value: 9.80665, label: 'Standard Gravity', symbol: 'g' },
  pi: { value: 3.14159265359, label: 'Pi', symbol: 'π' },
  epsilon_0: { value: 8.854e-12, label: 'Permittivity of Free Space', symbol: 'ε₀' },
  mu_0: { value: 1.257e-6, label: 'Permeability of Free Space', symbol: 'μ₀' },
};

// --- Display formatting for scientific notation ---
function formatSciDisplay(expr: string): string {
  // Replace "e" (for exponent) with "×10^" for display
  // But only when it's part of a number like 6.67e-11
  let formatted = expr;
  // Match patterns like: numberE±digits or number e ± digits
  formatted = formatted.replace(/(\d+\.?\d*)[eE]([+-]?\d+)/g, (_, base, exp) => {
    return `${base}×10^${exp}`;
  });
  return formatted;
}

// --- Evaluate expression to a number ---
function evaluateExpression(expr: string): number | null {
  try {
    // Replace × with * for math.js
    let processed = expr.replace(/×/g, '*');
    // Replace "e" or "E" exponent notation with math.js compatible format
    // e.g., 6.67e-11 stays as-is (math.js understands this)
    // But handle ×10^ notation → convert back to * 10^
    processed = processed.replace(/×10\^([+-]?\d+)/g, '*10^($1)');
    processed = processed.replace(/10\^([+-]?\d+)/g, '10^($1)');

    const result = evaluate(processed);
    if (typeof result === 'number' && isFinite(result)) {
      return result;
    }
    return null;
  } catch {
    return null;
  }
}

interface ScientificCalculatorProps {
  currentValue: string;
  onValueChange: (value: string) => void;
  variableName: string;
  variableUnit?: string;
  trigger?: React.ReactNode;
}

export default function ScientificCalculator({
  currentValue,
  onValueChange,
  variableName,
  variableUnit,
  trigger,
}: ScientificCalculatorProps) {
  const [open, setOpen] = useState(false);
  const [expression, setExpression] = useState(currentValue || '');
  const [preview, setPreview] = useState<string>('');
  const [showConstants, setShowConstants] = useState(false);
  const [lastResult, setLastResult] = useState<string>('');

  // Update expression when dialog opens
  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setExpression(currentValue || '');
      setPreview('');
      setShowConstants(false);
    }
  }, [currentValue]);

  // Append to expression
  const append = useCallback((chars: string) => {
    setExpression((prev) => prev + chars);
  }, []);

  // Insert EXP (×10^) for scientific notation
  const insertExp = useCallback(() => {
    setExpression((prev) => prev + 'e');
  }, []);

  // Insert power
  const insertPower = useCallback(() => {
    setExpression((prev) => prev + '^');
  }, []);

  // Insert function
  const insertFunction = useCallback((fn: string) => {
    setExpression((prev) => prev + fn + '(');
  }, []);

  // Backspace
  const backspace = useCallback(() => {
    setExpression((prev) => prev.slice(0, -1));
  }, []);

  // Clear
  const clear = useCallback(() => {
    setExpression('');
    setPreview('');
    setLastResult('');
  }, []);

  // Negate (toggle sign)
  const negate = useCallback(() => {
    setExpression((prev) => {
      if (prev.startsWith('-')) return prev.slice(1);
      if (prev.length > 0) return '-' + prev;
      return prev;
    });
  }, []);

  // Insert constant
  const insertConstant = useCallback((key: string) => {
    const constant = PHYSICS_CONSTANTS[key];
    if (constant) {
      setExpression((prev) => prev + String(constant.value));
    }
  }, []);

  // Evaluate and preview
  const handleEquals = useCallback(() => {
    const result = evaluateExpression(expression);
    if (result !== null) {
      setLastResult(String(result));
      setPreview('');
    } else {
      setPreview('Error');
    }
  }, [expression]);

  // Confirm and send value back
  const handleConfirm = useCallback(() => {
    // Try to evaluate first
    const result = evaluateExpression(expression);
    if (result !== null) {
      onValueChange(String(result));
      setOpen(false);
    } else {
      // If can't evaluate, try as direct number
      const num = parseFloat(expression);
      if (!isNaN(num)) {
        onValueChange(String(num));
        setOpen(false);
      }
      // Otherwise show error in preview
      setPreview('Invalid expression');
    }
  }, [expression, onValueChange]);

  // Live preview
  React.useEffect(() => {
    if (!expression) {
      setPreview('');
      return;
    }
    const result = evaluateExpression(expression);
    if (result !== null) {
      setPreview(`= ${result.toPrecision(10).replace(/\.?0+$/, '')}`);
    } else {
      setPreview('');
    }
  }, [expression]);

  // Button layout
  const sciButtons = [
    { label: 'sin', action: () => insertFunction('sin'), className: 'text-xs' },
    { label: 'cos', action: () => insertFunction('cos'), className: 'text-xs' },
    { label: 'tan', action: () => insertFunction('tan'), className: 'text-xs' },
    { label: 'log', action: () => insertFunction('log10'), className: 'text-xs' },
    { label: 'ln', action: () => insertFunction('log'), className: 'text-xs' },
    { label: '√', action: () => insertFunction('sqrt'), className: 'text-xs' },
    { label: '(', action: () => append('('), className: 'text-xs' },
    { label: ')', action: () => append(')'), className: 'text-xs' },
    { label: '^', action: insertPower, className: 'text-xs font-bold' },
    { label: 'EXP', action: insertExp, className: 'text-xs font-bold text-blue-600' },
  ];

  const numButtons = [
    { label: '7', action: () => append('7') },
    { label: '8', action: () => append('8') },
    { label: '9', action: () => append('9') },
    { label: '÷', action: () => append('/'), className: 'text-lg font-bold' },
    { label: 'AC', action: clear, className: 'text-red-600 font-bold text-xs' },
    { label: '4', action: () => append('4') },
    { label: '5', action: () => append('5') },
    { label: '6', action: () => append('6') },
    { label: '×', action: () => append('*'), className: 'text-lg font-bold' },
    { label: '⌫', action: backspace, className: 'text-orange-600' },
    { label: '1', action: () => append('1') },
    { label: '2', action: () => append('2') },
    { label: '3', action: () => append('3') },
    { label: '−', action: () => append('-'), className: 'text-lg font-bold' },
    { label: '±', action: negate, className: 'text-xs font-bold' },
    { label: '0', action: () => append('0'), span: 1 },
    { label: '.', action: () => append('.') },
    { label: 'π', action: () => insertConstant('pi'), className: 'text-xs' },
    { label: '+', action: () => append('+'), className: 'text-lg font-bold' },
    { label: '=', action: handleEquals, className: 'bg-primary text-primary-foreground font-bold' },
  ];

  const constantEntries = Object.entries(PHYSICS_CONSTANTS).filter(([k]) => k !== 'pi');

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2"/>
              <path d="M7 7h10"/>
              <path d="M7 12h2"/>
              <path d="M13 12h4"/>
              <path d="M7 17h4"/>
              <path d="M15 17h2"/>
            </svg>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              Scientific Calculator — <span className="font-mono">{variableName}</span>
              {variableUnit && <span className="text-muted-foreground font-normal">({variableUnit})</span>}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-6 px-2"
              onClick={() => setShowConstants(!showConstants)}
            >
              {showConstants ? 'Keyboard' : 'Constants'}
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Display */}
        <div className="mx-4 mb-2 bg-muted/80 rounded-lg p-3 min-h-[72px] flex flex-col justify-end">
          <div className="text-right font-mono text-lg tracking-tight break-all min-h-[28px]">
            {expression ? formatSciDisplay(expression) : <span className="text-muted-foreground">0</span>}
          </div>
          {preview && (
            <div className={`text-right text-sm mt-1 ${preview.startsWith('=') ? 'text-primary' : 'text-red-500'}`}>
              {preview}
            </div>
          )}
          {lastResult && !preview && (
            <div className="text-right text-xs text-muted-foreground mt-1">
              Last: {lastResult}
            </div>
          )}
        </div>

        {/* Constants Panel */}
        {showConstants && (
          <div className="mx-4 mb-2 max-h-40 overflow-y-auto rounded-lg border">
            <div className="grid grid-cols-2 gap-1 p-2">
              {constantEntries.map(([key, { value, label, symbol }]) => (
                <Button
                  key={key}
                  variant="ghost"
                  size="sm"
                  className="h-auto py-1.5 px-2 justify-start text-left"
                  onClick={() => insertConstant(key)}
                >
                  <span className="font-mono font-bold mr-1.5 text-primary">{symbol}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {value.toExponential(3)} — {label}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Scientific Buttons Row */}
        {!showConstants && (
          <div className="mx-4 mb-1">
            <div className="grid grid-cols-5 gap-1">
              {sciButtons.map((btn) => (
                <Button
                  key={btn.label}
                  variant="outline"
                  size="sm"
                  className={`h-9 p-0 ${btn.className || ''}`}
                  onClick={btn.action}
                >
                  {btn.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Number Pad */}
        <div className="mx-4 mb-2">
          <div className="grid grid-cols-5 gap-1">
            {numButtons.map((btn) => (
              <Button
                key={btn.label}
                variant={btn.className?.includes('bg-primary') ? 'default' : 'outline'}
                size="sm"
                className={`h-11 p-0 text-base ${btn.className || ''}`}
                onClick={btn.action}
              >
                {btn.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Confirm Button */}
        <div className="mx-4 mb-4">
          <Button
            onClick={handleConfirm}
            className="w-full h-10 gap-2"
            size="default"
          >
            Use This Value
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
