"use client";

import { useEffect, useMemo, useState } from "react";

type ButtonKind = "number" | "operator" | "action" | "equals";

type CalculatorButton = {
  label: string;
  value: string;
  kind: ButtonKind;
  wide?: boolean;
  ariaLabel?: string;
};

const buttons: CalculatorButton[] = [
  { label: "C", value: "clear", kind: "action", ariaLabel: "Clear" },
  { label: "+/-", value: "sign", kind: "action", ariaLabel: "Change sign" },
  { label: "%", value: "%", kind: "operator", ariaLabel: "Percent" },
  { label: "/", value: "/", kind: "operator", ariaLabel: "Divide" },
  { label: "7", value: "7", kind: "number" },
  { label: "8", value: "8", kind: "number" },
  { label: "9", value: "9", kind: "number" },
  { label: "x", value: "*", kind: "operator", ariaLabel: "Multiply" },
  { label: "4", value: "4", kind: "number" },
  { label: "5", value: "5", kind: "number" },
  { label: "6", value: "6", kind: "number" },
  { label: "-", value: "-", kind: "operator", ariaLabel: "Subtract" },
  { label: "1", value: "1", kind: "number" },
  { label: "2", value: "2", kind: "number" },
  { label: "3", value: "3", kind: "number" },
  { label: "+", value: "+", kind: "operator", ariaLabel: "Add" },
  { label: "0", value: "0", kind: "number", wide: true },
  { label: ".", value: ".", kind: "number", ariaLabel: "Decimal point" },
  { label: "=", value: "equals", kind: "equals", ariaLabel: "Equals" },
];

const operators = new Set(["+", "-", "*", "/", "%"]);

function normalizeExpression(expression: string) {
  return expression.replaceAll("*", "x");
}

function trimNumber(value: number) {
  if (!Number.isFinite(value)) {
    throw new Error("Invalid result");
  }

  const rounded = Number.parseFloat(value.toPrecision(12));
  return Object.is(rounded, -0) ? "0" : rounded.toString();
}

function tokenize(expression: string) {
  const tokens: string[] = [];
  let numberBuffer = "";

  for (let index = 0; index < expression.length; index += 1) {
    const character = expression[index];
    const previous = expression[index - 1];
    const isUnaryMinus =
      character === "-" &&
      (index === 0 || operators.has(previous)) &&
      /[0-9.]/.test(expression[index + 1] ?? "");

    if (/[0-9.]/.test(character) || isUnaryMinus) {
      numberBuffer += character;
      continue;
    }

    if (operators.has(character)) {
      if (numberBuffer) {
        tokens.push(numberBuffer);
        numberBuffer = "";
      }
      tokens.push(character);
    }
  }

  if (numberBuffer) {
    tokens.push(numberBuffer);
  }

  return tokens;
}

function evaluateExpression(expression: string) {
  const tokens = tokenize(expression);

  if (tokens.length === 0 || operators.has(tokens[tokens.length - 1])) {
    throw new Error("Incomplete expression");
  }

  const values: number[] = [];
  const ops: string[] = [];
  const precedence: Record<string, number> = {
    "+": 1,
    "-": 1,
    "*": 2,
    "/": 2,
    "%": 2,
  };

  const applyOperation = () => {
    const operator = ops.pop();
    const right = values.pop();
    const left = values.pop();

    if (operator === undefined || left === undefined || right === undefined) {
      throw new Error("Invalid expression");
    }

    if (operator === "/" && right === 0) {
      throw new Error("Cannot divide by zero");
    }

    if (operator === "%" && right === 0) {
      throw new Error("Cannot modulo by zero");
    }

    const result =
      operator === "+"
        ? left + right
        : operator === "-"
          ? left - right
          : operator === "*"
            ? left * right
            : operator === "/"
              ? left / right
              : left % right;

    values.push(result);
  };

  for (const token of tokens) {
    if (operators.has(token)) {
      while (
        ops.length > 0 &&
        precedence[ops[ops.length - 1]] >= precedence[token]
      ) {
        applyOperation();
      }
      ops.push(token);
      continue;
    }

    const value = Number(token);
    if (!Number.isFinite(value)) {
      throw new Error("Invalid number");
    }
    values.push(value);
  }

  while (ops.length > 0) {
    applyOperation();
  }

  if (values.length !== 1) {
    throw new Error("Invalid expression");
  }

  return trimNumber(values[0]);
}

function getCurrentNumberRange(expression: string) {
  let start = expression.length - 1;

  while (start >= 0) {
    const character = expression[start];
    const previous = expression[start - 1];
    const isUnaryMinus =
      character === "-" && (start === 0 || operators.has(previous));

    if (!/[0-9.]/.test(character) && !isUnaryMinus) {
      break;
    }
    start -= 1;
  }

  return {
    start: start + 1,
    end: expression.length,
  };
}

function appendInput(expression: string, input: string) {
  const last = expression.at(-1);

  if (/[0-9]/.test(input)) {
    return expression === "0" ? input : `${expression}${input}`;
  }

  if (input === ".") {
    const { start } = getCurrentNumberRange(expression);
    const currentNumber = expression.slice(start);
    if (currentNumber.includes(".")) {
      return expression;
    }
    return currentNumber ? `${expression}.` : `${expression}0.`;
  }

  if (operators.has(input)) {
    if (!expression || expression === "-") {
      return input === "-" ? "-" : expression;
    }

    if (operators.has(last ?? "")) {
      return `${expression.slice(0, -1)}${input}`;
    }

    return `${expression}${input}`;
  }

  return expression;
}

function toggleSign(expression: string) {
  if (!expression || expression === "0") {
    return "-";
  }

  const { start, end } = getCurrentNumberRange(expression);
  const currentNumber = expression.slice(start, end);

  if (!currentNumber || operators.has(currentNumber)) {
    return expression;
  }

  if (currentNumber.startsWith("-")) {
    return `${expression.slice(0, start)}${currentNumber.slice(1)}`;
  }

  return `${expression.slice(0, start)}-${currentNumber}`;
}

export default function Home() {
  const [expression, setExpression] = useState("0");
  const [history, setHistory] = useState("");
  const [historyEntries, setHistoryEntries] = useState<string[]>([]);
  const [error, setError] = useState("");

  const formattedExpression = useMemo(
    () => normalizeExpression(expression),
    [expression],
  );

  const handleInput = (value: string) => {
    setError("");

    if (value === "clear") {
      setExpression("0");
      setHistory("");
      return;
    }

    if (value === "clearTape") {
      setHistoryEntries([]);
      return;
    }

    if (value === "backspace") {
      setExpression((current) =>
        current.length <= 1 || current === "Error" ? "0" : current.slice(0, -1),
      );
      return;
    }

    if (value === "sign") {
      setExpression((current) => toggleSign(current));
      return;
    }

    if (value === "equals") {
      try {
        const result = evaluateExpression(expression);
        setHistory(`${formattedExpression} =`);
        setExpression(result);
        setHistoryEntries((entries) => [
          `${formattedExpression} = ${result}`,
          ...entries.slice(0, 5),
        ]);
      } catch (calculationError) {
        setError(
          calculationError instanceof Error
            ? calculationError.message
            : "Something went wrong",
        );
      }
      return;
    }

    setExpression((current) =>
      appendInput(current === "Error" ? "0" : current, value),
    );
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const keyMap: Record<string, string> = {
        Enter: "equals",
        "=": "equals",
        Backspace: "backspace",
        Escape: "clear",
        c: "clear",
        C: "clear",
        x: "*",
        X: "*",
      };

      const value =
        keyMap[event.key] ??
        (/^[0-9.+\-*/%]$/.test(event.key) ? event.key : undefined);

      if (value) {
        event.preventDefault();
        handleInput(value);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <main className="min-h-screen overflow-hidden bg-[#eef3f0] text-slate-950">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-6 px-5 py-7 sm:px-8 lg:grid-cols-[1fr_0.82fr]">
        <div className="mx-auto w-full max-w-sm rounded-lg border border-slate-900/10 bg-slate-950 p-4 shadow-2xl shadow-slate-900/25 sm:p-5">
          <div className="mb-4 flex items-center justify-between text-white">
            <h1 className="text-xl font-semibold">Calculator</h1>
            <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
            </div>
          </div>

          <div className="mb-4 min-h-36 rounded-lg bg-[#f7fbf8] p-5 text-right shadow-inner shadow-slate-900/10">
            <div className="min-h-6 truncate text-sm font-medium text-slate-500">
              {history || "Ready"}
            </div>
            <output
              aria-live="polite"
              className={[
                "mt-5 block min-h-14 break-all font-semibold leading-none text-slate-950",
                error ? "text-2xl" : "text-5xl",
              ].join(" ")}
            >
              {error || formattedExpression}
            </output>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {buttons.map((button) => (
              <button
                aria-label={button.ariaLabel ?? button.label}
                className={[
                  "h-16 rounded-lg text-xl font-semibold transition duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-slate-950 active:scale-[0.98]",
                  button.wide ? "col-span-2" : "",
                  button.kind === "number"
                    ? "bg-slate-800 text-white hover:bg-slate-700"
                    : "",
                  button.kind === "action"
                    ? "bg-slate-200 text-slate-950 hover:bg-white"
                    : "",
                  button.kind === "operator"
                    ? "bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                    : "",
                  button.kind === "equals"
                    ? "bg-amber-300 text-slate-950 hover:bg-amber-200"
                    : "",
                ].join(" ")}
                key={button.value}
                onClick={() => handleInput(button.value)}
                type="button"
              >
                {button.label}
              </button>
            ))}
          </div>

          <button
            aria-label="Backspace"
            className="mt-3 h-12 w-full rounded-lg border border-white/10 bg-slate-900 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-slate-950"
            onClick={() => handleInput("backspace")}
            type="button"
          >
            DEL
          </button>
        </div>

        <aside className="mx-auto w-full max-w-sm rounded-lg border border-slate-900/10 bg-white/80 p-5 shadow-xl shadow-slate-900/10 backdrop-blur">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-950">Tape</h2>
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              onClick={() => handleInput("clearTape")}
              type="button"
            >
              Clear
            </button>
          </div>
          <div className="min-h-80 space-y-3">
            {historyEntries.length === 0 ? (
              <div className="flex min-h-80 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-medium text-slate-500">
                No calculations yet
              </div>
            ) : (
              historyEntries.map((entry, index) => (
                <div
                  className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-right font-mono text-base text-slate-800 shadow-sm"
                  key={`${entry}-${index}`}
                >
                  {entry}
                </div>
              ))
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
