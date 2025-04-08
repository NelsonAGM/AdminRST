import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface SignaturePadProps {
  value: string;
  onChange: (value: string) => void;
  width?: number;
  height?: number;
  className?: string;
}

export function SignaturePad({
  value,
  onChange,
  width = 400,
  height = 200,
  className,
}: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  // Si hay un valor inicial, cargarlo en el canvas
  useEffect(() => {
    if (value && sigCanvas.current) {
      const img = new Image();
      img.onload = () => {
        const ctx = sigCanvas.current?.getCanvas().getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          setIsEmpty(false);
        }
      };
      img.src = value;
    }
  }, []);

  // Limpiar el canvas
  const clear = () => {
    sigCanvas.current?.clear();
    onChange('');
    setIsEmpty(true);
  };

  // Guardar la firma como una imagen data URL
  const save = () => {
    if (sigCanvas.current) {
      const dataURL = sigCanvas.current.toDataURL('image/png');
      onChange(dataURL);
    }
  };

  // Actualizar el estado cuando el usuario firma
  const handleBegin = () => {
    setIsEmpty(false);
  };

  // Guardar automáticamente cuando se termina de firmar
  const handleEnd = () => {
    if (!isEmpty) {
      save();
    }
  };

  return (
    <div className={cn("border rounded-md p-2 flex flex-col space-y-2", className)}>
      <div className="border border-dashed rounded-md bg-gray-50 overflow-hidden">
        <SignatureCanvas
          ref={sigCanvas}
          penColor="black"
          canvasProps={{
            width,
            height,
            className: "signature-canvas",
          }}
          onBegin={handleBegin}
          onEnd={handleEnd}
        />
      </div>
      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clear}
          disabled={isEmpty}
        >
          Limpiar
        </Button>
        <span className="text-sm text-muted-foreground">
          {isEmpty ? "Firma del cliente" : "Firma guardada"}
        </span>
      </div>
    </div>
  );
}