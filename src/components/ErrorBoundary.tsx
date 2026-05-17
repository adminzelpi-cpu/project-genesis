import React, { Component, ErrorInfo, ReactNode } from "react";
import { logError } from "@/lib/errorLogger";
import { AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logError({
      category: "frontend",
      severity: "critical",
      message: error.message,
      stackTrace: error.stack,
      context: {
        componentStack: errorInfo.componentStack,
      },
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
          <div className="max-w-md w-full bg-background rounded-lg shadow-lg p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Algo deu errado</h2>
            <p className="text-muted-foreground mb-6">
              Ocorreu um erro inesperado. Estamos trabalhando para resolver o problema.
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                onClick={() => window.location.reload()}
                variant="default"
              >
                Recarregar Página
              </Button>
              <Button
                onClick={() => (window.location.href = "/")}
                variant="outline"
              >
                Voltar ao Início
              </Button>
            </div>
            {this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  Detalhes técnicos
                </summary>
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
