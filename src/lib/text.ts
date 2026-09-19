export function toTitleCase(str: string): string {
  if (!str) return str;

  return str
    .split(" ")
    .map((word) => {
      if (!word) return word;

      const isAllUpperCase = word === word.toUpperCase() && /[A-Z]/.test(word);

      if (isAllUpperCase) {
        return word;
      }

      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export function handleTitleCaseChange(
  e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  setter: (value: string) => void,
) {
  const cursorPosition = e.target.selectionStart || 0;
  const newValue = toTitleCase(e.target.value);
  setter(newValue);

  setTimeout(() => {
    e.target.setSelectionRange(cursorPosition, cursorPosition);
  }, 0);
}

export function formatPhoneNumber(phone: string): string {
  if (!phone) return phone;

  const cleaned = phone.replace(/[^\d+]/g, "");

  const withoutPlus = cleaned.startsWith("+") ? cleaned.substring(1) : cleaned;

  if (!withoutPlus) return "";

  if (cleaned.startsWith("+62")) {
    return cleaned;
  }
  if (withoutPlus.startsWith("62")) {
    return "+" + withoutPlus;
  }
  if (withoutPlus.startsWith("0")) {
    return "+62" + withoutPlus.substring(1);
  }
  if (withoutPlus.startsWith("8")) {
    return "+62" + withoutPlus;
  }
  return "+62" + withoutPlus;
}

export function handlePhoneChange(
  e: React.ChangeEvent<HTMLInputElement>,
  setter: (value: string) => void,
) {
  const value = e.target.value;
  const cleaned = value.replace(/[^\d+\-\s]/g, "");
  setter(cleaned);
}

export function handlePhoneBlur(
  value: string,
  setter: (value: string) => void,
) {
  if (value.trim()) {
    setter(formatPhoneNumber(value));
  }
}

