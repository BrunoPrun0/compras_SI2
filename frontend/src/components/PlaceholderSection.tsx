interface PlaceholderSectionProps {
  title: string;
  description: string;
}

// Marcador de posición para vistas que todavía no tienen funcionalidad implementada.
export function PlaceholderSection({ title, description }: PlaceholderSectionProps) {
  return (
    <div className="placeholder-card">
      <span className="placeholder-tag">Próximamente</span>
      <h2 className="placeholder-title">{title}</h2>
      <p className="placeholder-description">{description}</p>
    </div>
  );
}
