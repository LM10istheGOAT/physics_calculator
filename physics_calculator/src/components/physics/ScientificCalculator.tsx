"use client";

import { useState } from "react";
import { evaluate } from "mathjs";

interface ScientificCalculatorProps {
  open: boolean;
  onClose: () => void;
  onApply: (value: string) => void;
}

const PHYSICS_CONSTANTS: Record<string, { value: string; label: string; symbol: string }> = {
  G: { value: "6.674e-11", label: "Gravitational Constant", symbol: "G" },
  c: { value: "3e8", label: "Speed of Light", symbol: "c" },
  h: { value: "6.626e-34", label: "Planck Constant", symbol: "h" },
  k_B: { value: "1.381e-23", label: "Boltzmann Constant", symbol: "k_B" },
  e_charge: { value: "1.602e-19", label: "Elementary Charge", symbol: "e" },
  m_e: { value: "9.109e-31", label: "Electron Mass", symbol: "m_e" },
  m_p: { value: "1.673e-27", label: "Proton Mass", symbol: "m_p" },
  N_A: { value: "6.022e23", label: "Avogadro Number", symbol: "N_A" },
  R: { value: "8.314", label: "Gas Constant", symbol: "R" },
  g: { value: "9.8", label: "Gravity (Earth)", symbol: "g" },
};

export default function ScientificCalculator({ open, onClose, onApply }: ScientificCalculatorProps) {
  const [expression, setExpression] = useState("");
  const [preview, setPreview] = useState<string>("");

  if (!open) return null;

  const updateExpression = (newExpr: string) => {
    setExpression(newExpr);
    // Live preview
    try {
      if (newExpr.trim() === "") {
        setPreview("");
        return;
      }
      const result = evaluate(newExpr);
      if (typeof result === "number" && isFinite(result)) {
        setPreview(String(result));
      } else {
        setPreview("");
      }
    } catch {
      setPreview("");
    }
  };

  const appendChar = (char: string) => {
    updateExpression(expression + char);
  };

  const handleConstant = (value: string) => {
    // Wrap in parens if expression is not empty and doesn't end with operator
    const lastChar = expression.slice(-1);
    if (expression && lastChar && !["+", "-", "*", "/", "(", "^"].includes(lastChar)) {
      updateExpression(expression + "*" + value);
    } else {
      updateExpression(expression + value);
    }
  };

  const handleEquals = () => {
    try {
      const result = evaluate(expression);
      if (typeof result === "number" && isFinite(result)) {
        setExpression(String(result));
        setPreview("");
      }
    } catch {
      // Keep expression as-is
    }
  };

  const handleClear = () => {
    setExpression("");
    setPreview("");
  };

  const handleBackspace = () => {
    updateExpression(expression.slice(0, -1));
  };

  const handleUseValue = () => {
    let valueToUse = "";
    if (preview) {
      valueToUse = preview;
    } else {
      try {
        const result = evaluate(expression);
        if (typeof result === "number" && isFinite(result)) {
          valueToUse = String(result);
        }
      } catch {
        valueToUse = expression;
      }
    }
    onApply(valueToUse);
    setExpression("");
    setPreview("");
  };

  const CalcButton = ({
    label,
    onClick,
    className = "",
    small = false,
  }: {
    label: string;
    onClick: () => void;
    className?: string;
    small?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center rounded-lg font-semibold transition-all active:scale-95 ${
        small ? "text-xs px-1.5 py-1.5" : "text-sm px-2 py-2.5"
      } ${className}`}
    >
      {label}
    </button>
  );

  return (
    <div className="calc-overlay" onClick={onClose}>
      <div className="calc-panel animate-slide-up" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-accent-400 font-bold text-lg">Scientific Calculator</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-physics-400 hover:text-white transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        {/* Display */}
        <div className="bg-physics-900 rounded-lg p-3 mb-3 border border-physics-600">
          <div className="text-right text-xl font-mono text-white min-h-[1.75rem] break-all">
            {expression || "0"}
          </div>
          {preview && (
            <div className="text-right text-sm font-mono text-green-400 mt-1">= {preview}</div>
          )}
        </div>

        {/* Physics Constants */}
        <div className="mb-3">
          <div className="text-xs text-physics-400 mb-1.5 font-semibold uppercase tracking-wider">
            Physics Constants
          </div>
          <div className="grid grid-cols-5 gap-1">
            {Object.entries(PHYSICS_CONSTANTS).map(([key, { symbol }]) => (
              <CalcButton
                key={key}
                label={symbol}
                onClick={() => handleConstant(PHYSICS_CONSTANTS[key].value)}
                className="bg-purple-600/30 text-purple-300 hover:bg-purple-600/50 border border-purple-500/30"
                small
              />
            ))}
          </div>
        </div>

        {/* Main Buttons */}
        <div className="grid grid-cols-5 gap-1.5 mb-3">
          {/* Row 1 */}
          <CalcButton label="C" onClick={handleClear} className="bg-red-500/30 text-red-300 hover:bg-red-500/50" />
          <CalcButton label="(" onClick={() => appendChar("(")} className="bg-physics-700 text-physics-300 hover:bg-physics-600" />
          <CalcButton label=")" onClick={() => appendChar(")")} className="bg-physics-700 text-physics-300 hover:bg-physics-600" />
          <CalcButton label="^" onClick={() => appendChar("^")} className="bg-physics-700 text-physics-300 hover:bg-physics-600" />
          <CalcButton label="⌫" onClick={handleBackspace} className="bg-amber-500/30 text-amber-300 hover:bg-amber-500/50" />

          {/* Row 2 */}
          <CalcButton label="7" onClick={() => appendChar("7")} className="bg-physics-800 text-white hover:bg-physics-600" />
          <CalcButton label="8" onClick={() => appendChar("8")} className="bg-physics-800 text-white hover:bg-physics-600" />
          <CalcButton label="9" onClick={() => appendChar("9")} className="bg-physics-800 text-white hover:bg-physics-600" />
          <CalcButton label="÷" onClick={() => appendChar("/")} className="bg-accent-600/40 text-accent-300 hover:bg-accent-600/60" />
          <CalcButton label="EXP" onClick={() => appendChar("e")} className="bg-green-600/30 text-green-300 hover:bg-green-600/50 text-xs!" />

          {/* Row 3 */}
          <CalcButton label="4" onClick={() => appendChar("4")} className="bg-physics-800 text-white hover:bg-physics-600" />
          <CalcButton label="5" onClick={() => appendChar("5")} className="bg-physics-800 text-white hover:bg-physics-600" />
          <CalcButton label="6" onClick={() => appendChar("6")} className="bg-physics-800 text-white hover:bg-physics-600" />
          <CalcButton label="×" onClick={() => appendChar("*")} className="bg-accent-600/40 text-accent-300 hover:bg-accent-600/60" />
          <CalcButton label="√" onClick={() => appendChar("sqrt(")} className="bg-physics-700 text-physics-300 hover:bg-physics-600" />

          {/* Row 4 */}
          <CalcButton label="1" onClick={() => appendChar("1")} className="bg-physics-800 text-white hover:bg-physics-600" />
          <CalcButton label="2" onClick={() => appendChar("2")} className="bg-physics-800 text-white hover:bg-physics-600" />
          <CalcButton label="3" onClick={() => appendChar("3")} className="bg-physics-800 text-white hover:bg-physics-600" />
          <CalcButton label="-" onClick={() => appendChar("-")} className="bg-accent-600/40 text-accent-300 hover:bg-accent-600/60" />
          <CalcButton label="π" onClick={() => appendChar("pi")} className="bg-physics-700 text-physics-300 hover:bg-physics-600" />

          {/* Row 5 */}
          <CalcButton label="0" onClick={() => appendChar("0")} className="bg-physics-800 text-white hover:bg-physics-600" />
          <CalcButton label="." onClick={() => appendChar(".")} className="bg-physics-800 text-white hover:bg-physics-600" />
          <CalcButton label="=" onClick={handleEquals} className="bg-accent-600/40 text-accent-300 hover:bg-accent-600/60" />
          <CalcButton label="+" onClick={() => appendChar("+")} className="bg-accent-600/40 text-accent-300 hover:bg-accent-600/60" />
          <CalcButton label="x²" onClick={() => appendChar("^2")} className="bg-physics-700 text-physics-300 hover:bg-physics-600" />
        </div>

        {/* Use Value Button */}
        <button
          type="button"
          onClick={handleUseValue}
          className="w-full py-3 rounded-lg bg-gradient-to-r from-accent-600 to-purple-600 text-white font-bold text-base hover:from-accent-500 hover:to-purple-500 transition-all active:scale-[0.98]"
        >
          Use This Value
        </button>
      </div>
    </div>
  );
}
