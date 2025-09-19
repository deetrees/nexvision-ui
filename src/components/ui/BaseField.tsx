import * as React from "react";

export function BaseInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-md border px-3 py-2",
        "bg-white text-gray-900 placeholder:text-gray-500 caret-gray-900",
        "dark:bg-zinc-900 dark:text-gray-50 dark:placeholder:text-gray-400 dark:caret-gray-50",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60",
        props.className || "",
      ].join(" ")}
    />
  );
}

export function BaseTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        "w-full rounded-md border px-3 py-2 min-h-[120px]",
        "bg-white text-gray-900 placeholder:text-gray-500 caret-gray-900",
        "dark:bg-zinc-900 dark:text-gray-50 dark:placeholder:text-gray-400 dark:caret-gray-50",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60",
        props.className || "",
      ].join(" ")}
    />
  );
}

