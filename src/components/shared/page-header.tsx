import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="sr-only">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
