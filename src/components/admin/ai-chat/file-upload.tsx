import { ChangeEvent, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { FileUpload } from './types';

interface FileUploadProps {
  onFileSelect: (upload: FileUpload) => void;
}

export function FileUploadButton({ onFileSelect }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    onFileSelect({ file, previewUrl });
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <Button 
        onClick={() => fileInputRef.current?.click()}
        variant="outline"
      >
        Upload Book Image
      </Button>
    </div>
  );
} 