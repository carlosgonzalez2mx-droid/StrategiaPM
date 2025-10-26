/**
 * @fileoverview Error boundary para manejar errores en code splitting
 * @module components/ErrorBoundary
 */

import React from 'react';

/**
 * Error boundary para capturar errores en componentes lazy
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-100">
          <div className="max-w-md p-8 bg-white rounded-lg shadow-xl">
            <div className="text-center">
              {/* Icono de error */}
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-red-100 rounded-full">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              {/* Título */}
              <h2 className="mb-2 text-2xl font-bold text-gray-800">
                Algo salió mal
              </h2>

              {/* Descripción */}
              <p className="mb-6 text-gray-600">
                Ha ocurrido un error al cargar este componente. Por favor, intenta recargar la página.
              </p>

              {/* Detalles del error (solo en desarrollo) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mb-4 text-left">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                    Ver detalles técnicos
                  </summary>
                  <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              {/* Botón de recarga */}
              <button
                onClick={this.handleReload}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Recargar página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
