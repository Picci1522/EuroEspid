import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface ScannerCameraProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export default function ScannerCamera({ onScanSuccess, onClose }: ScannerCameraProps) {
  useEffect(() => {
    // Inicializa o leitor
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 300, height: 100 } // Formato retangular, ideal para código de barras de NF
      }, 
      false
    );

    scanner.render(
      (decodedText) => {
        scanner.clear(); // Desliga a câmera assim que lê
        onScanSuccess(decodedText);
      },
      (error) => {
        // Os erros aqui são apenas de "foco", ignoramos para não poluir o console
      }
    );

    // Limpeza ao fechar o componente
    return () => {
      scanner.clear().catch(console.error);
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-4 rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800">Ler Código de Barras</h3>
          <button onClick={onClose} className="text-red-500 font-bold hover:bg-red-50 p-2 rounded-lg">
            Fechar
          </button>
        </div>
        
        {/* A div onde o vídeo da câmera será injetado */}
        <div id="reader" className="w-full rounded overflow-hidden border-2 border-slate-200"></div>
        
        <p className="text-sm text-center text-slate-500 mt-4 font-medium">
          Aponte a câmera para o código da DANFE
        </p>
      </div>
    </div>
  );
}