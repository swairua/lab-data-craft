import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Loader2, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const UPLOAD_ENDPOINT = "https://lab.wayrus.co.ke/uploads";

type ImageType = "logo" | "contacts" | "stamp";

interface UploadedFile {
  name: string;
  size: number;
  uploadedAt: string;
  type: ImageType;
}

const Admin = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedImageType, setSelectedImageType] = useState<ImageType>("logo");
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
      // Log upload details
      console.log("Starting upload:", {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        imageType: selectedImageType,
        endpoint: UPLOAD_ENDPOINT,
      });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("image_type", selectedImageType);

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
        console.log("Upload response:", {
          status: xhr.status,
          statusText: xhr.statusText,
          response: xhr.responseText,
        });

        if (xhr.status >= 200 && xhr.status < 300) {
          // Add to uploaded files list
          setUploadedFiles((prev) => [
            {
              name: file.name,
              size: file.size,
              uploadedAt: new Date().toLocaleString(),
              type: selectedImageType,
            },
            ...prev,
          ]);

          const typeLabel = selectedImageType.charAt(0).toUpperCase() + selectedImageType.slice(1);
          toast.success(`Uploaded ${typeLabel}: ${file.name}`);
          setUploadProgress(0);
        } else {
          const errorMsg = xhr.responseText ? JSON.parse(xhr.responseText).error || xhr.statusText : xhr.statusText;
          console.error("Upload error response:", errorMsg);
          toast.error(`Upload failed: ${errorMsg || `Status ${xhr.status}`}`);
        }
      });

      // Handle network errors
      xhr.addEventListener("error", () => {
        console.error("Network error during upload", {
          status: xhr.status,
          statusText: xhr.statusText,
          endpoint: UPLOAD_ENDPOINT,
        });
        toast.error("Upload failed - network error. Check browser console for details.");
      });

      xhr.addEventListener("abort", () => {
        console.warn("Upload cancelled by user");
        toast.error("Upload cancelled");
      });

      // Set timeout to 5 minutes (300000 ms)
      xhr.timeout = 300000;

      xhr.addEventListener("timeout", () => {
        console.error("Upload timeout - server took too long to respond");
        toast.error("Upload timeout - server not responding");
      });

      console.log("Sending POST request to:", UPLOAD_ENDPOINT);
      xhr.open("POST", UPLOAD_ENDPOINT);
      xhr.send(formData);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("Upload exception:", {
        error: errorMsg,
        errorObj: error,
      });
      toast.error(`Upload error: ${errorMsg}`);
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
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Image Type</label>
            <Select value={selectedImageType} onValueChange={(value) => setSelectedImageType(value as ImageType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="logo">Logo</SelectItem>
                <SelectItem value="contacts">Contacts</SelectItem>
                <SelectItem value="stamp">Stamp</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                        {file.type.charAt(0).toUpperCase() + file.type.slice(1)}
                      </span>
                    </div>
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
