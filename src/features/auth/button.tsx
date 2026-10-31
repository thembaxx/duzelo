import type { ComponentProps } from "react";
type Variant = "default" | "outline" | "ghost";
export function buttonVariants({ variant = "default" }: { variant?: Variant } = {}) {
  return `button ${variant === "default" ? "button-primary" : "button-secondary"}`;
}
export function Button({
  variant,
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={`${buttonVariants({ variant })} ${className}`} {...props} />;
}
