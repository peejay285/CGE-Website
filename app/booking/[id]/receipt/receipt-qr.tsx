"use client";

import { QRCodeSVG } from "qrcode.react";

export function ReceiptQR({ url }: { url: string }) {
  return <QRCodeSVG value={url} size={196} level="M" includeMargin={false} />;
}
