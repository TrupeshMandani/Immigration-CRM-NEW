import clsx from "clsx";

const ShimmeringText = ({ text, className = "", wave = false }) => {
  return (
    <span className={clsx("inline-flex", className)}>
      <span
        className={clsx("shimmering-text", wave && "shimmering-text-wave")}
      >
        {text}
      </span>
    </span>
  );
};

export { ShimmeringText };
