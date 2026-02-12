interface GridBackgroundProps {
  size: number;
}

export const GridBackground = ({ size }: GridBackgroundProps) => {
  return (
    <div
      className="absolute left-0 top-0 bg-[radial-gradient(#cbd5f520_1px,transparent_1px)] [background-size:24px_24px]"
      style={{ width: size, height: size }}
    />
  );
};
