import { useEffect, useState } from "react";

interface Props {
  value: string;
  placeholder?: string;
  onChange(value: string): void;
}

export function StringField({ value, placeholder, onChange }: Props) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <input
      className="jf-input"
      type="text"
      value={text}
      placeholder={placeholder}
      onChange={e => setText(e.target.value)}
      onBlur={() => onChange(text)}
      onKeyDown={e => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}
