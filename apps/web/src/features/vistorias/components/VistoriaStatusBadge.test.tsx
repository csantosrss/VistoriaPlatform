import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VistoriaStatusBadge } from "./VistoriaStatusBadge";

describe("VistoriaStatusBadge", () => {
  it("renderiza label em PT-BR para SOLICITADA", () => {
    render(<VistoriaStatusBadge status="SOLICITADA" />);
    expect(screen.getByText("Solicitada")).toBeInTheDocument();
  });

  it("usa variante destructive para CANCELADA", () => {
    const { container } = render(<VistoriaStatusBadge status="CANCELADA" />);
    expect(container.firstChild).toHaveClass("bg-destructive");
    expect(screen.getByText("Cancelada")).toBeInTheDocument();
  });

  it("usa variante success para CONCLUIDA", () => {
    const { container } = render(<VistoriaStatusBadge status="CONCLUIDA" />);
    expect(container.firstChild).toHaveClass("bg-success");
  });
});
