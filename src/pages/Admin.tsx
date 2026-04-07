import { useCallback, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Loader2, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { buildApiUrl } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ImageType = "logo" | "contacts" | "stamp";

interface UploadedFile {
  name: string;
  size: number;
  uploadedAt: string;
  type: ImageType;
}

interface StoredImage {
  type: ImageType;
  dataUrl?: string;
  loading: boolean;
  error?: string;
}

const Admin = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedImageType, setSelectedImageType] = useState<ImageType>("logo");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [storedImages, setStoredImages] = useState<Record<ImageType, StoredImage>>({
    logo: { type: "logo", loading: true },
    contacts: { type: "contacts", loading: true },
    stamp: { type: "stamp", loading: true },
  });

  useEffect(() => {
    const fetchStoredImages = async () => {
      try {
        const url = buildApiUrl({ action: "list", table: "admin_images" });
        const resp = await fetch(url, { credentials: "include" });
        if (!resp.ok) {
          throw new Error("Failed to fetch images list");
        }
        const json = await resp.json();
        const rows: Array<{ image_type: string; file_path: string }> = json?.data || [];

        // Get latest per type
        const latest: Record<string, string> = {};
        for (const row of rows) {
          if (!latest[row.image_type]) {
            latest[row.image_type] = row.file_path;
          }
        }

        // Helper to fetch and convert image to data URL
        const toDataUrl = async (path: string): Promise<string | undefined> => {
          try {
            // Use relative fetch - let the browser handle the URL
            const imgResp = await fetch(path, { credentials: "include" });
            if (!imgResp.ok) {
              console.warn(`Failed to fetch image: ${path}, status: ${imgResp.status}`);
              return undefined;
            }
            const blob = await imgResp.blob();
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          } catch (error) {
            console.warn(`Error fetching image from path: ${path}`, error);
            return undefined;
          }
        };

        // Fetch all three images in parallel
        const results = await Promise.all([
          latest.logo ? toDataUrl(latest.logo) : Promise.resolve(undefined),
          latest.contacts ? toDataUrl(latest.contacts) : Promise.resolve(undefined),
          latest.stamp ? toDataUrl(latest.stamp) : Promise.resolve(undefined),
        ]);

        setStoredImages({
          logo: { type: "logo", dataUrl: results[0], loading: false },
          contacts: { type: "contacts", dataUrl: results[1], loading: false },
          stamp: { type: "stamp", dataUrl: results[2], loading: false },
        });
      } catch (error) {
        console.error("Error loading stored images:", error);
        // Set as no error - just no images available
        setStoredImages({
          logo: { type: "logo", loading: false },
          contacts: { type: "contacts", loading: false },
          stamp: { type: "stamp", loading: false },
        });
      }
    };

    fetchStoredImages();
  }, []);

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size must be less than 50MB");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("image_type", selectedImageType);

      const url = buildApiUrl({ action: "upload" });

      console.log("Starting upload:", {
        fileName: file.name,
        fileSize: file.size,
        imageType: selectedImageType,
        endpoint: url,
      });

      setUploadProgress(30);

      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      setUploadProgress(90);

      const data = await response.json().catch(() => null);
      console.log("Upload response:", { status: response.status, data });

      if (response.ok) {
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
      } else {
        const errorMsg = data?.error || response.statusText || `Status ${response.status}`;
        console.error("Upload error:", errorMsg);
        toast.error(`Upload failed: ${errorMsg}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("Upload exception:", error);
      toast.error(`Upload error: ${errorMsg}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [selectedImageType]);

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
      {/* Images Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle>Stored Images Preview</CardTitle>
          <CardDescription>Currently stored lab images (Logo, Contacts, Stamp)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Logo */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Logo</h4>
              <div className="border rounded-lg overflow-hidden bg-muted min-h-[150px] flex items-center justify-center">
                {storedImages.logo.loading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : storedImages.logo.error ? (
                  <p className="text-xs text-muted-foreground text-center px-2">No logo uploaded</p>
                ) : storedImages.logo.dataUrl ? (
                  <img src={storedImages.logo.dataUrl} alt="Logo" className="h-full w-full object-contain p-2" />
                ) : (
                  <p className="text-xs text-muted-foreground">No logo</p>
                )}
              </div>
            </div>

            {/* Contacts */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Contacts</h4>
              <div className="border rounded-lg overflow-hidden bg-muted min-h-[150px] flex items-center justify-center">
                {storedImages.contacts.loading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : storedImages.contacts.error ? (
                  <p className="text-xs text-muted-foreground text-center px-2">No contacts uploaded</p>
                ) : storedImages.contacts.dataUrl ? (
                  <img src={storedImages.contacts.dataUrl} alt="Contacts" className="h-full w-full object-contain p-2" />
                ) : (
                  <p className="text-xs text-muted-foreground">No contacts</p>
                )}
              </div>
            </div>

            {/* Stamp */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Stamp</h4>
              <div className="border rounded-lg overflow-hidden bg-muted min-h-[150px] flex items-center justify-center">
                {storedImages.stamp.loading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : storedImages.stamp.error ? (
                  <p className="text-xs text-muted-foreground text-center px-2">No stamp uploaded</p>
                ) : storedImages.stamp.dataUrl ? (
                  <img src={storedImages.stamp.dataUrl} alt="Stamp" className="h-full w-full object-contain p-2" />
                ) : (
                  <p className="text-xs text-muted-foreground">No stamp</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
                      <span className="inline-flex items-center rounded-full bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
                        {file.type.charAt(0).toUpperCase() + file.type.slice(1)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)} • {file.uploadedAt}
                    </p>
                  </div>
                  <div className="text-xs font-medium text-primary">✓ Uploaded</div>
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
