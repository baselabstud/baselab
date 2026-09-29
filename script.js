
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
        `${whole} ÷ ${base}`,
        quotient.toString(),
        digit
      ]);
    }

    remainders.push(digit);
    whole = quotient;
  }

  return tableBlock(
    "Whole-Number Conversion",
    `Repeatedly divide the integer portion by ${base}.`,
    ["Division", "Quotient", "Remainder"],
    rows,
    "Read the remainders from bottom to top: " +
    remainders.reverse().join("")
  );
}

// =====================================================
// FRACTIONAL CONVERSION
// =====================================================

function fractionalConversionSteps(value, base, output) {
  if (output.rows.length === 0) {
    return textBlock(
      "Fractional Conversion",
      "There is no fractional portion.",
      ["Fractional result = 0"]
    );
  }

  const rows = output.rows.map(row => [
    String(row.step),
    `${decimalDescription(
      makeFraction(row.before, row.denominator)
    )} × ${base}`,
    row.digit,
    decimalDescription(
      makeFraction(row.remainder, row.denominator)
    )
  ]);

  let note =
    "Read the extracted digits from top to bottom: " +
    output.fractionText + ". ";

  let highlightedRow = -1;

  if (output.repeating) {
    const repeatedValue = decimalDescription(
      makeFraction(output.repeatedRemainder, value.d)
    );

    const firstStep = output.repeatStart + 1;

    note +=
      `Stop: Remainder ${repeatedValue} appears again ` +
      `at Step ${output.repeatStep}. ` +
      `It was previously used at Step ${firstStep}.`;

    highlightedRow = output.rows.findIndex(
      row => row.repeated
    );
  } else if (output.truncated) {
    note +=
      "The 10,000-digit safety limit was reached. " +
      "The expansion is incomplete.";
  } else {
    note += "Stop: The remainder became zero.";
  }

  if (output.digits.length > output.rows.length) {
    note +=
      ` Showing the first ${output.rows.length} ` +
      "calculation rows only.";
  }

  return tableBlock(
    "Fractional Conversion",
    `Multiply the fractional remainder by ${base}. ` +
    "Stop when the remainder is zero or repeats.",
    ["#", "Fraction × Base", "Digit", "Next Remainder"],
    rows,
    note,
    highlightedRow,
    3
  );
}

// =====================================================
// PEN-AND-PAPER ARITHMETIC HELPERS
// =====================================================

function repeatCharacter(character, count) {
  return character.repeat(Math.max(1, count));
}

function alignRight(text, width) {
  return String(text).padStart(width, " ");
}

function makeVerticalWorking(top, bottom, symbol, result) {
  const width = Math.max(
    top.length,
    bottom.length + 2,
    result.length,
    5
  );

  return [
    alignRight(top, width),
    alignRight(`${symbol} ${bottom}`, width),
    repeatCharacter("─", width),
    alignRight(result, width)
  ].join("\n");
}

function decimalPlaces(value) {
  // Returns the number of decimal places if
  // the rational value terminates in Base 10.
  // Returns null if the decimal repeats.

  let denominator = value.d;
  let twos = 0;
  let fives = 0;

  while (denominator % 2n === 0n) {
    denominator /= 2n;
    twos++;
  }

  while (denominator % 5n === 0n) {
    denominator /= 5n;
    fives++;
  }

  if (denominator !== 1n) {
    return null;
  }

  return Math.max(twos, fives);
}

function powerOfTen(n) {
  return 10n ** BigInt(n);
}

function scaledInteger(value, places) {
  const scale = powerOfTen(places);

  return (value.n * scale) / value.d;
}

function formatScaledInteger(number, places) {
  const negative = number < 0n;
  let digits = absolute(number).toString();

  if (places > 0) {
    digits = digits.padStart(places + 1, "0");

    const cut = digits.length - places;

    digits =
      digits.slice(0, cut) +
      "." +
      digits.slice(cut);
  }

  return (negative ? "-" : "") + digits;
}

function paperSection(label, working, explanation = "") {
  return {
    label,
    working,
    explanation
  };
}

// =====================================================
// VERTICAL ADDITION & SUBTRACTION
// =====================================================

function additionSubtractionPaper(a, b, operator, result) {
  const aPlaces = decimalPlaces(a);
  const bPlaces = decimalPlaces(b);

  const sections = [];

  // If both decimals terminate, align decimal places.
  if (aPlaces !== null && bPlaces !== null) {
    const places = Math.max(aPlaces, bPlaces);

    const left = formatScaledInteger(
      scaledInteger(a, places),
      places
    );

    const right = formatScaledInteger(
      scaledInteger(b, places),
      places
    );

    const answer = formatScaledInteger(
      scaledInteger(result, places),
      places
    );

    sections.push(
      paperSection(
        "Vertical Calculation",
        makeVerticalWorking(
          left,
          right,
          operator === "+" ? "+" : "−",
          answer
        ),
        "Align the decimal points. Work from right " +
        "to left, carrying or borrowing where needed."
      )
    );

    sections.push(
      paperSection(
        "Check the Result",
        `${decimalDescription(a)} ` +
        `${operator === "+" ? "+" : "−"} ` +
        `${decimalDescription(b)}\n` +
        `= ${decimalDescription(result)}`,
        "The displayed answer is exact."
      )
    );
  } else {
    // Repeating decimals cannot be aligned
    // using a finite number of columns.
    const commonDenominator = a.d * b.d;
    const leftNumerator = a.n * b.d;
    const rightNumerator = b.n * a.d;

    const answerNumerator =
      operator === "+"
        ? leftNumerator + rightNumerator
        : leftNumerator - rightNumerator;

    sections.push(
      paperSection(
        "Write the Exact Values",
        `${fractionDescription(a)} ` +
        `${operator === "+" ? "+" : "−"} ` +
        `${fractionDescription(b)}`,
        "A repeating decimal has infinitely many digits, " +
        "so use exact fractions for the written working."
      )
    );

    sections.push(
      paperSection(
        "Use a Common Denominator",
        `${leftNumerator}/${commonDenominator}\n` +
        `${operator === "+" ? "+" : "−"} ` +
        `${rightNumerator}/${commonDenominator}\n` +
        repeatCharacter("─", 24) + "\n" +
        `${answerNumerator}/${commonDenominator}`,
        "Combine the numerators while keeping " +
        "the common denominator."
      )
    );

    sections.push(
      paperSection(
        "Simplify and Convert to Decimal",
        `${answerNumerator}/${commonDenominator}\n` +
        `= ${fractionDescription(result)}\n` +
        `= ${decimalDescription(result)}`,
        "The decimal result is exact."
      )
    );
  }

  return paperBlock(
    "Step 3: Perform the Arithmetic Operation",
    operator === "+"
      ? "Solve the addition using written working."
      : "Solve the subtraction using written working.",
    sections,
    decimalDescription(result)
  );
}

// =====================================================
// LONG MULTIPLICATION
// =====================================================

function multiplicationPaper(a, b, result) {
  const sections = [];

  const aPlaces = decimalPlaces(a);
  const bPlaces = decimalPlaces(b);

  if (aPlaces !== null && bPlaces !== null) {
    const left = scaledInteger(a, aPlaces);
    const right = scaledInteger(b, bPlaces);

    const leftAbs = absolute(left);
    const rightAbs = absolute(right);

    const multiplierDigits =
      rightAbs.toString().split("").reverse();

    const partials = multiplierDigits.map(
      (character, index) => {
        return (
          leftAbs *
          BigInt(character) *
          powerOfTen(index)
        );
      }
    );

    const product = leftAbs * rightAbs;
    const totalPlaces = aPlaces + bPlaces;

    const width = Math.max(
      leftAbs.toString().length,
      rightAbs.toString().length + 2,
      product.toString().length,
      ...partials.map(p => p.toString().length),
      5
    );

    const lines = [
      alignRight(leftAbs.toString(), width),
      alignRight(`× ${rightAbs}`, width),
      repeatCharacter("─", width)
    ];

    partials.forEach(partial => {
      lines.push(
        alignRight(partial.toString(), width)
      );
    });

    if (partials.length > 1) {
      lines.push(repeatCharacter("─", width));
    }

    lines.push(
      alignRight(product.toString(), width)
    );

    sections.push(
      paperSection(
        "Long Multiplication",
        lines.join("\n"),
        "Multiply by each digit of the second number, " +
        "moving from right to left. Each partial product " +
        "includes its correct place-value shift."
      )
    );

    sections.push(
      paperSection(
        "Place the Decimal Point",
        `First number: ${decimalDescription(a)}\n` +
        `Second number: ${decimalDescription(b)}\n` +
        `Decimal places: ${aPlaces} + ${bPlaces} = ${totalPlaces}\n` +
        `Product: ${formatScaledInteger(
          left * right,
          totalPlaces
        )}`,
        "The final product has the combined number " +
        "of decimal places."
      )
    );
  } else {
    const numerator = a.n * b.n;
    const denominator = a.d * b.d;

    sections.push(
      paperSection(
        "Write the Exact Values",
        `${fractionDescription(a)}\n` +
        `× ${fractionDescription(b)}`,
        "At least one operand has a repeating decimal. " +
        "Use exact fractions rather than rounding."
      )
    );

    sections.push(
      paperSection(
        "Multiply Numerators and Denominators",
        `(${a.n} × ${b.n})\n` +
        repeatCharacter("─", 24) + "\n" +
        `(${a.d} × ${b.d})\n\n` +
        `= ${numerator}/${denominator}`,
        "Multiply the numerators together and " +
        "the denominators together."
      )
    );

    sections.push(
      paperSection(
        "Simplify the Product",
        `${numerator}/${denominator}\n` +
        `= ${fractionDescription(result)}\n` +
        `= ${decimalDescription(result)}`,
        "The simplified fraction gives the exact " +
        "decimal result."
      )
    );
  }

  return paperBlock(
    "Step 3: Perform the Arithmetic Operation",
    "Solve the multiplication with partial products.",
    sections,
    decimalDescription(result)
  );
}

// =====================================================
// LONG DIVISION
// =====================================================

function divisionPaper(a, b, result) {
  const sections = [];

  const aPlaces = decimalPlaces(a);
  const bPlaces = decimalPlaces(b);

  // Show a decimal long-division setup if
  // both operands have terminating decimals.
  if (aPlaces !== null && bPlaces !== null) {
    const places = Math.max(aPlaces, bPlaces);

    const dividend = scaledInteger(a, places);
    const divisor = scaledInteger(b, places);

    const positiveDividend = absolute(dividend);
    const positiveDivisor = absolute(divisor);

    const wholeQuotient =
      positiveDividend / positiveDivisor;

    let remainder =
      positiveDividend % positiveDivisor;

    const lines = [
      `${positiveDivisor} ⟌ ${positiveDividend}`,
      "",
      `Whole quotient = ${wholeQuotient}`,
      `Remainder = ${remainder}`
    ];

    sections.push(
      paperSection(
        "Set Up Long Division",
        lines.join("\n"),
        "Move the decimal points equally in the " +
        "dividend and divisor until the divisor " +
        "is a whole number."
      )
    );

    const working = [];
    const seen = new Map();
    let position = 0;
    let repeated = false;

    while (
      remainder !== 0n &&
      position < Math.min(MAX_FRACTION_DIGITS, 80)
    ) {
      const key = remainder.toString();

      if (seen.has(key)) {
        repeated = true;
        working.push(
          `Remainder ${remainder} repeats — stop.`
        );
        break;
      }

      seen.set(key, position);

      const broughtDown = remainder * 10n;
      const digit = broughtDown / positiveDivisor;
      const subtracted = digit * positiveDivisor;
      const nextRemainder =
        broughtDown - subtracted;

      working.push(
        `${broughtDown} ÷ ${positiveDivisor} = ${digit}`,
        `${broughtDown} − ${subtracted} = ${nextRemainder}`,
        ""
      );

      remainder = nextRemainder;
      position++;
    }

    if (working.length === 0) {
      working.push(
        "The division ends with remainder 0."
      );
    } else if (
      remainder !== 0n &&
      !repeated &&
      position >= 80
    ) {
      working.push(
        "Additional long-division rows omitted."
      );
    }

    sections.push(
      paperSection(
        "Bring Down Zeros and Subtract",
        working.join("\n"),
        "For each decimal place, bring down a zero, " +
        "divide, subtract, and continue until the " +
        "remainder becomes zero or repeats."
      )
    );
  } else {
    sections.push(
      paperSection(
        "Write the Exact Values",
        `${fractionDescription(a)}\n` +
        `÷ ${fractionDescription(b)}`,
        "Use exact fraction division to avoid " +
        "rounding repeating decimal operands."
      )
    );
  }

  const numerator = a.n * b.d;
  const denominator = a.d * b.n;

  sections.push(
    paperSection(
      "Verify Using Exact Division",
      `(${a.n} × ${b.d})\n` +
      repeatCharacter("─", 24) + "\n" +
      `(${a.d} × ${b.n})\n\n` +
      `= ${numerator}/${denominator}\n` +
      `= ${fractionDescription(result)}\n` +
      `= ${decimalDescription(result)}`,
      "Dividing by a fraction is equivalent to " +
      "multiplying by its reciprocal."
    )
  );

  return paperBlock(
    "Step 3: Perform the Arithmetic Operation",
    "Solve the division and show the remainder working.",
    sections,
    decimalDescription(result)
  );
}

// =====================================================
// CHOOSE ARITHMETIC SOLUTION STYLE
// =====================================================

function arithmeticPaper(a, b, operator, result) {
  if (operator === "+" || operator === "-") {
    return additionSubtractionPaper(
      a,
      b,
      operator,
      result
    );
  }

  if (operator === "*") {
    return multiplicationPaper(a, b, result);
  }

  return divisionPaper(a, b, result);
}

// =====================================================
// INITIALIZE BASE SELECTORS
// =====================================================

const baseSelects = [
  "fromBase",
  "toBase",
  "firstBase",
  "secondBase",
  "resultBase"
];

for (const id of baseSelects) {
  const select = $(id);

  for (let base = 2; base <= 36; base++) {
    const option = document.createElement("option");

    option.value = String(base);
    option.textContent =
      `Base ${base}` +
      (BASE_NAMES[base] ? ` (${BASE_NAMES[base]})` : "");

    select.appendChild(option);
  }
}

$("fromBase").value = "10";
$("toBase").value = "2";
$("firstBase").value = "2";
$("secondBase").value = "2";
$("resultBase").value = "2";

// =====================================================
// RESULT MANAGEMENT
// =====================================================

function stopAnimation() {
  if (solutionTimer !== null) {
    clearInterval(solutionTimer);
    solutionTimer = null;
  }
}

function hideResults() {
  stopAnimation();

  $("resultSection").hidden = true;
  $("solutionSection").hidden = true;
  $("errorMessage").hidden = true;

  currentResult = "";
  currentSolution = [];
  lastConversion = null;
  solutionIndex = 0;
}

function showError(message) {
  hideResults();
  $("errorMessage").textContent = message;
  $("errorMessage").hidden = false;
}

function showResult(result, solution, note = "") {
  stopAnimation();

  currentResult = result;
  currentSolution = solution;
  solutionIndex = 0;

  $("errorMessage").hidden = true;
  $("resultNumber").textContent = result;
  $("resultNote").textContent = note;

  $("resultSection").hidden = false;
  $("solutionSection").hidden = true;

  $("solutionBtn").textContent =
    "Show Step-by-Step Solution";
}

function outputNote(output) {
  if (output.truncated) {
    return (
      "Incomplete fractional expansion: " +
      "the 10,000-digit safety limit was reached."
    );
  }

  if (output.repeating) {
    return (
      "Exact repeating representation. " +
      "Parentheses indicate repeating digits."
    );
  }

  return "Exact conversion result.";
}

// =====================================================
// TAB NAVIGATION
// =====================================================

document.querySelectorAll(".tab").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(tab => {
      tab.classList.remove("active");
    });

    document.querySelectorAll(".tab-content").forEach(
      section => {
        section.classList.remove("active");
      }
    );

    button.classList.add("active");
    $(button.dataset.tab).classList.add("active");

    hideResults();
  });
});

// =====================================================
// BASE CONVERTER
// =====================================================

$("convertBtn").addEventListener("click", () => {
  try {
    const input = $("convertNumber").value.trim();
    const from = Number($("fromBase").value);
    const to = Number($("toBase").value);

    const value = parseNumber(input, from);
    const output = formatNumber(value, to);

    const solution = [
      textBlock(
        "Step 1: Identify the Given Values",
        "Determine the original number and target base.",
        [
          `Given number: ${input.toUpperCase()}`,
          `Source base: ${from}`,
          `Target base: ${to}`
        ]
      )
    ];

    if (from === to) {
      solution.push(
        textBlock(
          "Step 2: No Conversion Required",
          "The source and target bases are identical.",
          ["No mathematical conversion is needed."]
        )
      );
    } else if (from === 10) {
      solution.push(integerConversionSteps(value, to));
      solution.push(
        fractionalConversionSteps(value, to, output)
      );
    } else if (to === 10) {
      solution.push(
        positionalSteps(
          input,
          from,
          "Step 2: Convert Directly to Decimal"
        )
      );
    } else {
      solution.push(
        positionalSteps(
          input,
          from,
          "Step 2: Convert to Decimal"
        )
      );

      solution.push(integerConversionSteps(value, to));

      solution.push(
        fractionalConversionSteps(value, to, output)
      );
    }

    solution.push(
      finalBlock(
        "Final Answer",
        "The number in the selected target base.",
        `${input.toUpperCase()} (Base ${from}) = ` +
        `${output.text} (Base ${to})`
      )
    );

    showResult(
      output.text,
      solution,
      outputNote(output)
    );

    lastConversion = {
      value,
      from,
      to,
      output
    };
  } catch (error) {
    showError(error.message);
  }
});

// =====================================================
// ARITHMETIC CALCULATOR
// =====================================================

$("calculateBtn").addEventListener("click", () => {
  try {
    const first = $("firstNumber").value.trim();
    const second = $("secondNumber").value.trim();

    const firstBase = Number($("firstBase").value);
    const secondBase = Number($("secondBase").value);
    const resultBase = Number($("resultBase").value);
    const operator = $("operator").value;

    const a = parseNumber(first, firstBase);
    const b = parseNumber(second, secondBase);

    let result;

    switch (operator) {
      case "+":
        result = add(a, b);
        break;
      case "-":
        result = subtract(a, b);
        break;
      case "*":
        result = multiply(a, b);
        break;
      case "/":
        result = divide(a, b);
        break;
      default:
        throw new Error("Invalid operation.");
    }

    const output = formatNumber(result, resultBase);

    const solution = [];

    if (firstBase !== 10) {
      solution.push(
        positionalSteps(
          first,
          firstBase,
          "Step 1: Convert the First Number to Decimal"
        )
      );
    } else {
      solution.push(
        textBlock(
          "Step 1: Identify the First Number",
          "The first number is already in decimal.",
          [`First number: ${decimalDescription(a)}`]
        )
      );
    }

    if (secondBase !== 10) {
      solution.push(
        positionalSteps(
          second,
          secondBase,
          "Step 2: Convert the Second Number to Decimal"
        )
      );
    } else {
      solution.push(
        textBlock(
          "Step 2: Identify the Second Number",
          "The second number is already in decimal.",
          [`Second number: ${decimalDescription(b)}`]
        )
      );
    }

    // NEW: Actual written arithmetic working
    solution.push(
      arithmeticPaper(a, b, operator, result)
    );

    if (resultBase !== 10) {
      solution.push(
        integerConversionSteps(result, resultBase)
      );

      solution.push(
        fractionalConversionSteps(
          result,
          resultBase,
          output
        )
      );
    }

    solution.push(
      finalBlock(
        "Final Answer",
        "The arithmetic result in the selected base.",
        `${output.text} (Base ${resultBase})`
      )
    );

    showResult(
      output.text,
      solution,
      outputNote(output)
    );
  } catch (error) {
    showError(error.message);
  }
});

// =====================================================
// HTML ELEMENT HELPERS
// =====================================================

function createElement(tag, className, content) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (content !== undefined) {
    element.textContent = content;
  }

  return element;
}

function renderTextStep(step, card) {
  for (const line of step.lines) {
    card.appendChild(
      createElement("p", "", line)
    );
  }
}

// =====================================================
// RENDER TABLE STEPS
// =====================================================

function renderTableStep(step, card) {
  const wrapper = createElement(
    "div",
    "solution-table-wrapper"
  );

  const table = createElement(
    "table",
    "solution-table"
  );

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  for (const heading of step.headers) {
    headerRow.appendChild(
      createElement("th", "", heading)
    );
  }

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  const visibleRows = step.rows.slice(0, MAX_TABLE_ROWS);

  visibleRows.forEach((row, rowIndex) => {
    const tr = document.createElement("tr");

    row.forEach((value, columnIndex) => {
      const td = createElement("td", "", value);

      if (
        step.headers[columnIndex] === "Digit" ||
        step.headers[columnIndex] === "Remainder"
      ) {
        td.classList.add("digit-cell");
      }

      if (
        rowIndex === step.highlightedRow &&
        columnIndex === step.highlightedColumn
      ) {
        td.classList.add("repeated-remainder");

        td.style.backgroundColor = "#FFF0D6";
        td.style.color = "#B45309";
        td.style.fontWeight = "700";
        td.style.border = "2px solid #F59E0B";
        td.title = "Repeated remainder — stop here.";
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrapper.appendChild(table);
  card.appendChild(wrapper);

  if (step.note) {
    const highlight = createElement(
      "div",
      "solution-highlight"
    );

    highlight.appendChild(
      createElement("p", "", step.note)
    );

    card.appendChild(highlight);
  }
}

// =====================================================
// NEW: RENDER PEN-AND-PAPER WORKING
// =====================================================

function renderPaperStep(step, card) {
  const container = createElement(
    "div",
    "paper-solution"
  );

  step.sections.forEach((section, index) => {
    const sectionCard = createElement(
      "div",
      "paper-section"
    );

    const heading = createElement(
      "h4",
      "paper-section-title",
      `${index + 1}. ${section.label}`
    );

    sectionCard.appendChild(heading);

    const paper = createElement(
      "div",
      "paper-sheet"
    );

    const working = createElement(
      "pre",
      "paper-working",
      section.working
    );

    paper.appendChild(working);
    sectionCard.appendChild(paper);

    if (section.explanation) {
      sectionCard.appendChild(
        createElement(
          "p",
          "paper-explanation",
          section.explanation
        )
      );
    }

    container.appendChild(sectionCard);
  });

  const answerBox = createElement(
    "div",
    "paper-answer"
  );

  answerBox.appendChild(
    createElement(
      "span",
      "paper-answer-label",
      "DECIMAL ANSWER"
    )
  );

  answerBox.appendChild(
    createElement(
      "strong",
      "paper-answer-value",
      step.answer
    )
  );

  container.appendChild(answerBox);
  card.appendChild(container);
}

// =====================================================
// RENDER INTERACTIVE SOLUTION
// =====================================================

function renderSolution() {
  if (currentSolution.length === 0) {
    return;
  }

  const step = currentSolution[solutionIndex];
  const total = currentSolution.length;

  $("solutionCounter").textContent =
    `Step ${solutionIndex + 1} of ${total}`;

  const percent = Math.round(
    ((solutionIndex + 1) / total) * 100
  );

  $("solutionPercent").textContent = `${percent}%`;
  $("solutionProgressFill").style.width = `${percent}%`;

  const container = $("solutionSteps");
  container.replaceChildren();

  const card = createElement(
    "div",
    "solution-step"
  );

  card.appendChild(
    createElement("h3", "", step.title)
  );

  if (step.description) {
    card.appendChild(
      createElement(
        "p",
        "solution-description",
        step.description
      )
    );
  }

  if (step.type === "text") {
    renderTextStep(step, card);
  } else if (step.type === "table") {
    renderTableStep(step, card);
  } else if (step.type === "paper") {
    renderPaperStep(step, card);
  } else if (step.type === "final") {
    card.appendChild(
      createElement(
        "div",
        "final-answer",
        step.answer
      )
    );
  }

  container.appendChild(card);

  $("previousStepBtn").disabled =
    solutionIndex === 0;

  $("nextStepBtn").disabled =
    solutionIndex === total - 1;

  $("playStepBtn").textContent =
    solutionTimer === null
      ? "▶ Play All"
      : "⏸ Pause";
}

// =====================================================
// SOLUTION NAVIGATION
// =====================================================

$("solutionBtn").addEventListener("click", () => {
  const section = $("solutionSection");

  if (!section.hidden) {
    stopAnimation();
    section.hidden = true;

    $("solutionBtn").textContent =
      "Show Step-by-Step Solution";

    return;
  }

  solutionIndex = 0;
  section.hidden = false;

  $("solutionBtn").textContent =
    "Hide Step-by-Step Solution";

  renderSolution();

  section.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
});

$("previousStepBtn").addEventListener("click", () => {
  stopAnimation();

  if (solutionIndex > 0) {
    solutionIndex--;
  }

  renderSolution();
});

$("nextStepBtn").addEventListener("click", () => {
  stopAnimation();

  if (solutionIndex < currentSolution.length - 1) {
    solutionIndex++;
  }

  renderSolution();
});

$("playStepBtn").addEventListener("click", () => {
  if (solutionTimer !== null) {
    stopAnimation();
    renderSolution();
    return;
  }

  if (solutionIndex === currentSolution.length - 1) {
    solutionIndex = 0;
  }

  solutionTimer = setInterval(() => {
    if (solutionIndex < currentSolution.length - 1) {
      solutionIndex++;
      renderSolution();
    } else {
      stopAnimation();
      renderSolution();
    }
  }, 2500);

  renderSolution();
});

$("resetStepBtn").addEventListener("click", () => {
  stopAnimation();
  solutionIndex = 0;
  renderSolution();
});

// =====================================================
// SWAP BASES
// =====================================================

$("swapBtn").addEventListener("click", () => {
  const from = $("fromBase").value;
  const to = $("toBase").value;
  const previous = lastConversion;

  $("fromBase").value = to;
  $("toBase").value = from;

  if (previous) {
    if (
      !previous.output.repeating &&
      !previous.output.truncated
    ) {
      $("convertNumber").value =
        previous.output.text;
    } else {
      $("convertNumber").value = "";

      showError(
        "The previous output repeats or exceeds " +
        "the safety limit. Enter a finite number " +
        "in the new source base."
      );

      return;
    }
  }

  hideResults();
});

// =====================================================
// RESET BUTTONS
// =====================================================

$("resetConvertBtn").addEventListener("click", () => {
  $("convertNumber").value = "";
  $("fromBase").value = "10";
  $("toBase").value = "2";

  hideResults();
});

$("resetCalcBtn").addEventListener("click", () => {
  $("firstNumber").value = "";
  $("secondNumber").value = "";

  $("firstBase").value = "2";
  $("secondBase").value = "2";
  $("resultBase").value = "2";
  $("operator").value = "+";

  hideResults();
});

// =====================================================
// COPY RESULT
// =====================================================

$("copyBtn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(currentResult);

    $("copyBtn").textContent = "Copied!";

    setTimeout(() => {
      $("copyBtn").textContent = "Copy";
    }, 1500);
  } catch {
    $("copyBtn").textContent = "Copy Failed";
  }
});

// =====================================================
// CLEAR OLD RESULTS WHEN INPUTS CHANGE
// =====================================================

document.querySelectorAll("input, select").forEach(
  element => {
    element.addEventListener("input", hideResults);
    element.addEventListener("change", hideResults);
  }
);

// =====================================================
// END OF SCRIPT
// =====================================================
