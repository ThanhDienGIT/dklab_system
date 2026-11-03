"use client";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** Vẽ mã QR (SVG) phía client từ chuỗi VietQR. */
export function QR({ value, size = 200 }: { value: string; size?: number }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let alive = true;
    QRCode.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "M" }).then((s) => alive && setSvg(s));
    return () => {
      alive = false;
    };
  }, [value]);
  return <div style={{ width: size, height: size }} className="[&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}
