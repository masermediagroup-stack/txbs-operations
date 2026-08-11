type SectionHeaderProps = {
  id?: string;
  title: string;
  description?: string;
};

export function SectionHeader({ id, title, description }: SectionHeaderProps) {
  return (
    <div>
      <h2 id={id} className="text-base font-semibold tracking-tight">
        {title}
      </h2>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
