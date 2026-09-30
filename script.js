
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
// POSITIONAL CONVERSION — TRADITIONAL METHOD
// =====================================================

function positionalSteps(input, base, title) {
  const text = String(input).trim().toUpperCase();
  const negative = text.startsWith("-");

  const unsigned = /^[+-]/.test(text)
    ? text.slice(1)
    : text;

  const [integerText = "", fractionText = ""] =
    unsigned.split(".");

  const lines = [];
  const terms = [];

  // -----------------------------------------
  // Whole-number positions
  // -----------------------------------------

  for (let i = 0; i < integerText.length; i++) {
    const character = integerText[i];
    const digit = DIGITS.indexOf(character);
    const power = integerText.length - i - 1;

    const place =
      BigInt(base) ** BigInt(power);

    const value =
      BigInt(digit) * place;

    terms.push({
      expression: `${character} × ${base}^${power}`,
      expanded: `${digit} × ${place}`,
      value: value.toString()
    });
  }

  // -----------------------------------------
  // Fractional positions
  // -----------------------------------------

  for (let i = 0; i < fractionText.length; i++) {
    const character = fractionText[i];
    const digit = BigInt(
      DIGITS.indexOf(character)
    );

    const power = i + 1;

    const denominator =
      BigInt(base) ** BigInt(power);

    const value =
      makeFraction(digit, denominator);

    terms.push({
      expression:
        `${character} × ${base}^(-${power})`,
      expanded:
        `${character} × 1/${denominator}`,
      value:
        decimalDescription(value)
    });
  }

  // -----------------------------------------
  // Traditional positional expansion
  // -----------------------------------------

  lines.push(
    unsigned +
    (negative ? "  (negative)" : "")
  );

  lines.push("");

  if (terms.length) {
    lines.push(
      "= " +
      terms
        .map(term => term.expression)
        .join(" + ")
    );

    lines.push("");

    lines.push(
      "= " +
      terms
        .map(term => term.expanded)
        .join(" + ")
    );

    lines.push("");

    lines.push(
      "= " +
      terms
        .map(term => term.value)
        .join(" + ")
    );
  }

  const decimalValue =
    decimalDescription(
      parseNumber(input, base)
    );

  lines.push("");
  lines.push("─".repeat(
    Math.max(
      12,
      decimalValue.length + 4
    )
  ));

  lines.push(
    `= ${decimalValue}`
  );

  if (negative) {
    lines.push("");
    lines.push(
      "Apply the negative sign to the result."
    );
  }

  return paperBlock(
    title,
    `Expand each digit according to its Base ${base} place value.`,
    lines,
    `Decimal value: ${decimalValue}`
  );
}


// =====================================================
// TRADITIONAL REPEATED LONG DIVISION
// Whole-number base conversion
// =====================================================

function integerConversionSteps(value, base) {
  let whole =
    absolute(value.n) / value.d;

  if (whole === 0n) {
    return paperBlock(
      "Convert the Whole-Number Portion",
      "The whole-number portion is zero.",
      [
        "0",
        "",
        "Whole-number result: 0"
      ],
      "No repeated division is needed."
    );
  }

  const radix = BigInt(base);
  const workings = [];
  const digits = [];

  while (whole > 0n) {
    const dividend = whole;
    const quotient =
      dividend / radix;

    const remainder =
      dividend % radix;

    const remainderDigit =
      DIGITS[Number(remainder)];

    workings.push({
      dividend,
      quotient,
      remainder,
      remainderDigit
    });

    digits.push(remainderDigit);

    whole = quotient;
  }

  const lines = [];

  workings.forEach((work, index) => {
    const dividendText =
      work.dividend.toString();

    const quotientText =
      work.quotient.toString();

    const divisorText =
      String(base);

    const remainderText =
      work.remainderDigit;

    const insideWidth =
      Math.max(
        dividendText.length,
        quotientText.length,
        3
      );

    const prefix =
      " ".repeat(
        divisorText.length + 3
      );

    lines.push(
      prefix +
      quotientText.padStart(
        insideWidth
      ) +
      `  R${remainderText}`
    );

    lines.push(
      prefix +
      "─".repeat(insideWidth)
    );

    lines.push(
      divisorText +
      " │ " +
      dividendText.padStart(
        insideWidth
      )
    );

    if (index < workings.length - 1) {
      lines.push("");
    }
  });

  const answer =
    digits.slice().reverse().join("");

  lines.push("");
  lines.push(
    "Read the remainders from bottom to top:"
  );

  lines.push("");

  digits
    .slice()
    .reverse()
    .forEach(digit => {
      lines.push(`↑ ${digit}`);
    });

  lines.push("");
  lines.push(`Result: ${answer}`);

  if (value.n < 0n) {
    lines.push("");
    lines.push(
      "Apply the negative sign."
    );
  }

  return paperBlock(
    "Convert the Whole-Number Portion",
    `Use repeated long division by ${base}. Keep each remainder, then read the remainders from bottom to top.`,
    lines,
    `Whole-number result: ${
      value.n < 0n ? "-" : ""
    }${answer}`
  );
}


// =====================================================
// TRADITIONAL STACKED MULTIPLICATION
// Fractional base conversion
// =====================================================

function fractionalConversionSteps(value, base) {
  const numerator =
    absolute(value.n);

  const denominator =
    value.d;

  let remainder =
    numerator % denominator;

  if (remainder === 0n) {
    return paperBlock(
      "Convert the Fractional Portion",
      "There is no fractional portion.",
      [
        "Fractional part = 0",
        "",
        "No additional conversion is needed."
      ]
    );
  }

  const radix = BigInt(base);
  const seen = new Map();

  const digits = [];
  const workings = [];

  let repeatStart = -1;
  let truncated = false;

  while (remainder !== 0n) {
    const key =
      remainder.toString();

    if (seen.has(key)) {
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

    const before =
      makeFraction(
        remainder,
        denominator
      );

    const product =
      remainder * radix;

    const digit =
      product / denominator;

    const nextRemainder =
      product % denominator;

    const digitText =
      DIGITS[Number(digit)];

    const beforeText =
      decimalDescription(before);

    const productValue =
      makeFraction(
        product,
        denominator
      );

    const productText =
      decimalDescription(
        productValue
      );

    workings.push({
      beforeText,
      productText,
      digitText
    });

    digits.push(digitText);

    remainder =
      nextRemainder;
  }

  const lines = [];

  workings.forEach(
    (work, index) => {
      const top =
        work.beforeText;

      const multiplier =
        `× ${base}`;

      const product =
        work.productText;

      const width =
        Math.max(
          top.length,
          multiplier.length,
          product.length
        );

      lines.push(
        top.padStart(width)
      );

      lines.push(
        multiplier.padStart(width)
      );

      lines.push(
        "─".repeat(width)
      );

      lines.push(
        product.padStart(width)
      );

      lines.push(
        " ".repeat(
          Math.max(0, width - 1)
        ) +
        "↑"
      );

      lines.push(
        " ".repeat(
          Math.max(0, width - 1)
        ) +
        work.digitText
      );

      if (
        index <
        workings.length - 1
      ) {
        lines.push("");
      }
    }
  );

  let fractionText =
    digits.join("");

  if (repeatStart >= 0) {
    fractionText =
      fractionText.slice(
        0,
        repeatStart
      ) +
      "(" +
      fractionText.slice(
        repeatStart
      ) +
      ")";
  } else if (truncated) {
    fractionText += "…";
  }

  lines.push("");
  lines.push(
    "Read the extracted whole-number digits from top to bottom:"
  );

  lines.push("");

  digits.forEach(digit => {
    lines.push(`↓ ${digit}`);
  });

  lines.push("");
  lines.push(
    `Fractional result: .${fractionText}`
  );

  let note =
    `Fractional digits: ${fractionText}`;

  if (repeatStart >= 0) {
    note +=
      " Parentheses indicate repeating digits.";
  }

  if (truncated) {
    note +=
      ` Only the first ${MAX_FRACTION_DIGITS} fractional digits are shown.`;
  }

  return paperBlock(
    "Convert the Fractional Portion",
    `Use repeated multiplication by ${base}. After each multiplication, take the whole-number digit and continue with the remaining fractional part.`,
    lines,
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
    // -----------------------------------------
    // Convert source number to decimal first
    // using positional notation when needed.
    // -----------------------------------------

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

    // -----------------------------------------
    // Decimal → target base
    // -----------------------------------------

    if (toBase !== 10) {
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
        "Invalid operation."
      );
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
// BASE ARITHMETIC HELPERS
// =====================================================

function digitValue(character) {
  return DIGITS.indexOf(
    String(character).toUpperCase()
  );
}


function digitCharacter(value) {
  return DIGITS[value];
}


function stripNumberSign(text) {
  return String(text)
    .replace(/^[+-]/, "");
}


function compareFractions(a, b) {
  const left =
    a.n * b.d;

  const right =
    b.n * a.d;

  if (left < right) return -1;
  if (left > right) return 1;

  return 0;
}


function isFiniteFormattedNumber(text) {
  return !/[()…]/.test(text);
}


// =====================================================
// NORMALIZE BASE NUMBER FOR COLUMN WORK
// =====================================================

function normalizeBaseNumber(
  value,
  base,
  places
) {
  const formatted =
    formatNumber(
      value,
      base
    );

  let text =
    stripNumberSign(
      formatted.text
    );

  if (
    !isFiniteFormattedNumber(text)
  ) {
    return null;
  }

  let [
    whole = "0",
    fraction = ""
  ] = text.split(".");

  fraction =
    fraction.padEnd(
      places,
      "0"
    );

  if (places > 0) {
    return (
      whole +
      "." +
      fraction
    );
  }

  return whole;
}


// =====================================================
// COLUMN ADDITION — WITH CARRIES
// =====================================================

function traditionalAdditionLines(
  first,
  second,
  base,
  result
) {
  const firstFormatted =
    formatNumber(first, base);

  const secondFormatted =
    formatNumber(second, base);

  const resultFormatted =
    formatNumber(result, base);

  if (
    !isFiniteFormattedNumber(
      firstFormatted.text
    ) ||
    !isFiniteFormattedNumber(
      secondFormatted.text
    ) ||
    !isFiniteFormattedNumber(
      resultFormatted.text
    ) ||
    first.n < 0n ||
    second.n < 0n
  ) {
    return null;
  }

  const firstFraction =
    (
      stripNumberSign(
        firstFormatted.text
      ).split(".")[1] || ""
    ).length;

  const secondFraction =
    (
      stripNumberSign(
        secondFormatted.text
      ).split(".")[1] || ""
    ).length;

  const resultFraction =
    (
      stripNumberSign(
        resultFormatted.text
      ).split(".")[1] || ""
    ).length;

  const places =
    Math.max(
      firstFraction,
      secondFraction,
      resultFraction
    );

  const firstText =
    normalizeBaseNumber(
      first,
      base,
      places
    );

  const secondText =
    normalizeBaseNumber(
      second,
      base,
      places
    );

  const resultText =
    normalizeBaseNumber(
      result,
      base,
      places
    );

  if (
    !firstText ||
    !secondText ||
    !resultText
  ) {
    return null;
  }

  const firstDigits =
    firstText.replace(".", "");

  const secondDigits =
    secondText.replace(".", "");

  const maxLength =
    Math.max(
      firstDigits.length,
      secondDigits.length
    );

  const a =
    firstDigits.padStart(
      maxLength,
      "0"
    );

  const b =
    secondDigits.padStart(
      maxLength,
      "0"
    );

  const carries =
    new Array(
      maxLength + 1
    ).fill(" ");

  let carry = 0;

  for (
    let i = maxLength - 1;
    i >= 0;
    i--
  ) {
    const sum =
      digitValue(a[i]) +
      digitValue(b[i]) +
      carry;

    carry =
      Math.floor(
        sum / base
      );

    if (
      carry > 0 &&
      i > 0
    ) {
      carries[i] =
        digitCharacter(carry);
    } else if (
      carry > 0 &&
      i === 0
    ) {
      carries[0] =
        digitCharacter(carry);
    }
  }

  const width =
    Math.max(
      firstText.length,
      secondText.length + 2,
      resultText.length,
      carries.join("").length
    );

  const lines = [];

  const carryText =
    carries.join("").trimEnd();

  if (carryText.trim()) {
    lines.push(
      carryText.padStart(width)
    );

    lines.push(
      "carry".padStart(width)
    );
  }

  lines.push(
    firstText.padStart(width)
  );

  lines.push(
    ("+ " + secondText)
      .padStart(width)
  );

  lines.push(
    "─".repeat(width)
  );

  lines.push(
    resultText.padStart(width)
  );

  return lines;
}


// =====================================================
// COLUMN SUBTRACTION — WITH BORROWING
// =====================================================

function traditionalSubtractionLines(
  first,
  second,
  base,
  result
) {
  if (
    first.n < 0n ||
    second.n < 0n ||
    result.n < 0n
  ) {
    return null;
  }

  const firstFormatted =
    formatNumber(first, base);

  const secondFormatted =
    formatNumber(second, base);

  const resultFormatted =
    formatNumber(result, base);

  if (
    !isFiniteFormattedNumber(
      firstFormatted.text
    ) ||
    !isFiniteFormattedNumber(
      secondFormatted.text
    ) ||
    !isFiniteFormattedNumber(
      resultFormatted.text
    )
  ) {
    return null;
  }

  const firstFraction =
    (
      firstFormatted.text
        .split(".")[1] || ""
    ).length;

  const secondFraction =
    (
      secondFormatted.text
        .split(".")[1] || ""
    ).length;

  const resultFraction =
    (
      resultFormatted.text
        .split(".")[1] || ""
    ).length;

  const places =
    Math.max(
      firstFraction,
      secondFraction,
      resultFraction
    );

  const firstText =
    normalizeBaseNumber(
      first,
      base,
      places
    );

  const secondText =
    normalizeBaseNumber(
      second,
      base,
      places
    );

  const resultText =
    normalizeBaseNumber(
      result,
      base,
      places
    );

  const firstDigits =
    firstText.replace(".", "");

  const secondDigits =
    secondText.replace(".", "");

  const maxLength =
    Math.max(
      firstDigits.length,
      secondDigits.length
    );

  const top =
    firstDigits
      .padStart(maxLength, "0")
      .split("")
      .map(digitValue);

  const bottom =
    secondDigits
      .padStart(maxLength, "0")
      .split("")
      .map(digitValue);

  const borrowMarks =
    new Array(maxLength)
      .fill(" ");

  const working =
    top.slice();

  for (
    let i = maxLength - 1;
    i >= 0;
    i--
  ) {
    if (
      working[i] <
      bottom[i]
    ) {
      let borrowIndex =
        i - 1;

      while (
        borrowIndex >= 0 &&
        working[borrowIndex] === 0
      ) {
        borrowIndex--;
      }

      if (borrowIndex >= 0) {
        working[borrowIndex]--;

        for (
          let j =
            borrowIndex + 1;
          j < i;
          j++
        ) {
          working[j] +=
            base - 1;

          borrowMarks[j] =
            digitCharacter(
              working[j]
            );
        }

        working[i] += base;

        borrowMarks[i] =
          working[i].toString();
      }
    }
  }

  const width =
    Math.max(
      firstText.length,
      secondText.length + 2,
      resultText.length
    );

  const lines = [];

  if (
    borrowMarks.some(
      mark =>
        String(mark).trim()
    )
  ) {
    lines.push(
      borrowMarks
        .join("")
        .padStart(width)
    );

    lines.push(
      "borrow/regroup".padStart(
        width
      )
    );
  }

  lines.push(
    firstText.padStart(width)
  );

  lines.push(
    ("− " + secondText)
      .padStart(width)
  );

  lines.push(
    "─".repeat(width)
  );

  lines.push(
    resultText.padStart(width)
  );

  return lines;
}


// =====================================================
// LONG MULTIPLICATION — BASES 2 TO 36
// =====================================================

function traditionalMultiplicationLines(
  first,
  second,
  base,
  result
) {
  const firstFormatted =
    formatNumber(first, base);

  const secondFormatted =
    formatNumber(second, base);

  const resultFormatted =
    formatNumber(result, base);

  const firstDisplay =
    stripNumberSign(
      firstFormatted.text
    );

  const secondDisplay =
    stripNumberSign(
      secondFormatted.text
    );

  const resultDisplay =
    stripNumberSign(
      resultFormatted.text
    );

  const negative =
    (first.n < 0n) !==
    (second.n < 0n);

  // ===================================================
  // Convert a displayed Base-N number into a finite
  // working value for traditional long multiplication.
  //
  // Example:
  // 52.5(4631)
  //
  // becomes:
  // 52.54631
  //
  // The parentheses are removed ONLY for the written
  // multiplication working. The exact arithmetic engine
  // is not changed.
  // ===================================================

  function makeFiniteWorkingText(text) {
    return text
      .replace(/\(([^)]+)\)/g, "$1")
      .replace(/…/g, "");
  }

  const firstWorking =
    makeFiniteWorkingText(
      firstDisplay
    );

  const secondWorking =
    makeFiniteWorkingText(
      secondDisplay
    );

  const repeating =
    /[()…]/.test(
      firstDisplay +
      secondDisplay
    );

  // ===================================================
  // Count radix places
  // ===================================================

  function fractionPlaces(text) {
    const dot =
      text.indexOf(".");

    if (dot < 0) {
      return 0;
    }

    return (
      text.length -
      dot -
      1
    );
  }

  const firstPlaces =
    fractionPlaces(
      firstWorking
    );

  const secondPlaces =
    fractionPlaces(
      secondWorking
    );

  const totalPlaces =
    firstPlaces +
    secondPlaces;

  // ===================================================
  // Remove radix points
  // ===================================================

  const firstDigits =
    firstWorking.replace(
      ".",
      ""
    );

  const secondDigits =
    secondWorking.replace(
      ".",
      ""
    );

  // ===================================================
  // Convert digit strings to BigInt while respecting
  // the selected base.
  // ===================================================

  function baseDigitsToBigInt(text) {
    let value = 0n;

    for (
      const character of text
    ) {
      value =
        value *
        BigInt(base) +
        BigInt(
          digitValue(character)
        );
    }

    return value;
  }

  const multiplicand =
    baseDigitsToBigInt(
      firstDigits
    );

  const multiplier =
    baseDigitsToBigInt(
      secondDigits
    );

  // ===================================================
  // Build partial products
  // ===================================================

  const multiplierCharacters =
    secondDigits
      .split("")
      .reverse();

  const partials = [];

  multiplierCharacters.forEach(
    (character, position) => {
      const digit =
        BigInt(
          digitValue(character)
        );

      const partial =
        multiplicand *
        digit *
        (
          BigInt(base) **
          BigInt(position)
        );

      partials.push(
        partial
          .toString(base)
          .toUpperCase()
      );
    }
  );

  const rawProduct =
    multiplicand *
    multiplier;

  let rawProductText =
    rawProduct
      .toString(base)
      .toUpperCase();

  // ===================================================
  // Restore radix point in written product
  // ===================================================

  function restoreRadixPoint(
    text,
    places
  ) {
    if (places === 0) {
      return text;
    }

    let working = text;

    while (
      working.length <= places
    ) {
      working =
        "0" + working;
    }

    const position =
      working.length -
      places;

    return (
      working.slice(
        0,
        position
      ) +
      "." +
      working.slice(
        position
      )
    );
  }

  const writtenProduct =
    restoreRadixPoint(
      rawProductText,
      totalPlaces
    );

  // ===================================================
  // Determine width
  // ===================================================

  const width =
    Math.max(
      firstWorking.length,
      secondWorking.length + 2,
      rawProductText.length,
      writtenProduct.length,
      ...partials.map(
        text => text.length
      )
    );

  const lines = [];

  // ===================================================
  // Show original values
  // ===================================================

  lines.push(
    firstDisplay.padStart(
      width
    )
  );

  lines.push(
    (
      "× " +
      secondDisplay
    ).padStart(
      width
    )
  );

  lines.push(
    "─".repeat(width)
  );

  // ===================================================
  // If repeating, explain the written precision
  // ===================================================

  if (repeating) {
    lines.push("");

    lines.push(
      "For the written long multiplication,"
    );

    lines.push(
      "use the displayed repeating digits:"
    );

    lines.push("");

    lines.push(
      firstWorking.padStart(
        width
      )
    );

    lines.push(
      (
        "× " +
        secondWorking
      ).padStart(
        width
      )
    );

    lines.push(
      "─".repeat(width)
    );
  }

  // ===================================================
  // Traditional partial products
  // ===================================================

  partials.forEach(
    partial => {
      lines.push(
        partial.padStart(
          width
        )
      );
    }
  );

  if (
    partials.length > 1
  ) {
    lines.push(
      "─".repeat(width)
    );
  }

  // Product before radix point
  lines.push(
    rawProductText.padStart(
      width
    )
  );

  // ===================================================
  // Restore radix point
  // ===================================================

  if (
    totalPlaces > 0
  ) {
    lines.push("");

    lines.push(
      "Restore the radix point:"
    );

    lines.push(
      `${firstPlaces} + ${secondPlaces} = ${totalPlaces} fractional places`
    );

    lines.push("");

    lines.push(
      writtenProduct.padStart(
        width
      )
    );
  }

  // ===================================================
  // Repeating-number note
  // ===================================================

  if (repeating) {
    lines.push("");

    lines.push(
      "The original number contains repeating digits,"
    );

    lines.push(
      "so the written multiplication above uses"
    );

    lines.push(
      "the displayed digits as the working precision."
    );

    lines.push("");

    lines.push(
      `Exact result: ${resultDisplay}`
    );
  } else {
    lines.push("");

    lines.push(
      `Result: ${resultDisplay}`
    );
  }

  // ===================================================
  // Sign
  // ===================================================

  if (
    negative &&
    result.n !== 0n
  ) {
    lines.push("");

    lines.push(
      "Apply the negative sign."
    );

    lines.push(
      `Final answer: −${resultDisplay}`
    );
  }

  return lines;
}
// =====================================================
// LONG DIVISION — BASES 2 TO 36
// =====================================================

function longDivisionSteps(
  first,
  second,
  base
) {
  if (second.n === 0n) {
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

  const radix =
    BigInt(base);

  const limit =
    MAX_DIVISION_WORK_DIGITS;

  // Convert fractional operands to
  // equivalent integer division:
  //
  // (a/b) ÷ (c/d)
  // =
  // (a × d) ÷ (b × c)

  const dividend =
    absolute(
      first.n *
      second.d
    );

  const divisor =
    absolute(
      first.d *
      second.n
    );

  const dividendText =
    dividend
      .toString(base)
      .toUpperCase();

  const divisorText =
    divisor
      .toString(base)
      .toUpperCase();

  const negative =
    (
      first.n < 0n
    ) !== (
      second.n < 0n
    ) &&
    dividend !== 0n;

  const inputDigits =
    dividendText.split("");

  const quotientPositions =
    new Array(
      inputDigits.length
    ).fill(" ");

  const operations = [];

  let remainder = 0n;
  let quotientStarted = false;

  // -----------------------------------------
  // Whole-number division
  // -----------------------------------------

  for (
    let i = 0;
    i < inputDigits.length;
    i++
  ) {
    const digit =
      BigInt(
        digitValue(
          inputDigits[i]
        )
      );

    const partial =
      remainder *
      radix +
      digit;

    const quotientDigit =
      partial / divisor;

    const product =
      quotientDigit *
      divisor;

    const nextRemainder =
      partial -
      product;

    if (
      quotientDigit !== 0n ||
      quotientStarted ||
      i ===
        inputDigits.length - 1
    ) {
      quotientStarted = true;

      quotientPositions[i] =
        DIGITS[
          Number(
            quotientDigit
          )
        ];

      operations.push({
        partial,
        product,
        remainder:
          nextRemainder,
        endColumn: i,
        fractional: false
      });
    }

    remainder =
      nextRemainder;
  }

  let wholeQuotient =
    quotientPositions
      .join("")
      .trim();

  if (!wholeQuotient) {
    wholeQuotient = "0";
  }

  // -----------------------------------------
  // Fractional division
  // -----------------------------------------

  const fractionDigits = [];
  const seen = new Map();

  let repeatStart = -1;
  let truncated = false;

  while (
    remainder !== 0n
  ) {
    const key =
      remainder.toString();

    if (seen.has(key)) {
      repeatStart =
        seen.get(key);
      break;
    }

    if (
      fractionDigits.length >=
      limit
    ) {
      truncated = true;
      break;
    }

    seen.set(
      key,
      fractionDigits.length
    );

    const partial =
      remainder *
      radix;

    const quotientDigit =
      partial /
      divisor;

    const product =
      quotientDigit *
      divisor;

    const nextRemainder =
      partial -
      product;

    const digitText =
      DIGITS[
        Number(
          quotientDigit
        )
      ];

    fractionDigits.push(
      digitText
    );

    operations.push({
      partial,
      product,
      remainder:
        nextRemainder,
      endColumn:
        inputDigits.length +
        fractionDigits.length,
      fractional: true
    });

    remainder =
      nextRemainder;
  }

  let fractionText =
    fractionDigits.join("");

  if (repeatStart >= 0) {
    fractionText =
      fractionText.slice(
        0,
        repeatStart
      ) +
      "(" +
      fractionText.slice(
        repeatStart
      ) +
      ")";
  } else if (truncated) {
    fractionText += "…";
  }

  const quotient =
    (negative ? "−" : "") +
    wholeQuotient +
    (
      fractionText
        ? "." + fractionText
        : ""
    );

  const workDigits =
    dividendText +
    (
      fractionDigits.length
        ? "." +
          "0".repeat(
            fractionDigits.length
          )
        : ""
    );

  const prefix =
    " ".repeat(
      divisorText.length + 3
    );

  const cleanQuotient =
    quotient.replace(
      /[()…−]/g,
      ""
    );

  const workWidth =
    Math.max(
      workDigits.length,
      cleanQuotient.length
    );

  const lines = [
    prefix +
      quotient.padStart(
        workWidth
      ),

    prefix +
      "─".repeat(
        workWidth
      ),

    divisorText +
      " │ " +
      workDigits
  ];

  operations.forEach(
    (item, index) => {
      const partialText =
        item.partial
          .toString(base)
          .toUpperCase();

      const productText =
        item.product
          .toString(base)
          .toUpperCase();

      const remainderText =
        item.remainder
          .toString(base)
          .toUpperCase();

      const columnWidth =
        Math.max(
          partialText.length,
          productText.length,
          remainderText.length
        );

      const start =
        Math.max(
          0,
          item.endColumn -
            columnWidth +
            1
        );

      const indentation =
        prefix +
        " ".repeat(start);

      lines.push(
        indentation +
        partialText.padStart(
          columnWidth
        )
      );

      lines.push(
        indentation +
        (
          "−" +
          productText
        ).padStart(
          columnWidth + 1
        )
      );

      lines.push(
        indentation +
        "─".repeat(
          columnWidth + 1
        )
      );

      lines.push(
        indentation +
        remainderText.padStart(
          columnWidth
        )
      );

      if (
        index <
        operations.length - 1
      ) {
        lines.push("");
      }
    }
  );

  let description =
    `Use traditional long division in Base ${base}. Divide, multiply, subtract, and bring down the next digit.`;

  if (
    first.d !== 1n ||
    second.d !== 1n
  ) {
    description +=
      " Fractional operands are first rewritten as an equivalent integer division.";
  }

  let note =
    `Quotient in Base ${base}: ${quotient}`;

  if (repeatStart >= 0) {
    note +=
      " Digits inside parentheses repeat.";
  }

  if (truncated) {
    note +=
      ` Only the first ${limit} fractional quotient digits are shown in the written work.`;
  }

  return paperBlock(
    `Long Division — Base ${base}`,
    description,
    lines,
    note
  );
}


// =====================================================
// TRADITIONAL ARITHMETIC SOLUTION
// =====================================================

function arithmeticSteps(
  first,
  second,
  operator,
  result,
  base
) {
  const firstText =
    formatNumber(
      first,
      base
    ).text;

  const secondText =
    formatNumber(
      second,
      base
    ).text;

  const resultText =
    formatNumber(
      result,
      base
    ).text;

  let lines = null;
  let description = "";

  // -----------------------------------------
  // Addition
  // -----------------------------------------

  if (operator === "+") {
    lines =
      traditionalAdditionLines(
        first,
        second,
        base,
        result
      );

    description =
      `Add directly in Base ${base}. Start at the rightmost column and carry whenever a column reaches ${base}.`;
  }

  // -----------------------------------------
  // Subtraction
  // -----------------------------------------

  else if (operator === "-") {
    lines =
      traditionalSubtractionLines(
        first,
        second,
        base,
        result
      );

    description =
      `Subtract directly in Base ${base}. Start at the rightmost column and borrow one group of ${base} whenever needed.`;
  }

  // -----------------------------------------
  // Multiplication
  // -----------------------------------------

  else if (operator === "*") {
    lines =
      traditionalMultiplicationLines(
        first,
        second,
        base,
        result
      );

    description =
      `Use traditional long multiplication in Base ${base}. Multiply by each digit, shift each partial product by its place value, then add the partial products.`;
  }

  // -----------------------------------------
  // Fallback for cases that cannot be
  // displayed finitely in column form.
  // -----------------------------------------

  if (!lines) {
    const width =
      Math.max(
        firstText.length,
        secondText.length + 2,
        resultText.length
      );

    lines = [
      firstText.padStart(width),
      (
        operationSymbol(operator) +
        " " +
        secondText
      ).padStart(width),
      "─".repeat(width),
      resultText.padStart(width)
    ];

    description =
      `Perform ${operationName(operator).toLowerCase()} in Base ${base}.`;
  }

  return paperBlock(
    `Traditional ${operationName(operator)} — Base ${base}`,
    description,
    lines,
    `${firstText} ${operationSymbol(operator)} ${secondText} = ${resultText}`
  );
}


// =====================================================
// CONVERT AN OPERAND TO THE WORKING BASE
// =====================================================

function operandConversionSteps(
  value,
  originalInput,
  originalBase,
  workingBase,
  label
) {
  const steps = [];

  if (
    originalBase ===
    workingBase
  ) {
    return steps;
  }

  steps.push(
    textBlock(
      `Prepare the ${label}`,
      `Convert the ${label.toLowerCase()} to the working base before performing the arithmetic.`,
      [
        `Original: ${originalInput.toUpperCase()} (Base ${originalBase})`,
        `Working base: ${workingBase}`
      ]
    )
  );

  if (
    originalBase !== 10
  ) {
    steps.push(
      positionalSteps(
        originalInput,
        originalBase,
        `Convert the ${label} to Decimal`
      )
    );
  }

  if (
    workingBase !== 10
  ) {
    steps.push(
      integerConversionSteps(
        value,
        workingBase
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
          workingBase
        )
      );
    }
  }

  const converted =
    formatNumber(
      value,
      workingBase
    ).text;

  steps.push(
    textBlock(
      `${label} Ready`,
      `The ${label.toLowerCase()} is now expressed in Base ${workingBase}.`,
      [
        `${label}: ${converted}`,
        `Working base: ${workingBase}`
      ]
    )
  );

  return steps;
}


// =====================================================
// COMPLETE CALCULATOR SOLUTION
// Traditional arithmetic is performed in RESULT BASE.
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

  steps.push(
    textBlock(
      "Identify the Given Values",
      "Identify the two numbers, their original bases, the operation, and the requested result base.",
      [
        `First number: ${firstInput.toUpperCase()} (Base ${firstBase})`,
        `Second number: ${secondInput.toUpperCase()} (Base ${secondBase})`,
        `Operation: ${operationName(operator)}`,
        `Working / result base: ${resultBase}`
      ]
    )
  );

  // -----------------------------------------
  // Convert operands to the common
  // working base when necessary.
  // -----------------------------------------

  const firstConversion =
    operandConversionSteps(
      first,
      firstInput,
      firstBase,
      resultBase,
      "First Number"
    );

  firstConversion.forEach(
    step => steps.push(step)
  );

  const secondConversion =
    operandConversionSteps(
      second,
      secondInput,
      secondBase,
      resultBase,
      "Second Number"
    );

  secondConversion.forEach(
    step => steps.push(step)
  );

  const firstWorking =
    formatNumber(
      first,
      resultBase
    ).text;

  const secondWorking =
    formatNumber(
      second,
      resultBase
    ).text;

  // -----------------------------------------
  // Show common working base
  // -----------------------------------------

  if (
    firstBase !== resultBase ||
    secondBase !== resultBase
  ) {
    steps.push(
      textBlock(
        "Numbers in the Same Working Base",
        `Both operands are now expressed in Base ${resultBase}, so the arithmetic can be performed directly using the traditional method.`,
        [
          `First number: ${firstWorking}`,
          `Second number: ${secondWorking}`,
          `Operation: ${operationName(operator)}`
        ]
      )
    );
  }

  // -----------------------------------------
  // Traditional arithmetic
  // -----------------------------------------

  if (operator === "/") {
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
        result,
        resultBase
      )
    );
  }

  // -----------------------------------------
  // Final result
  // -----------------------------------------

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
// =====================================================
// MOBILE HAMBURGER NAVIGATION
// =====================================================

function initializeMobileNavigation() {
  const toggle =
    document.getElementById(
      "mobileMenuToggle"
    );

  const navigation =
    document.getElementById(
      "mobileNavigation"
    );

  if (
    !toggle ||
    !navigation
  ) {
    return;
  }

  function setMenuState(open) {
    navigation.classList.toggle(
      "is-open",
      open
    );

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
  }

  toggle.addEventListener(
    "click",
    () => {
      const currentlyOpen =
        navigation.classList.contains(
          "is-open"
        );

      setMenuState(
        !currentlyOpen
      );
    }
  );

  navigation
    .querySelectorAll(
      ".tab"
    )
    .forEach(
      button => {
        button.addEventListener(
          "click",
          () => {
            if (
              window.innerWidth <=
              760
            ) {
              setMenuState(
                false
              );
            }
          }
        );
      }
    );

  window.addEventListener(
    "resize",
    () => {
      if (
        window.innerWidth >
        760
      ) {
        setMenuState(
          false
        );
      }
    }
  );
}


// Start mobile navigation after HTML loads.

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initializeMobileNavigation
  );

} else {
  initializeMobileNavigation();
}