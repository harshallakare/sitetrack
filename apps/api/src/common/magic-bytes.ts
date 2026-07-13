/**
 * Verifies that an uploaded file's CONTENT matches its claimed mimetype --
 * the client-supplied mimetype alone is trivially spoofable (e.g. an HTML
 * payload uploaded as "image/png"). Only the formats the app accepts.
 */
export function contentMatchesMimeType(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;

  switch (mimeType) {
    case "application/pdf":
      return buffer.subarray(0, 5).toString("latin1") === "%PDF-";
    case "image/jpeg":
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "image/png":
      return buffer.readUInt32BE(0) === 0x89504e47;
    case "image/webp":
      return (
        buffer.subarray(0, 4).toString("latin1") === "RIFF" &&
        buffer.subarray(8, 12).toString("latin1") === "WEBP"
      );
    default:
      return false;
  }
}
