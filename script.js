"use strict";

// =====================================================
// BASELAB — COMPLETE JAVASCRIPT
// Number Base Converter + Calculator + Learning Mode
// =====================================================

const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Used only for generating the exact answer and
// detecting repeating cycles.
const MAX_FRACTION_DIGITS = 500;

const MAX_RESULT_DISPLAY_DIGITS = 20;
const MAX_TABLE_ROWS = 100;

// =====================================================
// LEARNING-MODE DISPLAY LIMITS
// =====================================================

// These limits DO NOT change the exact result.
// They only prevent the Step-by-Step Solution from
// becoming unnecessarily long.
const MAX_CONVERSION_WORK_DIGITS = 5;
const MAX_DIVISION_WORK_DIGITS = 5;
const MAX_OPERATION_WORK_DIGITS = 5;

const $ = id =>
  document.getElementById(id);

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


function makeFraction(
  n,
  d = 1n
) {
  if (d === 0n) {
    throw new Error(
      "Division by zero is not allowed."
    );
  }

  if (d < 0n) {
    n = -n;
    d = -d;
  }

  const factor =
    gcd(n, d);

  return {
    n: n / factor,
    d: d / factor
  };
}


function add(a, b) {
  return makeFraction(
    a.n * b.d +
    b.n * a.d,

    a.d * b.d
  );
}


function subtract(a, b) {
  return makeFraction(
    a.n * b.d -
    b.n * a.d,

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
    throw new Error(
      "Division by zero is not allowed."
    );
  }

  return makeFraction(
    a.n * b.d,
    a.d * b.n
  );
}


// =====================================================
// NUMBER PARSING — BASES 2 TO 36
// =====================================================

function parseNumber(
  input,
  base
) {
  const text =
    String(input)
      .trim()
      .toUpperCase();

  if (
    !Number.isInteger(base) ||
    base < 2 ||
    base > 36
  ) {
    throw new Error(
      "Base must be between 2 and 36."
    );
  }

  if (!text) {
    throw new Error(
      "Please enter a number."
    );
  }

  let negative = false;
  let working = text;

  if (
    working.startsWith("-")
  ) {
    negative = true;
    working =
      working.slice(1);

  } else if (
    working.startsWith("+")
  ) {
    working =
      working.slice(1);
  }

  if (!working) {
    throw new Error(
      "Please enter a valid number."
    );
  }

  /*
    User input accepts finite positional numbers:

      101.01
      77.4
      25.5
      A3.F

    Repeating notation such as 0.(3) is produced
    by BaseLab's result formatter. The user does not
    need to type repeating notation manually.
  */

  if (
    !/^[0-9A-Z]+(?:\.[0-9A-Z]+)?$/.test(
      working
    )
  ) {
    throw new Error(
      "Please enter a valid number."
    );
  }

  const parts =
    working.split(".");

  const wholePart =
    parts[0] || "0";

  const fractionPart =
    parts[1] || "";

  const radix =
    BigInt(base);

  let wholeValue = 0n;

  for (
    const character
    of wholePart
  ) {
    const digit =
      DIGITS.indexOf(
        character
      );

    if (
      digit < 0 ||
      digit >= base
    ) {
      throw new Error(
        `"${character}" is not valid in Base ${base}.`
      );
    }

    wholeValue =
      wholeValue * radix +
      BigInt(digit);
  }

  let numerator =
    wholeValue;

  let denominator = 1n;

  if (fractionPart) {
    let fractionNumerator = 0n;
    let fractionDenominator = 1n;

    for (
      const character
      of fractionPart
    ) {
      const digit =
        DIGITS.indexOf(
          character
        );

      if (
        digit < 0 ||
        digit >= base
      ) {
        throw new Error(
          `"${character}" is not valid in Base ${base}.`
        );
      }

      fractionNumerator =
        fractionNumerator *
        radix +
        BigInt(digit);

      fractionDenominator *=
        radix;
    }

    numerator =
      wholeValue *
      fractionDenominator +
      fractionNumerator;

    denominator =
      fractionDenominator;
  }

  if (negative) {
    numerator =
      -numerator;
  }

  return makeFraction(
    numerator,
    denominator
  );
}


// =====================================================
// EXACT NUMBER FORMATTING
// =====================================================

function formatNumber(
  value,
  base
) {
  if (
    !Number.isInteger(base) ||
    base < 2 ||
    base > 36
  ) {
    throw new Error(
      "Base must be between 2 and 36."
    );
  }

  const radix =
    BigInt(base);

  const negative =
    value.n < 0n;

  const numerator =
    absolute(value.n);

  const denominator =
    value.d;

  const whole =
    numerator /
    denominator;

  let remainder =
    numerator %
    denominator;

  const wholeText =
    whole
      .toString(base)
      .toUpperCase();

  if (
    remainder === 0n
  ) {
    return {
      text:
        (negative ? "-" : "") +
        wholeText,

      wholeText,

      fractionText: "",

      repeating: false,

      truncated: false,

      digits: 0
    };
  }

  const digits = [];
  const seen = new Map();

  let repeatStart = -1;
  let truncated = false;

  while (
    remainder !== 0n
  ) {
    const key =
      remainder.toString();

    if (
      seen.has(key)
    ) {
      repeatStart =
        seen.get(key);

      break;
    }

    if (
      digits.length >=
      MAX_FRACTION_DIGITS
    ) {
      truncated = true;
      break;
    }

    seen.set(
      key,
      digits.length
    );

    remainder *=
      radix;

    const digit =
      remainder /
      denominator;

    remainder %=
      denominator;

    digits.push(
      DIGITS[
        Number(digit)
      ]
    );
  }

  let fractionText = "";
  let repeating = false;

  if (
    repeatStart >= 0
  ) {
    repeating = true;

    fractionText =
      digits
        .slice(
          0,
          repeatStart
        )
        .join("") +

      "(" +

      digits
        .slice(
          repeatStart
        )
        .join("") +

      ")";

  } else {
    fractionText =
      digits.join("");

    if (truncated) {
      fractionText +=
        "…";
    }
  }

  return {
    text:
      (negative ? "-" : "") +
      wholeText +
      "." +
      fractionText,

    wholeText,

    fractionText,

    repeating,

    truncated,

    digits:
      digits.length
  };
}


// =====================================================
// DISPLAY HELPERS
// =====================================================

function compactFormattedText(
  value,
  base
) {
  const formatted =
    formatNumber(
      value,
      base
    );

  const text =
    formatted.text;

  if (
    text.length <=
    MAX_RESULT_DISPLAY_DIGITS + 8
  ) {
    return text;
  }

  const negative =
    text.startsWith("-");

  const unsigned =
    negative
      ? text.slice(1)
      : text;

  const decimalIndex =
    unsigned.indexOf(".");

  if (
    decimalIndex < 0
  ) {
    return text;
  }

  const whole =
    unsigned.slice(
      0,
      decimalIndex
    );

  const fraction =
    unsigned.slice(
      decimalIndex + 1
    );

  const cleanFraction =
    fraction.replace(
      /[()…]/g,
      ""
    );

  const preview =
    cleanFraction.slice(
      0,
      MAX_RESULT_DISPLAY_DIGITS
    );

  let result =
    whole +
    "." +
    preview;

  if (
    formatted.repeating
  ) {
    result += "…";

  } else if (
    cleanFraction.length >
    MAX_RESULT_DISPLAY_DIGITS
  ) {
    result += "…";
  }

  return (
    (negative ? "-" : "") +
    result
  );
}


function decimalDescription(
  value
) {
  return formatNumber(
    value,
    10
  ).text;
}


function fractionDescription(
  value
) {
  if (
    value.d === 1n
  ) {
    return value.n.toString();
  }

  return (
    `${value.n}/${value.d}`
  );
}


function baseName(base) {
  return (
    BASE_NAMES[base] ||
    `Base ${base}`
  );
}


// =====================================================
// SOLUTION BLOCK BUILDERS
// =====================================================

function textBlock(
  title,
  description,
  lines = [],
  note = ""
) {
  return {
    type: "text",
    title,
    description,
    lines,
    note
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


function finalBlock(
  title,
  description,
  answer
) {
  return {
    type: "final",
    title,
    description,
    answer
  };
}


// =====================================================
// POSITIONAL VALUE EXPLANATION
// =====================================================

function positionalSteps(
  input,
  base,
  title =
    "Convert to Decimal"
) {
  const text =
    String(input)
      .trim()
      .toUpperCase();

  const negative =
    text.startsWith("-");

  const unsigned =
    text.replace(
      /^[+-]/,
      ""
    );

  const [
    wholePart = "0",
    fractionPart = ""
  ] =
    unsigned.split(".");

  const rows = [];

  let total =
    makeFraction(0n);

  // -----------------------------------------------
  // WHOLE-NUMBER POSITIONS
  // -----------------------------------------------

  for (
    let index = 0;
    index < wholePart.length;
    index++
  ) {
    const character =
      wholePart[index];

    const digit =
      DIGITS.indexOf(
        character
      );

    const exponent =
      wholePart.length -
      index -
      1;

    const placeValue =
      BigInt(base) **
      BigInt(exponent);

    const contribution =
      BigInt(digit) *
      placeValue;

    total =
      add(
        total,

        makeFraction(
          contribution
        )
      );

    rows.push([
      character,
      `${base}^${exponent}`,
      placeValue.toString(),
      contribution.toString()
    ]);
  }

  // -----------------------------------------------
  // FRACTIONAL POSITIONS
  // -----------------------------------------------

  for (
    let index = 0;
    index <
      fractionPart.length;
    index++
  ) {
    const character =
      fractionPart[index];

    const digit =
      DIGITS.indexOf(
        character
      );

    const exponent =
      -(index + 1);

    const denominator =
      BigInt(base) **
      BigInt(index + 1);

    const contribution =
      makeFraction(
        BigInt(digit),
        denominator
      );

    total =
      add(
        total,
        contribution
      );

    rows.push([
      character,

      `${base}^${exponent}`,

      `1/${denominator}`,

      fractionDescription(
        contribution
      )
    ]);
  }

  if (negative) {
    total =
      makeFraction(
        -total.n,
        total.d
      );
  }

  return tableBlock(
    title,

    `Expand each digit using powers of ${base}.`,

    [
      "Digit",
      "Position",
      "Place Value",
      "Contribution"
    ],

    rows.slice(
      0,
      MAX_TABLE_ROWS
    ),

    `Decimal value: ${decimalDescription(total)}`
  );
}


// =====================================================
// DECIMAL PREVIEW FOR LEARNING MODE
// =====================================================

/*
  Creates a finite decimal preview WITHOUT rounding.

  Example:

      163 / 6
      exact decimal = 27.1(6)

  With a five-digit learning limit:

      27.16666

  This preview is used ONLY for written arithmetic.
  Exact calculations still use the fraction itself.
*/

function decimalWorkPreview(
  value,
  maxFractionDigits =
    MAX_OPERATION_WORK_DIGITS
) {
  const negative =
    value.n < 0n;

  const numerator =
    absolute(value.n);

  const denominator =
    value.d;

  const whole =
    numerator /
    denominator;

  let remainder =
    numerator %
    denominator;

  let text =
    whole.toString();

  const digits = [];

  for (
    let index = 0;
    index <
      maxFractionDigits &&
    remainder !== 0n;
    index++
  ) {
    remainder *= 10n;

    const digit =
      remainder /
      denominator;

    remainder %=
      denominator;

    digits.push(
      digit.toString()
    );
  }

  if (
    digits.length > 0
  ) {
    text +=
      "." +
      digits.join("");
  }

  if (
    negative &&
    numerator !== 0n
  ) {
    text =
      "-" + text;
  }

  return {
    text,

    continues:
      remainder !== 0n,

    digits:
      digits.length
  };
}


// =====================================================
// DECIMAL STRING HELPERS
// =====================================================

function countFractionDigits(
  text
) {
  const unsigned =
    String(text)
      .replace(
        /^[+-]/,
        ""
      );

  const point =
    unsigned.indexOf(".");

  if (
    point < 0
  ) {
    return 0;
  }

  return (
    unsigned.length -
    point -
    1
  );
}


function removeDecimalPoint(
  text
) {
  return String(text)
    .replace(".", "");
}


function insertDecimalPoint(
  digits,
  places
) {
  let text =
    String(digits);

  if (
    places <= 0
  ) {
    return text;
  }

  while (
    text.length <= places
  ) {
    text =
      "0" + text;
  }

  const position =
    text.length -
    places;

  return (
    text.slice(
      0,
      position
    ) +
    "." +
    text.slice(
      position
    )
  );
}


function isTerminatingInBase(
  value,
  base = 10
) {
  let denominator =
    value.d;

  const radix =
    BigInt(base);

  while (true) {
    const factor =
      gcd(
        denominator,
        radix
      );

    if (
      factor === 1n
    ) {
      break;
    }

    denominator /=
      factor;
  }

  return (
    denominator === 1n
  );
}


function exactTerminatingText(
  value,
  base = 10
) {
  if (
    !isTerminatingInBase(
      value,
      base
    )
  ) {
    return null;
  }

  return formatNumber(
    value,
    base
  ).text;
}


// =====================================================
// TRADITIONAL INTEGER DIVISION FOR BASE CONVERSION
// =====================================================

function traditionalIntegerDivisionLines(
  dividend,
  divisor
) {
  dividend =
    absolute(dividend);

  divisor =
    absolute(divisor);

  if (
    divisor === 0n
  ) {
    throw new Error(
      "Division by zero is not allowed."
    );
  }

  const quotient =
    dividend / divisor;

  const remainder =
    dividend % divisor;

  const dividendText =
    dividend.toString();

  const divisorText =
    divisor.toString();

  const quotientText =
    quotient.toString();

  const product =
    quotient * divisor;

  const productText =
    product.toString();

  const remainderText =
    remainder.toString();

  const prefix =
    " ".repeat(
      divisorText.length + 3
    );

  const width =
    Math.max(
      dividendText.length,
      quotientText.length,
      productText.length
    );

  const lines = [];

  lines.push(
    prefix +
    quotientText.padStart(
      width
    )
  );

  lines.push(
    prefix +
    "─".repeat(
      width
    )
  );

  lines.push(
    `${divisorText} ) ${dividendText.padStart(width)}`
  );

  lines.push(
    prefix +
    productText.padStart(
      width
    )
  );

  lines.push(
    prefix +
    "─".repeat(
      width
    )
  );

  lines.push(
    prefix +
    remainderText.padStart(
      width
    )
  );

  return {
    lines,
    quotient,
    remainder
  };
}


// =====================================================
// INTEGER BASE CONVERSION
// TRADITIONAL REPEATED DIVISION
// =====================================================

function integerConversionSteps(
  value,
  targetBase
) {
  const radix =
    BigInt(targetBase);

  const magnitude =
    absolute(value.n) /
    value.d;

  if (
    magnitude === 0n
  ) {
    return paperBlock(
      "Convert the Integer Part",

      `Repeatedly divide the integer part by ${targetBase}.`,

      [
        `0 ÷ ${targetBase} = 0 remainder 0`,
        "",
        "Read the remainder from bottom to top:",
        "0"
      ],

      "Integer result: 0"
    );
  }

  let working =
    magnitude;

  const remainders = [];
  const lines = [];

  let iteration = 1;

  while (
    working > 0n
  ) {
    const quotient =
      working / radix;

    const remainder =
      working % radix;

    const digit =
      DIGITS[
        Number(remainder)
      ];

    lines.push(
      `Division ${iteration}`
    );

    lines.push("");

    const work =
      traditionalIntegerDivisionLines(
        working,
        radix
      );

    lines.push(
      ...work.lines
    );

    lines.push("");

    lines.push(
      `${working} ÷ ${targetBase} = ${quotient} remainder ${remainder} → digit ${digit}`
    );

    remainders.push(
      digit
    );

    working =
      quotient;

    if (
      working > 0n
    ) {
      lines.push("");
      lines.push(
        "────────────────────────"
      );
      lines.push("");
    }

    iteration++;
  }

  const answer =
    [...remainders]
      .reverse()
      .join("");

  lines.push("");
  lines.push(
    "Read the remainders from bottom to top:"
  );

  lines.push(
    answer
  );

  return paperBlock(
    "Traditional Division — Integer Conversion",

    `Repeatedly divide the integer part by ${targetBase}. Keep each remainder, then read the remainders from bottom to top.`,

    lines,

    `Integer result in Base ${targetBase}: ${answer}`
  );
}


// =====================================================
// FRACTIONAL BASE CONVERSION
// TRADITIONAL REPEATED MULTIPLICATION
// =====================================================

function fractionalConversionSteps(
  value,
  targetBase
) {
  const magnitude =
    absolute(value.n);

  const denominator =
    value.d;

  let remainder =
    magnitude %
    denominator;

  if (
    remainder === 0n
  ) {
    return textBlock(
      "Convert the Fractional Part",

      "There is no fractional part to convert.",

      [
        "Fractional part = 0"
      ]
    );
  }

  const radix =
    BigInt(targetBase);

  const digits = [];
  const lines = [];

  /*
    IMPORTANT:

    We intentionally do NOT run for hundreds of rows.

    Only the first five educational multiplication
    steps are displayed.

    formatNumber() separately calculates the exact
    repeating answer.
  */

  for (
    let index = 0;
    index <
      MAX_CONVERSION_WORK_DIGITS &&
    remainder !== 0n;
    index++
  ) {
    const before =
      makeFraction(
        remainder,
        denominator
      );

    const multiplied =
      remainder *
      radix;

    const digit =
      multiplied /
      denominator;

    const nextRemainder =
      multiplied %
      denominator;

    const digitText =
      DIGITS[
        Number(digit)
      ];

    const beforePreview =
      decimalWorkPreview(
        before,
        MAX_OPERATION_WORK_DIGITS
      );

    const multipliedFraction =
      makeFraction(
        multiplied,
        denominator
      );

    const multipliedPreview =
      decimalWorkPreview(
        multipliedFraction,
        MAX_OPERATION_WORK_DIGITS
      );

    digits.push(
      digitText
    );

    lines.push(
      `Multiplication ${index + 1}`
    );

    lines.push("");

    /*
      Show the operation vertically so students can
      immediately recognize the multiplication method.
    */

    const firstLine =
      beforePreview.text;

    const secondLine =
      `× ${targetBase}`;

    const width =
      Math.max(
        firstLine.length,
        secondLine.length,
        multipliedPreview.text.length
      );

    lines.push(
      firstLine.padStart(
        width
      )
    );

    lines.push(
      secondLine.padStart(
        width
      )
    );

    lines.push(
      "─".repeat(
        width
      )
    );

    lines.push(
      multipliedPreview.text.padStart(
        width
      )
    );

    lines.push("");

    lines.push(
      `Take the whole-number digit: ${digitText}`
    );

    if (
      nextRemainder !== 0n
    ) {
      const nextFraction =
        makeFraction(
          nextRemainder,
          denominator
        );

      const nextPreview =
        decimalWorkPreview(
          nextFraction,
          MAX_OPERATION_WORK_DIGITS
        );

      lines.push(
        `New fractional part: ${nextPreview.text}${nextPreview.continues ? "…" : ""}`
      );
    } else {
      lines.push(
        "New fractional part: 0"
      );
    }

    remainder =
      nextRemainder;

    if (
      remainder !== 0n &&
      index <
        MAX_CONVERSION_WORK_DIGITS - 1
    ) {
      lines.push("");
      lines.push(
        "────────────────────────"
      );
      lines.push("");
    }
  }

  const continues =
    remainder !== 0n;

  lines.push("");

  if (continues) {
    lines.push("⋮");
    lines.push(
      "Conversion continues…"
    );
    lines.push("");
  }

  const shown =
    digits.join("");

  lines.push(
    `Fractional digits shown: .${shown}${continues ? "…" : ""}`
  );

  const exactFormatted =
    formatNumber(
      value,
      targetBase
    );

  let note =
    `The learning process shows a maximum of ${MAX_CONVERSION_WORK_DIGITS} fractional conversion steps.`;

  if (continues) {
    note +=
      " The exact Calculation Result is not limited to these five digits.";
  }

  if (
    exactFormatted.repeating
  ) {
    note +=
      " The exact result uses parentheses to identify the repeating cycle.";
  }

  return paperBlock(
    "Traditional Multiplication — Fractional Conversion",

    `Multiply the fractional part by ${targetBase}. Take the whole-number digit from each result, then continue with the new fractional part.`,

    lines,

    note
  );
}


// =====================================================
// COMPLETE CONVERSION SOLUTION
// =====================================================

function buildConversionSolution(
  input,
  fromBase,
  toBase
) {
  const value =
    parseNumber(
      input,
      fromBase
    );

  const formatted =
    formatNumber(
      value,
      toBase
    );

  const steps = [];

  // -----------------------------------------------
  // STEP 1 — IDENTIFY
  // -----------------------------------------------

  steps.push(
    textBlock(
      "Identify the Given Number",

      "Start by identifying the original number and its base.",

      [
        `Number: ${input.toUpperCase()}`,
        `Original base: ${fromBase}`,
        `Target base: ${toBase}`
      ]
    )
  );

  // -----------------------------------------------
  // CONVERT SOURCE TO DECIMAL
  // -----------------------------------------------

  if (
    fromBase !== 10
  ) {
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
        "Decimal Value",

        "The original number is already in Base 10.",

        [
          `Decimal value: ${decimalDescription(value)}`
        ]
      )
    );
  }

  // -----------------------------------------------
  // CONVERT DECIMAL TO TARGET BASE
  // -----------------------------------------------

  if (
    toBase !== 10
  ) {
    steps.push(
      integerConversionSteps(
        value,
        toBase
      )
    );

    if (
      absolute(value.n) %
      value.d !==
      0n
    ) {
      steps.push(
        fractionalConversionSteps(
          value,
          toBase
        )
      );
    }
  }

  // -----------------------------------------------
  // FINAL EXACT RESULT
  // -----------------------------------------------

  steps.push(
    finalBlock(
      "Final Conversion Result",

      `The number in Base ${toBase} is:`,

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

function calculateExactResult(
  first,
  second,
  operator
) {
  switch (operator) {
    case "+":
      return add(
        first,
        second
      );

    case "-":
      return subtract(
        first,
        second
      );

    case "*":
      return multiply(
        first,
        second
      );

    case "/":
      return divide(
        first,
        second
      );

    default:
      throw new Error(
        "Please select a valid operation."
      );
  }
}


function operationSymbol(
  operator
) {
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


function operationName(
  operator
) {
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
      return "Operation";
  }
}


// =====================================================
// TRADITIONAL MULTIPLICATION CORE
// =====================================================

function buildTraditionalMultiplication(
  firstText,
  secondText
) {
  const firstNegative =
    String(firstText)
      .startsWith("-");

  const secondNegative =
    String(secondText)
      .startsWith("-");

  const negative =
    firstNegative !==
    secondNegative;

  const firstUnsigned =
    String(firstText)
      .replace(
        /^[+-]/,
        ""
      );

  const secondUnsigned =
    String(secondText)
      .replace(
        /^[+-]/,
        ""
      );

  const firstPlaces =
    countFractionDigits(
      firstUnsigned
    );

  const secondPlaces =
    countFractionDigits(
      secondUnsigned
    );

  const totalPlaces =
    firstPlaces +
    secondPlaces;

  const firstIntegerText =
    removeDecimalPoint(
      firstUnsigned
    );

  const secondIntegerText =
    removeDecimalPoint(
      secondUnsigned
    );

  const firstInteger =
    BigInt(
      firstIntegerText
    );

  const secondInteger =
    BigInt(
      secondIntegerText
    );

  const multiplierDigits =
    secondIntegerText
      .split("");

  const partialProducts = [];

  for (
    let index =
        multiplierDigits.length - 1,
      shift = 0;

    index >= 0;

    index--,
      shift++
  ) {
    const digit =
      BigInt(
        multiplierDigits[
          index
        ]
      );

    /*
      Keep the shift as trailing zeroes.

      Example:
        738 × 6      = 4428
        738 × 60     = 44280
        738 × 600    = 442800
    */

    const raw =
      firstInteger *
      digit;

    let text =
      raw.toString() +
      "0".repeat(
        shift
      );

    if (
      raw === 0n
    ) {
      /*
        A zero partial product is displayed as 0
        rather than a misleading sequence such as 000.
      */
      text = "0";
    }

    partialProducts.push({
      digit:
        multiplierDigits[
          index
        ],

      shift,

      text
    });
  }

  const integerProduct =
    firstInteger *
    secondInteger;

  const integerProductText =
    integerProduct.toString();

  const width =
    Math.max(
      firstIntegerText.length,

      secondIntegerText.length + 2,

      integerProductText.length,

      ...partialProducts.map(
        item =>
          item.text.length
      )
    );

  const lines = [];

  lines.push(
    firstIntegerText.padStart(
      width
    )
  );

  lines.push(
    (
      "× " +
      secondIntegerText
    ).padStart(
      width
    )
  );

  lines.push(
    "─".repeat(
      width
    )
  );

  partialProducts.forEach(
    item => {
      lines.push(
        item.text.padStart(
          width
        )
      );
    }
  );

  if (
    partialProducts.length > 1
  ) {
    lines.push(
      "─".repeat(
        width
      )
    );

    lines.push(
      integerProductText.padStart(
        width
      )
    );
  }

  const decimalResult =
    insertDecimalPoint(
      integerProductText,
      totalPlaces
    );

  lines.push("");

  lines.push(
    `Decimal places: ${firstPlaces} + ${secondPlaces} = ${totalPlaces}`
  );

  if (
    totalPlaces > 0
  ) {
    lines.push(
      `Place the decimal point ${totalPlaces} digit${totalPlaces === 1 ? "" : "s"} from the right.`
    );
  }

  lines.push(
    `Written result: ${negative ? "−" : ""}${decimalResult}`
  );

  return {
    lines,

    displayedResult:
      (negative ? "-" : "") +
      decimalResult,

    totalPlaces
  };
}


// =====================================================
// TRADITIONAL MULTIPLICATION
// INCLUDING REPEATING DECIMAL VALUES
// =====================================================

function traditionalMultiplicationLines(
  first,
  second
) {
  const exactResult =
    multiply(
      first,
      second
    );

  const exactFirst =
    exactTerminatingText(
      first,
      10
    );

  const exactSecond =
    exactTerminatingText(
      second,
      10
    );

  /*
    If a value terminates, use it exactly.

    If it repeats, use a five-fractional-digit decimal
    preview for the WRITTEN demonstration only.
  */

  const firstPreview =
    exactFirst !== null
      ? {
          text: exactFirst,
          continues: false
        }
      : decimalWorkPreview(
          first,
          MAX_OPERATION_WORK_DIGITS
        );

  const secondPreview =
    exactSecond !== null
      ? {
          text: exactSecond,
          continues: false
        }
      : decimalWorkPreview(
          second,
          MAX_OPERATION_WORK_DIGITS
        );

  const work =
    buildTraditionalMultiplication(
      firstPreview.text,
      secondPreview.text
    );

  const lines = [];

  if (
    firstPreview.continues ||
    secondPreview.continues
  ) {
    lines.push(
      "Decimal values used for the written demonstration:"
    );

    lines.push("");

    lines.push(
      `First number:  ${firstPreview.text}${firstPreview.continues ? "…" : ""}`
    );

    lines.push(
      `Second number: ${secondPreview.text}${secondPreview.continues ? "…" : ""}`
    );

    lines.push("");

    lines.push(
      ...work.lines
    );

  } else {
    lines.push(
      ...work.lines
    );
  }

  let note =
    `Exact result: ${decimalDescription(exactResult)}`;

  if (
    firstPreview.continues ||
    secondPreview.continues
  ) {
    note +=
      `. A repeating operand was shortened to ${MAX_OPERATION_WORK_DIGITS} fractional digits only for the traditional written demonstration. The actual Calculation Result still uses the exact value.`;
  }

  return {
    lines,
    note
  };
}
// =====================================================
// TRADITIONAL ADDITION / SUBTRACTION
// =====================================================

function padDecimalParts(
  firstText,
  secondText
) {
  const firstNegative =
    String(firstText).startsWith("-");

  const secondNegative =
    String(secondText).startsWith("-");

  const firstUnsigned =
    String(firstText).replace(
      /^[+-]/,
      ""
    );

  const secondUnsigned =
    String(secondText).replace(
      /^[+-]/,
      ""
    );

  const firstParts =
    firstUnsigned.split(".");

  const secondParts =
    secondUnsigned.split(".");

  const firstWhole =
    firstParts[0] || "0";

  const secondWhole =
    secondParts[0] || "0";

  const firstFraction =
    firstParts[1] || "";

  const secondFraction =
    secondParts[1] || "";

  const wholeLength =
    Math.max(
      firstWhole.length,
      secondWhole.length
    );

  const fractionLength =
    Math.max(
      firstFraction.length,
      secondFraction.length
    );

  const normalizedFirst =
    firstWhole.padStart(
      wholeLength,
      "0"
    ) +
    (
      fractionLength > 0
        ? "." +
          firstFraction.padEnd(
            fractionLength,
            "0"
          )
        : ""
    );

  const normalizedSecond =
    secondWhole.padStart(
      wholeLength,
      "0"
    ) +
    (
      fractionLength > 0
        ? "." +
          secondFraction.padEnd(
            fractionLength,
            "0"
          )
        : ""
    );

  return {
    first:
      (firstNegative ? "-" : "") +
      normalizedFirst,

    second:
      (secondNegative ? "-" : "") +
      normalizedSecond,

    fractionLength
  };
}


// =====================================================
// TRADITIONAL ADDITION / SUBTRACTION LINES
// =====================================================

function traditionalAddSubtractLines(
  first,
  second,
  operator
) {
  const exactResult =
    operator === "+"
      ? add(first, second)
      : subtract(first, second);

  const firstExact =
    exactTerminatingText(
      first,
      10
    );

  const secondExact =
    exactTerminatingText(
      second,
      10
    );

  const firstPreview =
    firstExact !== null
      ? {
          text: firstExact,
          continues: false
        }
      : decimalWorkPreview(
          first,
          MAX_OPERATION_WORK_DIGITS
        );

  const secondPreview =
    secondExact !== null
      ? {
          text: secondExact,
          continues: false
        }
      : decimalWorkPreview(
          second,
          MAX_OPERATION_WORK_DIGITS
        );

  /*
    The exact result is used whenever it terminates.

    If the result repeats, the written demonstration
    receives the same five-digit decimal preview.
  */

  const exactResultText =
    exactTerminatingText(
      exactResult,
      10
    );

  const resultPreview =
    exactResultText !== null
      ? {
          text:
            exactResultText,

          continues:
            false
        }
      : decimalWorkPreview(
          exactResult,
          MAX_OPERATION_WORK_DIGITS
        );

  const aligned =
    padDecimalParts(
      firstPreview.text,
      secondPreview.text
    );

  /*
    We also normalize the result so that decimal points
    line up visually with the operands.
  */

  const firstUnsigned =
    aligned.first.replace(
      /^[+-]/,
      ""
    );

  const pointIndex =
    firstUnsigned.indexOf(".");

  let resultText =
    resultPreview.text;

  const resultNegative =
    resultText.startsWith("-");

  let resultUnsigned =
    resultText.replace(
      /^[+-]/,
      ""
    );

  if (
    aligned.fractionLength > 0
  ) {
    const parts =
      resultUnsigned.split(".");

    const whole =
      parts[0] || "0";

    const fraction =
      (parts[1] || "")
        .padEnd(
          aligned.fractionLength,
          "0"
        );

    resultUnsigned =
      whole +
      "." +
      fraction;
  }

  const symbol =
    operator === "+"
      ? "+"
      : "−";

  const operandWidth =
    Math.max(
      aligned.first.length,
      aligned.second.length + 2,
      resultUnsigned.length +
        (resultNegative ? 1 : 0)
    );

  const lines = [];

  if (
    firstPreview.continues ||
    secondPreview.continues
  ) {
    lines.push(
      "Decimal values used for the written demonstration:"
    );

    lines.push("");

    lines.push(
      `First number:  ${firstPreview.text}${firstPreview.continues ? "…" : ""}`
    );

    lines.push(
      `Second number: ${secondPreview.text}${secondPreview.continues ? "…" : ""}`
    );

    lines.push("");
  }

  lines.push(
    aligned.first.padStart(
      operandWidth
    )
  );

  lines.push(
    (
      symbol +
      " " +
      aligned.second
    ).padStart(
      operandWidth
    )
  );

  lines.push(
    "─".repeat(
      operandWidth
    )
  );

  lines.push(
    (
      (resultNegative ? "−" : "") +
      resultUnsigned
    ).padStart(
      operandWidth
    )
  );

  let note =
    `Exact result: ${decimalDescription(exactResult)}`;

  if (
    firstPreview.continues ||
    secondPreview.continues ||
    resultPreview.continues
  ) {
    note +=
      `. Repeating decimals are shortened to ${MAX_OPERATION_WORK_DIGITS} fractional digits only in the written demonstration. The actual Calculation Result remains exact.`;
  }

  return {
    lines,
    note
  };
}


// =====================================================
// TRADITIONAL ARITHMETIC STEP
// =====================================================

function arithmeticSteps(
  first,
  second,
  operator,
  result
) {
  if (
    operator === "*"
  ) {
    const work =
      traditionalMultiplicationLines(
        first,
        second
      );

    return paperBlock(
      "Traditional Multiplication",

      "Multiply by each digit of the second number, shift each partial product according to place value, then add the partial products.",

      work.lines,

      work.note
    );
  }

  if (
    operator === "+" ||
    operator === "-"
  ) {
    const work =
      traditionalAddSubtractLines(
        first,
        second,
        operator
      );

    return paperBlock(
      operator === "+"
        ? "Traditional Addition"
        : "Traditional Subtraction",

      operator === "+"
        ? "Line up the decimal points and add the numbers by place value."
        : "Line up the decimal points and subtract the numbers by place value.",

      work.lines,

      work.note
    );
  }

  return textBlock(
    operationName(operator),

    "Perform the arithmetic operation.",

    [
      `${decimalDescription(first)} ${operationSymbol(operator)} ${decimalDescription(second)}`,
      `= ${decimalDescription(result)}`
    ]
  );
}


// =====================================================
// TRADITIONAL LONG DIVISION
// DIGIT-BY-DIGIT SCHOOL METHOD
// =====================================================

function longDivisionSteps(
  first,
  second,
  base = 10
) {
  if (
    second.n === 0n
  ) {
    throw new Error(
      "Division by zero is not allowed."
    );
  }

  if (
    !Number.isInteger(base) ||
    base < 2 ||
    base > 36
  ) {
    throw new Error(
      "Base must be between 2 and 36."
    );
  }

  /*
    Convert

        a/b ÷ c/d

    into the equivalent integer division

        (a × d) ÷ (b × c)

    This keeps the calculation exact.
  */

  const rawDividend =
    first.n *
    second.d;

  const rawDivisor =
    first.d *
    second.n;

  const negative =
    (rawDividend < 0n) !==
    (rawDivisor < 0n);

  const dividend =
    absolute(
      rawDividend
    );

  const divisor =
    absolute(
      rawDivisor
    );

  if (
    divisor === 0n
  ) {
    throw new Error(
      "Division by zero is not allowed."
    );
  }

  const radix =
    BigInt(base);

  function toBaseText(
    value
  ) {
    return value
      .toString(base)
      .toUpperCase();
  }

  /*
    For the school-style working we scan the dividend
    digit by digit instead of simply calculating the
    complete whole-number quotient in one operation.
  */

  const dividendText =
    toBaseText(
      dividend
    );

  const divisorText =
    toBaseText(
      divisor
    );

  let remainder = 0n;

  const quotientWholeDigits = [];

  const operations = [];

  let quotientStarted = false;

  // -------------------------------------------------
  // WHOLE-NUMBER DIGITS
  // -------------------------------------------------

  for (
    let index = 0;
    index <
      dividendText.length;
    index++
  ) {
    const character =
      dividendText[index];

    const digitValue =
      BigInt(
        DIGITS.indexOf(
          character
        )
      );

    const partial =
      remainder *
      radix +
      digitValue;

    const quotientDigit =
      partial /
      divisor;

    const product =
      quotientDigit *
      divisor;

    const newRemainder =
      partial -
      product;

    /*
      Do not display unnecessary leading zero quotient
      digits. Once the quotient starts, internal zeros
      must be kept.
    */

    if (
      quotientDigit !== 0n ||
      quotientStarted ||
      index ===
        dividendText.length - 1
    ) {
      quotientStarted =
        true;

      quotientWholeDigits.push(
        DIGITS[
          Number(
            quotientDigit
          )
        ]
      );
    }

    /*
      Only create a subtraction operation once the
      divisor can actually be used, or after quotient
      writing has started.

      This avoids meaningless:

          1
        - 0
    */

    if (
      partial >= divisor ||
      (
        quotientStarted &&
        quotientDigit !== 0n
      )
    ) {
      operations.push({
        section:
          "whole",

        endColumn:
          index,

        partial,

        quotientDigit,

        product,

        remainder:
          newRemainder
      });
    }

    remainder =
      newRemainder;
  }

  let wholeText =
    quotientWholeDigits.join("");

  if (!wholeText) {
    wholeText = "0";
  }

  // -------------------------------------------------
  // FRACTIONAL DIGITS
  // -------------------------------------------------

  const fractionalDigits = [];
  const fractionalOperations = [];

  /*
    IMPORTANT:

    Do not stop immediately when a repeating remainder
    is found.

    Students asked to see up to five decimal digits,
    so repeating values such as 1 ÷ 3 display:

        0.33333

    rather than stopping at:

        0.(3)
  */

  const seenRemainders =
    new Map();

  let repeatDetected = false;
  let repeatStart = -1;

  for (
    let index = 0;
    index <
      MAX_DIVISION_WORK_DIGITS &&
    remainder !== 0n;
    index++
  ) {
    const key =
      remainder.toString();

    if (
      seenRemainders.has(key)
    ) {
      repeatDetected =
        true;

      if (
        repeatStart < 0
      ) {
        repeatStart =
          seenRemainders.get(
            key
          );
      }
    } else {
      seenRemainders.set(
        key,
        index
      );
    }

    /*
      Traditional "bring down 0".
    */

    const partial =
      remainder *
      radix;

    const quotientDigit =
      partial /
      divisor;

    const product =
      quotientDigit *
      divisor;

    const newRemainder =
      partial -
      product;

    fractionalDigits.push(
      DIGITS[
        Number(
          quotientDigit
        )
      ]
    );

    /*
      The visible dividend is:

          dividendText + "." + zeros

      Therefore the first fractional zero is located
      after the decimal point:

          dividendText.length + 1
    */

    fractionalOperations.push({
      section:
        "fraction",

      endColumn:
        dividendText.length +
        1 +
        index,

      partial,

      quotientDigit,

      product,

      remainder:
        newRemainder
    });

    remainder =
      newRemainder;
  }

  const continues =
    remainder !== 0n;

  // -------------------------------------------------
  // QUOTIENT
  // -------------------------------------------------

  let quotientText =
    wholeText;

  if (
    fractionalDigits.length >
    0
  ) {
    quotientText +=
      "." +
      fractionalDigits.join("");
  }

  if (
    negative &&
    dividend !== 0n
  ) {
    quotientText =
      "−" +
      quotientText;
  }

  /*
    We intentionally DO NOT add an ellipsis directly
    to the quotient.

    Example:

        3.74396

    The continuation is shown separately below:

        Division continues…
  */

  // -------------------------------------------------
  // WORKING DIVIDEND
  // -------------------------------------------------

  let workingDividend =
    dividendText;

  if (
    fractionalDigits.length >
    0
  ) {
    workingDividend +=
      "." +
      "0".repeat(
        fractionalDigits.length
      );
  }

  /*
    We need a character canvas wide enough for every
    subtraction line.

    Index positions correspond directly to the visible
    dividend, including the decimal point.
  */

  const workWidth =
    workingDividend.length;

  const prefix =
    " ".repeat(
      divisorText.length + 3
    );

  function placeByRightEdge(
    text,
    endColumn
  ) {
    const value =
      String(text);

    const start =
      Math.max(
        0,
        endColumn -
        value.length +
        1
      );

    return (
      prefix +
      " ".repeat(
        start
      ) +
      value
    );
  }

  function underlineByRightEdge(
    length,
    endColumn
  ) {
    const start =
      Math.max(
        0,
        endColumn -
        length +
        1
      );

    return (
      prefix +
      " ".repeat(
        start
      ) +
      "─".repeat(
        length
      )
    );
  }

  const lines = [];

  // -------------------------------------------------
  // QUOTIENT HEADER
  // -------------------------------------------------

  const quotientWithoutSign =
    quotientText.replace(
      /^−/,
      ""
    );

  /*
    Align the decimal point in the quotient with the
    decimal point in the dividend.

    For simple values padStart is sufficient because
    both are right-aligned to the working dividend.
  */

  lines.push(
    prefix +
    quotientText.padStart(
      Math.max(
        workWidth,
        quotientText.length
      )
    )
  );

  lines.push(
    prefix +
    "─".repeat(
      Math.max(
        workWidth,
        quotientWithoutSign.length
      )
    )
  );

  lines.push(
    `${divisorText} ) ${workingDividend}`
  );

  // -------------------------------------------------
  // WHOLE-NUMBER OPERATIONS
  // -------------------------------------------------

  for (
    const operation
    of operations
  ) {
    const partialText =
      toBaseText(
        operation.partial
      );

    const productText =
      toBaseText(
        operation.product
      );

    const remainderText =
      toBaseText(
        operation.remainder
      );

    const underlineLength =
      Math.max(
        partialText.length,
        productText.length
      );

    /*
      Partial dividend.
    */

    lines.push(
      placeByRightEdge(
        partialText,
        operation.endColumn
      )
    );

    /*
      Product to subtract.
    */

    lines.push(
      placeByRightEdge(
        productText,
        operation.endColumn
      )
    );

    /*
      Subtraction line.
    */

    lines.push(
      underlineByRightEdge(
        underlineLength,
        operation.endColumn
      )
    );

    /*
      Remainder.
    */

    lines.push(
      placeByRightEdge(
        remainderText,
        operation.endColumn
      )
    );
  }

  // -------------------------------------------------
  // FRACTIONAL OPERATIONS
  // -------------------------------------------------

  for (
    const operation
    of fractionalOperations
  ) {
    const partialText =
      toBaseText(
        operation.partial
      );

    const productText =
      toBaseText(
        operation.product
      );

    const remainderText =
      toBaseText(
        operation.remainder
      );

    const underlineLength =
      Math.max(
        partialText.length,
        productText.length
      );

    lines.push(
      placeByRightEdge(
        partialText,
        operation.endColumn
      )
    );

    lines.push(
      placeByRightEdge(
        productText,
        operation.endColumn
      )
    );

    lines.push(
      underlineByRightEdge(
        underlineLength,
        operation.endColumn
      )
    );

    lines.push(
      placeByRightEdge(
        remainderText,
        operation.endColumn
      )
    );
  }

  // -------------------------------------------------
  // CONTINUATION
  // -------------------------------------------------

  if (continues) {
    lines.push("");
    lines.push(
      prefix + "⋮"
    );

    lines.push(
      prefix +
      "Division continues…"
    );
  }

  // -------------------------------------------------
  // DESCRIPTION / NOTE
  // -------------------------------------------------

  let description =
    `Use traditional long division in Base ${base}. Divide, multiply, subtract, then bring down the next digit.`;

  if (
    first.d !== 1n ||
    second.d !== 1n
  ) {
    description +=
      " The original decimal values are first rewritten as an equivalent integer division so the written method remains exact.";
  }

  let note =
    `Displayed quotient: ${quotientText}.`;

  if (continues) {
    note +=
      ` Only the first ${MAX_DIVISION_WORK_DIGITS} fractional quotient digits are shown in the written division. The Calculation Result remains exact.`;
  }

  if (repeatDetected) {
    note +=
      " A remainder repeated, so the decimal expansion is repeating.";
  }

  if (negative) {
    note +=
      " The negative sign applies to the complete quotient.";
  }

  return paperBlock(
    `Traditional Long Division — Base ${base}`,

    description,

    lines,

    note
  );
}


// =====================================================
// PREPARE DIVISION STEP
// =====================================================

function divisionPreparationStep(
  first,
  second
) {
  const lines = [];

  lines.push(
    `Dividend: ${decimalDescription(first)}`
  );

  lines.push(
    `Divisor: ${decimalDescription(second)}`
  );

  /*
    When either operand contains a fractional value,
    show how BaseLab obtains an equivalent integer
    division before performing the school method.
  */

  if (
    first.d !== 1n ||
    second.d !== 1n
  ) {
    const integerDividend =
      absolute(
        first.n *
        second.d
      );

    const integerDivisor =
      absolute(
        first.d *
        second.n
      );

    lines.push("");
    lines.push(
      "Move the decimal values into an equivalent integer division:"
    );

    lines.push("");

    lines.push(
      `${decimalDescription(first)} ÷ ${decimalDescription(second)}`
    );

    lines.push("");

    lines.push(
      `Equivalent integer division: ${integerDividend} ÷ ${integerDivisor}`
    );

    lines.push("");

    lines.push(
      "This does not change the value of the quotient."
    );
  }

  return textBlock(
    "Prepare the Division",

    "Identify the dividend and divisor before starting traditional long division.",

    lines
  );
}


// =====================================================
// CALCULATOR SOLUTION BUILDER
// =====================================================

function buildCalculatorSolution(
  firstInput,
  firstBase,
  secondInput,
  secondBase,
  operator,
  resultBase
) {
  const first =
    parseNumber(
      firstInput,
      firstBase
    );

  const second =
    parseNumber(
      secondInput,
      secondBase
    );

  const result =
    calculateExactResult(
      first,
      second,
      operator
    );

  const formatted =
    formatNumber(
      result,
      resultBase
    );

  const steps = [];

  // -------------------------------------------------
  // IDENTIFY THE OPERATION
  // -------------------------------------------------

  steps.push(
    textBlock(
      "Identify the Operation",

      `The selected operation is ${operationName(operator)}.`,

      [
        `First number: ${String(firstInput).toUpperCase()} (Base ${firstBase})`,
        `Second number: ${String(secondInput).toUpperCase()} (Base ${secondBase})`,
        `Operation: ${operationSymbol(operator)}`,
        `Requested result base: ${resultBase}`
      ]
    )
  );

  // -------------------------------------------------
  // FIRST NUMBER TO DECIMAL
  // -------------------------------------------------

  if (
    firstBase !== 10
  ) {
    steps.push(
      positionalSteps(
        firstInput,
        firstBase,
        "Convert the First Number to Decimal"
      )
    );

  } else {
    steps.push(
      textBlock(
        "First Number in Decimal",

        "The first number is already in Base 10.",

        [
          `First number: ${decimalDescription(first)}`
        ]
      )
    );
  }

  // -------------------------------------------------
  // SECOND NUMBER TO DECIMAL
  // -------------------------------------------------

  if (
    secondBase !== 10
  ) {
    steps.push(
      positionalSteps(
        secondInput,
        secondBase,
        "Convert the Second Number to Decimal"
      )
    );

  } else {
    steps.push(
      textBlock(
        "Second Number in Decimal",

        "The second number is already in Base 10.",

        [
          `Second number: ${decimalDescription(second)}`
        ]
      )
    );
  }

  // -------------------------------------------------
  // PERFORM THE OPERATION
  // -------------------------------------------------

  if (
    operator === "/"
  ) {
    steps.push(
      divisionPreparationStep(
        first,
        second
      )
    );

    /*
      Arithmetic is demonstrated in decimal first.

      If another result base was selected, the exact
      result is converted afterward.
    */

    steps.push(
      longDivisionSteps(
        first,
        second,
        10
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

  // -------------------------------------------------
  // EXACT DECIMAL RESULT
  // -------------------------------------------------

  steps.push(
    textBlock(
      "Exact Decimal Result",

      "BaseLab keeps the exact mathematical value even when the written learning demonstration is shortened.",

      [
        `${decimalDescription(first)} ${operationSymbol(operator)} ${decimalDescription(second)}`,
        `= ${decimalDescription(result)}`
      ],

      result.d !== 1n
        ? `Exact fraction: ${fractionDescription(result)}`
        : ""
    )
  );

  // -------------------------------------------------
  // CONVERT RESULT TO REQUESTED BASE
  // -------------------------------------------------

  if (
    resultBase !== 10
  ) {
    steps.push(
      textBlock(
        "Prepare the Result for Base Conversion",

        `Now convert the exact decimal result to Base ${resultBase}.`,

        [
          `Decimal result: ${decimalDescription(result)}`,
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

    if (
      absolute(result.n) %
      result.d !==
      0n
    ) {
      steps.push(
        fractionalConversionSteps(
          result,
          resultBase
        )
      );
    }
  }

  // -------------------------------------------------
  // FINAL ANSWER
  // -------------------------------------------------

  steps.push(
    finalBlock(
      "Final Calculation Result",

      `The final result in Base ${resultBase} is:`,

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
// RESULT NOTE
// =====================================================

function fractionResultNote(
  formatted,
  base
) {
  if (
    formatted.repeating
  ) {
    return (
      `This Base ${base} result contains a repeating fractional expansion. ` +
      "Digits inside parentheses repeat indefinitely."
    );
  }

  if (
    formatted.truncated
  ) {
    return (
      `This Base ${base} fractional expansion is very long. ` +
      "The displayed result is shortened for readability."
    );
  }

  if (
    formatted.fractionText
  ) {
    return (
      `Exact result in Base ${base}.`
    );
  }

  return (
    `Exact whole-number result in Base ${base}.`
  );
}


// =====================================================
// SHOW ERROR
// =====================================================

function showError(
  message
) {
  const error =
    $("errorMessage");

  if (!error) {
    return;
  }

  error.textContent =
    message;

  error.hidden =
    false;
}


// =====================================================
// HIDE ERROR
// =====================================================

function hideError() {
  const error =
    $("errorMessage");

  if (!error) {
    return;
  }

  error.textContent = "";
  error.hidden = true;
}


// =====================================================
// STOP SOLUTION PLAYBACK
// =====================================================

function stopSolutionPlayback() {
  if (
    solutionTimer !== null
  ) {
    clearInterval(
      solutionTimer
    );

    solutionTimer =
      null;
  }
}


// =====================================================
// HIDE PREVIOUS RESULTS
// =====================================================

function hideResults() {
  stopSolutionPlayback();

  const resultSection =
    $("resultSection");

  const solutionSection =
    $("solutionSection");

  const solutionButton =
    $("solutionBtn");

  if (resultSection) {
    resultSection.hidden =
      true;
  }

  if (solutionSection) {
    solutionSection.hidden =
      true;
  }

  if (solutionButton) {
    solutionButton.textContent =
      "Show Step-by-Step Solution";
  }

  currentResult = "";
  currentSolution = [];
  solutionIndex = 0;

  updatePlayButton();
}


// =====================================================
// SHOW RESULT
// =====================================================

function showResult(
  formatted,
  base,
  steps
) {
  hideError();
  stopSolutionPlayback();

  currentResult =
    formatted.text;

  currentSolution =
    Array.isArray(steps)
      ? steps
      : [];

  solutionIndex = 0;

  const resultSection =
    $("resultSection");

  const resultNumber =
    $("resultNumber");

  const resultBase =
    $("resultBaseLabel") ||
    $("resultBaseText");

  const resultNote =
    $("resultNote");

  const solutionSection =
    $("solutionSection");

  const solutionButton =
    $("solutionBtn");

  if (resultNumber) {
    /*
      Keep the exact/repeating result here.

      DO NOT cut this to five digits. The five-digit
      limits apply only to the educational working.
    */

    resultNumber.textContent =
      formatted.text;
  }

  if (resultBase) {
    resultBase.textContent =
      `Base ${base}`;
  }

  if (resultNote) {
    resultNote.textContent =
      fractionResultNote(
        formatted,
        base
      );
  }

  if (resultSection) {
    resultSection.hidden =
      false;
  }

  if (solutionSection) {
    solutionSection.hidden =
      true;
  }

  if (solutionButton) {
    solutionButton.textContent =
      "Show Step-by-Step Solution";

    solutionButton.disabled =
      currentSolution.length === 0;
  }

  updatePlayButton();

  /*
    Keep the user's old interface behavior: after
    calculating/converting, bring the result into view.
  */

  if (resultSection) {
    resultSection.scrollIntoView({
      behavior:
        "smooth",

      block:
        "nearest"
    });
  }
}


// =====================================================
// CONVERT NUMBER
// =====================================================

function convertNumber() {
  hideError();

  const inputElement =
    $("convertNumber");

  const fromBaseElement =
    $("fromBase");

  const toBaseElement =
    $("toBase");

  if (
    !inputElement ||
    !fromBaseElement ||
    !toBaseElement
  ) {
    return;
  }

  const input =
    inputElement.value;

  const fromBase =
    Number(
      fromBaseElement.value
    );

  const toBase =
    Number(
      toBaseElement.value
    );

  try {
    const conversion =
      buildConversionSolution(
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
    hideResults();

    showError(
      error.message ||
      "Unable to convert the number."
    );
  }
}


// =====================================================
// CALCULATE NUMBER
// =====================================================

function calculateNumber() {
  hideError();

  const firstNumberElement =
    $("firstNumber");

  const firstBaseElement =
    $("firstBase");

  const secondNumberElement =
    $("secondNumber");

  const secondBaseElement =
    $("secondBase");

  const operatorElement =
    $("operator");

  const resultBaseElement =
    $("resultBase");

  if (
    !firstNumberElement ||
    !firstBaseElement ||
    !secondNumberElement ||
    !secondBaseElement ||
    !operatorElement ||
    !resultBaseElement
  ) {
    return;
  }

  const firstInput =
    firstNumberElement.value;

  const firstBase =
    Number(
      firstBaseElement.value
    );

  const secondInput =
    secondNumberElement.value;

  const secondBase =
    Number(
      secondBaseElement.value
    );

  const operator =
    operatorElement.value;

  const resultBase =
    Number(
      resultBaseElement.value
    );

  try {
    const calculation =
      buildCalculatorSolution(
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
    hideResults();

    showError(
      error.message ||
      "Unable to calculate the result."
    );
  }
}


// =====================================================
// SWAP CONVERTER BASES
// =====================================================

function swapBases() {
  const from =
    $("fromBase");

  const to =
    $("toBase");

  if (
    !from ||
    !to
  ) {
    return;
  }

  const oldFrom =
    from.value;

  from.value =
    to.value;

  to.value =
    oldFrom;

  hideResults();
}


// =====================================================
// RESET CONVERTER
// =====================================================

function resetConverter() {
  const input =
    $("convertNumber");

  const from =
    $("fromBase");

  const to =
    $("toBase");

  if (input) {
    input.value = "";
  }

  if (from) {
    from.value = "10";
  }

  if (to) {
    to.value = "2";
  }

  hideError();
  hideResults();

  if (input) {
    input.focus();
  }
}


// =====================================================
// RESET CALCULATOR
// =====================================================

function resetCalculator() {
  const first =
    $("firstNumber");

  const second =
    $("secondNumber");

  const firstBase =
    $("firstBase");

  const secondBase =
    $("secondBase");

  const operator =
    $("operator");

  const resultBase =
    $("resultBase");

  if (first) {
    first.value = "";
  }

  if (second) {
    second.value = "";
  }

  if (firstBase) {
    firstBase.value =
      "10";
  }

  if (secondBase) {
    secondBase.value =
      "10";
  }

  if (operator) {
    operator.value =
      "+";
  }

  if (resultBase) {
    resultBase.value =
      "10";
  }

  hideError();
  hideResults();

  if (first) {
    first.focus();
  }
}


// =====================================================
// COPY RESULT
// =====================================================

async function copyResult() {
  if (!currentResult) {
    return;
  }

  const button =
    $("copyBtn");

  try {
    await navigator.clipboard.writeText(
      currentResult
    );

    if (button) {
      const original =
        button.textContent;

      button.textContent =
        "Copied!";

      setTimeout(
        () => {
          button.textContent =
            original;
        },
        1200
      );
    }

  } catch (error) {
    /*
      Fallback for browsers/pages where the Clipboard
      API is unavailable.
    */

    const textarea =
      document.createElement(
        "textarea"
      );

    textarea.value =
      currentResult;

    textarea.setAttribute(
      "readonly",
      ""
    );

    textarea.style.position =
      "fixed";

    textarea.style.opacity =
      "0";

    document.body.appendChild(
      textarea
    );

    textarea.select();

    document.execCommand(
      "copy"
    );

    textarea.remove();

    if (button) {
      const original =
        button.textContent;

      button.textContent =
        "Copied!";

      setTimeout(
        () => {
          button.textContent =
            original;
        },
        1200
      );
    }
  }
}
// =====================================================
// POPULATE BASE SELECTORS
// =====================================================

function populateBaseSelectors() {
  const selectorIds = [
    "fromBase",
    "toBase",
    "firstBase",
    "secondBase",
    "resultBase"
  ];

  selectorIds.forEach(
    id => {
      const select =
        $(id);

      if (!select) {
        return;
      }

      /*
        Remember the current value in case the HTML
        already assigned a default.
      */

      const currentValue =
        select.value;

      select.innerHTML = "";

      for (
        let base = 2;
        base <= 36;
        base++
      ) {
        const option =
          document.createElement(
            "option"
          );

        option.value =
          String(base);

        if (
          BASE_NAMES[base]
        ) {
          option.textContent =
            `Base ${base} — ${BASE_NAMES[base]}`;

        } else {
          option.textContent =
            `Base ${base}`;
        }

        select.appendChild(
          option
        );
      }

      /*
        Restore an existing valid value when possible.
      */

      if (
        currentValue &&
        Number(currentValue) >= 2 &&
        Number(currentValue) <= 36
      ) {
        select.value =
          currentValue;
      }
    }
  );

  // -------------------------------------------------
  // DEFAULT VALUES
  // -------------------------------------------------

  const fromBase =
    $("fromBase");

  const toBase =
    $("toBase");

  const firstBase =
    $("firstBase");

  const secondBase =
    $("secondBase");

  const resultBase =
    $("resultBase");

  if (
    fromBase &&
    !fromBase.value
  ) {
    fromBase.value =
      "10";
  }

  if (
    toBase &&
    !toBase.value
  ) {
    toBase.value =
      "2";
  }

  if (
    firstBase &&
    !firstBase.value
  ) {
    firstBase.value =
      "10";
  }

  if (
    secondBase &&
    !secondBase.value
  ) {
    secondBase.value =
      "10";
  }

  if (
    resultBase &&
    !resultBase.value
  ) {
    resultBase.value =
      "10";
  }
}


// =====================================================
// CREATE SIMPLE SOLUTION LINE
// =====================================================

function createSolutionLine(
  text
) {
  const line =
    document.createElement(
      "p"
    );

  line.textContent =
    String(text);

  return line;
}


// =====================================================
// CREATE SOLUTION NOTE
// =====================================================

function createSolutionNote(
  text
) {
  const note =
    document.createElement(
      "div"
    );

  note.className =
    "solution-note";

  note.textContent =
    String(text);

  return note;
}


// =====================================================
// RENDER TEXT SOLUTION BLOCK
// =====================================================

function renderTextSolution(
  container,
  step
) {
  const lines =
    document.createElement(
      "div"
    );

  lines.className =
    "solution-lines";

  (
    step.lines || []
  ).forEach(
    text => {
      lines.appendChild(
        createSolutionLine(
          text
        )
      );
    }
  );

  container.appendChild(
    lines
  );

  if (step.note) {
    container.appendChild(
      createSolutionNote(
        step.note
      )
    );
  }
}


// =====================================================
// RENDER TABLE SOLUTION BLOCK
// =====================================================

function renderTableSolution(
  container,
  step
) {
  const wrapper =
    document.createElement(
      "div"
    );

  wrapper.className =
    "solution-table-wrapper";

  const table =
    document.createElement(
      "table"
    );

  table.className =
    "solution-table";

  // -------------------------------------------------
  // TABLE HEADER
  // -------------------------------------------------

  if (
    step.headers &&
    step.headers.length
  ) {
    const thead =
      document.createElement(
        "thead"
      );

    const tr =
      document.createElement(
        "tr"
      );

    step.headers.forEach(
      header => {
        const th =
          document.createElement(
            "th"
          );

        th.textContent =
          String(header);

        tr.appendChild(
          th
        );
      }
    );

    thead.appendChild(
      tr
    );

    table.appendChild(
      thead
    );
  }

  // -------------------------------------------------
  // TABLE BODY
  // -------------------------------------------------

  const tbody =
    document.createElement(
      "tbody"
    );

  (
    step.rows || []
  ).forEach(
    row => {
      const tr =
        document.createElement(
          "tr"
        );

      row.forEach(
        cell => {
          const td =
            document.createElement(
              "td"
            );

          td.textContent =
            String(cell);

          tr.appendChild(
            td
          );
        }
      );

      tbody.appendChild(
        tr
      );
    }
  );

  table.appendChild(
    tbody
  );

  wrapper.appendChild(
    table
  );

  container.appendChild(
    wrapper
  );

  if (step.note) {
    container.appendChild(
      createSolutionNote(
        step.note
      )
    );
  }
}


// =====================================================
// RENDER TRADITIONAL WRITTEN MATH
// =====================================================

function renderPaperSolution(
  container,
  step
) {
  const wrapper =
    document.createElement(
      "div"
    );

  wrapper.className =
    "baselab-written-math";

  const pre =
    document.createElement(
      "pre"
    );

  /*
    white-space: pre in our injected CSS preserves
    every space and line break.

    This is required for:

      traditional addition
      traditional subtraction
      traditional multiplication
      traditional long division
      base-conversion division
      base-conversion multiplication
  */

  pre.textContent =
    (
      step.lines || []
    ).join("\n");

  wrapper.appendChild(
    pre
  );

  container.appendChild(
    wrapper
  );

  if (step.note) {
    container.appendChild(
      createSolutionNote(
        step.note
      )
    );
  }
}


// =====================================================
// RENDER FINAL ANSWER
// =====================================================

function renderFinalSolution(
  container,
  step
) {
  const wrapper =
    document.createElement(
      "div"
    );

  wrapper.className =
    "solution-final-answer";

  const label =
    document.createElement(
      "p"
    );

  label.textContent =
    step.description ||
    "Final answer:";

  const answer =
    document.createElement(
      "strong"
    );

  answer.textContent =
    step.answer;

  wrapper.appendChild(
    label
  );

  wrapper.appendChild(
    answer
  );

  container.appendChild(
    wrapper
  );
}


// =====================================================
// UPDATE SOLUTION PROGRESS
// =====================================================

function updateSolutionProgress() {
  const total =
    currentSolution.length;

  const current =
    total > 0
      ? solutionIndex + 1
      : 0;

  const percentage =
    total > 0
      ? (
          current /
          total
        ) * 100
      : 0;

  // -------------------------------------------------
  // STEP COUNTER
  // -------------------------------------------------

  const counter =
    $("stepCounter") ||
    $("solutionStepCounter");

  if (counter) {
    counter.textContent =
      total > 0
        ? `Step ${current} of ${total}`
        : "Step 0 of 0";
  }

  // -------------------------------------------------
  // PROGRESS BAR
  // -------------------------------------------------

  const progress =
    $("solutionProgressBar") ||
    $("solutionProgress");

  if (progress) {
    progress.style.width =
      `${percentage}%`;

    progress.setAttribute(
      "aria-valuemin",
      "0"
    );

    progress.setAttribute(
      "aria-valuemax",
      "100"
    );

    progress.setAttribute(
      "aria-valuenow",
      String(
        Math.round(
          percentage
        )
      )
    );
  }

  // -------------------------------------------------
  // PREVIOUS BUTTON
  // -------------------------------------------------

  const previous =
    $("previousStepBtn");

  if (previous) {
    previous.disabled =
      total === 0 ||
      solutionIndex <= 0;
  }

  // -------------------------------------------------
  // NEXT BUTTON
  // -------------------------------------------------

  const next =
    $("nextStepBtn");

  if (next) {
    next.disabled =
      total === 0 ||
      solutionIndex >=
        total - 1;
  }

  // -------------------------------------------------
  // RESTART BUTTON
  // -------------------------------------------------

  const restart =
    $("resetStepBtn");

  if (restart) {
    restart.disabled =
      total === 0;
  }

  // -------------------------------------------------
  // PLAY BUTTON
  // -------------------------------------------------

  const play =
    $("playStepBtn");

  if (play) {
    play.disabled =
      total <= 1;
  }
}


// =====================================================
// RENDER CURRENT SOLUTION STEP
// =====================================================

function renderSolutionStep() {
  const container =
    $("solutionSteps");

  if (!container) {
    return;
  }

  container.innerHTML =
    "";

  if (
    !currentSolution.length
  ) {
    const empty =
      document.createElement(
        "p"
      );

    empty.textContent =
      "No solution steps are available.";

    container.appendChild(
      empty
    );

    updateSolutionProgress();

    return;
  }

  /*
    Keep the index valid.
  */

  if (
    solutionIndex < 0
  ) {
    solutionIndex = 0;
  }

  if (
    solutionIndex >=
    currentSolution.length
  ) {
    solutionIndex =
      currentSolution.length - 1;
  }

  const step =
    currentSolution[
      solutionIndex
    ];

  // -------------------------------------------------
  // STEP NUMBER
  // -------------------------------------------------

  const eyebrow =
    document.createElement(
      "div"
    );

  eyebrow.className =
    "solution-step-label";

  eyebrow.textContent =
    `Step ${solutionIndex + 1}`;

  container.appendChild(
    eyebrow
  );

  // -------------------------------------------------
  // TITLE
  // -------------------------------------------------

  const title =
    document.createElement(
      "h3"
    );

  title.className =
    "solution-step-title";

  title.textContent =
    step.title ||
    "Solution";

  container.appendChild(
    title
  );

  // -------------------------------------------------
  // DESCRIPTION
  // -------------------------------------------------

  if (step.description) {
    const description =
      document.createElement(
        "p"
      );

    description.className =
      "solution-step-description";

    description.textContent =
      step.description;

    container.appendChild(
      description
    );
  }

  // -------------------------------------------------
  // BLOCK CONTENT
  // -------------------------------------------------

  switch (step.type) {
    case "table":
      renderTableSolution(
        container,
        step
      );
      break;

    case "paper":
      renderPaperSolution(
        container,
        step
      );
      break;

    case "final":
      renderFinalSolution(
        container,
        step
      );
      break;

    case "text":
    default:
      renderTextSolution(
        container,
        step
      );
      break;
  }

  updateSolutionProgress();
}


// =====================================================
// SHOW / HIDE STEP-BY-STEP SOLUTION
// =====================================================

function toggleSolution() {
  const section =
    $("solutionSection");

  const button =
    $("solutionBtn");

  if (
    !section ||
    !button ||
    !currentSolution.length
  ) {
    return;
  }

  const currentlyHidden =
    section.hidden;

  if (
    currentlyHidden
  ) {
    section.hidden =
      false;

    button.textContent =
      "Hide Step-by-Step Solution";

    /*
      Always begin from Step 1 when opening a newly
      calculated solution.
    */

    if (
      solutionIndex < 0 ||
      solutionIndex >=
        currentSolution.length
    ) {
      solutionIndex = 0;
    }

    renderSolutionStep();

    section.scrollIntoView({
      behavior:
        "smooth",

      block:
        "start"
    });

  } else {
    section.hidden =
      true;

    button.textContent =
      "Show Step-by-Step Solution";

    stopSolutionPlayback();
    updatePlayButton();
  }
}


// =====================================================
// PREVIOUS STEP
// =====================================================

function previousSolutionStep() {
  stopSolutionPlayback();
  updatePlayButton();

  if (
    !currentSolution.length
  ) {
    return;
  }

  if (
    solutionIndex > 0
  ) {
    solutionIndex--;

    renderSolutionStep();
  }
}


// =====================================================
// NEXT STEP
// =====================================================

function nextSolutionStep() {
  stopSolutionPlayback();
  updatePlayButton();

  if (
    !currentSolution.length
  ) {
    return;
  }

  if (
    solutionIndex <
    currentSolution.length - 1
  ) {
    solutionIndex++;

    renderSolutionStep();
  }
}


// =====================================================
// RESTART SOLUTION
// =====================================================

function restartSolution() {
  stopSolutionPlayback();
  updatePlayButton();

  if (
    !currentSolution.length
  ) {
    return;
  }

  solutionIndex = 0;

  renderSolutionStep();
}


// =====================================================
// UPDATE PLAY BUTTON
// =====================================================

function updatePlayButton() {
  const button =
    $("playStepBtn");

  if (!button) {
    return;
  }

  if (
    solutionTimer !== null
  ) {
    button.textContent =
      "Ⅱ Pause";

    button.setAttribute(
      "aria-label",
      "Pause solution"
    );

  } else {
    button.textContent =
      "▶ Play All";

    button.setAttribute(
      "aria-label",
      "Play all solution steps"
    );
  }
}


// =====================================================
// PLAY ALL / PAUSE
// =====================================================

function toggleSolutionPlayback() {
  if (
    !currentSolution.length
  ) {
    return;
  }

  /*
    If already playing, pause.
  */

  if (
    solutionTimer !== null
  ) {
    stopSolutionPlayback();
    updatePlayButton();

    return;
  }

  /*
    If currently at the final step, Play All restarts
    the explanation from Step 1.
  */

  if (
    solutionIndex >=
    currentSolution.length - 1
  ) {
    solutionIndex = 0;

    renderSolutionStep();
  }

  solutionTimer =
    setInterval(
      () => {
        if (
          solutionIndex >=
          currentSolution.length - 1
        ) {
          stopSolutionPlayback();
          updatePlayButton();

          return;
        }

        solutionIndex++;

        renderSolutionStep();

        if (
          solutionIndex >=
          currentSolution.length - 1
        ) {
          stopSolutionPlayback();
          updatePlayButton();
        }
      },

      1800
    );

  updatePlayButton();
}


// =====================================================
// KEYBOARD SUPPORT FOR SOLUTION
// =====================================================

function initializeSolutionKeyboard() {
  document.addEventListener(
    "keydown",
    event => {
      const section =
        $("solutionSection");

      if (
        !section ||
        section.hidden ||
        !currentSolution.length
      ) {
        return;
      }

      /*
        Do not intercept arrow keys while the user is
        typing inside an input, textarea, or select.
      */

      const target =
        event.target;

      if (
        target &&
        (
          target.tagName ===
            "INPUT" ||
          target.tagName ===
            "TEXTAREA" ||
          target.tagName ===
            "SELECT"
        )
      ) {
        return;
      }

      if (
        event.key ===
        "ArrowRight"
      ) {
        event.preventDefault();

        nextSolutionStep();
      }

      if (
        event.key ===
        "ArrowLeft"
      ) {
        event.preventDefault();

        previousSolutionStep();
      }
    }
  );
}


// =====================================================
// WORKSPACE TAB HELPERS
// =====================================================

function getTabTarget(
  button
) {
  if (!button) {
    return "";
  }

  /*
    Support the different attribute names used by
    versions of the old BaseLab interface.
  */

  return (
    button.dataset.tab ||
    button.dataset.target ||
    button.getAttribute(
      "data-section"
    ) ||
    ""
  );
}


function findWorkspaceSection(
  target
) {
  if (!target) {
    return null;
  }

  return (
    $(target) ||
    document.querySelector(
      `[data-workspace="${target}"]`
    )
  );
}


// =====================================================
// ACTIVATE WORKSPACE TAB
// =====================================================

function activateWorkspaceTab(
  button
) {
  if (!button) {
    return;
  }

  const target =
    getTabTarget(
      button
    );

  const section =
    findWorkspaceSection(
      target
    );

  if (!section) {
    return;
  }

  // -------------------------------------------------
  // TAB BUTTONS
  // -------------------------------------------------

  document
    .querySelectorAll(
      ".tab"
    )
    .forEach(
      tab => {
        tab.classList.remove(
          "active"
        );

        tab.setAttribute(
          "aria-selected",
          "false"
        );
      }
    );

  button.classList.add(
    "active"
  );

  button.setAttribute(
    "aria-selected",
    "true"
  );

  // -------------------------------------------------
  // WORKSPACE PANELS
  // -------------------------------------------------

  document
    .querySelectorAll(
      ".tab-content"
    )
    .forEach(
      panel => {
        panel.classList.remove(
          "active"
        );

        panel.hidden =
          true;
      }
    );

  section.classList.add(
    "active"
  );

  section.hidden =
    false;

  /*
    A result from the other workspace should not remain
    visible after switching between Converter and
    Calculator.
  */

  hideResults();
  hideError();
}


// =====================================================
// INITIALIZE WORKSPACE TABS
// =====================================================

function initializeWorkspaceTabs() {
  const tabs =
    document.querySelectorAll(
      ".tab"
    );

  tabs.forEach(
    button => {
      button.addEventListener(
        "click",
        () => {
          activateWorkspaceTab(
            button
          );
        }
      );
    }
  );

  /*
    Preserve the active workspace already selected by
    the HTML.

    If none is active, use the first available tab.
  */

  const active =
    document.querySelector(
      ".tab.active"
    );

  if (active) {
    const target =
      getTabTarget(
        active
      );

    const section =
      findWorkspaceSection(
        target
      );

    if (section) {
      section.hidden =
        false;

      section.classList.add(
        "active"
      );
    }

    return;
  }

  if (
    tabs.length > 0
  ) {
    activateWorkspaceTab(
      tabs[0]
    );
  }
}


// =====================================================
// QUICK REFERENCE BASE BUTTONS
// =====================================================

function initializeQuickReference() {
  const buttons =
    document.querySelectorAll(
      "[data-base]"
    );

  buttons.forEach(
    button => {
      button.addEventListener(
        "click",
        () => {
          const base =
            Number(
              button.dataset.base
            );

          if (
            !Number.isInteger(base) ||
            base < 2 ||
            base > 36
          ) {
            return;
          }

          /*
            Quick Reference buttons should not destroy
            any typed number. They simply change the
            most relevant base selector in the active
            workspace.
          */

          const converterPanel =
            $("converter") ||
            $("converterTab") ||
            document.querySelector(
              '[data-workspace="converter"]'
            );

          const calculatorPanel =
            $("calculator") ||
            $("calculatorTab") ||
            document.querySelector(
              '[data-workspace="calculator"]'
            );

          if (
            converterPanel &&
            (
              converterPanel.classList.contains(
                "active"
              ) ||
              !converterPanel.hidden
            )
          ) {
            const from =
              $("fromBase");

            if (from) {
              from.value =
                String(base);
            }

            hideResults();

            return;
          }

          if (
            calculatorPanel &&
            (
              calculatorPanel.classList.contains(
                "active"
              ) ||
              !calculatorPanel.hidden
            )
          ) {
            const first =
              $("firstBase");

            if (first) {
              first.value =
                String(base);
            }

            hideResults();
          }
        }
      );
    }
  );
}


// =====================================================
// MOBILE NAVIGATION
// =====================================================

function initializeMobileNavigation() {
 function initializeMobileNavigation() {
  const toggle =
    $("mobileMenuToggle") ||
    document.querySelector(
      ".mobile-menu-toggle"
    );

  const menu =
    $("mobileNavigation") ||
    $("mobileMenuContent");

  if (
    !toggle ||
    !menu
  ) {
    return;
  }

  function closeMenu() {
    menu.classList.remove(
      "is-open"
    );

    toggle.classList.remove(
      "is-open"
    );

    toggle.setAttribute(
      "aria-expanded",
      "false"
    );

    toggle.setAttribute(
      "aria-label",
      "Open navigation menu"
    );
  }

  function openMenu() {
    menu.classList.add(
      "is-open"
    );

    toggle.classList.add(
      "is-open"
    );

    toggle.setAttribute(
      "aria-expanded",
      "true"
    );

    toggle.setAttribute(
      "aria-label",
      "Close navigation menu"
    );
  }

  // =================================================
  // BURGER BUTTON
  // =================================================

  toggle.addEventListener(
    "click",
    event => {
      event.preventDefault();
      event.stopPropagation();

      const isOpen =
        menu.classList.contains(
          "is-open"
        );

      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    }
  );

  // =================================================
  // CLOSE AFTER SELECTING A MENU ITEM
  // =================================================

  menu
    .querySelectorAll(
      ".tab"
    )
    .forEach(
      button => {
        button.addEventListener(
          "click",
          () => {
            if (
              window.innerWidth <= 760
            ) {
              closeMenu();
            }
          }
        );
      }
    );

  // =================================================
  // CLOSE WITH ESCAPE
  // =================================================

  document.addEventListener(
    "keydown",
    event => {
      if (
        event.key ===
        "Escape"
      ) {
        closeMenu();
      }
    }
  );

  // =================================================
  // CLOSE WHEN CLICKING OUTSIDE
  // =================================================

  document.addEventListener(
    "click",
    event => {
      if (
        window.innerWidth <= 760 &&
        !menu.contains(
          event.target
        ) &&
        !toggle.contains(
          event.target
        )
      ) {
        closeMenu();
      }
    }
  );

  // =================================================
  // RESET WHEN RETURNING TO DESKTOP
  // =================================================

  window.addEventListener(
    "resize",
    () => {
      if (
        window.innerWidth > 760
      ) {
        closeMenu();
      }
    }
  );
}


// =====================================================
// SAFE CLICK LISTENER
// =====================================================

function addClickListener(
  id,
  callback
) {
  const element =
    $(id);

  if (!element) {
    return;
  }

  element.addEventListener(
    "click",
    callback
  );
}


// =====================================================
// SAFE ENTER LISTENER
// =====================================================

function addEnterListener(
  id,
  callback
) {
  const element =
    $(id);

  if (!element) {
    return;
  }

  element.addEventListener(
    "keydown",
    event => {
      if (
        event.key !==
        "Enter"
      ) {
        return;
      }

      event.preventDefault();

      callback();
    }
  );
}


// =====================================================
// CALCULATOR / CONVERTER BUTTON EVENTS
// =====================================================

function initializeControls() {
  // -------------------------------------------------
  // BASE CONVERTER
  // -------------------------------------------------

  addClickListener(
    "convertBtn",
    convertNumber
  );

  addClickListener(
    "swapBtn",
    swapBases
  );

  addClickListener(
    "resetConvertBtn",
    resetConverter
  );

  addEnterListener(
    "convertNumber",
    convertNumber
  );

  // -------------------------------------------------
  // BASE CALCULATOR
  // -------------------------------------------------

  addClickListener(
    "calculateBtn",
    calculateNumber
  );

  addClickListener(
    "resetCalcBtn",
    resetCalculator
  );

  addEnterListener(
    "firstNumber",
    calculateNumber
  );

  addEnterListener(
    "secondNumber",
    calculateNumber
  );

  // -------------------------------------------------
  // RESULT
  // -------------------------------------------------

  addClickListener(
    "copyBtn",
    copyResult
  );

  addClickListener(
    "solutionBtn",
    toggleSolution
  );

  // -------------------------------------------------
  // STEP-BY-STEP CONTROLS
  // -------------------------------------------------

  addClickListener(
    "previousStepBtn",
    previousSolutionStep
  );

  addClickListener(
    "nextStepBtn",
    nextSolutionStep
  );

  addClickListener(
    "playStepBtn",
    toggleSolutionPlayback
  );

  addClickListener(
    "resetStepBtn",
    restartSolution
  );
}


// =====================================================
// INPUT CHANGE HANDLING
// =====================================================

function initializeInputChanges() {
  const ids = [
    "convertNumber",
    "fromBase",
    "toBase",

    "firstNumber",
    "firstBase",

    "secondNumber",
    "secondBase",

    "operator",
    "resultBase"
  ];

  ids.forEach(
    id => {
      const element =
        $(id);

      if (!element) {
        return;
      }

      const eventName =
        element.tagName ===
        "SELECT"
          ? "change"
          : "input";

      element.addEventListener(
        eventName,
        () => {
          /*
            Once the input changes, the previous answer
            no longer belongs to the current problem.
          */

          hideResults();
          hideError();
        }
      );
    }
  );
}


// =====================================================
// INITIAL RESULT / SOLUTION STATE
// =====================================================

function initializeResultState() {
  const resultSection =
    $("resultSection");

  const solutionSection =
    $("solutionSection");

  const error =
    $("errorMessage");

  if (resultSection) {
    resultSection.hidden =
      true;
  }

  if (solutionSection) {
    solutionSection.hidden =
      true;
  }

  if (error) {
    error.hidden =
      true;
  }

  currentResult = "";
  currentSolution = [];
  solutionIndex = 0;

  updateSolutionProgress();
  updatePlayButton();
}
// =====================================================
// BASELAB WRITTEN-MATH / LEARNING-MODE STYLES
// =====================================================

function initializeWrittenMathStyles() {
  /*
    Avoid inserting the stylesheet more than once.
  */

  if (
    $("baselabWrittenMathStyles")
  ) {
    return;
  }

  const style =
    document.createElement(
      "style"
    );

  style.id =
    "baselabWrittenMathStyles";

  style.textContent = `

    /* =================================================
       STEP-BY-STEP SOLUTION
       ================================================= */

    .solution-step-label {
      display: inline-flex;
      align-items: center;

      margin-bottom: 8px;

      padding: 5px 10px;

      border-radius: 999px;

      background: #f0edff;

      color: #6758d9;

      font-size: 12px;
      font-weight: 700;

      letter-spacing: 0.04em;
      text-transform: uppercase;
    }


    .solution-step-title {
      margin:
        0 0 8px;

      color: #22243a;

      font-size:
        clamp(
          20px,
          2.5vw,
          26px
        );

      line-height: 1.25;
    }


    .solution-step-description {
      margin:
        0 0 18px;

      color: #66697c;

      line-height: 1.65;
    }


    /* =================================================
       NORMAL SOLUTION LINES
       ================================================= */

    .solution-lines {
      display: flex;

      flex-direction: column;

      gap: 7px;

      margin-top: 14px;
    }


    .solution-lines p {
      margin: 0;

      color: #33364d;

      line-height: 1.65;

      overflow-wrap: anywhere;
    }


    /* =================================================
       NOTES
       ================================================= */

    .solution-note {
      margin-top: 18px;

      padding:
        13px 15px;

      background:
        #f7f6ff;

      border-left:
        4px solid
        #6758d9;

      border-radius:
        8px;

      color:
        #4f5267;

      font-size:
        14px;

      line-height:
        1.65;
    }


    /* =================================================
       TRADITIONAL WRITTEN MATHEMATICS
       ================================================= */

    .baselab-written-math {
      width: 100%;

      box-sizing:
        border-box;

      margin:
        18px 0 4px;

      padding:
        22px 20px;

      background:
        #faf9ff;

      border:
        1px solid
        #e5e1ff;

      border-radius:
        14px;

      overflow-x:
        auto;

      text-align:
        left;
    }


    .baselab-written-math pre {
      display:
        inline-block;

      min-width:
        max-content;

      margin: 0;

      padding: 0;

      color:
        #252943;

      font-family:
        "Courier New",
        Consolas,
        "Liberation Mono",
        monospace;

      font-size:
        16px;

      font-weight:
        600;

      line-height:
        1.55;

      letter-spacing:
        0;

      white-space:
        pre;

      text-align:
        left;

      tab-size:
        4;

      font-variant-numeric:
        tabular-nums;
    }


    /* =================================================
       SOLUTION TABLE
       ================================================= */

    .solution-table-wrapper {
      width: 100%;

      margin-top:
        16px;

      overflow-x:
        auto;

      border:
        1px solid
        #e8e8f0;

      border-radius:
        10px;
    }


    .solution-table {
      width: 100%;

      border-collapse:
        collapse;

      background:
        #ffffff;

      font-size:
        14px;
    }


    .solution-table th {
      padding:
        11px 12px;

      background:
        #f7f6ff;

      border-bottom:
        1px solid
        #e6e4f5;

      color:
        #34335d;

      font-weight:
        700;

      text-align:
        left;

      white-space:
        nowrap;
    }


    .solution-table td {
      padding:
        11px 12px;

      border-bottom:
        1px solid
        #eeeeF4;

      color:
        #3d4055;

      text-align:
        left;

      white-space:
        nowrap;
    }


    .solution-table tbody tr:last-child td {
      border-bottom:
        none;
    }


    .solution-table tbody tr:nth-child(even) {
      background:
        #fbfbfe;
    }


    /* =================================================
       FINAL SOLUTION ANSWER
       ================================================= */

    .solution-final-answer {
      margin-top:
        18px;

      padding:
        22px 18px;

      background:
        linear-gradient(
          135deg,
          #f7f5ff,
          #fbfaff
        );

      border:
        1px solid
        #e3defe;

      border-radius:
        14px;

      text-align:
        center;
    }


    .solution-final-answer p {
      margin:
        0 0 8px;

      color:
        #696b7d;

      line-height:
        1.5;
    }


    .solution-final-answer strong {
      display:
        block;

      color:
        #4f42b8;

      font-size:
        clamp(
          24px,
          4vw,
          36px
        );

      font-weight:
        800;

      line-height:
        1.3;

      overflow-wrap:
        anywhere;

      word-break:
        break-word;
    }


    /* =================================================
       MAIN CALCULATION RESULT
       ================================================= */

    #resultNumber {
      overflow-wrap:
        anywhere;

      word-break:
        break-word;

      font-variant-numeric:
        tabular-nums;
    }


    #resultNote {
      line-height:
        1.55;
    }


    /* =================================================
       SOLUTION PROGRESS
       ================================================= */

    #solutionProgressBar,
    #solutionProgress {
      transition:
        width 0.3s ease;
    }


    /* =================================================
       BUTTON DISABLED STATE
       ================================================= */

    #previousStepBtn:disabled,
    #nextStepBtn:disabled,
    #playStepBtn:disabled,
    #resetStepBtn:disabled {
      opacity: 0.45;

      cursor:
        not-allowed;
    }


    /* =================================================
       LONG DIVISION
       =================================================

       Long division depends heavily on fixed-width
       characters. Do not change this section to a
       proportional font.
       ================================================= */

    .baselab-written-math pre {
      font-feature-settings:
        "tnum" 1,
        "liga" 0;
    }


    /* =================================================
       MOBILE
       ================================================= */

    @media (
      max-width: 760px
    ) {

      .baselab-written-math {
        padding:
          17px 11px;

        border-radius:
          11px;
      }


      .baselab-written-math pre {
        font-size:
          14px;

        line-height:
          1.6;
      }


      .solution-table {
        font-size:
          13px;
      }


      .solution-table th,
      .solution-table td {
        padding:
          9px 10px;
      }


      .solution-note {
        padding:
          11px 12px;

        font-size:
          13px;
      }


      .solution-final-answer {
        padding:
          18px 12px;
      }


      .solution-step-title {
        font-size:
          20px;
      }
    }
  `;

  document.head.appendChild(
    style
  );
}


// =====================================================
// VALIDATE SELECTED BASE
// =====================================================

function ensureValidBaseSelection(
  element,
  fallback
) {
  if (!element) {
    return;
  }

  const value =
    Number(
      element.value
    );

  if (
    !Number.isInteger(value) ||
    value < 2 ||
    value > 36
  ) {
    element.value =
      String(fallback);
  }
}


// =====================================================
// APPLY DEFAULT BASE VALUES
// =====================================================

function initializeDefaultBases() {
  /*
    populateBaseSelectors() attempts to preserve values
    already supplied by the HTML.

    This function guarantees sensible defaults if no
    valid value exists.
  */

  ensureValidBaseSelection(
    $("fromBase"),
    10
  );

  ensureValidBaseSelection(
    $("toBase"),
    2
  );

  ensureValidBaseSelection(
    $("firstBase"),
    10
  );

  ensureValidBaseSelection(
    $("secondBase"),
    10
  );

  ensureValidBaseSelection(
    $("resultBase"),
    10
  );
}


// =====================================================
// NORMALIZE OPERATOR VALUE
// =====================================================

function normalizeOperatorSelector() {
  const operator =
    $("operator");

  if (!operator) {
    return;
  }

  /*
    Different HTML versions sometimes use:
        ×
        *
        x

    or:
        ÷
        /

    The calculation functions expect:
        +
        -
        *
        /
  */

  const originalValue =
    operator.value;

  if (
    originalValue === "×" ||
    originalValue.toLowerCase() === "x"
  ) {
    operator.value = "*";
  }

  if (
    originalValue === "÷"
  ) {
    operator.value = "/";
  }
}


// =====================================================
// AUTO-UPPERCASE BASE DIGITS
// =====================================================

function initializeNumberInputs() {
  const ids = [
    "convertNumber",
    "firstNumber",
    "secondNumber"
  ];

  ids.forEach(
    id => {
      const input =
        $(id);

      if (!input) {
        return;
      }

      /*
        Hexadecimal and Bases 17–36 use letters.
        Visually normalize those letters to uppercase
        without preventing decimal points or signs.
      */

      input.addEventListener(
        "input",
        () => {
          const start =
            input.selectionStart;

          const end =
            input.selectionEnd;

          const uppercase =
            input.value.toUpperCase();

          if (
            input.value !==
            uppercase
          ) {
            input.value =
              uppercase;

            try {
              input.setSelectionRange(
                start,
                end
              );
            } catch {
              // Some input types do not support
              // selection ranges.
            }
          }
        }
      );
    }
  );
}


// =====================================================
// ACCESSIBILITY FOR SOLUTION CONTROLS
// =====================================================

function initializeSolutionAccessibility() {
  const solutionSection =
    $("solutionSection");

  if (solutionSection) {
    solutionSection.setAttribute(
      "aria-live",
      "polite"
    );
  }

  const solutionButton =
    $("solutionBtn");

  if (solutionButton) {
    solutionButton.setAttribute(
      "aria-controls",
      "solutionSection"
    );
  }

  const progress =
    $("solutionProgressBar") ||
    $("solutionProgress");

  if (progress) {
    progress.setAttribute(
      "role",
      "progressbar"
    );

    progress.setAttribute(
      "aria-valuemin",
      "0"
    );

    progress.setAttribute(
      "aria-valuemax",
      "100"
    );
  }
}


// =====================================================
// PREVENT DUPLICATE INITIALIZATION
// =====================================================

let baseLabInitialized =
  false;


// =====================================================
// COMPLETE BASELAB INITIALIZATION
// =====================================================

function initializeBaseLab() {
  if (
    baseLabInitialized
  ) {
    return;
  }

  baseLabInitialized =
    true;

  // -------------------------------------------------
  // CREATE BASE 2–36 OPTIONS
  // -------------------------------------------------

  populateBaseSelectors();

  // -------------------------------------------------
  // CHECK DEFAULT VALUES
  // -------------------------------------------------

  initializeDefaultBases();

  // -------------------------------------------------
  // OPERATOR COMPATIBILITY
  // -------------------------------------------------

  normalizeOperatorSelector();

  // -------------------------------------------------
  // BUTTONS / INPUTS
  // -------------------------------------------------

  initializeControls();

  initializeInputChanges();

  initializeNumberInputs();

  // -------------------------------------------------
  // WORKSPACE / NAVIGATION
  // -------------------------------------------------

  initializeWorkspaceTabs();

  initializeQuickReference();

  initializeMobileNavigation();

  // -------------------------------------------------
  // SOLUTION SYSTEM
  // -------------------------------------------------

  initializeSolutionKeyboard();

  initializeSolutionAccessibility();

  initializeWrittenMathStyles();

  initializeResultState();
}


// =====================================================
// START BASELAB
// =====================================================

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initializeBaseLab
  );

} else {
  initializeBaseLab();
}


// =====================================================
// OPTIONAL GLOBAL ACCESS
// =====================================================

/*
  Keeping these functions available on window makes the
  JavaScript compatible with an older HTML version that
  may still use onclick attributes such as:

      onclick="convertNumber()"

  Event listeners are already registered above, so this
  does not change the newer button behavior.
*/

window.convertNumber =
  convertNumber;

window.calculateNumber =
  calculateNumber;

window.swapBases =
  swapBases;

window.resetConverter =
  resetConverter;

window.resetCalculator =
  resetCalculator;

window.copyResult =
  copyResult;

window.toggleSolution =
  toggleSolution;

window.previousSolutionStep =
  previousSolutionStep;

window.nextSolutionStep =
  nextSolutionStep;

window.restartSolution =
  restartSolution;

window.toggleSolutionPlayback =
  toggleSolutionPlayback;


// =====================================================
// END OF BASELAB — COMPLETE JAVASCRIPT
// =====================================================