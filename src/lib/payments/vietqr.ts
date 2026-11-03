/**
 * Sinh chuỗi VietQR theo chuẩn EMVCo QR / NAPAS 247 (chuyển khoản nhanh tới tài khoản).
 * Mọi app ngân hàng tại VN quét được. Không phụ thuộc dịch vụ bên ngoài.
 * Dùng được cả server lẫn client.
 */

export type Bank = { bin: string; code: string; name: string; short: string };

/** Mã BIN NAPAS của các ngân hàng phổ biến. */
export const BANKS: Bank[] = [
  { bin: "970436", code: "VCB", short: "Vietcombank", name: "Ngân hàng TMCP Ngoại thương Việt Nam" },
  { bin: "970415", code: "ICB", short: "VietinBank", name: "Ngân hàng TMCP Công thương Việt Nam" },
  { bin: "970418", code: "BIDV", short: "BIDV", name: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam" },
  { bin: "970405", code: "VBA", short: "Agribank", name: "Ngân hàng Nông nghiệp và Phát triển Nông thôn" },
  { bin: "970407", code: "TCB", short: "Techcombank", name: "Ngân hàng TMCP Kỹ thương Việt Nam" },
  { bin: "970422", code: "MB", short: "MB Bank", name: "Ngân hàng TMCP Quân đội" },
  { bin: "970416", code: "ACB", short: "ACB", name: "Ngân hàng TMCP Á Châu" },
  { bin: "970432", code: "VPB", short: "VPBank", name: "Ngân hàng TMCP Việt Nam Thịnh Vượng" },
  { bin: "970423", code: "TPB", short: "TPBank", name: "Ngân hàng TMCP Tiên Phong" },
  { bin: "970403", code: "STB", short: "Sacombank", name: "Ngân hàng TMCP Sài Gòn Thương Tín" },
  { bin: "970441", code: "VIB", short: "VIB", name: "Ngân hàng TMCP Quốc tế Việt Nam" },
  { bin: "970443", code: "SHB", short: "SHB", name: "Ngân hàng TMCP Sài Gòn – Hà Nội" },
  { bin: "970437", code: "HDB", short: "HDBank", name: "Ngân hàng TMCP Phát triển TP.HCM" },
  { bin: "970448", code: "OCB", short: "OCB", name: "Ngân hàng TMCP Phương Đông" },
  { bin: "970426", code: "MSB", short: "MSB", name: "Ngân hàng TMCP Hàng Hải" },
  { bin: "970440", code: "SEAB", short: "SeABank", name: "Ngân hàng TMCP Đông Nam Á" },
  { bin: "970431", code: "EIB", short: "Eximbank", name: "Ngân hàng TMCP Xuất Nhập khẩu Việt Nam" },
  { bin: "970449", code: "LPB", short: "LPBank", name: "Ngân hàng TMCP Lộc Phát Việt Nam" },
  { bin: "970428", code: "NAB", short: "Nam A Bank", name: "Ngân hàng TMCP Nam Á" },
  { bin: "970409", code: "BAB", short: "Bac A Bank", name: "Ngân hàng TMCP Bắc Á" },
  { bin: "970412", code: "PVCB", short: "PVcomBank", name: "Ngân hàng TMCP Đại Chúng Việt Nam" },
  { bin: "970425", code: "ABB", short: "ABBANK", name: "Ngân hàng TMCP An Bình" },
  { bin: "970452", code: "KLB", short: "KienlongBank", name: "Ngân hàng TMCP Kiên Long" },
  { bin: "970419", code: "NCB", short: "NCB", name: "Ngân hàng TMCP Quốc Dân" },
  { bin: "970400", code: "SGICB", short: "SaigonBank", name: "Ngân hàng TMCP Sài Gòn Công Thương" },
  { bin: "970438", code: "BVB", short: "BaoVietBank", name: "Ngân hàng TMCP Bảo Việt" },
  { bin: "970433", code: "VIETBANK", short: "VietBank", name: "Ngân hàng TMCP Việt Nam Thương Tín" },
  { bin: "970427", code: "VAB", short: "VietABank", name: "Ngân hàng TMCP Việt Á" },
  { bin: "970454", code: "VCCB", short: "Viet Capital Bank", name: "Ngân hàng TMCP Bản Việt" },
];

export const findBank = (bin: string) => BANKS.find((b) => b.bin === bin);

/** Bỏ dấu tiếng Việt + ký tự lạ: nội dung chuyển khoản chỉ nên dùng A-Z 0-9 và khoảng trắng. */
export function toTransferText(s: string, max = 50): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, max);
}

const tlv = (id: string, value: string) => `${id}${value.length.toString().padStart(2, "0")}${value}`;

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) theo EMVCo. */
export function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export type VietQRInput = {
  bankBin: string;
  accountNumber: string;
  /** Số tiền VND (số nguyên). Bỏ trống => khách tự nhập số tiền */
  amount?: number;
  /** Nội dung chuyển khoản (sẽ được bỏ dấu) */
  description?: string;
};

export function buildVietQR({ bankBin, accountNumber, amount, description }: VietQRInput): string {
  if (!/^\d{6}$/.test(bankBin)) throw new Error("Mã BIN ngân hàng không hợp lệ");
  const acc = accountNumber.replace(/\s/g, "");
  if (!/^[0-9A-Za-z]{4,19}$/.test(acc)) throw new Error("Số tài khoản không hợp lệ");

  const beneficiary = tlv("00", bankBin) + tlv("01", acc);
  const merchantInfo = tlv("00", "A000000727") + tlv("01", beneficiary) + tlv("02", "QRIBFTTA");
  const hasAmount = typeof amount === "number" && amount > 0;

  let payload =
    tlv("00", "01") +
    tlv("01", hasAmount ? "12" : "11") + // 12: QR động (1 lần, có số tiền) | 11: QR tĩnh
    tlv("38", merchantInfo) +
    tlv("53", "704") + // VND
    (hasAmount ? tlv("54", String(Math.round(amount!))) : "") +
    tlv("58", "VN");

  const info = description ? toTransferText(description) : "";
  if (info) payload += tlv("62", tlv("08", info));

  payload += "6304";
  return payload + crc16(payload);
}
