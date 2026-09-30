
"use strict";

// =====================================================
// BASELAB — COMPLETE JAVASCRIPT
// Number Base Converter + Calculator + Learning Mode
// =====================================================

const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MAX_FRACTION_DIGITS = 10;
const MAX_TABLE_ROWS = 100;
const MAX_DIVISION_WORK_DIGITS = 5;
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
// NUMBER PARSING — BASES 2 TO 36
// =====================================================

function parseNumber(input, base) {
  const text = String(input).trim().toUpperCase();

  if (
    !Number.isInteger(base) ||
    base < 2 ||
    base > 36
  ) {
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
// FORMAT EXACT NUMBERS
// Parentheses indicate repeating digits.
// =====================================================

function formatNumber(value, base) {
  if (
    !Number.isInteger(base) ||
    base < 2 ||
    base > 36
  ) {
    throw new Error("Base must be between 2 and 36.");
  }

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

function finalBlock(title, description, answer) {
  return {
    type: "final",
    title,
    description,
    answer
  };
}

// =====================================================
// POSITIONAL CONVERSION
// =====================================================

function positionalSteps(input, base, title) {
  const text = String(input).trim().toUpperCase();
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

    if (rows.length < MAX_TABLE_ROWS) {
      rows.push([
        character,
        `${base}^${power}`,
        `${digit} × ${place}`,
        (BigInt(digit) * place).toString()
      ]);
    }
  }

  for (let i = 0; i < fractionText.length; i++) {
    const character = fractionText[i];
    const digit = BigInt(DIGITS.indexOf(character));

    const denominator =
      BigInt(base) ** BigInt(i + 1);

    if (rows.length < MAX_TABLE_ROWS) {
      rows.push([
        character,
        `${base}^(-${i + 1})`,
        `${digit} × ${base}^(-${i + 1})`,
        decimalDescription(
          makeFraction(digit, denominator)
        )
      ]);
    }
  }

  let note =
    `${negative ? "Apply the negative sign. " : ""}` +
    `Decimal result: ${decimalDescription(
      parseNumber(input, base)
    )}`;

  if (
    integerText.length + fractionText.length >
    MAX_TABLE_ROWS
  ) {
    note +=
      ` Only the first ${MAX_TABLE_ROWS} rows are displayed.`;
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
    note
  );
}

// =====================================================
// CONVERT WHOLE-NUMBER PORTION
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

  let note =
    `Whole-number result: ${digits.reverse().join("")}`;

  if (digits.length > MAX_TABLE_ROWS) {
    note +=
      ` Only the first ${MAX_TABLE_ROWS} division rows are displayed.`;
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
    note
  );
}

// =====================================================
// CONVERT FRACTIONAL PORTION
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
    note +=
      " Parentheses indicate repeating digits.";
  }

  if (formatted.truncated) {
    note += " The expansion was truncated.";
  }

  if (digits.length > MAX_TABLE_ROWS) {
    note +=
      ` Only the first ${MAX_TABLE_ROWS} rows are displayed.`;
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
// COMPLETE CONVERTER SOLUTION
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
      steps.push(
        integerConversionSteps(value, toBase)
      );

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
// WRITTEN ARITHMETIC HELPERS
// =====================================================

function decimalPlaces(text) {
  const clean = text.replace(/^\+/, "");
  const dot = clean.indexOf(".");

  return dot < 0 ? 0 : clean.length - dot - 1;
}

function padDecimal(text, places) {
  if (text.includes("(") || text.includes("…")) {
    return text;
  }

  if (places === 0) {
    return text;
  }

  if (!text.includes(".")) {
    return text + "." + "0".repeat(places);
  }

  return text + "0".repeat(
    Math.max(0, places - decimalPlaces(text))
  );
}


function buildWrittenArithmetic(first, second, operator, result) {
  const firstText = decimalDescription(first);
  const secondText = decimalDescription(second);
  const resultText = decimalDescription(result);
  const symbol = operationSymbol(operator);

  // ADDITION AND SUBTRACTION
  if (operator === "+" || operator === "-") {
    const finite = !/[()…]/.test(
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

  // TRADITIONAL LONG MULTIPLICATION
  if (operator === "*") {
    // Convert exact fractions to equivalent integer multiplication:
    // (a/b) × (c/d) = (a × c) / (b × d).
    const a = absolute(first.n);
    const b = absolute(second.n);
    const denominator = first.d * second.d;

    const aText = a.toString();
    const bText = b.toString();
    const digits = bText.split("").reverse();

    const partials = digits.map((character, position) => {
      return a * BigInt(character) * (10n ** BigInt(position));
    });

    const product = a * b;
    const productText = product.toString();

    const width = Math.max(
      aText.length,
      bText.length + 2,
      productText.length,
      ...partials.map(value => value.toString().length)
    );

    const lines = [
      aText.padStart(width),
      ("× " + bText).padStart(width),
      "─".repeat(width)
    ];

    partials.forEach(value => {
      lines.push(value.toString().padStart(width));
    });

    if (partials.length > 1) {
      lines.push("─".repeat(width));
    }

    lines.push(productText.padStart(width));

    if (denominator !== 1n) {
      lines.push("");
      lines.push(
        `Divide the product by ${denominator.toString()}`
      );
      lines.push(
        `${productText} ÷ ${denominator.toString()}`
      );
      lines.push(`= ${resultText}`);
    }

    if ((first.n < 0n) !== (second.n < 0n) && product !== 0n) {
      lines.push("Apply the negative sign.");
      lines.push(`Final answer: ${resultText}`);
    }

    return lines;
  }

  return [
    `${firstText} ${symbol} ${secondText}`,
    "─".repeat(20),
    resultText
  ];
}
// =====================================================
// IMPROVED LONG DIVISION — BASES 2 TO 36
// Exact BigInt working.
// Displays up to 5 fractional digits.
// =====================================================

function longDivisionSteps(first, second, base) {
  if (second.n === 0n) {
    throw new Error("Division by zero is not allowed.");
  }

  if (
    !Number.isInteger(base) ||
    base < 2 ||
    base > 36
  ) {
    throw new Error("Base must be between 2 and 36.");
  }

  const radix = BigInt(base);
  const limit = MAX_DIVISION_WORK_DIGITS;

  // (a/b) ÷ (c/d) = (a*d) ÷ (b*c)
  // Use positive integer magnitudes for working.

  const dividend = absolute(
    first.n * second.d
  );

  const divisor = absolute(
    first.d * second.n
  );

  const dividendText =
    dividend.toString(base).toUpperCase();

  const divisorText =
    divisor.toString(base).toUpperCase();

  const negative =
    (first.n < 0n) !== (second.n < 0n) &&
    dividend !== 0n;

  const inputDigits = dividendText.split("");
  const wholeDigits = [];
  const operations = [];

  let remainder = 0n;
  let started = false;

  // -----------------------------------------
  // Whole-number division
  // -----------------------------------------

  for (let i = 0; i < inputDigits.length; i++) {
    const digit = BigInt(
      DIGITS.indexOf(inputDigits[i])
    );

    const partial = remainder * radix + digit;
    const quotientDigit = partial / divisor;
    const product = quotientDigit * divisor;
    const nextRemainder = partial - product;

    if (
      quotientDigit !== 0n ||
      started ||
      i === inputDigits.length - 1
    ) {
      started = true;

      wholeDigits.push(
        DIGITS[Number(quotientDigit)]
      );

      operations.push({
        partial,
        product,
        remainder: nextRemainder,
        endColumn: i,
        digit: DIGITS[Number(quotientDigit)]
      });
    }

    remainder = nextRemainder;
  }

  // -----------------------------------------
  // Fractional division
  // -----------------------------------------

  const fractionDigits = [];
  const seen = new Map();

  let repeatStart = -1;
  let truncated = false;

  while (remainder !== 0n) {
    const key = remainder.toString();

    if (seen.has(key)) {
      repeatStart = seen.get(key);
      break;
    }

    if (fractionDigits.length >= limit) {
      truncated = true;
      break;
    }

    seen.set(key, fractionDigits.length);

    const partial = remainder * radix;
    const quotientDigit = partial / divisor;
    const product = quotientDigit * divisor;
    const nextRemainder = partial - product;

    const digitText =
      DIGITS[Number(quotientDigit)];

    fractionDigits.push(digitText);

    operations.push({
      partial,
      product,
      remainder: nextRemainder,
      endColumn:
        inputDigits.length + fractionDigits.length,
      digit: digitText
    });

    remainder = nextRemainder;
  }

  // -----------------------------------------
  // Prepare quotient
  // -----------------------------------------

  let fractionText = fractionDigits.join("");

  if (repeatStart >= 0) {
    fractionText =
      fractionText.slice(0, repeatStart) +
      "(" +
      fractionText.slice(repeatStart) +
      ")";
  } else if (truncated) {
    fractionText += "…";
  }

  const quotient =
    (negative ? "−" : "") +
    wholeDigits.join("") +
    (fractionText ? "." + fractionText : "");

  // -----------------------------------------
  // Build long-division bracket
  // -----------------------------------------

  const workDigits =
    dividendText +
    (
      fractionDigits.length
        ? "." + "0".repeat(fractionDigits.length)
        : ""
    );

  const prefix =
    " ".repeat(divisorText.length + 3);

  const workWidth = Math.max(
    workDigits.length,
    quotient.replace(/[()…]/g, "").length
  );

  const lines = [
    prefix + quotient.padStart(workWidth),
    prefix + "─".repeat(workWidth),
    divisorText + " │ " + workDigits
  ];

  // -----------------------------------------
  // Show division working
  // -----------------------------------------

  operations.forEach((item, index) => {
    const partialText =
      item.partial.toString(base).toUpperCase();

    const productText =
      item.product.toString(base).toUpperCase();

    const remainderText =
      item.remainder.toString(base).toUpperCase();

    const columnWidth = Math.max(
      partialText.length,
      productText.length,
      remainderText.length
    );

    const start = Math.max(
      0,
      item.endColumn - columnWidth + 1
    );

    const indentation =
      prefix + " ".repeat(start);

    lines.push(
      indentation +
      partialText.padStart(columnWidth)
    );

    lines.push(
      indentation +
      ("−" + productText).padStart(columnWidth + 1)
    );

    lines.push(
      indentation +
      "─".repeat(columnWidth + 1)
    );

    lines.push(
      indentation +
      remainderText.padStart(columnWidth)
    );

    if (index < operations.length - 1) {
      lines.push("");
    }
  });

  // -----------------------------------------
  // Explanation and note
  // -----------------------------------------

  let description =
    `Divide in Base ${base}. For each quotient digit, ` +
    "multiply the divisor, subtract the product, " +
    "and bring down the next digit.";

  if (first.d !== 1n || second.d !== 1n) {
    description +=
      " Fractional operands are first rewritten " +
      "as an equivalent integer division.";
  }

  let note =
    `Quotient in Base ${base}: ${quotient}`;

  if (repeatStart >= 0) {
    note +=
      " Digits inside parentheses repeat.";
  }

  if (truncated) {
    note +=
      ` Only the first ${limit} fractional digits ` +
      "are shown in the division working. " +
      "The division continues beyond this point.";
  }

  if (negative) {
    note +=
      " The negative sign is applied to the quotient.";
  }

  return paperBlock(
    `Long Division — Base ${base}`,
    description,
    lines,
    note
  );
}

// =====================================================
// WRITTEN ARITHMETIC SOLUTION
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
      "Align the decimal points, add each column, " +
      "and write the answer below the line.";
  } else if (operator === "-") {
    description =
      "Align the decimal points, subtract each column, " +
      "and write the answer below the line.";
  } else if (operator === "*") {
    description =
      "Multiply the decimal values and write the " +
      "product below the line.";
  } else {
    description =
      "Perform the arithmetic operation.";
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

  // Convert the first input to decimal if needed.
  if (firstBase !== 10) {
    steps.push(
      positionalSteps(
        firstInput,
        firstBase,
        "Convert the First Number to Decimal"
      )
    );
  }

  // Convert the second input to decimal if needed.
  if (secondBase !== 10) {
    steps.push(
      positionalSteps(
        secondInput,
        secondBase,
        "Convert the Second Number to Decimal"
      )
    );
  }

  // -----------------------------------------
  // Arithmetic
  // -----------------------------------------

  if (operator === "/") {
    steps.push(
      textBlock(
        "Identify the Division",
        "Read the dividend and divisor in decimal form.",
        [
          `Dividend: ${decimalDescription(first)}`,
          `Divisor: ${decimalDescription(second)}`,
          `Decimal answer: ${decimalDescription(result)}`
        ]
      )
    );

    steps.push(
      longDivisionSteps(
        first,
        second,
        resultBase
      )
    );
  } else {
    steps.push(
      arithmeticSteps(
        first,
        second,
        operator,
        result
      )
    );
  }

  // -----------------------------------------
  // Convert result to requested base
  // -----------------------------------------

  if (resultBase !== 10) {
    steps.push(
      textBlock(
        "Prepare the Result for Base Conversion",
        "The arithmetic result is ready to convert.",
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
      "Digits inside parentheses repeat indefinitely " +
      `in Base ${base}.`
    );
  }

  if (formatted.truncated) {
    return (
      `The expansion exceeds ${MAX_FRACTION_DIGITS} ` +
      "digits and has been truncated."
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

  if (error) {
    error.textContent = message;
    error.hidden = false;
  }

  const resultSection = $("resultSection");
  const solutionSection = $("solutionSection");

  if (resultSection) {
    resultSection.hidden = true;
  }

  if (solutionSection) {
    solutionSection.hidden = true;
  }

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

  const resultSection = $("resultSection");
  const solutionSection = $("solutionSection");

  if (resultSection) {
    resultSection.hidden = true;
  }

  if (solutionSection) {
    solutionSection.hidden = true;
  }

  currentResult = "";
  currentSolution = [];
  solutionIndex = 0;

  updatePlayButton();
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
    const input =
      $("convertNumber").value.trim();

    const fromBase =
      Number($("fromBase").value);

    const toBase =
      Number($("toBase").value);

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
// CALCULATE NUMBER
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

    const firstBase =
      Number($("firstBase").value);

    const secondBase =
      Number($("secondBase").value);

    const operator =
      $("operator").value;

    const resultBase =
      Number($("resultBase").value);

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

    if (!button) return;

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

  if (
    !container ||
    !currentSolution.length
  ) {
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

    const pre =
      document.createElement("pre");

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
// MOBILE NAVIGATION
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
// WRITTEN ARITHMETIC STYLING
// Automatically added by JavaScript.
// =====================================================

function initializeWrittenMathStyles() {
  if ($("baselabWrittenMathStyles")) return;

  const style =
    document.createElement("style");

  style.id = "baselabWrittenMathStyles";

  style.textContent = `
    .baselab-written-math {
      margin: 20px 0;
      padding: 24px 18px;
      background: #f7f6ff;
      border: 1px solid #e4e1ff;
      border-radius: 14px;
      overflow-x: auto;
      text-align: left;
    }

    .baselab-written-math pre {
      display: inline-block;
      margin: 0;
      padding: 0;
      color: #263254;
      font-family: "Courier New", Consolas, monospace;
      font-size: 17px;
      font-weight: 700;
      line-height: 1.65;
      letter-spacing: 0;
      text-align: left;
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
