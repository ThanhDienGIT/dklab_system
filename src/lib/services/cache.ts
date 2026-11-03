import "server-only";
import { revalidateTag } from "next/cache";

/** Xóa cache trang public của tenant ngay lập tức sau khi admin sửa dữ liệu. */
export const invalidateTours = (tid: string) => revalidateTag(`tours:${tid}`, { expire: 0 });
export const invalidateTenant = () => revalidateTag("tenants", { expire: 0 });
