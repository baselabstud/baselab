
"use strict";

// =====================================================
// BASELAB — CONVERTER & PEN-AND-PAPER CALCULATOR
// =====================================================

const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const MAX_FRACTION_DIGITS = 10000;

const MAX_TABLE_ROWS = 1024;

const $ = id => document.getElementById(id);

const BASE_NAMES = {
  2: "Binary",
  8: "Octal",
  10: "Decimal",
  16: "Hexadecimal"
};

let currentResult = "";

let currentSolution = [];

let lastConversion = null;

let solutionIndex = 0;

let solutionTimer = null;

// =====================================================
// EXACT FRACTION ARITHMETIC
// =====================================================

function absolute(n) {
  return n < 0n ? -n : n;
}

function gcd(a, b) {
  a = absolute(a);
  b = absolute(b);

  while (b !== 0n) {
    [a, b] = [b, a % b];
  }

  return a;
}

function makeFraction(n, d = 1n) {
  if (d === 0n) {
    throw new Error("Division by zero is not allowed.");
  }

  if (d < 0n) {
    n = -n;
    d = -d;
  }

  const factor = gcd(n, d);

  return {
    n: n / factor,
    d: d / factor
  };
}

function add(a, b) {
  return makeFraction(
    a.n * b.d + b.n * a.d,
    a.d * b.d
  );
}

function subtract(a, b) {
  return makeFraction(
    a.n * b.d - b.n * a.d,
    a.d * b.d
  );
}

function multiply(a, b) {
  return makeFraction(
    a.n * b.n,
    a.d * b.d
  );
}

function divide(a, b) {
  if (b.n === 0n) {
    throw new Error("Division by zero is not allowed.");
  }

  return makeFraction(
    a.n * b.d,
    a.d * b.n
  );
}

// =====================================================
// PARSE NUMBER IN BASES 2–36
// =====================================================

function parseNumber(input, base) {
  const text = input.trim().toUpperCase();

  if (
    !/^-?(?:[0-9A-Z]+(?:\.[0-9A-Z]*)?|\.[0-9A-Z]+)$/.test(text)
  ) {
    throw new Error(
      "Enter a valid number, such as 123.45, 101.101, or A.F."
    );
  }

  const negative = text.startsWith("-");
  const unsigned = negative ? text.slice(1) : text;

  const [integerText = "", fractionText = ""] =
    unsigned.split(".");

  let integer = 0n;

  for (const character of integerText) {
    const digit = DIGITS.indexOf(character);

    if (digit < 0 || digit >= base) {
      throw new Error(
        `Digit "${character}" is invalid in Base ${base}.`
      );
    }

    integer = integer * BigInt(base) + BigInt(digit);
  }

  let numerator = 0n;
  let denominator = 1n;

  for (const character of fractionText) {
    const digit = DIGITS.indexOf(character);

    if (digit < 0 || digit >= base) {
      throw new Error(
        `Digit "${character}" is invalid in Base ${base}.`
      );
    }

    numerator = numerator * BigInt(base) + BigInt(digit);
    denominator *= BigInt(base);
  }

  const total = integer * denominator + numerator;

  return makeFraction(
    negative ? -total : total,
    denominator
  );
}

// =====================================================
// FORMAT NUMBER AND DETECT REPEATING REMAINDERS
// =====================================================

function formatNumber(value, base) {
  const negative = value.n < 0n;
  const numerator = absolute(value.n);
  const denominator = value.d;
  const radix = BigInt(base);

  const whole = numerator / denominator;
  let remainder = numerator % denominator;

  const wholeText = whole.toString(base).toUpperCase();
  const sign = negative ? "-" : "";

  if (remainder === 0n) {
    return {
      text: sign + wholeText,
      wholeText,
      fractionText: "",
      repeating: false,
      truncated: false,
      repeatStart: -1,
      repeatStep: -1,
      repeatedRemainder: null,
      digits: [],
      rows: []
    };
  }

  const seen = new Map();
  const digits = [];
  const rows = [];

  let repeatStart = -1;
  let repeatStep = -1;
  let repeatedRemainder = null;

  seen.set(remainder.toString(), 0);

  while (
    remainder !== 0n &&
    digits.length < MAX_FRACTION_DIGITS
  ) {
    const before = remainder;
    const product = before * radix;
    const digit = product / denominator;
    const nextRemainder = product % denominator;
    const character = DIGITS[Number(digit)];
    const currentStep = digits.length + 1;

    digits.push(character);

    const key = nextRemainder.toString();

    const repeated =
      nextRemainder !== 0n &&
      seen.has(key);

    let firstSeenStep = -1;

    if (repeated) {
      firstSeenStep = seen.get(key);
      repeatStart = firstSeenStep;
      repeatStep = currentStep;
      repeatedRemainder = nextRemainder;
    }

    if (rows.length < MAX_TABLE_ROWS) {
      rows.push({
        step: currentStep,
        before,
        product,
        digit: character,
        remainder: nextRemainder,
        denominator,
        repeated,
        firstSeenStep
      });
    }

    remainder = nextRemainder;

    if (repeated) break;

    if (remainder !== 0n) {
      seen.set(key, currentStep);
    }
  }

  const truncated =
    remainder !== 0n && repeatStart === -1;

  let fractionText = digits.join("");

  if (repeatStart >= 0) {
    const prefix = fractionText.slice(0, repeatStart);
    const cycle = fractionText.slice(repeatStart);

    fractionText = `${prefix}(${cycle})`;
  } else if (truncated) {
    fractionText += "…";
  }

  return {
    text: `${sign}${wholeText}.${fractionText}`,
    wholeText,
    fractionText,
    repeating: repeatStart >= 0,
    truncated,
    repeatStart,
    repeatStep,
    repeatedRemainder,
    digits,
    rows
  };
}

function decimalDescription(value) {
  return formatNumber(value, 10).text;
}

function fractionDescription(value) {
  return value.d === 1n
    ? value.n.toString()
    : `${value.n}/${value.d}`;
}

 // =====================================================
 // SOLUTION BLOCKS
 // =====================================================

function textBlock(title, description, lines) {
  return {
    type: "text",
    title,
    description,
    lines
  };
}

function tableBlock(
  title,
  description,
  headers,
  rows,
  note = "",
  highlightedRow = -1,
  highlightedColumn = -1
) {
  return {
    type: "table",
    title,
    description,
    headers,
    rows,
    note,
    highlightedRow,
    highlightedColumn
  };
}

function finalBlock(title, description, answer) {
  return {
    type: "final",
    title,
    description,
    answer
  };
}

function paperBlock(title, description, sections, answer) {
  return {
    type: "paper",
    title,
    description,
    sections,
    answer
  };
}

// =====================================================
// POSITIONAL-VALUE CONVERSION
// =====================================================

function positionalSteps(input, base, title) {
  const text = input.trim().toUpperCase();
  const negative = text.startsWith("-");
  const unsigned = negative ? text.slice(1) : text;
  const [integerText = "", fractionalText = ""] =
    unsigned.split(".");

  const rows = [];

  for (let i = 0; i < integerText.length; i++) {
    const character = integerText[i];
    const digit = DIGITS.indexOf(character);
    const power = integerText.length - i - 1;
    const place = BigInt(base) ** BigInt(power);

    rows.push([
      character,
      `${base}^${power}`,
      `${digit} × ${place}`,
      (BigInt(digit) * place).toString()
    ]);
  }

  for (let i = 0; i < fractionalText.length; i++) {
    const character = fractionalText[i];
    const digit = BigInt(DIGITS.indexOf(character));
    const denominator = BigInt(base) ** BigInt(i + 1);

    rows.push([
      character,
      `${base}^(-${i + 1})`,
      `${digit} × ${base}^(-${i + 1})`,
      decimalDescription(makeFraction(digit, denominator))
    ]);
  }

  const value = parseNumber(input, base);

  return tableBlock(
    title,
    `Expand each digit using its positional value in Base ${base}.`,
    [
      "Digit",
      "Place Value",
      "Calculation",
      "Decimal Contribution"
    ],
    rows,
    `${negative ? "Apply the negative sign. " : ""}` +
    `Exact decimal value: ${decimalDescription(value)}`
  );
}

// =====================================================
// INTEGER CONVERSION
// =====================================================

function integerConversionSteps(value, base) {
  let whole = absolute(value.n) / value.d;

  if (whole === 0n) {
    return textBlock(
      "Whole-Number Conversion",
      "The integer portion is zero.",
      ["Whole-number result = 0"]
    );
  }

  const rows = [];
  const remainders = [];
  const radix = BigInt(base);

  while (whole > 0n) {
    const quotient = whole / radix;
    const remainder = whole % radix;
    const digit = DIGITS[Number(remainder)];

    if (rows.length < MAX_TABLE_ROWS) {
      rows.push([
        whole.toString(),
        base.toString(),
        quotient.toString(),
        digit
      ]);
    }

    remainders.push(digit);
    whole = quotient;
  }

  return tableBlock(
    "Whole-Number Conversion",
    `Repeatedly divide the integer portion by ${base}. Read the remainders from bottom to top.`,
    [
      "Dividend",
      "Divisor",
      "Quotient",
      "Remainder"
    ],
    rows,
    `Read upward: ${remainders.reverse().join("")}`
  );
}

 // =====================================================
 // FRACTIONAL CONVERSION STEPS
 // =====================================================

function fractionalConversionSteps(value, base, formatted) {
  const numerator = absolute(value.n);
  const denominator = value.d;

  let remainder = numerator % denominator;

  if (remainder === 0n) {
    return textBlock(
      "Fractional Conversion",
      "The number has no fractional portion.",
      ["No fractional conversion is needed."]
    );
  }

  const rows = [];
  const radix = BigInt(base);
  const seen = new Map();
  const digits = [];

  let repeatStart = -1;
  let truncated = false;

  while (remainder !== 0n) {
    const key = remainder.toString();

    if (seen.has(key)) {
      repeatStart = seen.get(key);
      break;
    }

    if (digits.length >= MAX_FRACTION_DIGITS) {
      truncated = true;
      break;
    }

    seen.set(key, digits.length);

    const before = remainder;
    const product = before * radix;
    const digit = product / denominator;

    remainder = product % denominator;

    const digitText = DIGITS[Number(digit)];
    digits.push(digitText);

    if (rows.length < MAX_TABLE_ROWS) {
      rows.push([
        digits.length.toString(),
        `${before}/${denominator}`,
        `${before} × ${base} / ${denominator}`,
        digitText,
        `${remainder}/${denominator}`
      ]);
    }
  }

  let explanation = "";

  if (repeatStart >= 0) {
    const prefix = digits.slice(0, repeatStart).join("");
    const repeating = digits.slice(repeatStart).join("");

    explanation =
      `The remainder repeats, so the digits repeat. ` +
      `Fractional result: .${prefix}(${repeating})`;
  } else if (truncated) {
    explanation =
      `The fractional expansion exceeds ${MAX_FRACTION_DIGITS} digits. ` +
      "The displayed digits are truncated.";
  } else {
    explanation =
      `The remainder becomes zero. ` +
      `Fractional result: .${digits.join("")}`;
  }

  return tableBlock(
    "Fractional Conversion",
    `Multiply the fractional remainder by ${base}, ` +
      "record the integer digit, and continue with the new remainder.",
    [
      "Step",
      "Fraction",
      "Multiplication",
      "Digit",
      "New Remainder"
    ],
    rows,
    explanation
  );
}

// =====================================================
// BUILD COMPLETE CONVERSION SOLUTION
// =====================================================

function buildConversionSolution(input, fromBase, toBase) {
  const value = parseNumber(input, fromBase);
  const formatted = formatNumber(value, toBase);

  const steps = [];

  steps.push(
    textBlock(
      "Identify the Given Number",
      "Start with the original number and its source base.",
      [
        `Given number: ${input.toUpperCase()}`,
        `Source base: ${fromBase}`,
        `Target base: ${toBase}`
      ]
    )
  );

  steps.push(
    positionalSteps(
      input,
      fromBase,
      "Convert the Original Number to Decimal"
    )
  );

  steps.push(
    textBlock(
      "Identify the Exact Decimal Value",
      "Keep the value as an exact fraction to avoid rounding errors.",
      [
        `Exact fraction: ${fractionDescription(value)}`,
        `Decimal representation: ${decimalDescription(value)}`
      ]
    )
  );

  steps.push(integerConversionSteps(value, toBase));

  steps.push(
    fractionalConversionSteps(value, toBase, formatted)
  );

  steps.push(
    finalBlock(
      "Final Conversion Result",
      `The original number in Base ${fromBase} ` +
        `is represented in Base ${toBase} as:`,
      formatted.text
    )
  );

  return {
    value,
    formatted,
    steps
  };
}

// =====================================================
// EXACT CALCULATOR RESULT
// =====================================================

function calculateExactResult(first, second, operator) {
  switch (operator) {
    case "+":
      return add(first, second);

    case "-":
      return subtract(first, second);

    case "*":
      return multiply(first, second);

    case "/":
      return divide(first, second);

    default:
      throw new Error("Invalid mathematical operation.");
  }
}

// =====================================================
// OPERATION SYMBOL
// =====================================================

function operationSymbol(operator) {
  switch (operator) {
    case "+":
      return "+";

    case "-":
      return "−";

    case "*":
      return "×";

    case "/":
      return "÷";

    default:
      return operator;
  }
}

 // =====================================================
 // CALCULATOR — EXACT FRACTION EXPLANATIONS
 // =====================================================

function fractionArithmeticSteps(first, second, operator, result) {
  const symbol = operationSymbol(operator);
  const lines = [];

  lines.push(
    `First value: ${fractionDescription(first)}`
  );

  lines.push(
    `Second value: ${fractionDescription(second)}`
  );

  switch (operator) {
    case "+": {
      const left = first.n * second.d;
      const right = second.n * first.d;
      const denominator = first.d * second.d;

      lines.push(
        "For addition, use a common denominator."
      );

      lines.push(
        `(${first.n} × ${second.d}) + ` +
        `(${second.n} × ${first.d})`
      );

      lines.push(
        `= (${left} + ${right}) / ${denominator}`
      );

      break;
    }

    case "-": {
      const left = first.n * second.d;
      const right = second.n * first.d;
      const denominator = first.d * second.d;

      lines.push(
        "For subtraction, use a common denominator."
      );

      lines.push(
        `(${first.n} × ${second.d}) − ` +
        `(${second.n} × ${first.d})`
      );

      lines.push(
        `= (${left} − ${right}) / ${denominator}`
      );

      break;
    }

    case "*": {
      lines.push(
        "Multiply the numerators and denominators."
      );

      lines.push(
        `(${first.n} × ${second.n}) / ` +
        `(${first.d} × ${second.d})`
      );

      break;
    }

    case "/": {
      lines.push(
        "Multiply the first fraction by the reciprocal of the second."
      );

      lines.push(
        `(${first.n} × ${second.d}) / ` +
        `(${first.d} × ${second.n})`
      );

      break;
    }
  }

  lines.push(
    `Exact result: ${fractionDescription(result)}`
  );

  lines.push(
    `Decimal representation: ${decimalDescription(result)}`
  );

  return textBlock(
    `Perform ${operationName(operator)}`,
    `Apply the ${symbol} operation using exact fraction arithmetic.`,
    lines
  );
}

// =====================================================
// OPERATION NAMES
// =====================================================

function operationName(operator) {
  switch (operator) {
    case "+":
      return "Addition";

    case "-":
      return "Subtraction";

    case "*":
      return "Multiplication";

    case "/":
      return "Division";

    default:
      return "Calculation";
  }
}

// =====================================================
// CALCULATOR — BUILD COMPLETE SOLUTION
// =====================================================

function buildCalculatorSolution(
  firstInput,
  firstBase,
  secondInput,
  secondBase,
  operator,
  resultBase
) {
  const first = parseNumber(firstInput, firstBase);
  const second = parseNumber(secondInput, secondBase);

  const result = calculateExactResult(
    first,
    second,
    operator
  );

  const formatted = formatNumber(result, resultBase);
  const symbol = operationSymbol(operator);

  const steps = [];

  steps.push(
    textBlock(
      "Identify the Given Values",
      "Read both numbers and their respective bases.",
      [
        `First number: ${firstInput.toUpperCase()} (Base ${firstBase})`,
        `Second number: ${secondInput.toUpperCase()} (Base ${secondBase})`,
        `Operation: ${operationName(operator)} (${symbol})`,
        `Requested result base: ${resultBase}`
      ]
    )
  );

  steps.push(
    positionalSteps(
      firstInput,
      firstBase,
      "Convert the First Number to Decimal"
    )
  );

  steps.push(
    positionalSteps(
      secondInput,
      secondBase,
      "Convert the Second Number to Decimal"
    )
  );

  steps.push(
    fractionArithmeticSteps(
      first,
      second,
      operator,
      result
    )
  );

  steps.push(
    integerConversionSteps(
      result,
      resultBase
    )
  );

  steps.push(
    fractionalConversionSteps(
      result,
      resultBase,
      formatted
    )
  );

  steps.push(
    finalBlock(
      "Final Calculation Result",
      `${firstInput.toUpperCase()} (Base ${firstBase}) ` +
        `${symbol} ${secondInput.toUpperCase()} (Base ${secondBase}) ` +
        `produces the following result in Base ${resultBase}:`,
      formatted.text
    )
  );

  return {
    first,
    second,
    result,
    formatted,
    steps
  };
}

// =====================================================
// FORMAT REPEATING FRACTION INFORMATION
// =====================================================

function fractionResultNote(formatted, base) {
  if (formatted.repeating) {
    return (
      `The digits inside parentheses repeat indefinitely ` +
      `in Base ${base}.`
    );
  }

  if (formatted.truncated) {
    return (
      `The fractional expansion is longer than ` +
      `${MAX_FRACTION_DIGITS} digits. ` +
      `The displayed representation is truncated.`
    );
  }

  if (formatted.fractionText) {
    return `Exact fractional representation in Base ${base}.`;
  }

  return `Exact whole-number representation in Base ${base}.`;
}

 // =====================================================
 // BASELAB — DISPLAY RESULTS AND HANDLE BUTTONS
 // =====================================================

function showError(message) {
  const error = $("errorMessage");

  if (!error) return;

  error.textContent = message;
  error.hidden = false;

  $("resultSection").hidden = true;
  $("solutionSection").hidden = true;

  stopSolutionPlayback();
}

function clearError() {
  const error = $("errorMessage");

  if (!error) return;

  error.textContent = "";
  error.hidden = true;
}

function stopSolutionPlayback() {
  if (solutionTimer !== null) {
    clearInterval(solutionTimer);
    solutionTimer = null;
  }
}

function hideResults() {
  clearError();
  stopSolutionPlayback();

  $("resultSection").hidden = true;
  $("solutionSection").hidden = true;

  currentResult = "";
  currentSolution = [];
  solutionIndex = 0;
}

function showResult(formatted, base, steps) {
  clearError();
  stopSolutionPlayback();

  currentResult = formatted.text;
  currentSolution = steps;
  solutionIndex = 0;

  $("resultNumber").textContent = formatted.text;
  $("resultNote").textContent =
    fractionResultNote(formatted, base);

  $("resultSection").hidden = false;
  $("solutionSection").hidden = true;

  const solutionButton = $("solutionBtn");

  if (solutionButton) {
    solutionButton.textContent = "Show Step-by-Step Solution";
  }
}

// =====================================================
// CONVERTER BUTTON
// =====================================================

function convertNumber() {
  try {
    const input = $("convertNumber").value.trim();
    const fromBase = Number($("fromBase").value);
    const toBase = Number($("toBase").value);

    if (!input) {
      throw new Error("Please enter a number to convert.");
    }

    const conversion = buildConversionSolution(
      input,
      fromBase,
      toBase
    );

    lastConversion = conversion;

    showResult(
      conversion.formatted,
      toBase,
      conversion.steps
    );
  } catch (error) {
    showError(error.message);
  }
}

// =====================================================
// CALCULATOR BUTTON
// =====================================================

function calculateNumber() {
  try {
    const firstInput = $("firstNumber").value.trim();
    const secondInput = $("secondNumber").value.trim();

    const firstBase = Number($("firstBase").value);
    const secondBase = Number($("secondBase").value);

    const operator = $("operator").value;
    const resultBase = Number($("resultBase").value);

    if (!firstInput || !secondInput) {
      throw new Error(
        "Please enter both numbers before calculating."
      );
    }

    const calculation = buildCalculatorSolution(
      firstInput,
      firstBase,
      secondInput,
      secondBase,
      operator,
      resultBase
    );

    showResult(
      calculation.formatted,
      resultBase,
      calculation.steps
    );
  } catch (error) {
    showError(error.message);
  }
}

// =====================================================
// SWAP BASES
// =====================================================

function swapBases() {
  const fromBase = $("fromBase");
  const toBase = $("toBase");

  const previousFrom = fromBase.value;

  fromBase.value = toBase.value;
  toBase.value = previousFrom;

  hideResults();
}

// =====================================================
// RESET CONVERTER
// =====================================================

function resetConverter() {
  $("convertNumber").value = "";
  $("fromBase").value = "10";
  $("toBase").value = "2";

  lastConversion = null;

  hideResults();
}

// =====================================================
// RESET CALCULATOR
// =====================================================

function resetCalculator() {
  $("firstNumber").value = "";
  $("secondNumber").value = "";

  $("firstBase").value = "10";
  $("secondBase").value = "10";

  $("operator").value = "+";
  $("resultBase").value = "10";

  hideResults();
}

// =====================================================
// COPY RESULT
// =====================================================

async function copyResult() {
  if (!currentResult) return;

  try {
    await navigator.clipboard.writeText(currentResult);

    const button = $("copyBtn");

    button.textContent = "Copied!";

    setTimeout(() => {
      button.textContent = "Copy";
    }, 1800);
  } catch (error) {
    showError(
      "Unable to copy automatically. Please select and copy the result manually."
    );
  }
}

// =====================================================
// POPULATE BASE SELECTORS
// =====================================================

function populateBaseSelectors() {
  const selectors = [
    "fromBase",
    "toBase",
    "firstBase",
    "secondBase",
    "resultBase"
  ];

  selectors.forEach(id => {
    const select = $(id);

    if (!select) return;

    select.innerHTML = "";

    for (let base = 2; base <= 36; base++) {
      const option = document.createElement("option");

      option.value = String(base);

      const name = BASE_NAMES[base];

      option.textContent = name
        ? `Base ${base} — ${name}`
        : `Base ${base}`;

      select.appendChild(option);
    }
  });

  $("fromBase").value = "10";
  $("toBase").value = "2";

  $("firstBase").value = "10";
  $("secondBase").value = "10";
  $("resultBase").value = "10";
}

// =====================================================
// CONVERTER AND CALCULATOR EVENT LISTENERS
// =====================================================

function initializeCalculatorControls() {
  $("convertBtn").addEventListener(
    "click",
    convertNumber
  );

  $("calculateBtn").addEventListener(
    "click",
    calculateNumber
  );

  $("swapBtn").addEventListener(
    "click",
    swapBases
  );

  $("resetConvertBtn").addEventListener(
    "click",
    resetConverter
  );

  $("resetCalcBtn").addEventListener(
    "click",
    resetCalculator
  );

  $("copyBtn").addEventListener(
    "click",
    copyResult
  );

  // Press Enter to calculate or convert.
  $("convertNumber").addEventListener(
    "keydown",
    event => {
      if (event.key === "Enter") {
        convertNumber();
      }
    }
  );

  ["firstNumber", "secondNumber"].forEach(id => {
    $(id).addEventListener("keydown", event => {
      if (event.key === "Enter") {
        calculateNumber();
      }
    });
  });
}

 // =====================================================
 // BASELAB — INTERACTIVE STEP-BY-STEP SOLUTIONS
 // =====================================================

function createSolutionLine(text) {
  const line = document.createElement("p");
  line.textContent = String(text);
  return line;
}

function renderSolutionStep() {
  const container = $("solutionSteps");

  if (!container || currentSolution.length === 0) {
    return;
  }

  const step = currentSolution[solutionIndex];

  container.innerHTML = "";

  const heading = document.createElement("h3");
  heading.textContent = step.title || "Solution Step";
  container.appendChild(heading);

  if (step.description) {
    const description = document.createElement("p");
    description.textContent = step.description;
    container.appendChild(description);
  }

  if (step.type === "text") {
    const lines = document.createElement("div");
    lines.className = "solution-lines";

    (step.lines || []).forEach(text => {
      lines.appendChild(createSolutionLine(text));
    });

    container.appendChild(lines);
  }

  if (step.type === "table") {
    const tableWrapper = document.createElement("div");
    tableWrapper.className = "solution-table-wrapper";

    const table = document.createElement("table");
    table.className = "solution-table";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    (step.headers || []).forEach(headerText => {
      const th = document.createElement("th");
      th.textContent = String(headerText);
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    (step.rows || []).forEach((row, rowIndex) => {
      const tr = document.createElement("tr");

      row.forEach((value, columnIndex) => {
        const td = document.createElement("td");
        td.textContent = String(value);

        if (
          rowIndex === step.highlightedRow ||
          columnIndex === step.highlightedColumn
        ) {
          td.classList.add("highlighted-cell");
        }

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);

    if (step.note) {
      const note = document.createElement("p");
      note.className = "solution-note";
      note.textContent = step.note;
      container.appendChild(note);
    }
  }

  if (step.type === "final") {
    const answer = document.createElement("div");
    answer.className = "solution-final-answer";
    answer.textContent = String(step.answer);
    container.appendChild(answer);
  }

  if (step.type === "paper") {
    (step.sections || []).forEach(section => {
      const sectionElement = document.createElement("div");
      sectionElement.className = "paper-section";

      if (section.title) {
        const sectionTitle = document.createElement("h4");
        sectionTitle.textContent = section.title;
        sectionElement.appendChild(sectionTitle);
      }

      (section.lines || []).forEach(line => {
        sectionElement.appendChild(createSolutionLine(line));
      });

      container.appendChild(sectionElement);
    });

    if (step.answer !== undefined) {
      const answer = document.createElement("div");
      answer.className = "solution-final-answer";
      answer.textContent = String(step.answer);
      container.appendChild(answer);
    }
  }

  const total = currentSolution.length;
  const current = solutionIndex + 1;
  const percentage = Math.round((current / total) * 100);

  $("solutionCounter").textContent =
    `Step ${current} of ${total}`;

  $("solutionPercent").textContent =
    `${percentage}%`;

  $("solutionProgressFill").style.width =
    `${percentage}%`;

  $("previousStepBtn").disabled =
    solutionIndex === 0;

  $("nextStepBtn").disabled =
    solutionIndex >= total - 1;
}

// =====================================================
// SHOW / HIDE SOLUTION
// =====================================================

function toggleSolution() {
  const section = $("solutionSection");
  const button = $("solutionBtn");

  if (!currentSolution.length) return;

  if (!section.hidden) {
    section.hidden = true;
    button.textContent = "Show Step-by-Step Solution";
    stopSolutionPlayback();
    return;
  }

  section.hidden = false;
  button.textContent = "Hide Step-by-Step Solution";

  solutionIndex = 0;
  renderSolutionStep();

  section.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

// =====================================================
// SOLUTION NAVIGATION
// =====================================================

function nextSolutionStep() {
  if (solutionIndex < currentSolution.length - 1) {
    solutionIndex++;
    renderSolutionStep();
  } else {
    stopSolutionPlayback();
    updatePlayButton();
  }
}

function previousSolutionStep() {
  stopSolutionPlayback();
  updatePlayButton();

  if (solutionIndex > 0) {
    solutionIndex--;
    renderSolutionStep();
  }
}

function restartSolution() {
  stopSolutionPlayback();
  updatePlayButton();

  solutionIndex = 0;
  renderSolutionStep();
}

function updatePlayButton() {
  const button = $("playStepBtn");

  if (!button) return;

  button.textContent =
    solutionTimer === null ? "▶ Play All" : "Ⅱ Pause";
}

// =====================================================
// AUTO-PLAY SOLUTION STEPS
// =====================================================

function toggleSolutionPlayback() {
  if (!currentSolution.length) return;

  if (solutionTimer !== null) {
    stopSolutionPlayback();
    updatePlayButton();
    return;
  }

  if (solutionIndex >= currentSolution.length - 1) {
    solutionIndex = 0;
    renderSolutionStep();
  }

  solutionTimer = setInterval(() => {
    if (solutionIndex >= currentSolution.length - 1) {
      stopSolutionPlayback();
      updatePlayButton();
      return;
    }

    solutionIndex++;
    renderSolutionStep();

    if (solutionIndex >= currentSolution.length - 1) {
      stopSolutionPlayback();
      updatePlayButton();
    }
  }, 1800);

  updatePlayButton();
}

// =====================================================
// DESKTOP AND MOBILE WORKSPACE TABS
// =====================================================

function initializeWorkspaceTabs() {
  document.querySelectorAll(".tab").forEach(button => {
    button.addEventListener("click", () => {
      const target = button.dataset.tab;
      const targetSection = $(target);

      if (!targetSection) return;

      document.querySelectorAll(".tab").forEach(tab => {
        tab.classList.remove("active");
        tab.setAttribute("aria-selected", "false");
      });

      document.querySelectorAll(".tab-content").forEach(section => {
        section.classList.remove("active");
      });

      button.classList.add("active");
      button.setAttribute("aria-selected", "true");

      targetSection.classList.add("active");

      hideResults();

      if (window.innerWidth <= 760) {
        targetSection.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    });
  });
}

// =====================================================
// MOBILE HAMBURGER NAVIGATION
// =====================================================

function initializeMobileNavigation() {
  const toggle = $("mobileMenuToggle");

  const menu =
    $("mobileNavigation") ||
    $("mobileMenuContent");

  if (!toggle || !menu) return;

  function closeMenu() {
    menu.classList.remove("is-open");

    toggle.setAttribute(
      "aria-expanded",
      "false"
    );

    toggle.setAttribute(
      "aria-label",
      "Open navigation menu"
    );
  }

  toggle.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("is-open");

    toggle.setAttribute(
      "aria-expanded",
      String(isOpen)
    );

    toggle.setAttribute(
      "aria-label",
      isOpen
        ? "Close navigation menu"
        : "Open navigation menu"
    );
  });

  menu.querySelectorAll(".tab").forEach(button => {
    button.addEventListener("click", () => {
      if (window.innerWidth <= 760) {
        closeMenu();
      }
    });
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  document.addEventListener("click", event => {
    if (
      window.innerWidth <= 760 &&
      !menu.contains(event.target) &&
      !toggle.contains(event.target)
    ) {
      closeMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 760) {
      closeMenu();
    }
  });
}

// =====================================================
// INITIALIZE ALL BASELAB FEATURES
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  populateBaseSelectors();

  initializeCalculatorControls();

  initializeWorkspaceTabs();

  initializeMobileNavigation();

  $("solutionBtn").addEventListener(
    "click",
    toggleSolution
  );

  $("nextStepBtn").addEventListener(
    "click",
    () => {
      stopSolutionPlayback();
      updatePlayButton();
      nextSolutionStep();
    }
  );

  $("previousStepBtn").addEventListener(
    "click",
    previousSolutionStep
  );

  $("playStepBtn").addEventListener(
    "click",
    toggleSolutionPlayback
  );

  $("resetStepBtn").addEventListener(
    "click",
    restartSolution
  );
});
