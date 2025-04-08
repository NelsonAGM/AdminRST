import React, { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { Input } from './input';
import { X, Image as ImageIcon, Upload } from 'lucide-react';
import { ScrollArea } from './scroll-area';

interface ImageUploadProps {
  value: string[];
  onChange: (value: string[]) => void;
  maxImages?: number;
}

export function ImageUpload({ value = [], onChange, maxImages = 5 }: ImageUploadProps) {
  const [images, setImages] = useState<string[]>(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Actualizar el estado local cuando cambien los props
  useEffect(() => {
    setImages(value);
  }, [value]);

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Verificar si añadiendo nuevas imágenes excederíamos el máximo
    if (images.length + files.length > maxImages) {
      alert(`Solo puede subir hasta ${maxImages} imágenes.`);
      return;
    }

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        alert('Por favor, seleccione solo archivos de imagen.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImages(prev => {
          const newImages = [...prev, base64String];
          onChange(newImages);
          return newImages;
        });
      };
      reader.readAsDataURL(file);
    });

    // Limpiar el input para permitir seleccionar el mismo archivo nuevamente
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
    onChange(newImages);
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap gap-2">
        {images.length > 0 ? (
          <ScrollArea className="h-32 w-full">
            <div className="flex flex-wrap gap-2 p-1">
              {images.map((img, index) => (
                <div key={index} className="relative h-24 w-24 rounded-md overflow-hidden border">
                  <img
                    src={img}
                    alt={`Imagen ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="w-full flex items-center justify-center border border-dashed rounded-md p-6">
            <div className="text-center">
              <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No hay imágenes seleccionadas
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
          multiple
        />
        <div className="text-sm text-muted-foreground">
          {images.length} de {maxImages} imágenes
        </div>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={handleClick}
          disabled={images.length >= maxImages}
        >
          <Upload className="h-4 w-4 mr-2" />
          Subir imágenes
        </Button>
      </div>
    </div>
  );
}