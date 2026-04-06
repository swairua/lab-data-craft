import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Loader2, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const UPLOAD_ENDPOINT = "https://lab.wayrus.co.ke/uploads";

interface UploadedFile {
  name: string;
  size: number;
  uploadedAt: string;
}

const Admin = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file is an image
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size must be less than 50MB");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      // Handle completion
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Add to uploaded files list
          setUploadedFiles((prev) => [
            {
              name: file.name,
              size: file.size,
              uploadedAt: new Date().toLocaleString(),
            },
            ...prev,
          ]);

          toast.success(`Uploaded ${file.name}`);
          setUploadProgress(0);
        } else {
          toast.error(`Upload failed with status ${xhr.status}`);
        }
      });

      // Handle errors
      xhr.addEventListener("error", () => {
        toast.error("Upload failed - network error");
      });

      xhr.addEventListener("abort", () => {
        toast.error("Upload cancelled");
      });

      xhr.open("POST", UPLOAD_ENDPOINT);
      xhr.send(formData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleUpload(e.dataTransfer.files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleUpload(e.target.files);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Image Upload</CardTitle>
          <CardDescription>Upload images to the lab media library</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-8 transition-all ${
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              disabled={isUploading}
              className="absolute inset-0 opacity-0 cursor-pointer"
              aria-label="Upload image"
            />

            <div className="flex flex-col items-center gap-3 text-center">
              {isUploading ? (
                <>
                  <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                  <div className="space-y-2 w-full max-w-sm">
                    <p className="text-sm font-medium text-foreground">Uploading...</p>
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground">{Math.round(uploadProgress)}%</p>
                  </div>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Drag and drop images here</p>
                    <p className="text-xs text-muted-foreground">or click to browse</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Supported formats: JPG, PNG, GIF, WebP (Max 50MB)</p>
                </>
              )}
            </div>
          </div>

          {!isUploading && (
            <div className="mt-4">
              <Button variant="outline" className="w-full" asChild>
                <label className="cursor-pointer">
                  Choose Image
                  <input type="file" accept="image/*" onChange={handleFileInputChange} className="hidden" />
                </label>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Uploads</CardTitle>
            <CardDescription>{uploadedFiles.length} file(s) uploaded in this session</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-muted">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)} • {file.uploadedAt}
                    </p>
                  </div>
                  <div className="text-green-600 text-xs font-medium">✓ Uploaded</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Admin;
