import { useState, useMemo, useEffect, useRef } from "react";
import { formatCurrency, roundToThousand } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { getMarkupForPrice, getMarkupRules } from "@/database/markup";
import { getCategories } from "@/database/categories";

export type Operator = "+" | "-" | "×" | "÷" | null;

export function useCalculator() {
  const { toast } = useToast();
  const [display, setDisplay] = useState<string>("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("__all__");

  const categories = useMemo(() => getCategories(), []);
  const markupRules = useMemo(() => getMarkupRules(), []);

  const cost = parseFloat(display) || 0;

  const markup = useMemo(() => {
    if (cost <= 0) return null;
    const categoryId = selectedCategory === "__all__" ? null : selectedCategory;
    return getMarkupForPrice(cost, categoryId);
  }, [cost, selectedCategory]);

  const isFixedMarkup = markup?.type === "fixed";

  let rawRetailPrice: number;
  let rawWholesalePrice: number;

  if (isFixedMarkup) {
    rawRetailPrice = cost + (markup?.retailFixed || 0);
    rawWholesalePrice = cost + (markup?.wholesaleFixed || 0);
  } else {
    rawRetailPrice = cost + (cost * (markup?.retailPercent || 0)) / 100;
    rawWholesalePrice = cost + (cost * (markup?.wholesalePercent || 0)) / 100;
  }

  const retailPrice = roundToThousand(rawRetailPrice);
  const wholesalePrice = roundToThousand(rawWholesalePrice);

  const appliedRule = useMemo(() => {
    if (!markup || cost <= 0) return null;
    const categoryId = selectedCategory === "__all__" ? null : selectedCategory;

    for (const rule of markupRules) {
      if (categoryId && rule.categoryId === categoryId) {
        const minMatch = cost >= rule.minPrice;
        const maxMatch = rule.maxPrice === null || cost <= rule.maxPrice;
        if (minMatch && maxMatch) {
          const category = categories.find((c) => c.id === rule.categoryId);
          return { ...rule, categoryName: category?.name };
        }
      }
    }

    for (const rule of markupRules) {
      if (rule.categoryId !== null) continue;
      const minMatch = cost >= rule.minPrice;
      const maxMatch = rule.maxPrice === null || cost <= rule.maxPrice;
      if (minMatch && maxMatch) {
        return { ...rule, categoryName: null };
      }
    }

    return null;
  }, [cost, selectedCategory, markupRules, categories, markup]);

  const handleNumber = (num: string) => {
    if (waitingForOperand) {
      setDisplay(num);
      setWaitingForOperand(false);
    } else {
      setDisplay((prev) => {
        if (prev === "0") return num;
        if (prev.length >= 15) return prev;
        return prev + num;
      });
    }
  };

  const handleClear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const handleBackspace = () => {
    if (waitingForOperand) return;
    setDisplay((prev) => {
      if (prev.length === 1) return "0";
      return prev.slice(0, -1);
    });
  };

  const handleTripleZero = () => {
    if (waitingForOperand) {
      setDisplay("0");
      setWaitingForOperand(false);
      return;
    }
    setDisplay((prev) => {
      if (prev === "0") return prev;
      if (prev.length >= 12) return prev;
      return prev + "000";
    });
  };

  const handleDoubleZero = () => {
    if (waitingForOperand) {
      setDisplay("0");
      setWaitingForOperand(false);
      return;
    }
    setDisplay((prev) => {
      if (prev === "0") return prev;
      if (prev.length >= 13) return prev;
      return prev + "00";
    });
  };

  const calculate = (left: number, right: number, op: Operator): number => {
    switch (op) {
      case "+":
        return left + right;
      case "-":
        return left - right;
      case "×":
        return left * right;
      case "÷":
        return right !== 0 ? left / right : 0;
      default:
        return right;
    }
  };

  const handleOperator = (nextOperator: Operator) => {
    const inputValue = parseFloat(display) || 0;

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operator) {
      const result = calculate(previousValue, inputValue, operator);
      setDisplay(String(Math.round(result)));
      setPreviousValue(result);
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  };

  const handleEquals = () => {
    if (operator === null || previousValue === null) return;

    const inputValue = parseFloat(display) || 0;
    const result = calculate(previousValue, inputValue, operator);

    setDisplay(String(Math.round(result)));
    setPreviousValue(null);
    setOperator(null);
    setWaitingForOperand(true);
  };

  const copyToClipboard = (value: number, label: string) => {
    navigator.clipboard.writeText(Math.round(value).toString());
    toast({
      title: "Disalin!",
      description: `${label}: ${formatCurrency(value)}`,
    });
  };

  const handlersRef = useRef({
    handleNumber,
    handleOperator,
    handleEquals,
    handleBackspace,
    handleClear,
  });

  useEffect(() => {
    handlersRef.current = {
      handleNumber,
      handleOperator,
      handleEquals,
      handleBackspace,
      handleClear,
    };
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      const key = e.key;
      const {
        handleNumber,
        handleOperator,
        handleEquals,
        handleBackspace,
        handleClear,
      } = handlersRef.current;

      if (/[0-9]/.test(key)) {
        e.preventDefault();
        handleNumber(key);
      } else if (key === "+") {
        e.preventDefault();
        handleOperator("+");
      } else if (key === "-") {
        e.preventDefault();
        handleOperator("-");
      } else if (key === "*" || key.toLowerCase() === "x") {
        e.preventDefault();
        handleOperator("×");
      } else if (key === "/") {
        e.preventDefault();
        handleOperator("÷");
      } else if (key === "=" || key === "Enter") {
        e.preventDefault();
        handleEquals();
      } else if (key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (key === "Escape" || key.toLowerCase() === "c") {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const expressionDisplay =
    previousValue !== null && operator
      ? `${formatCurrency(previousValue)} ${operator}`
      : null;

  return {
    display,
    cost,
    selectedCategory,
    setSelectedCategory,
    categories,
    markupRules,
    markup,
    isFixedMarkup,
    retailPrice,
    wholesalePrice,
    appliedRule,
    expressionDisplay,
    handleNumber,
    handleClear,
    handleBackspace,
    handleTripleZero,
    handleDoubleZero,
    handleOperator,
    handleEquals,
    copyToClipboard,
  };
}

