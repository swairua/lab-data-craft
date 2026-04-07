import { buildApiUrl } from "./api";

export interface AdminImages {
  logo?: string; // base64 data URL
  contacts?: string;
  stamp?: string;
}

/**
 * Fetches admin images (logo, contacts, stamp) from the admin_images API table.
 * Images are converted to base64 data URLs for embedding in documents.
 * Missing images are silently skipped.
 */
export async function fetchAdminImages(): Promise<AdminImages> {
  const images: AdminImages = {};
  try {
    const url = buildApiUrl({ action: "list", table: "admin_images" });
    const resp = await fetch(url, { credentials: "include" });
    if (!resp.ok) return images;
    const json = await resp.json();
    const rows: Array<{ image_type: string; file_path: string }> = json?.data || [];

    // Get latest per type
    const latest: Record<string, string> = {};
    for (const row of rows) {
      if (!latest[row.image_type]) {
        latest[row.image_type] = row.file_path;
      }
    }

    const baseUrl = new URL(buildApiUrl()).origin;

    const toDataUrl = async (path: string): Promise<string | undefined> => {
      try {
        const imgResp = await fetch(`${baseUrl}${path}`, { credentials: "include" });
        if (!imgResp.ok) return undefined;
        const blob = await imgResp.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch {
        return undefined;
      }
    };

    const [logo, contacts, stamp] = await Promise.all([
      latest.logo ? toDataUrl(latest.logo) : Promise.resolve(undefined),
      latest.contacts ? toDataUrl(latest.contacts) : Promise.resolve(undefined),
      latest.stamp ? toDataUrl(latest.stamp) : Promise.resolve(undefined),
    ]);

    images.logo = logo;
    images.contacts = contacts;
    images.stamp = stamp;
  } catch {
    // Silently fail – images are optional
  }
  return images;
}
