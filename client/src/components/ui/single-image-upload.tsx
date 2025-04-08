import React, { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { Input } from './input';
import { X, Image as ImageIcon, Upload, RefreshCw } from 'lucide-react';

interface SingleImageUploadProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function SingleImageUpload({ value = "", onChange, label = "Imagen" }: SingleImageUploadProps) {
  const [image, setImage] = useState<string>(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Actualizar el estado local cuando cambien los props
  useEffect(() => {
    setImage(value);
  }, [value]);

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      alert('Por favor, seleccione solo archivos de imagen.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setImage(base64String);
      onChange(base64String);
    };
    reader.readAsDataURL(file);

    // Limpiar el input para permitir seleccionar el mismo archivo nuevamente
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = () => {
    setImage("");
    onChange("");
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap gap-2">
        {image ? (
          <div className="relative w-full max-w-sm h-40 rounded-md overflow-hidden border">
            <img
              src={image}
              alt={label}
              className="h-full w-full object-contain"
            />
            <Button
              type="button"
              size="icon"
              variant="destructive"
              onClick={removeImage}
              className="absolute top-2 right-2 shadow-md"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-sm flex items-center justify-center border border-dashed rounded-md p-6 h-40">
            <div className="text-center">
              <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No hay imagen seleccionada
              </p>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between">
        <Input
          type="file"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
        />
        {image ? (
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={handleClick}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Cambiar imagen
          </Button>
        ) : (
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={handleClick}
          >
            <Upload className="h-4 w-4 mr-2" />
            Subir imagen
          </Button>
        )}
      </div>
    </div>
  );
}