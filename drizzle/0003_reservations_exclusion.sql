-- Chống đặt trùng tài nguyên ở tầng database:
-- cùng một bàn / phòng / giường / nhân viên không thể có 2 lượt giữ chỗ chồng lấn thời gian
-- (chỉ tính các lượt còn hiệu lực). Hai request đồng thời => một bên nhận lỗi 23P01.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_time_valid" CHECK ("end_at" > "start_at");
--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_no_overlap"
  EXCLUDE USING gist ("resource_id" WITH =, tstzrange("start_at", "end_at", '[)') WITH &&)
  WHERE ("status" IN ('pending', 'confirmed', 'checked_in'));
