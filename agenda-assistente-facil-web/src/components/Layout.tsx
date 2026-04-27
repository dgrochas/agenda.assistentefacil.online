import type { PropsWithChildren } from "react";

type LayoutProps = PropsWithChildren<{
  title: string;
  onLogout?: () => void;
}>;

export function Layout({ title, onLogout, children }: LayoutProps) {
  return (
    <main className="container">
      <header className="header">
        <h1>{title}</h1>
        {onLogout ? (
          <button type="button" onClick={onLogout}>
            Sair
          </button>
        ) : null}
      </header>
      {children}
    </main>
  );
}
