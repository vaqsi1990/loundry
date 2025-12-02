"use client";

import { useState } from "react";

export default function CalculatorSection() {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);

  const inputNumber = (num: string) => {
    if (waitingForNewValue) {
      setDisplay(num);
      setWaitingForNewValue(false);
    } else {
      setDisplay(display === "0" ? num : display + num);
    }
  };

  const inputDecimal = () => {
    if (waitingForNewValue) {
      setDisplay("0.");
      setWaitingForNewValue(false);
    } else if (display.indexOf(".") === -1) {
      setDisplay(display + ".");
    }
  };

  const clear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setWaitingForNewValue(false);
  };

  const performOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForNewValue(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue: number, secondValue: number, operation: string): number => {
    switch (operation) {
      case "+":
        return firstValue + secondValue;
      case "-":
        return firstValue - secondValue;
      case "×":
        return firstValue * secondValue;
      case "÷":
        return secondValue !== 0 ? firstValue / secondValue : 0;
      case "=":
        return secondValue;
      default:
        return secondValue;
    }
  };

  const handleEquals = () => {
    const inputValue = parseFloat(display);

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation);
      setDisplay(String(newValue));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForNewValue(true);
    }
  };

  const handlePercent = () => {
    const value = parseFloat(display);
    setDisplay(String(value / 100));
  };

  const handleToggleSign = () => {
    const value = parseFloat(display);
    setDisplay(String(-value));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-black">კალკულატორი</h2>
      </div>

      <div className="max-w-md mx-auto">
        {/* Display */}
        <div className="bg-gray-900 p-6 rounded-t-lg">
          <div className="text-right">
            <div className="text-white text-[32px] md:text-[48px] font-mono overflow-x-auto">
              {display}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="bg-gray-800 p-4 rounded-b-lg">
          <div className="grid grid-cols-4 gap-2">
            {/* Row 1 */}
            <button
              onClick={clear}
              className="bg-gray-500 hover:bg-gray-600 text-white text-[20px] md:text-[24px] font-semibold py-4 rounded-lg transition-colors"
            >
              AC
            </button>
            <button
              onClick={handleToggleSign}
              className="bg-gray-500 hover:bg-gray-600 text-white text-[20px] md:text-[24px] font-semibold py-4 rounded-lg transition-colors"
            >
              +/-
            </button>
            <button
              onClick={handlePercent}
              className="bg-gray-500 hover:bg-gray-600 text-white text-[20px] md:text-[24px] font-semibold py-4 rounded-lg transition-colors"
            >
              %
            </button>
            <button
              onClick={() => performOperation("÷")}
              className="bg-orange-500 hover:bg-orange-600 text-white text-[20px] md:text-[24px] font-semibold py-4 rounded-lg transition-colors"
            >
              ÷
            </button>

            {/* Row 2 */}
            <button
              onClick={() => inputNumber("7")}
              className="bg-gray-700 hover:bg-gray-600 text-white text-[20px] md:text-[24px] font-semibold py-4 rounded-lg transition-colors"
            >
              7
            </button>
            <button
              onClick={() => inputNumber("8")}
              className="bg-gray-700 hover:bg-gray-600 text-white text-[20px] md:text-[24px] font-semibold py-4 rounded-lg transition-colors"
            >
              8
            </button>
            <button
              onClick={() => inputNumber("9")}
              className="bg-gray-700 hover:bg-gray-600 text-white text-[20px] md:text-[24px] font-semibold py-4 rounded-lg transition-colors"
            >
              9
            </button>
            <button
              onClick={() => performOperation("×")}
              className="bg-orange-500 hover:bg-orange-600 text-white text-[20px] md:text-[24px] font-semibold py-4 rounded-lg transition-colors"
            >
              ×
            </button>

            {/* Row 3 */}
            <button
              onClick={() => inputNumber("4")}
              className="bg-gray-700 hover:bg-gray-600 text-white text-[20px] md:text-[24px] font-semibold py-4 rounded-lg transition-colors"
            >
              4
            </button>
            <button
              onClick={() => inputNumber("5")}
              className="bg-gray-700 hover:bg-gray-600 text-white text-[20px] md:text-[24px] font-semibold py-4 rounded-lg transition-colors"
            >
              5
            </button>
            <button
              onClick={() => inputNumber("6")}
              className="bg-gray-700 hover:bg-gray-600 text-white text-[20px] md:text-[24px] font-semibold py-4 rounded-lg transition-colors"
            >
              6
            </button>
            <button
              onClick={() => performOperation("-")}
              className="bg-orange-500 hover:bg-orange-600 text-white text-[20px] md:text-[24px] font-semibold py-4 rounded-lg transition-colors"
            >
              -
            </button>

            {/* Row 4 */}
            <button
              onClick={() => inputNumber("1")}
              className="bg-gray-700 hover:bg-gray-600 text-white text-[20px] md:text-[24px] font-semibold py-4 rounded-lg transition-colors"
            >
              1
            </button>
            <button
              onClick={() => inputNumber("2")}
              className="bg-gray-700 hover:bg-gray-600 text-white text-[20px] md:text-[24px] font-semibold py-4 rounded-lg transition-colors"
            >
              2
            </button>
            <button
              onClick={() => inputNumber("3")}
              className="bg-gray-700 hover:bg-gray-600 text-white text-[20px] md:text-[24px] font-semibold py-4 rounded-lg transition-colors"
            >
              3
            </button>
            <button
              onClick={() => performOperation("+")}
              className="bg-orange-500 hover:bg-orange-600 text-white text-[20px] md:text-[24px] font-semibold py-4 rounded-lg transition-colors"
            >
              +
            </button>

            {/* Row 5 */}
            <button
              onClick={() => inputNumber("0")}
              className="bg-gray-700 hover:bg-gray-600 text-white text-[20px] md:text-[24px] font-semibold py-4 rounded-lg transition-colors col-span-2"
            >
              0
            </button>
            <button
              onClick={inputDecimal}
              className="bg-gray-700 hover:bg-gray-600 text-white text-[20px] md:text-[24px] font-semibold py-4 rounded-lg transition-colors"
            >
              .
            </button>
            <button
              onClick={handleEquals}
              className="bg-orange-500 hover:bg-orange-600 text-white text-[20px] md:text-[24px] font-semibold py-4 rounded-lg transition-colors"
            >
              =
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

