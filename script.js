
"use strict";

// =====================================================
// BASELAB — COMPLETE JAVASCRIPT
// Number Base Converter + Calculator + Learning Mode
// =====================================================

const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MAX_FRACTION_DIGITS = 500;
const MAX_TABLE_ROWS = 100;
const $ = id => document.getElementById(id);

const BASE_NAMES = {
  2: "Binary",
  8: "Octal",
  10: "Decimal",
  16: "Hexadecimal"
};

let currentResult = "";
let currentSolution = [];
let solutionIndex = 0;
let solutionTimer = null;

// =====================================================
// EXACT ARITHMETIC
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
// PARSE NUMBER FROM BASE 2–36
// =====================================================

function parseNumber(input, base) {
  const text = String(input).trim().toUpperCase();

  if (!Number.isInteger(base) || base < 2 || base > 36) {
    throw new Error("Base must be between 2 and 36.");
  }

  if (
    !/^[+-]?(?:[0-9A-Z]+(?:\.[0-9A-Z]*)?|\.[0-9A-Z]+)$/.test(text)
  ) {
    throw new Error("Enter a valid number.");
  }

  const negative = text.startsWith("-");
  const unsigned = /^[+-]/.test(text)
    ? text.slice(1)
    : text;

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

    integer =
      integer * BigInt(base) + BigInt(digit);
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

    numerator =
      numerator * BigInt(base) + BigInt(digit);

    denominator *= BigInt(base);
  }

  const total =
    integer * denominator + numerator;

  return makeFraction(
    negative ? -total : total,
    denominator
  );
}

// =====================================================
// FORMAT EXACT NUMBER
// Parentheses indicate repeating digits.
// Example: 0.(3)
// =====================================================

function formatNumber(value, base) {
  const negative = value.n < 0n;
  const numerator = absolute(value.n);
  const denominator = value.d;
  const radix = BigInt(base);

  const whole = numerator / denominator;
  let remainder = numerator % denominator;

  const wholeText =
    whole.toString(base).toUpperCase();

  const sign = negative ? "-" : "";

  if (remainder === 0n) {
    return {
      text: sign + wholeText,
      wholeText,
      fractionText: "",
      repeating: false,
      truncated: false,
      digits: []
    };
  }

  const seen = new Map();
  const digits = [];
  let repeatStart = -1;

  while (
    remainder !== 0n &&
    digits.length < MAX_FRACTION_DIGITS
  ) {
    const key = remainder.toString();

    if (seen.has(key)) {
      repeatStart = seen.get(key);
      break;
    }

    seen.set(key, digits.length);

    const product = remainder * radix;
    const digit = product / denominator;

    remainder = product % denominator;

    digits.push(DIGITS[Number(digit)]);
  }

  const truncated =
    remainder !== 0n && repeatStart === -1;

  let fractionText = digits.join("");

  if (repeatStart >= 0) {
    fractionText =
      fractionText.slice(0, repeatStart) +
      "(" +
      fractionText.slice(repeatStart) +
      ")";
  } else if (truncated) {
    fractionText += "…";
  }

  return {
    text: `${sign}${wholeText}.${fractionText}`,
    wholeText,
    fractionText,
    repeating: repeatStart >= 0,
    truncated,
    digits
  };
}

function decimalDescription(value) {
  return formatNumber(value, 10).text;
}

// =====================================================
// SOLUTION BLOCK HELPERS
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
  note = ""
) {
  return {
    type: "table",
    title,
    description,
    headers,
    rows,
    note
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

function paperBlock(
  title,
  description,
  lines,
  note = ""
) {
  return {
    type: "paper",
    title,
    description,
    lines,
    note
  };
}

// =====================================================
// POSITIONAL CONVERSION
// Used only when source base is NOT decimal.
// =====================================================

function positionalSteps(input, base, title) {
  const text = input.trim().toUpperCase();
  const negative = text.startsWith("-");
  const unsigned = /^[+-]/.test(text)
    ? text.slice(1)
    : text;

  const [integerText = "", fractionText = ""] =
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

  for (let i = 0; i < fractionText.length; i++) {
    const character = fractionText[i];
    const digit = BigInt(DIGITS.indexOf(character));
    const denominator =
      BigInt(base) ** BigInt(i + 1);

    rows.push([
      character,
      `${base}^(-${i + 1})`,
      `${digit} × ${base}^(-${i + 1})`,
      decimalDescription(
        makeFraction(digit, denominator)
      )
    ]);
  }

  return tableBlock(
    title,
    `Expand the digits using powers of ${base}.`,
    [
      "Digit",
      "Place Value",
      "Calculation",
      "Decimal Value"
    ],
    rows,
    `${negative ? "Apply the negative sign. " : ""}` +
    `Decimal result: ${
      decimalDescription(parseNumber(input, base))
    }`
  );
}

// =====================================================
// CONVERT INTEGER PORTION
// =====================================================

function integerConversionSteps(value, base) {
  let whole = absolute(value.n) / value.d;

  if (whole === 0n) {
    return textBlock(
      "Convert the Whole-Number Portion",
      "The integer portion is zero.",
      ["Whole-number result: 0"]
    );
  }

  const rows = [];
  const digits = [];
  const radix = BigInt(base);

  while (whole > 0n) {
    const quotient = whole / radix;
    const remainder = whole % radix;

    const digit = DIGITS[Number(remainder)];

    if (rows.length < MAX_TABLE_ROWS) {
      rows.push([
        whole.toString(),
        String(base),
        quotient.toString(),
        digit
      ]);
    }

    digits.push(digit);
    whole = quotient;
  }

  return tableBlock(
    "Convert the Whole-Number Portion",
    `Divide repeatedly by ${base}. Read the remainders from bottom to top.`,
    [
      "Dividend",
      "Divisor",
      "Quotient",
      "Remainder"
    ],
    rows,
    `Whole-number result: ${digits.reverse().join("")}`
  );
}

// =====================================================
// CONVERT FRACTIONAL PORTION
// Decimal values shown instead of fraction notation.
// =====================================================

function fractionalConversionSteps(value, base) {
  const numerator = absolute(value.n);
  const denominator = value.d;

  let remainder = numerator % denominator;

  if (remainder === 0n) {
    return textBlock(
      "Convert the Fractional Portion",
      "There is no fractional portion.",
      ["No additional conversion is needed."]
    );
  }

  const rows = [];
  const seen = new Map();
  const digits = [];
  const radix = BigInt(base);

  let repeatStart = -1;

  while (
    remainder !== 0n &&
    digits.length < MAX_FRACTION_DIGITS
  ) {
    const key = remainder.toString();

    if (seen.has(key)) {
      repeatStart = seen.get(key);
      break;
    }

    seen.set(key, digits.length);

    const before = makeFraction(
      remainder,
      denominator
    );

    const product = remainder * radix;
    const digit = product / denominator;

    remainder = product % denominator;

    const digitText = DIGITS[Number(digit)];
    digits.push(digitText);

    if (rows.length < MAX_TABLE_ROWS) {
      rows.push([
        String(digits.length),
        decimalDescription(before),
        `${decimalDescription(before)} × ${base}`,
        digitText,
        decimalDescription(
          makeFraction(remainder, denominator)
        )
      ]);
    }
  }

  const formatted = formatNumber(value, base);

  let note =
    `Fractional digits: ${formatted.fractionText}`;

  if (repeatStart >= 0) {
    note += " Parentheses indicate repeating digits.";
  }

  if (formatted.truncated) {
    note += " The expansion was truncated.";
  }

  return tableBlock(
    "Convert the Fractional Portion",
    `Multiply the fractional remainder by ${base} and record each whole-number digit.`,
    [
      "Step",
      "Fractional Value",
      "Multiply",
      "Digit",
      "New Fraction"
    ],
    rows,
    note
  );
}

// =====================================================
// CONVERTER SOLUTION
// =====================================================

function buildConversionSolution(
  input,
  fromBase,
  toBase
) {
  const value = parseNumber(input, fromBase);
  const formatted = formatNumber(value, toBase);
  const steps = [];

  steps.push(
    textBlock(
      "Identify the Given Number",
      "Read the original number and the requested base.",
      [
        `Given number: ${input.toUpperCase()}`,
        `Source base: ${fromBase}`,
        `Target base: ${toBase}`
      ]
    )
  );

  if (fromBase === toBase) {
    steps.push(
      textBlock(
        "No Base Conversion Needed",
        "The source and target bases are identical.",
        [
          `Original value: ${input.toUpperCase()}`,
          `Result: ${formatted.text}`
        ]
      )
    );
  } else {
    if (fromBase !== 10) {
      steps.push(
        positionalSteps(
          input,
          fromBase,
          "Convert the Original Number to Decimal"
        )
      );
    } else {
      steps.push(
        textBlock(
          "Decimal Value Identified",
          "The original number is already in decimal form.",
          [
            `Decimal value: ${decimalDescription(value)}`
          ]
        )
      );
    }

    if (toBase !== 10) {
      steps.push(integerConversionSteps(value, toBase));

      if (absolute(value.n) % value.d !== 0n) {
        steps.push(
          fractionalConversionSteps(value, toBase)
        );
      }
    }
  }

  steps.push(
    finalBlock(
      "Final Conversion Result",
      `The number expressed in Base ${toBase} is:`,
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
// CALCULATOR OPERATIONS
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
      throw new Error("Invalid operation.");
  }
}

function operationSymbol(operator) {
  return {
    "+": "+",
    "-": "−",
    "*": "×",
    "/": "÷"
  }[operator] || operator;
}

function operationName(operator) {
  return {
    "+": "Addition",
    "-": "Subtraction",
    "*": "Multiplication",
    "/": "Division"
  }[operator] || "Calculation";
}

// =====================================================
// DECIMAL ALIGNMENT HELPERS
// =====================================================

function decimalPlaces(text) {
  const clean = text.replace(/^\+/, "");
  const dot = clean.indexOf(".");

  if (dot < 0) return 0;

  return clean.length - dot - 1;
}

function padDecimal(text, places) {
  if (text.includes("(") || text.includes("…")) {
    return text;
  }

  const current = decimalPlaces(text);

  if (places === 0) {
    return text;
  }

  if (!text.includes(".")) {
    return text + "." + "0".repeat(places);
  }

  return text + "0".repeat(
    Math.max(0, places - current)
  );
}

// =====================================================
// WRITTEN ARITHMETIC
// Horizontal line under the operation.
// =====================================================

function buildWrittenArithmetic(
  first,
  second,
  operator,
  result
) {
  const firstText = decimalDescription(first);
  const secondText = decimalDescription(second);
  const resultText = decimalDescription(result);

  const symbol = operationSymbol(operator);

  // Addition and subtraction:
  // align the decimal points.
  if (operator === "+" || operator === "-") {
    const finite =
      !/[()…]/.test(
        firstText + secondText + resultText
      );

    const places = finite
      ? Math.max(
          decimalPlaces(firstText),
          decimalPlaces(secondText),
          decimalPlaces(resultText)
        )
      : 0;

    const left = finite
      ? padDecimal(firstText, places)
      : firstText;

    const right = finite
      ? padDecimal(secondText, places)
      : secondText;

    const answer = finite
      ? padDecimal(resultText, places)
      : resultText;

    const width = Math.max(
      left.length,
      right.length + 2,
      answer.length
    );

    return [
      left.padStart(width),
      (symbol + " " + right).padStart(width),
      "─".repeat(width),
      answer.padStart(width)
    ];
  }

  // Multiplication: show the factors and product.
  if (operator === "*") {
    const width = Math.max(
      firstText.length,
      secondText.length + 2,
      resultText.length
    );

    return [
      firstText.padStart(width),
      ("× " + secondText).padStart(width),
      "─".repeat(width),
      resultText.padStart(width)
    ];
  }

  // Division: display a long-division-style bracket.
  if (operator === "/") {
    const width = Math.max(
      firstText.length,
      resultText.length
    );

    return [
      " ".repeat(secondText.length + 3) +
        resultText.padStart(width),
      " ".repeat(secondText.length + 2) +
        "─".repeat(width + 1),
      secondText + " ) " +
        firstText.padStart(width)
    ];
  }

  return [
    `${firstText} ${symbol} ${secondText}`,
    "─".repeat(20),
    resultText
  ];
}

// =====================================================
// ARITHMETIC SOLUTION BLOCK
// =====================================================

function arithmeticSteps(
  first,
  second,
  operator,
  result
) {
  const firstText = decimalDescription(first);
  const secondText = decimalDescription(second);
  const resultText = decimalDescription(result);

  const lines = buildWrittenArithmetic(
    first,
    second,
    operator,
    result
  );

  let description = "";

  if (operator === "+") {
    description =
      "Align the decimal points, add each column, and write the answer below the horizontal line.";
  } else if (operator === "-") {
    description =
      "Align the decimal points, subtract each column, and write the answer below the horizontal line.";
  } else if (operator === "*") {
    description =
      "Multiply the decimal values and place the result below the horizontal line.";
  } else {
    description =
      "Divide the decimal values. The quotient appears above the division bracket.";
  }

  let note =
    `${firstText} ${operationSymbol(operator)} ` +
    `${secondText} = ${resultText}`;

  if (resultText.includes("(")) {
    note +=
      ". Digits inside parentheses repeat indefinitely.";
  }

  if (resultText.includes("…")) {
    note +=
      ". The displayed decimal expansion is truncated.";
  }

  return paperBlock(
    `Perform ${operationName(operator)}`,
    description,
    lines,
    note
  );
}

// =====================================================
// COMPLETE CALCULATOR SOLUTION
// =====================================================

function buildCalculatorSolution(
  firstInput,
  firstBase,
  secondInput,
  secondBase,
  operator,
  resultBase
) {
  const first = parseNumber(
    firstInput,
    firstBase
  );

  const second = parseNumber(
    secondInput,
    secondBase
  );

  const result = calculateExactResult(
    first,
    second,
    operator
  );

  const formatted = formatNumber(
    result,
    resultBase
  );

  const steps = [];

  steps.push(
    textBlock(
      "Identify the Given Values",
      "Identify the numbers, their bases, and the operation.",
      [
        `First number: ${firstInput.toUpperCase()} (Base ${firstBase})`,
        `Second number: ${secondInput.toUpperCase()} (Base ${secondBase})`,
        `Operation: ${operationName(operator)}`,
        `Result base: ${resultBase}`
      ]
    )
  );

  // Only convert to decimal when necessary.
  if (firstBase !== 10) {
    steps.push(
      positionalSteps(
        firstInput,
        firstBase,
        "Convert the First Number to Decimal"
      )
    );
  }

  if (secondBase !== 10) {
    steps.push(
      positionalSteps(
        secondInput,
        secondBase,
        "Convert the Second Number to Decimal"
      )
    );
  }

  // Show written arithmetic using decimal values.
  steps.push(
    arithmeticSteps(
      first,
      second,
      operator,
      result
    )
  );

  // Convert the decimal answer only when
  // the requested output base is not 10.
  if (resultBase !== 10) {
    steps.push(
      textBlock(
        "Prepare the Result for Base Conversion",
        "The arithmetic result is now ready to convert.",
        [
          `Decimal answer: ${decimalDescription(result)}`,
          `Target base: ${resultBase}`
        ]
      )
    );

    steps.push(
      integerConversionSteps(
        result,
        resultBase
      )
    );

    if (absolute(result.n) % result.d !== 0n) {
      steps.push(
        fractionalConversionSteps(
          result,
          resultBase
        )
      );
    }
  }

  steps.push(
    finalBlock(
      "Final Calculation Result",
      `The answer in Base ${resultBase} is:`,
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
// RESULT NOTES
// =====================================================

function fractionResultNote(formatted, base) {
  if (formatted.repeating) {
    return (
      `Digits inside parentheses repeat indefinitely ` +
      `in Base ${base}.`
    );
  }

  if (formatted.truncated) {
    return (
      `The expansion exceeds ${MAX_FRACTION_DIGITS} ` +
      `digits and has been truncated.`
    );
  }

  if (formatted.fractionText) {
    return `Exact result in Base ${base}.`;
  }

  return `Exact whole-number result in Base ${base}.`;
}

// =====================================================
// ERROR HANDLING
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

// =====================================================
// DISPLAY RESULT
// =====================================================

function showResult(formatted, base, steps) {
  clearError();
  stopSolutionPlayback();

  currentResult = formatted.text;
  currentSolution = steps;
  solutionIndex = 0;

  $("resultNumber").textContent =
    formatted.text;

  $("resultNote").textContent =
    fractionResultNote(formatted, base);

  $("resultSection").hidden = false;
  $("solutionSection").hidden = true;

  $("solutionBtn").textContent =
    "Show Step-by-Step Solution";

  updatePlayButton();
}

// =====================================================
// CONVERT NUMBER
// =====================================================

function convertNumber() {
  try {
    const input = $("convertNumber").value.trim();

    const fromBase = Number(
      $("fromBase").value
    );

    const toBase = Number(
      $("toBase").value
    );

    if (!input) {
      throw new Error(
        "Please enter a number to convert."
      );
    }

    const conversion = buildConversionSolution(
      input,
      fromBase,
      toBase
    );

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
// CALCULATE
// =====================================================

function calculateNumber() {
  try {
    const firstInput =
      $("firstNumber").value.trim();

    const secondInput =
      $("secondNumber").value.trim();

    if (!firstInput || !secondInput) {
      throw new Error(
        "Please enter both numbers."
      );
    }

    const calculation = buildCalculatorSolution(
      firstInput,
      Number($("firstBase").value),
      secondInput,
      Number($("secondBase").value),
      $("operator").value,
      Number($("resultBase").value)
    );

    showResult(
      calculation.formatted,
      Number($("resultBase").value),
      calculation.steps
    );
  } catch (error) {
    showError(error.message);
  }
}

// =====================================================
// SWAP AND RESET
// =====================================================

function swapBases() {
  const from = $("fromBase");
  const to = $("toBase");

  const previous = from.value;

  from.value = to.value;
  to.value = previous;

  hideResults();
}

function resetConverter() {
  $("convertNumber").value = "";
  $("fromBase").value = "10";
  $("toBase").value = "2";

  hideResults();
}

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
    await navigator.clipboard.writeText(
      currentResult
    );

    const button = $("copyBtn");
    button.textContent = "Copied!";

    setTimeout(() => {
      button.textContent = "Copy";
    }, 1800);
  } catch (error) {
    showError(
      "Unable to copy automatically."
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
      const option =
        document.createElement("option");

      option.value = String(base);

      option.textContent = BASE_NAMES[base]
        ? `Base ${base} — ${BASE_NAMES[base]}`
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
// RENDER STEP-BY-STEP SOLUTION
// =====================================================

function createSolutionLine(text) {
  const line = document.createElement("p");
  line.textContent = String(text);
  return line;
}

function renderSolutionStep() {
  const container = $("solutionSteps");

  if (!container || !currentSolution.length) {
    return;
  }

  const step = currentSolution[solutionIndex];

  container.innerHTML = "";

  const heading = document.createElement("h3");
  heading.textContent =
    step.title || "Solution Step";

  container.appendChild(heading);

  if (step.description) {
    const description =
      document.createElement("p");

    description.textContent =
      step.description;

    container.appendChild(description);
  }

  // -----------------------------------------
  // TEXT STEP
  // -----------------------------------------

  if (step.type === "text") {
    const lines = document.createElement("div");
    lines.className = "solution-lines";

    (step.lines || []).forEach(text => {
      lines.appendChild(
        createSolutionLine(text)
      );
    });

    container.appendChild(lines);
  }

  // -----------------------------------------
  // TABLE STEP
  // -----------------------------------------

  if (step.type === "table") {
    const wrapper =
      document.createElement("div");

    wrapper.className =
      "solution-table-wrapper";

    const table =
      document.createElement("table");

    table.className = "solution-table";

    const thead =
      document.createElement("thead");

    const headerRow =
      document.createElement("tr");

    (step.headers || []).forEach(text => {
      const th = document.createElement("th");
      th.textContent = String(text);
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody =
      document.createElement("tbody");

    (step.rows || []).forEach(row => {
      const tr = document.createElement("tr");

      row.forEach(value => {
        const td = document.createElement("td");
        td.textContent = String(value);
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    wrapper.appendChild(table);

    container.appendChild(wrapper);

    if (step.note) {
      const note =
        document.createElement("p");

      note.className = "solution-note";
      note.textContent = step.note;

      container.appendChild(note);
    }
  }

  // -----------------------------------------
  // WRITTEN ARITHMETIC STEP
  // -----------------------------------------

  if (step.type === "paper") {
    const wrapper =
      document.createElement("div");

    wrapper.className =
      "baselab-written-math";

    const pre = document.createElement("pre");

    pre.textContent =
      (step.lines || []).join("\n");

    wrapper.appendChild(pre);
    container.appendChild(wrapper);

    if (step.note) {
      const note =
        document.createElement("p");

      note.className = "solution-note";
      note.textContent = step.note;

      container.appendChild(note);
    }
  }

  // -----------------------------------------
  // FINAL STEP
  // -----------------------------------------

  if (step.type === "final") {
    const answer =
      document.createElement("div");

    answer.className =
      "solution-final-answer";

    answer.textContent =
      String(step.answer);

    container.appendChild(answer);
  }

  // -----------------------------------------
  // PROGRESS INDICATOR
  // -----------------------------------------

  const total = currentSolution.length;
  const current = solutionIndex + 1;

  const percentage = Math.round(
    (current / total) * 100
  );

  $("solutionCounter").textContent =
    `Step ${current} of ${total}`;

  $("solutionPercent").textContent =
    `${percentage}%`;

  $("solutionProgressFill").style.width =
    `${percentage}%`;

  $("previousStepBtn").disabled =
    solutionIndex === 0;

  $("nextStepBtn").disabled =
    solutionIndex === total - 1;
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

    button.textContent =
      "Show Step-by-Step Solution";

    stopSolutionPlayback();
    updatePlayButton();
    return;
  }

  section.hidden = false;

  button.textContent =
    "Hide Step-by-Step Solution";

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
  if (
    solutionIndex < currentSolution.length - 1
  ) {
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
    solutionTimer === null
      ? "▶ Play All"
      : "Ⅱ Pause";
}

// =====================================================
// AUTO-PLAY SOLUTION
// =====================================================

function toggleSolutionPlayback() {
  if (!currentSolution.length) return;

  if (solutionTimer !== null) {
    stopSolutionPlayback();
    updatePlayButton();
    return;
  }

  if (
    solutionIndex >= currentSolution.length - 1
  ) {
    solutionIndex = 0;
    renderSolutionStep();
  }

  solutionTimer = setInterval(() => {
    if (
      solutionIndex >= currentSolution.length - 1
    ) {
      stopSolutionPlayback();
      updatePlayButton();
      return;
    }

    solutionIndex++;
    renderSolutionStep();

    if (
      solutionIndex >= currentSolution.length - 1
    ) {
      stopSolutionPlayback();
      updatePlayButton();
    }
  }, 1800);

  updatePlayButton();
}

// =====================================================
// WORKSPACE TABS
// =====================================================

function initializeWorkspaceTabs() {
  document.querySelectorAll(".tab").forEach(button => {
    button.addEventListener("click", () => {
      const target = button.dataset.tab;
      const section = $(target);

      if (!section) return;

      document.querySelectorAll(".tab").forEach(tab => {
        tab.classList.remove("active");

        tab.setAttribute(
          "aria-selected",
          "false"
        );
      });

      document.querySelectorAll(
        ".tab-content"
      ).forEach(item => {
        item.classList.remove("active");
      });

      button.classList.add("active");

      button.setAttribute(
        "aria-selected",
        "true"
      );

      section.classList.add("active");

      hideResults();

      if (window.innerWidth <= 760) {
        section.scrollIntoView({
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
    const open =
      menu.classList.toggle("is-open");

    toggle.setAttribute(
      "aria-expanded",
      String(open)
    );

    toggle.setAttribute(
      "aria-label",
      open
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
// BUTTON EVENT LISTENERS
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
}

// =====================================================
// STYLING FOR WRITTEN ARITHMETIC
// Injected automatically by JavaScript.
// No separate CSS edit required.
// =====================================================

function initializeWrittenMathStyles() {
  if ($("baselabWrittenMathStyles")) return;

  const style = document.createElement("style");

  style.id = "baselabWrittenMathStyles";

  style.textContent = `
    .baselab-written-math {
      margin: 20px 0;
      padding: 24px 18px;
      background: #f7f6ff;
      border: 1px solid #e4e1ff;
      border-radius: 14px;
      overflow-x: auto;
      text-align: center;
    }

    .baselab-written-math pre {
      display: inline-block;
      margin: 0;
      padding: 0;
      color: #263254;
      font-family: "Courier New", monospace;
      font-size: 20px;
      font-weight: 700;
      line-height: 1.8;
      letter-spacing: 0;
      text-align: right;
      white-space: pre;
      font-variant-numeric: tabular-nums;
    }

    @media (max-width: 760px) {
      .baselab-written-math {
        padding: 18px 10px;
      }

      .baselab-written-math pre {
        font-size: 15px;
        line-height: 1.7;
      }
    }
  `;

  document.head.appendChild(style);
}

// =====================================================
// INITIALIZE BASELAB
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  populateBaseSelectors();

  initializeCalculatorControls();

  initializeWorkspaceTabs();

  initializeMobileNavigation();

  initializeWrittenMathStyles();
});
