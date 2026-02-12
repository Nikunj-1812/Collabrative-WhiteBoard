import clsx from "clsx";
import React from "react";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export const IconButton = ({ active, className, ...props }: IconButtonProps) => {
  return (
    <button
      className={clsx(
        "h-11 w-11 rounded-lg flex items-center justify-center border-2 border-gray-200 bg-white text-gray-700 shadow-md transition-all duration-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-lg active:scale-95",
        active && "border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 ring-2 ring-blue-300 ring-offset-1 shadow-blue-200",
        className
      )}
      {...props}
    />
  );
};
