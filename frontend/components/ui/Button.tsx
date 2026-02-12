import clsx from "clsx";
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
}

export const Button = ({ variant = "primary", className, ...props }: ButtonProps) => {
  return (
    <button
      className={clsx(
        "rounded-lg px-6 py-2.5 text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg active:scale-95",
        variant === "primary"
          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 hover:shadow-blue-500/50"
          : "bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200 hover:border-gray-400",
        className
      )}
      {...props}
    />
  );
};
