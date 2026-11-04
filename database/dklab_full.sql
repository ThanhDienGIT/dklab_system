-- DKLab database — sinh bởi npm run db:export-sql. Nạp: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <file>
-- Yêu cầu PostgreSQL >= 13 và extension btree_gist (gói postgresql-contrib).
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;
-- Cấu trúc + dữ liệu demo. Tài khoản: dklab/Dklab@123 (/superdklab), admin@dulichdemo.vn (và admin@<domain> từng ngành) / Admin@123. ĐỔI MẬT KHẨU khi chạy thật.
--
-- PostgreSQL database dump
--



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS "drizzle";


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS "public";


SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: -
--

CREATE TABLE "drizzle"."__drizzle_migrations" (
    "id" integer NOT NULL,
    "hash" "text" NOT NULL,
    "created_at" bigint
);


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: -
--

CREATE SEQUENCE "drizzle"."__drizzle_migrations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: -
--

ALTER SEQUENCE "drizzle"."__drizzle_migrations_id_seq" OWNED BY "drizzle"."__drizzle_migrations"."id";


--
-- Name: addon_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."addon_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "target" "text" NOT NULL,
    "months" integer DEFAULT 1 NOT NULL,
    "amount" bigint DEFAULT 0 NOT NULL,
    "code" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_by" "uuid",
    "approved_by" "uuid",
    "paid_at" timestamp with time zone,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "entity" "text" NOT NULL,
    "entity_id" "text",
    "data" "jsonb",
    "ip" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: booking_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."booking_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "resource_type" "text" NOT NULL,
    "resource_id" "uuid",
    "slot_id" "uuid",
    "resource_label" "text",
    "booking_date" "date",
    "booking_time" "text",
    "adults" integer DEFAULT 1 NOT NULL,
    "children" integer DEFAULT 0 NOT NULL,
    "full_name" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "note" "text",
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "source" "text" DEFAULT 'website'::"text" NOT NULL,
    "estimated_total" bigint DEFAULT 0 NOT NULL,
    "customer_id" "uuid",
    "assigned_to" "uuid",
    "staff_note" "text",
    "handled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "item_id" "uuid",
    "start_at" timestamp with time zone,
    "end_at" timestamp with time zone,
    "items" "jsonb"
);


--
-- Name: branches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."branches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "address" "text",
    "phone" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: catalog_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."catalog_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: catalog_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."catalog_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "category_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "price" bigint DEFAULT 0 NOT NULL,
    "duration_min" integer,
    "capacity" integer,
    "image_url" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."contracts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "item_id" "uuid",
    "code" "text" NOT NULL,
    "title" "text" NOT NULL,
    "monthly_fee" bigint DEFAULT 0 NOT NULL,
    "tax_period" "text" DEFAULT 'quarterly'::"text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "last_billed_period" "text",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "tax_code" "text",
    "address" "text",
    "note" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "source" "text",
    "total_spent" bigint DEFAULT 0 NOT NULL,
    "booking_count" integer DEFAULT 0 NOT NULL,
    "consent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "branch_id" "uuid",
    "user_id" "uuid",
    "code" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "position" "text",
    "department" "text",
    "start_date" "date",
    "status" "text" DEFAULT 'working'::"text" NOT NULL,
    "base_salary" bigint DEFAULT 0 NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."invoice_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "line_no" integer NOT NULL,
    "item_code" "text",
    "item_name" "text" NOT NULL,
    "unit" "text" DEFAULT 'Khách'::"text" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price" bigint DEFAULT 0 NOT NULL,
    "vat_rate" integer DEFAULT 8 NOT NULL,
    "amount" bigint DEFAULT 0 NOT NULL,
    "vat_amount" bigint DEFAULT 0 NOT NULL
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "booking_id" "uuid",
    "customer_id" "uuid",
    "buyer_name" "text" NOT NULL,
    "buyer_legal_name" "text",
    "buyer_tax_code" "text",
    "buyer_address" "text",
    "buyer_email" "text",
    "buyer_phone" "text",
    "issue_date" "date" NOT NULL,
    "status" "text" DEFAULT 'issued'::"text" NOT NULL,
    "subtotal" bigint DEFAULT 0 NOT NULL,
    "discount" bigint DEFAULT 0 NOT NULL,
    "vat_amount" bigint DEFAULT 0 NOT NULL,
    "total" bigint DEFAULT 0 NOT NULL,
    "paid_amount" bigint DEFAULT 0 NOT NULL,
    "bank_account_id" "text",
    "payment_ref" "text" NOT NULL,
    "public_token" "text" NOT NULL,
    "einvoice_status" "text" DEFAULT 'none'::"text" NOT NULL,
    "einvoice_data" "jsonb",
    "note" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "method" "text" NOT NULL,
    "amount" bigint DEFAULT 0 NOT NULL,
    "reference" "text",
    "received_by" "uuid",
    "paid_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: platform_admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."platform_admins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "username" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "password_hash" "text" NOT NULL,
    "token_version" integer DEFAULT 0 NOT NULL,
    "failed_logins" integer DEFAULT 0 NOT NULL,
    "locked_until" timestamp with time zone,
    "last_login_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: platform_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."platform_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid",
    "action" "text" NOT NULL,
    "tenant_id" "uuid",
    "data" "jsonb",
    "ip" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: reservations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."reservations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "resource_id" "uuid" NOT NULL,
    "booking_id" "uuid",
    "item_id" "uuid",
    "start_at" timestamp with time zone NOT NULL,
    "end_at" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "party_size" integer DEFAULT 1 NOT NULL,
    "label" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "reservations_time_valid" CHECK (("end_at" > "start_at"))
);


--
-- Name: resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."resources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "name" "text" NOT NULL,
    "area" "text",
    "capacity" integer DEFAULT 1 NOT NULL,
    "item_id" "uuid",
    "x" integer DEFAULT 0 NOT NULL,
    "y" integer DEFAULT 0 NOT NULL,
    "shape" "text" DEFAULT 'square'::"text" NOT NULL,
    "housekeeping" "text" DEFAULT 'clean'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_system" boolean DEFAULT false NOT NULL,
    "permissions" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "refresh_hash" "text" NOT NULL,
    "previous_hash" "text",
    "user_agent" "text",
    "ip" "text",
    "expires_at" timestamp with time zone NOT NULL,
    "revoked_at" timestamp with time zone,
    "last_used_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "impersonated_by" "uuid"
);


--
-- Name: tax_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."tax_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "contract_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "period" "text" NOT NULL,
    "due_date" "date" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "done_at" timestamp with time zone,
    "note" "text"
);


--
-- Name: tenant_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."tenant_domains" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "domain" "text" NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "verified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "verify_token" "text"
);


--
-- Name: tenant_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."tenant_modules" (
    "tenant_id" "uuid" NOT NULL,
    "module_key" "text" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "source" "text" DEFAULT 'industry'::"text" NOT NULL,
    "expires_at" timestamp with time zone
);


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "industry" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "plan" "text" DEFAULT 'basic'::"text" NOT NULL,
    "settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "plan_expires_at" timestamp with time zone
);


--
-- Name: tour_departures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."tour_departures" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "tour_id" "uuid" NOT NULL,
    "depart_date" "date" NOT NULL,
    "seats_total" integer NOT NULL,
    "seats_booked" integer DEFAULT 0 NOT NULL,
    "price" bigint,
    "status" "text" DEFAULT 'open'::"text" NOT NULL
);


--
-- Name: tours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."tours" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "summary" "text",
    "description" "text",
    "location" "text",
    "depart_from" "text",
    "duration_days" integer DEFAULT 1 NOT NULL,
    "duration_nights" integer DEFAULT 0 NOT NULL,
    "base_price" bigint DEFAULT 0 NOT NULL,
    "child_price" bigint DEFAULT 0 NOT NULL,
    "image_url" "text",
    "highlights" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "itinerary" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "is_published" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."user_roles" (
    "user_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "email" "text",
    "phone" "text",
    "full_name" "text" NOT NULL,
    "password_hash" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "token_version" integer DEFAULT 0 NOT NULL,
    "failed_logins" integer DEFAULT 0 NOT NULL,
    "locked_until" timestamp with time zone,
    "last_login_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY "drizzle"."__drizzle_migrations" ALTER COLUMN "id" SET DEFAULT "nextval"('"drizzle"."__drizzle_migrations_id_seq"'::"regclass");


--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: -
--

COPY "drizzle"."__drizzle_migrations" ("id", "hash", "created_at") FROM stdin;
1	1600488008166881813c677a2269420116555e5a439662515c7e01fd6e26f2d2	1793700232381
2	d895c5b16126a97d4e246b041c468c4e9deb1f886853d020ad07bf7f0bfdb62d	1793710211112
3	b9ab3d37bcc2801eaac3ddaa6f3c1bd8c069e0946cf0576b09e152041db64b5f	1793782508313
4	16468f53f1a52cedf841b7fc7ac6f7cd7f0443be32db3af84f768b876ecc1a6e	1793782509173
5	78f16f0fd90da4dcf3885c31a2a62ff889038dc5b9b10834035c9e6fe296b3f1	1793783515841
6	05731524b3ee57684addc6185b4f07276aae41ff3214a76d1f1e416f571b7d25	1793784288766
\.


--
-- Data for Name: addon_orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."addon_orders" ("id", "tenant_id", "kind", "target", "months", "amount", "code", "status", "created_by", "approved_by", "paid_at", "note", "created_at") FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."audit_logs" ("id", "tenant_id", "user_id", "action", "entity", "entity_id", "data", "ip", "created_at") FROM stdin;
\.


--
-- Data for Name: booking_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."booking_requests" ("id", "tenant_id", "code", "resource_type", "resource_id", "slot_id", "resource_label", "booking_date", "booking_time", "adults", "children", "full_name", "phone", "email", "note", "status", "source", "estimated_total", "customer_id", "assigned_to", "staff_note", "handled_at", "created_at", "updated_at", "item_id", "start_at", "end_at", "items") FROM stdin;
15dec02e-0db5-4cca-9adb-7700ae8dd1e8	8620e0f3-97c7-4cb4-9382-f06c521a1381	DC261104-DEM1	tour	d5dd00f2-7b7e-400d-8804-2efd57347d94	\N	Hạ Long – Ngủ đêm du thuyền 5 sao	2026-11-10	\N	2	1	Hoàng Minh Anh	0912345671	minhanh@example.com	Gia đình có bé 6 tuổi, cần phòng tầng thấp	new	website	7970000	bc15a82f-be9b-40f6-b7a7-f1f43c0248f4	\N	\N	\N	2026-11-04 09:49:14.798779+00	2026-11-04 09:49:14.798779+00	\N	\N	\N	\N
261d9994-9758-4b0c-909c-3bcd05dfbd13	8620e0f3-97c7-4cb4-9382-f06c521a1381	DC261104-DEM2	tour	b0f9f4a6-dd02-4e72-80cd-786810fd2797	\N	Đà Nẵng – Hội An – Bà Nà Hills	2026-11-11	\N	2	0	Đỗ Thu Trang	0912345672	\N	Gọi sau 18h giúp em	new	website	9180000	3d784e2c-fe96-427e-b948-1f4650bf06dc	\N	\N	\N	2026-11-04 09:49:14.798779+00	2026-11-04 09:49:14.798779+00	\N	\N	\N	\N
3546fb73-a9a7-4f82-ad40-84094207872c	3b80d278-2af7-4dae-b58a-2dbd991b4182	DC261105-KE1	service	\N	\N	Kê khai thuế trọn gói (DN nhỏ) · CV. Lê Thu Hà	2026-11-05	10:00	2	0	Nguyễn Thu Hà	0912000101	\N	\N	new	website	1000000	8d2e4750-af52-49bf-b2a8-0d35761c126f	\N	\N	\N	2026-11-04 09:49:14.927361+00	2026-11-04 09:49:14.927361+00	15219888-df74-463e-bcec-5f7d999e26de	2026-11-05 03:00:00+00	2026-11-05 03:30:00+00	\N
f322013e-44af-40ad-9259-29309528e56a	3b80d278-2af7-4dae-b58a-2dbd991b4182	DC261105-KE2	service	\N	\N	Kê khai thuế trọn gói (DN nhỏ) · CV. Phạm Quốc Bảo	2026-11-05	18:00	2	0	Trần Quốc Việt	0912000102	\N	\N	confirmed	website	1000000	878b7e2a-a460-45cd-a738-40b54633ec40	\N	\N	\N	2026-11-04 09:49:14.927361+00	2026-11-04 09:49:14.927361+00	15219888-df74-463e-bcec-5f7d999e26de	2026-11-05 11:00:00+00	2026-11-05 11:30:00+00	\N
8249b1e2-5e39-474d-be8d-30169493ed25	455f57ad-4545-48ac-8552-459852027f1a	DC261105-CA1	table	7da14f7c-c158-4726-aa3b-f4ebfcab673e	\N	Bàn B1	2026-11-05	10:00	2	0	Nguyễn Thu Hà	0912000101	\N	\N	new	website	35000	08a6b75a-a80e-4216-82db-303eb1eff67c	\N	\N	\N	2026-11-04 09:49:14.998973+00	2026-11-04 09:49:14.998973+00	\N	2026-11-05 03:00:00+00	2026-11-05 04:30:00+00	\N
e7deb0bd-0aae-49c5-bf60-0c6724e750fd	455f57ad-4545-48ac-8552-459852027f1a	DC261105-CA2	table	43069bf6-2db8-47a9-beb9-95012668f091	\N	Bàn B2	2026-11-05	18:00	2	0	Trần Quốc Việt	0912000102	\N	\N	confirmed	website	35000	d2ccca60-9a37-427b-87c6-ba79e4fea43f	\N	\N	\N	2026-11-04 09:49:14.998973+00	2026-11-04 09:49:14.998973+00	\N	2026-11-05 11:00:00+00	2026-11-05 12:30:00+00	\N
c3aff66d-b929-4c41-b4fe-dd050b0a1d74	b8a63c7f-10a0-4c8b-b34e-2dbef4297724	DC261105-KH1	room	\N	\N	Standard · 101	2026-11-05	14:00	2	0	Nguyễn Thu Hà	0912000101	\N	\N	new	website	650000	d1aa73f7-4f5c-4441-9749-3dc31b7110da	\N	\N	\N	2026-11-04 09:49:15.115094+00	2026-11-04 09:49:15.115094+00	b0a85d00-55e1-46c9-b1e7-48d07cbac73e	2026-11-05 07:00:00+00	2026-11-06 05:00:00+00	\N
a6ea72e8-b3a1-4725-b541-2232a49654aa	b8a63c7f-10a0-4c8b-b34e-2dbef4297724	DC261105-KH2	room	\N	\N	Standard · 201	2026-11-05	14:00	2	0	Trần Quốc Việt	0912000102	\N	\N	confirmed	website	650000	30e4c3e3-76e1-4bf0-8cae-472799867842	\N	\N	\N	2026-11-04 09:49:15.115094+00	2026-11-04 09:49:15.115094+00	b0a85d00-55e1-46c9-b1e7-48d07cbac73e	2026-11-05 07:00:00+00	2026-11-06 05:00:00+00	\N
5a38c60d-65f8-466e-8f11-fdc4174356a3	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	DC261105-NH1	table	f7587a2a-5c00-4cd4-91e8-1fe947e14f01	\N	Bàn T1	2026-11-05	10:00	2	0	Nguyễn Thu Hà	0912000101	\N	\N	new	website	65000	ce2d83ea-ab8a-442e-ad79-08e6bc427b8b	\N	\N	\N	2026-11-04 09:49:15.165171+00	2026-11-04 09:49:15.165171+00	\N	2026-11-05 03:00:00+00	2026-11-05 05:00:00+00	\N
db8c8d63-8c5f-4afa-9466-07774ea69782	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	DC261105-NH2	table	f48350e5-ff4b-47f2-8d03-905de1e60b45	\N	Bàn T2	2026-11-05	18:00	2	0	Trần Quốc Việt	0912000102	\N	\N	confirmed	website	65000	9078684f-f716-44a9-af9e-a2b88463b2db	\N	\N	\N	2026-11-04 09:49:15.165171+00	2026-11-04 09:49:15.165171+00	\N	2026-11-05 11:00:00+00	2026-11-05 13:00:00+00	\N
5f5fe392-60c6-4095-9df7-0c8bb405e154	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	DC261105-SP1	service	\N	\N	Massage body đá nóng · KTV Ngọc Anh	2026-11-05	10:00	2	0	Nguyễn Thu Hà	0912000101	\N	\N	new	website	450000	24ed9541-053c-436e-8411-e3eac4f0fce5	\N	\N	\N	2026-11-04 09:49:15.213727+00	2026-11-04 09:49:15.213727+00	4ca6abef-9224-4679-8bd3-258197d52086	2026-11-05 03:00:00+00	2026-11-05 04:30:00+00	\N
bda15939-bfb7-4268-8cda-7ea71d2bdca2	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	DC261105-SP2	service	\N	\N	Massage body đá nóng · KTV Thảo	2026-11-05	18:00	2	0	Trần Quốc Việt	0912000102	\N	\N	confirmed	website	450000	649430a4-b9fd-41a9-bdb3-a35e744ae0e3	\N	\N	\N	2026-11-04 09:49:15.213727+00	2026-11-04 09:49:15.213727+00	4ca6abef-9224-4679-8bd3-258197d52086	2026-11-05 11:00:00+00	2026-11-05 12:30:00+00	\N
\.


--
-- Data for Name: branches; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."branches" ("id", "tenant_id", "name", "address", "phone", "is_active", "created_at") FROM stdin;
21ceb3f6-08e2-4784-a090-748f08bc06aa	8620e0f3-97c7-4cb4-9382-f06c521a1381	Văn phòng TP.HCM	123 Nguyễn Huệ, Q.1	0901234567	t	2026-11-04 09:49:14.798779+00
2c764863-b8a8-45c5-ae18-3e1a288dc259	3b80d278-2af7-4dae-b58a-2dbd991b4182	Cơ sở chính	150 Cộng Hòa, Tân Bình, TP.HCM	0906789012	t	2026-11-04 09:49:14.927361+00
ebc744d1-9cdb-4464-b0a4-d33aee55cde7	455f57ad-4545-48ac-8552-459852027f1a	Cơ sở chính	12 Nguyễn Thị Minh Khai, Quận 3, TP.HCM	0903456789	t	2026-11-04 09:49:14.998973+00
3661c56f-dad7-4ce6-a397-97527c08eb1f	b8a63c7f-10a0-4c8b-b34e-2dbef4297724	Cơ sở chính	20 Võ Nguyên Giáp, Sơn Trà, Đà Nẵng	0905678901	t	2026-11-04 09:49:15.115094+00
fc3a3dd2-77ff-44f3-8c85-a0415837e8c0	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	Cơ sở chính	88 Hai Bà Trưng, Quận 1, TP.HCM	0904567890	t	2026-11-04 09:49:15.165171+00
885977af-28fa-4a97-ac15-3a07005d9f8d	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	Cơ sở chính	45 Lê Lợi, Quận 1, TP.HCM	0902345678	t	2026-11-04 09:49:15.213727+00
\.


--
-- Data for Name: catalog_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."catalog_categories" ("id", "tenant_id", "name", "sort_order", "is_active", "created_at") FROM stdin;
407ee555-7be1-44b5-8665-023dd0789377	3b80d278-2af7-4dae-b58a-2dbd991b4182	Gói hàng tháng	0	t	2026-11-04 09:49:14.927361+00
cb33a857-5e7a-4f32-a596-cb12e98637b8	3b80d278-2af7-4dae-b58a-2dbd991b4182	Dịch vụ một lần	1	t	2026-11-04 09:49:14.927361+00
eff46370-8a62-4664-b8b2-c603c81f44b6	455f57ad-4545-48ac-8552-459852027f1a	Cà phê	0	t	2026-11-04 09:49:14.998973+00
538b0cb2-31f8-4794-86af-2fcec3e37f45	455f57ad-4545-48ac-8552-459852027f1a	Trà & Đá xay	1	t	2026-11-04 09:49:14.998973+00
6712e2a5-4e10-4dfc-bbcb-f7a8880e719c	455f57ad-4545-48ac-8552-459852027f1a	Bánh	2	t	2026-11-04 09:49:14.998973+00
b3cd31c7-2077-4e2f-b3ce-6a472db1d093	b8a63c7f-10a0-4c8b-b34e-2dbef4297724	Phòng	0	t	2026-11-04 09:49:15.115094+00
8f54d7a3-b82a-48af-a0a3-5f50577bc3fc	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	Khai vị	0	t	2026-11-04 09:49:15.165171+00
0b5e2ca1-01f3-4263-9389-dac96491dee8	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	Món chính	1	t	2026-11-04 09:49:15.165171+00
2e691a2a-834b-4278-a07d-cb7e7eb1fffe	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	Tráng miệng & Đồ uống	2	t	2026-11-04 09:49:15.165171+00
36a8ea77-e551-45d8-92d0-d6cef6a21da9	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	Massage trị liệu	0	t	2026-11-04 09:49:15.213727+00
899373ac-a59d-4cd0-adf9-360eabc5d065	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	Chăm sóc da	1	t	2026-11-04 09:49:15.213727+00
13224539-0800-4554-b302-83baacf8e8f2	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	Gói thư giãn	2	t	2026-11-04 09:49:15.213727+00
\.


--
-- Data for Name: catalog_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."catalog_items" ("id", "tenant_id", "category_id", "name", "description", "price", "duration_min", "capacity", "image_url", "tags", "is_active", "sort_order", "created_at", "updated_at") FROM stdin;
15219888-df74-463e-bcec-5f7d999e26de	3b80d278-2af7-4dae-b58a-2dbd991b4182	407ee555-7be1-44b5-8665-023dd0789377	Kê khai thuế trọn gói (DN nhỏ)	Kê khai GTGT, TNCN, nộp tờ khai đúng hạn, tư vấn qua Zalo.	1000000	30	\N	\N	{"Phổ biến"}	t	0	2026-11-04 09:49:14.927361+00	2026-11-04 09:49:14.927361+00
1449f9e6-5570-426e-b6fc-6ce3cf298878	3b80d278-2af7-4dae-b58a-2dbd991b4182	407ee555-7be1-44b5-8665-023dd0789377	Kế toán dịch vụ trọn gói	Sổ sách, kê khai, báo cáo tài chính cuối năm.	2500000	30	\N	\N	{}	t	1	2026-11-04 09:49:14.927361+00	2026-11-04 09:49:14.927361+00
04cf4f26-09ff-44db-b449-4cff6c10d1b2	3b80d278-2af7-4dae-b58a-2dbd991b4182	cb33a857-5e7a-4f32-a596-cb12e98637b8	Thành lập doanh nghiệp	Hồ sơ, đăng ký, khắc dấu, chữ ký số.	1500000	30	\N	\N	{}	t	0	2026-11-04 09:49:14.927361+00	2026-11-04 09:49:14.927361+00
9bfa76f8-9816-416e-87db-c7e4def2c2f2	3b80d278-2af7-4dae-b58a-2dbd991b4182	cb33a857-5e7a-4f32-a596-cb12e98637b8	Quyết toán thuế TNDN cuối năm	\N	3000000	60	\N	\N	{}	t	1	2026-11-04 09:49:14.927361+00	2026-11-04 09:49:14.927361+00
145cf60a-0d64-4f86-bde7-abb3a6731abd	3b80d278-2af7-4dae-b58a-2dbd991b4182	cb33a857-5e7a-4f32-a596-cb12e98637b8	Tư vấn miễn phí 30 phút	\N	0	30	\N	\N	{}	t	2	2026-11-04 09:49:14.927361+00	2026-11-04 09:49:14.927361+00
505d42bf-75cf-457e-97ad-6e6be8e29aa1	455f57ad-4545-48ac-8552-459852027f1a	eff46370-8a62-4664-b8b2-c603c81f44b6	Cà phê sữa đá	\N	35000	\N	\N	\N	{"Bán chạy"}	t	0	2026-11-04 09:49:14.998973+00	2026-11-04 09:49:14.998973+00
073db454-2686-4eb7-80c0-44b8dc7d1478	455f57ad-4545-48ac-8552-459852027f1a	eff46370-8a62-4664-b8b2-c603c81f44b6	Bạc xỉu	\N	39000	\N	\N	\N	{}	t	1	2026-11-04 09:49:14.998973+00	2026-11-04 09:49:14.998973+00
58814d72-20d1-4998-8eb3-efb12db33c0a	455f57ad-4545-48ac-8552-459852027f1a	eff46370-8a62-4664-b8b2-c603c81f44b6	Cà phê muối	\N	45000	\N	\N	\N	{Mới}	t	2	2026-11-04 09:49:14.998973+00	2026-11-04 09:49:14.998973+00
8b93fdb9-6c1b-4a01-9924-3171311479e7	455f57ad-4545-48ac-8552-459852027f1a	eff46370-8a62-4664-b8b2-c603c81f44b6	Cold brew cam sả	\N	55000	\N	\N	\N	{}	t	3	2026-11-04 09:49:14.998973+00	2026-11-04 09:49:14.998973+00
0a983cde-6436-4335-8270-8bacb0da4fdc	455f57ad-4545-48ac-8552-459852027f1a	538b0cb2-31f8-4794-86af-2fcec3e37f45	Trà đào cam sả	\N	45000	\N	\N	\N	{}	t	0	2026-11-04 09:49:14.998973+00	2026-11-04 09:49:14.998973+00
768bae18-71e4-4a8b-bbde-42ec28af4200	455f57ad-4545-48ac-8552-459852027f1a	538b0cb2-31f8-4794-86af-2fcec3e37f45	Trà sen vàng	\N	49000	\N	\N	\N	{}	t	1	2026-11-04 09:49:14.998973+00	2026-11-04 09:49:14.998973+00
78a1bb06-eada-4f8a-b1c9-aeb4b152b657	455f57ad-4545-48ac-8552-459852027f1a	538b0cb2-31f8-4794-86af-2fcec3e37f45	Matcha đá xay	\N	59000	\N	\N	\N	{}	t	2	2026-11-04 09:49:14.998973+00	2026-11-04 09:49:14.998973+00
f646b5cc-5e21-4c84-b651-7d4714b9c357	455f57ad-4545-48ac-8552-459852027f1a	6712e2a5-4e10-4dfc-bbcb-f7a8880e719c	Croissant bơ	\N	35000	\N	\N	\N	{}	t	0	2026-11-04 09:49:14.998973+00	2026-11-04 09:49:14.998973+00
ffd18922-7b00-47b0-9037-ca318d078b85	455f57ad-4545-48ac-8552-459852027f1a	6712e2a5-4e10-4dfc-bbcb-f7a8880e719c	Tiramisu	\N	49000	\N	\N	\N	{}	t	1	2026-11-04 09:49:14.998973+00	2026-11-04 09:49:14.998973+00
b0a85d00-55e1-46c9-b1e7-48d07cbac73e	b8a63c7f-10a0-4c8b-b34e-2dbef4297724	b3cd31c7-2077-4e2f-b3ce-6a472db1d093	Standard	1 giường đôi, 22m², cửa sổ thành phố.	650000	\N	2	\N	{}	t	0	2026-11-04 09:49:15.115094+00	2026-11-04 09:49:15.115094+00
5308f18d-53ba-41fe-8838-9a0c05e982cb	b8a63c7f-10a0-4c8b-b34e-2dbef4297724	b3cd31c7-2077-4e2f-b3ce-6a472db1d093	Deluxe hướng biển	1 giường King, 30m², ban công hướng biển.	1150000	\N	2	\N	{"Được yêu thích"}	t	1	2026-11-04 09:49:15.115094+00	2026-11-04 09:49:15.115094+00
5e059094-f437-48f8-80d8-a30646f8da52	b8a63c7f-10a0-4c8b-b34e-2dbef4297724	b3cd31c7-2077-4e2f-b3ce-6a472db1d093	Family	2 giường đôi, 40m², phù hợp gia đình 4 người.	1550000	\N	4	\N	{}	t	2	2026-11-04 09:49:15.115094+00	2026-11-04 09:49:15.115094+00
f6be83ac-779b-4ad0-a616-520ff1ab7074	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	8f54d7a3-b82a-48af-a0a3-5f50577bc3fc	Gỏi cuốn tôm thịt	\N	65000	\N	\N	\N	{}	t	0	2026-11-04 09:49:15.165171+00	2026-11-04 09:49:15.165171+00
b8492eb4-9e41-4a39-8e0f-a17dc9b6d21f	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	8f54d7a3-b82a-48af-a0a3-5f50577bc3fc	Chả giò hải sản	\N	89000	\N	\N	\N	{}	t	1	2026-11-04 09:49:15.165171+00	2026-11-04 09:49:15.165171+00
85482602-46b5-4735-9234-02d18560d0f5	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	0b5e2ca1-01f3-4263-9389-dac96491dee8	Cá kho tộ	\N	149000	\N	\N	\N	{"Đặc sản"}	t	0	2026-11-04 09:49:15.165171+00	2026-11-04 09:49:15.165171+00
3292f0de-d1c5-4be8-8b72-641524ca18fa	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	0b5e2ca1-01f3-4263-9389-dac96491dee8	Gà nướng mật ong	\N	199000	\N	\N	\N	{}	t	1	2026-11-04 09:49:15.165171+00	2026-11-04 09:49:15.165171+00
492bd1bb-6154-4b09-85e5-0a2d9265686d	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	0b5e2ca1-01f3-4263-9389-dac96491dee8	Bò lúc lắc	\N	219000	\N	\N	\N	{"Bán chạy"}	t	2	2026-11-04 09:49:15.165171+00	2026-11-04 09:49:15.165171+00
e7b0840e-0a69-4e14-9fd2-3fb88275c42f	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	0b5e2ca1-01f3-4263-9389-dac96491dee8	Lẩu thái hải sản	2–4 người	399000	\N	\N	\N	{}	t	3	2026-11-04 09:49:15.165171+00	2026-11-04 09:49:15.165171+00
2739cbed-845f-4217-8887-00e69b7861f2	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	2e691a2a-834b-4278-a07d-cb7e7eb1fffe	Chè khúc bạch	\N	45000	\N	\N	\N	{}	t	0	2026-11-04 09:49:15.165171+00	2026-11-04 09:49:15.165171+00
099445fa-f623-4fc4-8212-e9591e4a2564	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	2e691a2a-834b-4278-a07d-cb7e7eb1fffe	Nước ép cam	\N	49000	\N	\N	\N	{}	t	1	2026-11-04 09:49:15.165171+00	2026-11-04 09:49:15.165171+00
4ca6abef-9224-4679-8bd3-258197d52086	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	36a8ea77-e551-45d8-92d0-d6cef6a21da9	Massage body đá nóng	Đá bazan nóng giúp giãn cơ, lưu thông khí huyết.	450000	90	\N	\N	{}	t	0	2026-11-04 09:49:15.213727+00	2026-11-04 09:49:15.213727+00
caaad6dd-4458-4745-80c6-a3a9e928cf5f	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	36a8ea77-e551-45d8-92d0-d6cef6a21da9	Massage cổ vai gáy	Giảm đau mỏi cho dân văn phòng.	250000	45	\N	\N	{}	t	1	2026-11-04 09:49:15.213727+00	2026-11-04 09:49:15.213727+00
71a5684d-1b04-4f86-9345-fcd943448f02	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	36a8ea77-e551-45d8-92d0-d6cef6a21da9	Bấm huyệt chân	Thư giãn, ngủ ngon hơn.	200000	60	\N	\N	{}	t	2	2026-11-04 09:49:15.213727+00	2026-11-04 09:49:15.213727+00
5061b760-028a-49a0-852c-4124ee8bcd23	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	899373ac-a59d-4cd0-adf9-360eabc5d065	Chăm sóc da mặt cơ bản	Làm sạch sâu, đắp mặt nạ, cấp ẩm.	350000	60	\N	\N	{}	t	0	2026-11-04 09:49:15.213727+00	2026-11-04 09:49:15.213727+00
2795515d-6dab-4e98-ae28-bcadb460bf59	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	899373ac-a59d-4cd0-adf9-360eabc5d065	Trị mụn chuẩn y khoa	Lấy nhân mụn, điện di, kháng viêm.	550000	75	\N	\N	{}	t	1	2026-11-04 09:49:15.213727+00	2026-11-04 09:49:15.213727+00
169baf3c-c70d-4abd-a911-f9ffa039cf25	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	13224539-0800-4554-b302-83baacf8e8f2	Gói Lotus 2 giờ	Xông hơi + massage body + chăm sóc da mặt.	990000	120	\N	\N	{"Bán chạy"}	t	0	2026-11-04 09:49:15.213727+00	2026-11-04 09:49:15.213727+00
\.


--
-- Data for Name: contracts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."contracts" ("id", "tenant_id", "customer_id", "item_id", "code", "title", "monthly_fee", "tax_period", "start_date", "end_date", "status", "last_billed_period", "note", "created_at", "updated_at") FROM stdin;
3bc1e5ed-968d-49f3-bd41-5ba73b1e90f0	3b80d278-2af7-4dae-b58a-2dbd991b4182	7f37220d-2e36-48dc-a5d8-43b7de479dc6	15219888-df74-463e-bcec-5f7d999e26de	HD-KT001	Dịch vụ kê khai thuế trọn gói	1000000	quarterly	2026-01-01	\N	active	\N	\N	2026-11-04 09:49:14.927361+00	2026-11-04 09:49:14.927361+00
eb338349-1bfe-46b8-baf1-84e8728cc5b4	3b80d278-2af7-4dae-b58a-2dbd991b4182	57b7a3d8-20fa-4b26-9679-59cd8852c454	15219888-df74-463e-bcec-5f7d999e26de	HD-KT002	Dịch vụ kê khai thuế trọn gói	2500000	monthly	2026-01-01	\N	active	\N	\N	2026-11-04 09:49:14.927361+00	2026-11-04 09:49:14.927361+00
05bdb445-1e2d-478a-b8da-1659cc9ed06a	3b80d278-2af7-4dae-b58a-2dbd991b4182	58c7d6d5-9d92-4841-928f-23229e011aa4	15219888-df74-463e-bcec-5f7d999e26de	HD-KT003	Dịch vụ kê khai thuế trọn gói	600000	quarterly	2026-01-01	\N	active	\N	\N	2026-11-04 09:49:14.927361+00	2026-11-04 09:49:14.927361+00
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."customers" ("id", "tenant_id", "full_name", "phone", "email", "tax_code", "address", "note", "tags", "source", "total_spent", "booking_count", "consent_at", "created_at", "updated_at") FROM stdin;
bc15a82f-be9b-40f6-b7a7-f1f43c0248f4	8620e0f3-97c7-4cb4-9382-f06c521a1381	Hoàng Minh Anh	0912345671	minhanh@example.com	\N	\N	\N	{}	website	0	1	2026-11-04 09:49:14.824+00	2026-11-04 09:49:14.798779+00	2026-11-04 09:49:14.798779+00
3d784e2c-fe96-427e-b948-1f4650bf06dc	8620e0f3-97c7-4cb4-9382-f06c521a1381	Đỗ Thu Trang	0912345672	\N	\N	\N	\N	{}	website	0	1	2026-11-04 09:49:14.83+00	2026-11-04 09:49:14.798779+00	2026-11-04 09:49:14.798779+00
8d2e4750-af52-49bf-b2a8-0d35761c126f	3b80d278-2af7-4dae-b58a-2dbd991b4182	Nguyễn Thu Hà	0912000101	\N	\N	\N	\N	{}	website	0	1	2026-11-04 09:49:14.956+00	2026-11-04 09:49:14.927361+00	2026-11-04 09:49:14.927361+00
878b7e2a-a460-45cd-a738-40b54633ec40	3b80d278-2af7-4dae-b58a-2dbd991b4182	Trần Quốc Việt	0912000102	\N	\N	\N	\N	{}	website	0	1	2026-11-04 09:49:14.962+00	2026-11-04 09:49:14.927361+00	2026-11-04 09:49:14.927361+00
7f37220d-2e36-48dc-a5d8-43b7de479dc6	3b80d278-2af7-4dae-b58a-2dbd991b4182	Công ty TNHH Thương mại Hải Đăng	0283800111	\N	0316789012	\N	\N	{"Doanh nghiệp"}	referral	0	0	\N	2026-11-04 09:49:14.927361+00	2026-11-04 09:49:14.927361+00
57b7a3d8-20fa-4b26-9679-59cd8852c454	3b80d278-2af7-4dae-b58a-2dbd991b4182	Công ty CP Công nghệ Sao Mai	0283800222	\N	0317890123	\N	\N	{"Doanh nghiệp"}	referral	0	0	\N	2026-11-04 09:49:14.927361+00	2026-11-04 09:49:14.927361+00
58c7d6d5-9d92-4841-928f-23229e011aa4	3b80d278-2af7-4dae-b58a-2dbd991b4182	Hộ kinh doanh Cà phê Gió	0909111222	\N	8023456789	\N	\N	{"Doanh nghiệp"}	referral	0	0	\N	2026-11-04 09:49:14.927361+00	2026-11-04 09:49:14.927361+00
08a6b75a-a80e-4216-82db-303eb1eff67c	455f57ad-4545-48ac-8552-459852027f1a	Nguyễn Thu Hà	0912000101	\N	\N	\N	\N	{}	website	0	1	2026-11-04 09:49:15.041+00	2026-11-04 09:49:14.998973+00	2026-11-04 09:49:14.998973+00
d2ccca60-9a37-427b-87c6-ba79e4fea43f	455f57ad-4545-48ac-8552-459852027f1a	Trần Quốc Việt	0912000102	\N	\N	\N	\N	{}	website	0	1	2026-11-04 09:49:15.046+00	2026-11-04 09:49:14.998973+00	2026-11-04 09:49:14.998973+00
d1aa73f7-4f5c-4441-9749-3dc31b7110da	b8a63c7f-10a0-4c8b-b34e-2dbef4297724	Nguyễn Thu Hà	0912000101	\N	\N	\N	\N	{}	website	0	1	2026-11-04 09:49:15.145+00	2026-11-04 09:49:15.115094+00	2026-11-04 09:49:15.115094+00
30e4c3e3-76e1-4bf0-8cae-472799867842	b8a63c7f-10a0-4c8b-b34e-2dbef4297724	Trần Quốc Việt	0912000102	\N	\N	\N	\N	{}	website	0	1	2026-11-04 09:49:15.148+00	2026-11-04 09:49:15.115094+00	2026-11-04 09:49:15.115094+00
ce2d83ea-ab8a-442e-ad79-08e6bc427b8b	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	Nguyễn Thu Hà	0912000101	\N	\N	\N	\N	{}	website	0	1	2026-11-04 09:49:15.193+00	2026-11-04 09:49:15.165171+00	2026-11-04 09:49:15.165171+00
9078684f-f716-44a9-af9e-a2b88463b2db	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	Trần Quốc Việt	0912000102	\N	\N	\N	\N	{}	website	0	1	2026-11-04 09:49:15.195+00	2026-11-04 09:49:15.165171+00	2026-11-04 09:49:15.165171+00
24ed9541-053c-436e-8411-e3eac4f0fce5	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	Nguyễn Thu Hà	0912000101	\N	\N	\N	\N	{}	website	0	1	2026-11-04 09:49:15.239+00	2026-11-04 09:49:15.213727+00	2026-11-04 09:49:15.213727+00
649430a4-b9fd-41a9-bdb3-a35e744ae0e3	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	Trần Quốc Việt	0912000102	\N	\N	\N	\N	{}	website	0	1	2026-11-04 09:49:15.244+00	2026-11-04 09:49:15.213727+00	2026-11-04 09:49:15.213727+00
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."employees" ("id", "tenant_id", "branch_id", "user_id", "code", "full_name", "phone", "email", "position", "department", "start_date", "status", "base_salary", "note", "created_at", "updated_at") FROM stdin;
fd019058-0c2f-4229-ae67-f0aed6b64f92	8620e0f3-97c7-4cb4-9382-f06c521a1381	21ceb3f6-08e2-4784-a090-748f08bc06aa	d4511f1f-9a08-4be5-9e96-bdb965d33c2c	NV001	Nguyễn Văn Chủ	0900000001	admin@dulichdemo.vn	Giám đốc	Kinh doanh	2025-11-04	working	12000000	\N	2026-11-04 09:49:14.798779+00	2026-11-04 09:49:14.798779+00
cf318057-4be1-4045-9fd3-a2a30e9e6360	8620e0f3-97c7-4cb4-9382-f06c521a1381	21ceb3f6-08e2-4784-a090-748f08bc06aa	98da1b1a-c465-4c5d-9b3e-63d48aeb9f68	NV002	Trần Thị Lễ Tân	0900000002	letan@dulichdemo.vn	Lễ tân / Sale tour	Kinh doanh	2025-11-04	working	12000000	\N	2026-11-04 09:49:14.798779+00	2026-11-04 09:49:14.798779+00
1aba2a70-48a3-44ab-869f-9f9ace45b648	8620e0f3-97c7-4cb4-9382-f06c521a1381	21ceb3f6-08e2-4784-a090-748f08bc06aa	792d182b-c92d-4ab9-aade-08390d9d316e	NV003	Lê Văn Kế Toán	0900000003	ketoan@dulichdemo.vn	Kế toán	Kế toán	2025-11-04	working	12000000	\N	2026-11-04 09:49:14.798779+00	2026-11-04 09:49:14.798779+00
59221f47-71e2-4eae-8610-93f52c80adf1	8620e0f3-97c7-4cb4-9382-f06c521a1381	21ceb3f6-08e2-4784-a090-748f08bc06aa	35a0f8ff-72e7-4917-983d-13b5b3ddea99	NV004	Phạm Hướng Dẫn	0900000004	hdv@dulichdemo.vn	Hướng dẫn viên	Kinh doanh	2025-11-04	working	12000000	\N	2026-11-04 09:49:14.798779+00	2026-11-04 09:49:14.798779+00
f3e7eda1-4dbe-4e32-ad2c-4b3848a0d130	3b80d278-2af7-4dae-b58a-2dbd991b4182	2c764863-b8a8-45c5-ae18-3e1a288dc259	ca12f46e-8538-49b9-a292-9595e72458a1	NV001	Chủ doanh nghiệp	\N	admin@ketoandemo.vn	Giám đốc	\N	\N	working	0	\N	2026-11-04 09:49:14.927361+00	2026-11-04 09:49:14.927361+00
13a021f8-d283-4352-a3e7-ccd98cc773da	3b80d278-2af7-4dae-b58a-2dbd991b4182	2c764863-b8a8-45c5-ae18-3e1a288dc259	30c6ac2b-98d5-4269-93a5-c42a02dd6aa8	NV002	Lễ tân	\N	letan@ketoandemo.vn	Lễ tân	\N	\N	working	0	\N	2026-11-04 09:49:14.927361+00	2026-11-04 09:49:14.927361+00
a3bc361b-c83c-491f-a82c-f2218338f704	3b80d278-2af7-4dae-b58a-2dbd991b4182	2c764863-b8a8-45c5-ae18-3e1a288dc259	a9fcb9cf-f881-4314-a558-fdb8bb98818c	NV003	Kế toán	\N	ketoan@ketoandemo.vn	Kế toán	\N	\N	working	0	\N	2026-11-04 09:49:14.927361+00	2026-11-04 09:49:14.927361+00
4b5c4f5e-334d-4ea9-831e-b859cddcaf1d	455f57ad-4545-48ac-8552-459852027f1a	ebc744d1-9cdb-4464-b0a4-d33aee55cde7	1d1aae5b-3a1c-4630-ba53-5b01ebe647fe	NV001	Chủ doanh nghiệp	\N	admin@cafedemo.vn	Giám đốc	\N	\N	working	0	\N	2026-11-04 09:49:14.998973+00	2026-11-04 09:49:14.998973+00
9c109132-d041-4c15-b16d-50ceb6b69154	455f57ad-4545-48ac-8552-459852027f1a	ebc744d1-9cdb-4464-b0a4-d33aee55cde7	925a47cd-7e2d-40e7-ae64-f715583edcee	NV002	Lễ tân	\N	letan@cafedemo.vn	Lễ tân	\N	\N	working	0	\N	2026-11-04 09:49:14.998973+00	2026-11-04 09:49:14.998973+00
d4b4b182-6ada-41d1-ad58-047512de8540	455f57ad-4545-48ac-8552-459852027f1a	ebc744d1-9cdb-4464-b0a4-d33aee55cde7	26604e4e-888d-41a5-8024-13181ce1fb19	NV003	Kế toán	\N	ketoan@cafedemo.vn	Kế toán	\N	\N	working	0	\N	2026-11-04 09:49:14.998973+00	2026-11-04 09:49:14.998973+00
fcedf022-738a-446e-97b9-724b61d652a0	b8a63c7f-10a0-4c8b-b34e-2dbef4297724	3661c56f-dad7-4ce6-a397-97527c08eb1f	74d2dd54-aebc-40da-9eca-32a435a715bf	NV001	Chủ doanh nghiệp	\N	admin@khachsandemo.vn	Giám đốc	\N	\N	working	0	\N	2026-11-04 09:49:15.115094+00	2026-11-04 09:49:15.115094+00
e1895fea-21a8-42cc-9065-ebba67e25ecf	b8a63c7f-10a0-4c8b-b34e-2dbef4297724	3661c56f-dad7-4ce6-a397-97527c08eb1f	dfa3f1e3-9a17-487a-90a7-452ceb021b3c	NV002	Lễ tân	\N	letan@khachsandemo.vn	Lễ tân	\N	\N	working	0	\N	2026-11-04 09:49:15.115094+00	2026-11-04 09:49:15.115094+00
9771df85-fa8c-44a4-b34f-c7b32e46cb87	b8a63c7f-10a0-4c8b-b34e-2dbef4297724	3661c56f-dad7-4ce6-a397-97527c08eb1f	3ef24c74-c555-4fcc-b87f-fc56003b1032	NV003	Kế toán	\N	ketoan@khachsandemo.vn	Kế toán	\N	\N	working	0	\N	2026-11-04 09:49:15.115094+00	2026-11-04 09:49:15.115094+00
51256159-8fa4-4668-bf0b-76fb908ce027	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	fc3a3dd2-77ff-44f3-8c85-a0415837e8c0	7a4cfbf0-46b2-463f-92ca-3f9868735862	NV001	Chủ doanh nghiệp	\N	admin@nhahangdemo.vn	Giám đốc	\N	\N	working	0	\N	2026-11-04 09:49:15.165171+00	2026-11-04 09:49:15.165171+00
72eaebc8-f3b9-41a3-bf73-46cec4ae32cc	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	fc3a3dd2-77ff-44f3-8c85-a0415837e8c0	5b6cd821-731a-497a-be32-fe8f578ff63d	NV002	Lễ tân	\N	letan@nhahangdemo.vn	Lễ tân	\N	\N	working	0	\N	2026-11-04 09:49:15.165171+00	2026-11-04 09:49:15.165171+00
0283930f-fe6b-424e-9d01-836a91e42d75	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	fc3a3dd2-77ff-44f3-8c85-a0415837e8c0	ed904081-6059-419c-9f5d-f236d7bc09d0	NV003	Kế toán	\N	ketoan@nhahangdemo.vn	Kế toán	\N	\N	working	0	\N	2026-11-04 09:49:15.165171+00	2026-11-04 09:49:15.165171+00
19e802ea-f704-4162-a588-9d1265beb748	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	885977af-28fa-4a97-ac15-3a07005d9f8d	1c4226b3-a9c5-44d5-8a07-6606959992da	NV001	Chủ doanh nghiệp	\N	admin@spademo.vn	Giám đốc	\N	\N	working	0	\N	2026-11-04 09:49:15.213727+00	2026-11-04 09:49:15.213727+00
c694f877-fc84-4e30-aad2-c6a76bd5f875	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	885977af-28fa-4a97-ac15-3a07005d9f8d	427ce962-9f6d-4a84-a96d-52864ececedc	NV002	Lễ tân	\N	letan@spademo.vn	Lễ tân	\N	\N	working	0	\N	2026-11-04 09:49:15.213727+00	2026-11-04 09:49:15.213727+00
ec02da74-84a7-4daa-b8a7-990979ffccf0	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	885977af-28fa-4a97-ac15-3a07005d9f8d	b72224c3-4bd7-4a6f-84fd-3573582f7352	NV003	Kế toán	\N	ketoan@spademo.vn	Kế toán	\N	\N	working	0	\N	2026-11-04 09:49:15.213727+00	2026-11-04 09:49:15.213727+00
\.


--
-- Data for Name: invoice_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."invoice_items" ("id", "invoice_id", "line_no", "item_code", "item_name", "unit", "quantity", "unit_price", "vat_rate", "amount", "vat_amount") FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."invoices" ("id", "tenant_id", "code", "booking_id", "customer_id", "buyer_name", "buyer_legal_name", "buyer_tax_code", "buyer_address", "buyer_email", "buyer_phone", "issue_date", "status", "subtotal", "discount", "vat_amount", "total", "paid_amount", "bank_account_id", "payment_ref", "public_token", "einvoice_status", "einvoice_data", "note", "created_by", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."payments" ("id", "tenant_id", "invoice_id", "method", "amount", "reference", "received_by", "paid_at") FROM stdin;
\.


--
-- Data for Name: platform_admins; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."platform_admins" ("id", "username", "full_name", "password_hash", "token_version", "failed_logins", "locked_until", "last_login_at", "created_at") FROM stdin;
f26d4423-1e35-4e4c-9243-077ca9a0b542	dklab	Quản trị nền tảng	$argon2id$v=19$m=19456,t=2,p=1$4IEQWmpu0B2OFV+Q4yAAdw$3TcOgOndxt2lHboQZFIvTApH7ZxByMuCYnplAwLruE4	0	0	\N	\N	2026-11-04 09:49:14.741831+00
\.


--
-- Data for Name: platform_audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."platform_audit_logs" ("id", "admin_id", "action", "tenant_id", "data", "ip", "created_at") FROM stdin;
\.


--
-- Data for Name: reservations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."reservations" ("id", "tenant_id", "resource_id", "booking_id", "item_id", "start_at", "end_at", "status", "party_size", "label", "created_at") FROM stdin;
eaae1ea2-b0cc-4499-86c7-9edd512bceb8	3b80d278-2af7-4dae-b58a-2dbd991b4182	590aba31-f233-4350-9633-2e684fb7dfdf	3546fb73-a9a7-4f82-ad40-84094207872c	\N	2026-11-05 03:00:00+00	2026-11-05 03:30:00+00	pending	2	\N	2026-11-04 09:49:14.927361+00
f40602f8-0840-41da-880f-c836070697ee	3b80d278-2af7-4dae-b58a-2dbd991b4182	2073a851-da0b-4efb-8bf4-dc5310d9d45d	f322013e-44af-40ad-9259-29309528e56a	\N	2026-11-05 11:00:00+00	2026-11-05 11:30:00+00	confirmed	2	\N	2026-11-04 09:49:14.927361+00
63253e99-f491-4016-a509-17bed6681127	455f57ad-4545-48ac-8552-459852027f1a	7da14f7c-c158-4726-aa3b-f4ebfcab673e	8249b1e2-5e39-474d-be8d-30169493ed25	\N	2026-11-05 03:00:00+00	2026-11-05 04:30:00+00	pending	2	\N	2026-11-04 09:49:14.998973+00
d3dd906f-766a-47f3-969e-095fadc5c330	455f57ad-4545-48ac-8552-459852027f1a	43069bf6-2db8-47a9-beb9-95012668f091	e7deb0bd-0aae-49c5-bf60-0c6724e750fd	\N	2026-11-05 11:00:00+00	2026-11-05 12:30:00+00	confirmed	2	\N	2026-11-04 09:49:14.998973+00
ee2f3c2f-53d5-4b95-904b-b028942a4405	b8a63c7f-10a0-4c8b-b34e-2dbef4297724	d5d0286e-17d5-49a5-aea7-b413fd0de2ef	c3aff66d-b929-4c41-b4fe-dd050b0a1d74	\N	2026-11-05 07:00:00+00	2026-11-06 05:00:00+00	pending	2	\N	2026-11-04 09:49:15.115094+00
3d50ee48-e191-4816-aa34-d182ff1ea6a5	b8a63c7f-10a0-4c8b-b34e-2dbef4297724	005317f8-e038-4c8c-8f25-17c081063d5f	a6ea72e8-b3a1-4725-b541-2232a49654aa	\N	2026-11-05 07:00:00+00	2026-11-06 05:00:00+00	confirmed	2	\N	2026-11-04 09:49:15.115094+00
99b865f8-5e60-4a9d-ac73-2b6aeb51936e	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	f7587a2a-5c00-4cd4-91e8-1fe947e14f01	5a38c60d-65f8-466e-8f11-fdc4174356a3	\N	2026-11-05 03:00:00+00	2026-11-05 05:00:00+00	pending	2	\N	2026-11-04 09:49:15.165171+00
17d1b5b4-8107-4af4-8a45-a671dd8403ea	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	f48350e5-ff4b-47f2-8d03-905de1e60b45	db8c8d63-8c5f-4afa-9466-07774ea69782	\N	2026-11-05 11:00:00+00	2026-11-05 13:00:00+00	confirmed	2	\N	2026-11-04 09:49:15.165171+00
ed2240ab-1917-4e0c-8dd1-d26a41ff6935	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	81f28156-a969-49fe-b29d-a01c1e727063	5f5fe392-60c6-4095-9df7-0c8bb405e154	\N	2026-11-05 03:00:00+00	2026-11-05 04:30:00+00	pending	2	\N	2026-11-04 09:49:15.213727+00
03135564-c399-4d6f-9a92-1f3b0ed2c908	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	2389033c-10fc-48ae-b623-31ad539e0184	5f5fe392-60c6-4095-9df7-0c8bb405e154	\N	2026-11-05 03:00:00+00	2026-11-05 04:30:00+00	pending	1	\N	2026-11-04 09:49:15.213727+00
b76f7726-8b63-4b60-912c-693e212c5a6b	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	54342ae2-440f-4746-ad39-4d930b122bf2	bda15939-bfb7-4268-8cda-7ea71d2bdca2	\N	2026-11-05 11:00:00+00	2026-11-05 12:30:00+00	confirmed	2	\N	2026-11-04 09:49:15.213727+00
850b68c9-f446-465f-91a9-5b89cedc9e9b	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	d4b2a40d-6b79-42da-a0dd-c90f3e836df7	bda15939-bfb7-4268-8cda-7ea71d2bdca2	\N	2026-11-05 11:00:00+00	2026-11-05 12:30:00+00	confirmed	1	\N	2026-11-04 09:49:15.213727+00
\.


--
-- Data for Name: resources; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."resources" ("id", "tenant_id", "kind", "name", "area", "capacity", "item_id", "x", "y", "shape", "housekeeping", "is_active", "sort_order", "created_at") FROM stdin;
590aba31-f233-4350-9633-2e684fb7dfdf	3b80d278-2af7-4dae-b58a-2dbd991b4182	staff	CV. Lê Thu Hà	\N	1	\N	0	0	square	clean	t	0	2026-11-04 09:49:14.927361+00
2073a851-da0b-4efb-8bf4-dc5310d9d45d	3b80d278-2af7-4dae-b58a-2dbd991b4182	staff	CV. Phạm Quốc Bảo	\N	1	\N	0	0	square	clean	t	1	2026-11-04 09:49:14.927361+00
7da14f7c-c158-4726-aa3b-f4ebfcab673e	455f57ad-4545-48ac-8552-459852027f1a	table	B1	Tầng 1	2	\N	1	1	round	clean	t	0	2026-11-04 09:49:14.998973+00
43069bf6-2db8-47a9-beb9-95012668f091	455f57ad-4545-48ac-8552-459852027f1a	table	B2	Tầng 1	2	\N	4	1	round	clean	t	1	2026-11-04 09:49:14.998973+00
eb735e03-4c2a-435b-a230-732d0bf7922b	455f57ad-4545-48ac-8552-459852027f1a	table	B3	Tầng 1	4	\N	7	1	square	clean	t	2	2026-11-04 09:49:14.998973+00
5985cf21-42bd-4e06-8aaa-5cdd69179130	455f57ad-4545-48ac-8552-459852027f1a	table	B4	Tầng 1	4	\N	1	4	square	clean	t	3	2026-11-04 09:49:14.998973+00
36b8650c-05bf-49ba-aedf-05c02d322dbb	455f57ad-4545-48ac-8552-459852027f1a	table	B5	Tầng 1	6	\N	5	4	rect	clean	t	4	2026-11-04 09:49:14.998973+00
c6129865-20ba-4762-a5a5-d64676e2559e	455f57ad-4545-48ac-8552-459852027f1a	table	B6	Tầng 1	2	\N	10	5	round	clean	t	5	2026-11-04 09:49:14.998973+00
af10e61a-c93f-4935-bb13-46510909f243	455f57ad-4545-48ac-8552-459852027f1a	table	V1	Sân vườn	4	\N	1	1	square	clean	t	6	2026-11-04 09:49:14.998973+00
972c2e21-8cd9-4771-9523-474724813710	455f57ad-4545-48ac-8552-459852027f1a	table	V2	Sân vườn	4	\N	5	1	square	clean	t	7	2026-11-04 09:49:14.998973+00
7605d619-839c-4f3c-a12e-29e40ed1a4ab	455f57ad-4545-48ac-8552-459852027f1a	table	V3	Sân vườn	8	\N	3	4	rect	clean	t	8	2026-11-04 09:49:14.998973+00
d5d0286e-17d5-49a5-aea7-b413fd0de2ef	b8a63c7f-10a0-4c8b-b34e-2dbef4297724	room	101	Tầng 1	2	b0a85d00-55e1-46c9-b1e7-48d07cbac73e	0	0	square	clean	t	0	2026-11-04 09:49:15.115094+00
8ad0c799-af30-492e-83e9-83dee8c257e5	b8a63c7f-10a0-4c8b-b34e-2dbef4297724	room	102	Tầng 1	2	b0a85d00-55e1-46c9-b1e7-48d07cbac73e	0	0	square	clean	t	1	2026-11-04 09:49:15.115094+00
c35e2a1b-27d2-42ba-9672-0caff169b99b	b8a63c7f-10a0-4c8b-b34e-2dbef4297724	room	103	Tầng 1	2	b0a85d00-55e1-46c9-b1e7-48d07cbac73e	0	0	square	clean	t	2	2026-11-04 09:49:15.115094+00
005317f8-e038-4c8c-8f25-17c081063d5f	b8a63c7f-10a0-4c8b-b34e-2dbef4297724	room	201	Tầng 2	2	5308f18d-53ba-41fe-8838-9a0c05e982cb	0	0	square	clean	t	3	2026-11-04 09:49:15.115094+00
94ce41a9-eb78-4e2c-954d-089dcabaa2db	b8a63c7f-10a0-4c8b-b34e-2dbef4297724	room	202	Tầng 2	2	5308f18d-53ba-41fe-8838-9a0c05e982cb	0	0	square	clean	t	4	2026-11-04 09:49:15.115094+00
ae802311-a693-42e1-aa54-eb6be56286ae	b8a63c7f-10a0-4c8b-b34e-2dbef4297724	room	203	Tầng 2	2	5308f18d-53ba-41fe-8838-9a0c05e982cb	0	0	square	clean	t	5	2026-11-04 09:49:15.115094+00
ffb7140e-6459-4a68-adde-9988e883b660	b8a63c7f-10a0-4c8b-b34e-2dbef4297724	room	301	Tầng 3	2	5e059094-f437-48f8-80d8-a30646f8da52	0	0	square	clean	t	6	2026-11-04 09:49:15.115094+00
f55855f2-7406-4d2f-80d5-171db80de107	b8a63c7f-10a0-4c8b-b34e-2dbef4297724	room	302	Tầng 3	2	5e059094-f437-48f8-80d8-a30646f8da52	0	0	square	clean	t	7	2026-11-04 09:49:15.115094+00
f7587a2a-5c00-4cd4-91e8-1fe947e14f01	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	table	T1	Sảnh chính	4	\N	1	1	square	clean	t	0	2026-11-04 09:49:15.165171+00
f48350e5-ff4b-47f2-8d03-905de1e60b45	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	table	T2	Sảnh chính	4	\N	4	1	square	clean	t	1	2026-11-04 09:49:15.165171+00
5935e14e-cb5f-411b-8330-3f07eef065b6	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	table	T3	Sảnh chính	4	\N	7	1	square	clean	t	2	2026-11-04 09:49:15.165171+00
53786a5b-ba2e-4ad2-b2ca-e0135b0f4888	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	table	T4	Sảnh chính	6	\N	1	4	rect	clean	t	3	2026-11-04 09:49:15.165171+00
4c1959ed-146f-4d34-bfc8-356a7fd7bb07	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	table	T5	Sảnh chính	6	\N	6	4	rect	clean	t	4	2026-11-04 09:49:15.165171+00
0f36146b-9209-4ec3-82f2-f0b621f34e88	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	table	T6	Sảnh chính	2	\N	10	1	round	clean	t	5	2026-11-04 09:49:15.165171+00
4e0eb630-f27a-4811-8a87-c80141800ba2	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	table	VIP1	Phòng VIP	10	\N	2	2	rect	clean	t	6	2026-11-04 09:49:15.165171+00
fdbe932d-c54c-4f4b-b6e1-f9c3ad21874c	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	table	VIP2	Phòng VIP	12	\N	7	2	round	clean	t	7	2026-11-04 09:49:15.165171+00
2389033c-10fc-48ae-b623-31ad539e0184	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	bed	Phòng 1	Tầng 2	1	\N	0	0	square	clean	t	0	2026-11-04 09:49:15.213727+00
d4b2a40d-6b79-42da-a0dd-c90f3e836df7	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	bed	Phòng 2	Tầng 2	1	\N	0	0	square	clean	t	1	2026-11-04 09:49:15.213727+00
98f6d352-99e2-444f-8cd8-1c264b74d2cd	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	bed	Phòng VIP	Tầng 3	2	\N	0	0	square	clean	t	2	2026-11-04 09:49:15.213727+00
81f28156-a969-49fe-b29d-a01c1e727063	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	staff	KTV Ngọc Anh	\N	1	\N	0	0	square	clean	t	3	2026-11-04 09:49:15.213727+00
54342ae2-440f-4746-ad39-4d930b122bf2	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	staff	KTV Thảo	\N	1	\N	0	0	square	clean	t	4	2026-11-04 09:49:15.213727+00
04531dff-0305-4f07-97da-5025500b8530	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	staff	KTV Minh	\N	1	\N	0	0	square	clean	t	5	2026-11-04 09:49:15.213727+00
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."roles" ("id", "tenant_id", "key", "name", "description", "is_system", "permissions", "created_at") FROM stdin;
3ff64cf0-0b94-494f-a356-d57bc3691c14	8620e0f3-97c7-4cb4-9382-f06c521a1381	owner	Chủ doanh nghiệp	Toàn quyền trong doanh nghiệp	t	{*}	2026-11-04 09:49:14.798779+00
92d5bf76-31a9-4280-afc9-58df44cfeb50	8620e0f3-97c7-4cb4-9382-f06c521a1381	manager	Quản lý	Điều hành vận hành, không quản lý tài khoản	t	{dashboard.view,booking.view,booking.handle,booking.delete,customer.view,customer.manage,employee.view,employee.manage,invoice.view,invoice.create,invoice.payment,invoice.cancel,einvoice.publish,tour.view,tour.manage,audit.view,catalog.view,catalog.manage,resource.view,resource.manage,schedule.view,contract.view,contract.manage,tax.manage}	2026-11-04 09:49:14.798779+00
bb0badac-681c-46f9-af91-fb11c1461ab9	8620e0f3-97c7-4cb4-9382-f06c521a1381	receptionist	Lễ tân / Tiếp nhận	Tiếp nhận đặt chỗ, gọi khách xác nhận, lập hóa đơn	t	{dashboard.view,booking.view,booking.handle,customer.view,customer.manage,invoice.view,invoice.create,invoice.payment,tour.view,catalog.view,resource.view,schedule.view,contract.view}	2026-11-04 09:49:14.798779+00
43f7172f-0243-4813-a059-7645c5937c7f	8620e0f3-97c7-4cb4-9382-f06c521a1381	accountant	Kế toán	Hóa đơn, thanh toán, hóa đơn điện tử	t	{dashboard.view,invoice.view,invoice.create,invoice.payment,invoice.cancel,einvoice.publish,customer.view,contract.view,contract.manage,tax.manage}	2026-11-04 09:49:14.798779+00
1ef422da-4863-453e-8ad3-0e9f18e6c9d4	8620e0f3-97c7-4cb4-9382-f06c521a1381	staff	Nhân viên	Chỉ xem các đặt chỗ được giao cho mình	t	{booking.view:own,booking.handle:own,tour.view,schedule.view,resource.view}	2026-11-04 09:49:14.798779+00
5a442092-15fc-41ab-ba12-c988ee39b4b0	3b80d278-2af7-4dae-b58a-2dbd991b4182	owner	Chủ doanh nghiệp	Toàn quyền trong doanh nghiệp	t	{*}	2026-11-04 09:49:14.927361+00
1efc17f6-9bf1-4f9a-91ea-891df314c530	3b80d278-2af7-4dae-b58a-2dbd991b4182	manager	Quản lý	Điều hành vận hành, không quản lý tài khoản	t	{dashboard.view,booking.view,booking.handle,booking.delete,customer.view,customer.manage,employee.view,employee.manage,invoice.view,invoice.create,invoice.payment,invoice.cancel,einvoice.publish,tour.view,tour.manage,audit.view,catalog.view,catalog.manage,resource.view,resource.manage,schedule.view,contract.view,contract.manage,tax.manage}	2026-11-04 09:49:14.927361+00
f5424a8e-cd06-453e-bcba-821f1da7aa8e	3b80d278-2af7-4dae-b58a-2dbd991b4182	receptionist	Lễ tân / Tiếp nhận	Tiếp nhận đặt chỗ, gọi khách xác nhận, lập hóa đơn	t	{dashboard.view,booking.view,booking.handle,customer.view,customer.manage,invoice.view,invoice.create,invoice.payment,tour.view,catalog.view,resource.view,schedule.view,contract.view}	2026-11-04 09:49:14.927361+00
571ebf4a-105e-4440-8db4-4d90d9949540	3b80d278-2af7-4dae-b58a-2dbd991b4182	accountant	Kế toán	Hóa đơn, thanh toán, hóa đơn điện tử	t	{dashboard.view,invoice.view,invoice.create,invoice.payment,invoice.cancel,einvoice.publish,customer.view,contract.view,contract.manage,tax.manage}	2026-11-04 09:49:14.927361+00
2610f781-80c1-4ed2-a058-704f6c9a650e	3b80d278-2af7-4dae-b58a-2dbd991b4182	staff	Nhân viên	Chỉ xem các đặt chỗ được giao cho mình	t	{booking.view:own,booking.handle:own,tour.view,schedule.view,resource.view}	2026-11-04 09:49:14.927361+00
5cd9c918-a267-4a9c-af2f-ccc9d66f36a1	455f57ad-4545-48ac-8552-459852027f1a	owner	Chủ doanh nghiệp	Toàn quyền trong doanh nghiệp	t	{*}	2026-11-04 09:49:14.998973+00
1007bf74-95f5-4a6e-b596-bbc53971ea44	455f57ad-4545-48ac-8552-459852027f1a	manager	Quản lý	Điều hành vận hành, không quản lý tài khoản	t	{dashboard.view,booking.view,booking.handle,booking.delete,customer.view,customer.manage,employee.view,employee.manage,invoice.view,invoice.create,invoice.payment,invoice.cancel,einvoice.publish,tour.view,tour.manage,audit.view,catalog.view,catalog.manage,resource.view,resource.manage,schedule.view,contract.view,contract.manage,tax.manage}	2026-11-04 09:49:14.998973+00
8b644d1f-c0df-4724-8fad-a044661f1915	455f57ad-4545-48ac-8552-459852027f1a	receptionist	Lễ tân / Tiếp nhận	Tiếp nhận đặt chỗ, gọi khách xác nhận, lập hóa đơn	t	{dashboard.view,booking.view,booking.handle,customer.view,customer.manage,invoice.view,invoice.create,invoice.payment,tour.view,catalog.view,resource.view,schedule.view,contract.view}	2026-11-04 09:49:14.998973+00
ff980237-c444-432e-9d6e-90f3b3ef57b1	455f57ad-4545-48ac-8552-459852027f1a	accountant	Kế toán	Hóa đơn, thanh toán, hóa đơn điện tử	t	{dashboard.view,invoice.view,invoice.create,invoice.payment,invoice.cancel,einvoice.publish,customer.view,contract.view,contract.manage,tax.manage}	2026-11-04 09:49:14.998973+00
84d9258d-ddd6-4d30-9cf8-3ef5e1027a65	455f57ad-4545-48ac-8552-459852027f1a	staff	Nhân viên	Chỉ xem các đặt chỗ được giao cho mình	t	{booking.view:own,booking.handle:own,tour.view,schedule.view,resource.view}	2026-11-04 09:49:14.998973+00
77638920-dfe1-4ddc-9dee-2a8a8358549d	b8a63c7f-10a0-4c8b-b34e-2dbef4297724	owner	Chủ doanh nghiệp	Toàn quyền trong doanh nghiệp	t	{*}	2026-11-04 09:49:15.115094+00
68a67b92-dbda-4f57-a08b-7216bb212de7	b8a63c7f-10a0-4c8b-b34e-2dbef4297724	manager	Quản lý	Điều hành vận hành, không quản lý tài khoản	t	{dashboard.view,booking.view,booking.handle,booking.delete,customer.view,customer.manage,employee.view,employee.manage,invoice.view,invoice.create,invoice.payment,invoice.cancel,einvoice.publish,tour.view,tour.manage,audit.view,catalog.view,catalog.manage,resource.view,resource.manage,schedule.view,contract.view,contract.manage,tax.manage}	2026-11-04 09:49:15.115094+00
ee7e80a8-2dcb-4090-bad3-45bc0f71d1c1	b8a63c7f-10a0-4c8b-b34e-2dbef4297724	receptionist	Lễ tân / Tiếp nhận	Tiếp nhận đặt chỗ, gọi khách xác nhận, lập hóa đơn	t	{dashboard.view,booking.view,booking.handle,customer.view,customer.manage,invoice.view,invoice.create,invoice.payment,tour.view,catalog.view,resource.view,schedule.view,contract.view}	2026-11-04 09:49:15.115094+00
0f4666ca-1a00-4e13-82d0-cad86227073a	b8a63c7f-10a0-4c8b-b34e-2dbef4297724	accountant	Kế toán	Hóa đơn, thanh toán, hóa đơn điện tử	t	{dashboard.view,invoice.view,invoice.create,invoice.payment,invoice.cancel,einvoice.publish,customer.view,contract.view,contract.manage,tax.manage}	2026-11-04 09:49:15.115094+00
e333e45f-15e8-4099-9e02-436aaa287fd4	b8a63c7f-10a0-4c8b-b34e-2dbef4297724	staff	Nhân viên	Chỉ xem các đặt chỗ được giao cho mình	t	{booking.view:own,booking.handle:own,tour.view,schedule.view,resource.view}	2026-11-04 09:49:15.115094+00
039238a9-cf2e-4981-bc8b-263d4cb2f1f3	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	owner	Chủ doanh nghiệp	Toàn quyền trong doanh nghiệp	t	{*}	2026-11-04 09:49:15.165171+00
04416fb5-e166-4a35-b059-fc1fb151c9aa	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	manager	Quản lý	Điều hành vận hành, không quản lý tài khoản	t	{dashboard.view,booking.view,booking.handle,booking.delete,customer.view,customer.manage,employee.view,employee.manage,invoice.view,invoice.create,invoice.payment,invoice.cancel,einvoice.publish,tour.view,tour.manage,audit.view,catalog.view,catalog.manage,resource.view,resource.manage,schedule.view,contract.view,contract.manage,tax.manage}	2026-11-04 09:49:15.165171+00
fdb62c08-b1d6-459f-9d00-85dadfaeed19	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	receptionist	Lễ tân / Tiếp nhận	Tiếp nhận đặt chỗ, gọi khách xác nhận, lập hóa đơn	t	{dashboard.view,booking.view,booking.handle,customer.view,customer.manage,invoice.view,invoice.create,invoice.payment,tour.view,catalog.view,resource.view,schedule.view,contract.view}	2026-11-04 09:49:15.165171+00
4b5046b7-88ca-4841-81d0-ef6455108bb4	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	accountant	Kế toán	Hóa đơn, thanh toán, hóa đơn điện tử	t	{dashboard.view,invoice.view,invoice.create,invoice.payment,invoice.cancel,einvoice.publish,customer.view,contract.view,contract.manage,tax.manage}	2026-11-04 09:49:15.165171+00
1b8c988f-0913-4f5f-acbb-1694576385f1	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	staff	Nhân viên	Chỉ xem các đặt chỗ được giao cho mình	t	{booking.view:own,booking.handle:own,tour.view,schedule.view,resource.view}	2026-11-04 09:49:15.165171+00
f38d923c-4dc6-4a44-a439-e78708786569	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	owner	Chủ doanh nghiệp	Toàn quyền trong doanh nghiệp	t	{*}	2026-11-04 09:49:15.213727+00
cd43d378-3eff-4557-aebb-9deadd380bf1	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	manager	Quản lý	Điều hành vận hành, không quản lý tài khoản	t	{dashboard.view,booking.view,booking.handle,booking.delete,customer.view,customer.manage,employee.view,employee.manage,invoice.view,invoice.create,invoice.payment,invoice.cancel,einvoice.publish,tour.view,tour.manage,audit.view,catalog.view,catalog.manage,resource.view,resource.manage,schedule.view,contract.view,contract.manage,tax.manage}	2026-11-04 09:49:15.213727+00
2d996584-30bb-44f9-af7e-0a897ef00ee1	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	receptionist	Lễ tân / Tiếp nhận	Tiếp nhận đặt chỗ, gọi khách xác nhận, lập hóa đơn	t	{dashboard.view,booking.view,booking.handle,customer.view,customer.manage,invoice.view,invoice.create,invoice.payment,tour.view,catalog.view,resource.view,schedule.view,contract.view}	2026-11-04 09:49:15.213727+00
0e74dc23-f583-417b-a188-a8715396b436	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	accountant	Kế toán	Hóa đơn, thanh toán, hóa đơn điện tử	t	{dashboard.view,invoice.view,invoice.create,invoice.payment,invoice.cancel,einvoice.publish,customer.view,contract.view,contract.manage,tax.manage}	2026-11-04 09:49:15.213727+00
a9db58ee-292e-4e90-92fa-546e07524711	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	staff	Nhân viên	Chỉ xem các đặt chỗ được giao cho mình	t	{booking.view:own,booking.handle:own,tour.view,schedule.view,resource.view}	2026-11-04 09:49:15.213727+00
\.


--
-- Data for Name: tax_tasks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."tax_tasks" ("id", "tenant_id", "contract_id", "customer_id", "kind", "period", "due_date", "status", "done_at", "note") FROM stdin;
7f737db3-6219-4ce5-8d29-cdbc2b5db9d8	3b80d278-2af7-4dae-b58a-2dbd991b4182	3bc1e5ed-968d-49f3-bd41-5ba73b1e90f0	7f37220d-2e36-48dc-a5d8-43b7de479dc6	vat	2026-Q3	2026-10-31	done	\N	\N
ad5b110c-62c8-45ee-a91b-bc78f29c0d96	3b80d278-2af7-4dae-b58a-2dbd991b4182	3bc1e5ed-968d-49f3-bd41-5ba73b1e90f0	7f37220d-2e36-48dc-a5d8-43b7de479dc6	pit	2026-Q3	2026-10-31	done	\N	\N
d10c7b6e-c33e-4efd-9d66-705d4cfb3c0a	3b80d278-2af7-4dae-b58a-2dbd991b4182	3bc1e5ed-968d-49f3-bd41-5ba73b1e90f0	7f37220d-2e36-48dc-a5d8-43b7de479dc6	cit_prov	2026-Q3	2026-10-31	done	\N	\N
faabe6a5-1c56-4f1c-bdf3-ff88af3faa6b	3b80d278-2af7-4dae-b58a-2dbd991b4182	3bc1e5ed-968d-49f3-bd41-5ba73b1e90f0	7f37220d-2e36-48dc-a5d8-43b7de479dc6	vat	2026-Q4	2027-01-31	pending	\N	\N
7b9f01ab-1610-4c42-800c-6397c2194ee5	3b80d278-2af7-4dae-b58a-2dbd991b4182	3bc1e5ed-968d-49f3-bd41-5ba73b1e90f0	7f37220d-2e36-48dc-a5d8-43b7de479dc6	pit	2026-Q4	2027-01-31	pending	\N	\N
38dd2824-94ad-4678-8ffe-d092250b3fc8	3b80d278-2af7-4dae-b58a-2dbd991b4182	3bc1e5ed-968d-49f3-bd41-5ba73b1e90f0	7f37220d-2e36-48dc-a5d8-43b7de479dc6	cit_prov	2026-Q4	2027-01-31	pending	\N	\N
8dd38b6e-0c7e-4512-af87-543bcb86e8ed	3b80d278-2af7-4dae-b58a-2dbd991b4182	eb338349-1bfe-46b8-baf1-84e8728cc5b4	57b7a3d8-20fa-4b26-9679-59cd8852c454	vat	2026-09	2026-10-20	done	\N	\N
b273283c-7668-4aee-9add-4d6bf0c1d7dc	3b80d278-2af7-4dae-b58a-2dbd991b4182	eb338349-1bfe-46b8-baf1-84e8728cc5b4	57b7a3d8-20fa-4b26-9679-59cd8852c454	pit	2026-09	2026-10-20	done	\N	\N
9af1335f-0d8a-42ed-9fd8-a24d1b18b6a0	3b80d278-2af7-4dae-b58a-2dbd991b4182	eb338349-1bfe-46b8-baf1-84e8728cc5b4	57b7a3d8-20fa-4b26-9679-59cd8852c454	vat	2026-10	2026-11-20	pending	\N	\N
01cc7c2e-f18b-4e94-a129-8ec5c33144b2	3b80d278-2af7-4dae-b58a-2dbd991b4182	eb338349-1bfe-46b8-baf1-84e8728cc5b4	57b7a3d8-20fa-4b26-9679-59cd8852c454	pit	2026-10	2026-11-20	pending	\N	\N
4edf4445-cc23-4e3f-b6fc-aa8105881862	3b80d278-2af7-4dae-b58a-2dbd991b4182	eb338349-1bfe-46b8-baf1-84e8728cc5b4	57b7a3d8-20fa-4b26-9679-59cd8852c454	vat	2026-11	2026-12-20	pending	\N	\N
fbda50f6-223b-4b06-b642-a70dd0bf85d4	3b80d278-2af7-4dae-b58a-2dbd991b4182	eb338349-1bfe-46b8-baf1-84e8728cc5b4	57b7a3d8-20fa-4b26-9679-59cd8852c454	pit	2026-11	2026-12-20	pending	\N	\N
d48146b0-e75a-4255-8c56-ca4eda21ce56	3b80d278-2af7-4dae-b58a-2dbd991b4182	eb338349-1bfe-46b8-baf1-84e8728cc5b4	57b7a3d8-20fa-4b26-9679-59cd8852c454	vat	2026-12	2027-01-20	pending	\N	\N
2f4ab9ef-e88f-4b20-954b-4c25613b4bc7	3b80d278-2af7-4dae-b58a-2dbd991b4182	eb338349-1bfe-46b8-baf1-84e8728cc5b4	57b7a3d8-20fa-4b26-9679-59cd8852c454	pit	2026-12	2027-01-20	pending	\N	\N
b759bc06-74d2-42e2-afdc-2b127a5189c3	3b80d278-2af7-4dae-b58a-2dbd991b4182	eb338349-1bfe-46b8-baf1-84e8728cc5b4	57b7a3d8-20fa-4b26-9679-59cd8852c454	cit_prov	2026-Q3	2026-10-31	done	\N	\N
b3958fc3-9c3d-4335-9ade-e24ef916153c	3b80d278-2af7-4dae-b58a-2dbd991b4182	eb338349-1bfe-46b8-baf1-84e8728cc5b4	57b7a3d8-20fa-4b26-9679-59cd8852c454	cit_prov	2026-Q4	2027-01-31	pending	\N	\N
d00dba55-86f9-4cf2-af3b-31dd7bc50e97	3b80d278-2af7-4dae-b58a-2dbd991b4182	05bdb445-1e2d-478a-b8da-1659cc9ed06a	58c7d6d5-9d92-4841-928f-23229e011aa4	vat	2026-Q3	2026-10-31	done	\N	\N
1ac0b8bb-bf8a-451a-8bad-ef01e255613f	3b80d278-2af7-4dae-b58a-2dbd991b4182	05bdb445-1e2d-478a-b8da-1659cc9ed06a	58c7d6d5-9d92-4841-928f-23229e011aa4	pit	2026-Q3	2026-10-31	done	\N	\N
bf984d63-e581-4e16-b90c-391fae783ecc	3b80d278-2af7-4dae-b58a-2dbd991b4182	05bdb445-1e2d-478a-b8da-1659cc9ed06a	58c7d6d5-9d92-4841-928f-23229e011aa4	cit_prov	2026-Q3	2026-10-31	done	\N	\N
9847ac9f-e01b-40ad-985a-f5bb5249e2f3	3b80d278-2af7-4dae-b58a-2dbd991b4182	05bdb445-1e2d-478a-b8da-1659cc9ed06a	58c7d6d5-9d92-4841-928f-23229e011aa4	vat	2026-Q4	2027-01-31	pending	\N	\N
a6f85226-7f76-4f12-8282-4587cf73f0e2	3b80d278-2af7-4dae-b58a-2dbd991b4182	05bdb445-1e2d-478a-b8da-1659cc9ed06a	58c7d6d5-9d92-4841-928f-23229e011aa4	pit	2026-Q4	2027-01-31	pending	\N	\N
8599b480-4b49-4ec9-bf7e-a695b947f200	3b80d278-2af7-4dae-b58a-2dbd991b4182	05bdb445-1e2d-478a-b8da-1659cc9ed06a	58c7d6d5-9d92-4841-928f-23229e011aa4	cit_prov	2026-Q4	2027-01-31	pending	\N	\N
\.


--
-- Data for Name: tenant_domains; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."tenant_domains" ("id", "tenant_id", "domain", "is_primary", "verified_at", "created_at", "verify_token") FROM stdin;
d06cdf9f-8d5d-4f70-a3f9-690a18ea30fa	8620e0f3-97c7-4cb4-9382-f06c521a1381	dulich-demo.dklab.vn	t	2026-11-04 09:49:14.802+00	2026-11-04 09:49:14.798779+00	\N
\.


--
-- Data for Name: tenant_modules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."tenant_modules" ("tenant_id", "module_key", "enabled", "config", "source", "expires_at") FROM stdin;
8620e0f3-97c7-4cb4-9382-f06c521a1381	core	t	{}	industry	\N
8620e0f3-97c7-4cb4-9382-f06c521a1381	booking	t	{}	industry	\N
8620e0f3-97c7-4cb4-9382-f06c521a1381	crm	t	{}	industry	\N
8620e0f3-97c7-4cb4-9382-f06c521a1381	hr	t	{}	industry	\N
8620e0f3-97c7-4cb4-9382-f06c521a1381	invoice	t	{}	industry	\N
8620e0f3-97c7-4cb4-9382-f06c521a1381	tour	t	{}	industry	\N
3b80d278-2af7-4dae-b58a-2dbd991b4182	core	t	{}	industry	\N
3b80d278-2af7-4dae-b58a-2dbd991b4182	booking	t	{}	industry	\N
3b80d278-2af7-4dae-b58a-2dbd991b4182	crm	t	{}	industry	\N
3b80d278-2af7-4dae-b58a-2dbd991b4182	hr	t	{}	industry	\N
3b80d278-2af7-4dae-b58a-2dbd991b4182	invoice	t	{}	industry	\N
3b80d278-2af7-4dae-b58a-2dbd991b4182	catalog	t	{}	industry	\N
3b80d278-2af7-4dae-b58a-2dbd991b4182	resource	t	{}	industry	\N
3b80d278-2af7-4dae-b58a-2dbd991b4182	schedule	t	{}	industry	\N
3b80d278-2af7-4dae-b58a-2dbd991b4182	accounting	t	{}	industry	\N
455f57ad-4545-48ac-8552-459852027f1a	core	t	{}	industry	\N
455f57ad-4545-48ac-8552-459852027f1a	booking	t	{}	industry	\N
455f57ad-4545-48ac-8552-459852027f1a	crm	t	{}	industry	\N
455f57ad-4545-48ac-8552-459852027f1a	hr	t	{}	industry	\N
455f57ad-4545-48ac-8552-459852027f1a	invoice	t	{}	industry	\N
455f57ad-4545-48ac-8552-459852027f1a	catalog	t	{}	industry	\N
455f57ad-4545-48ac-8552-459852027f1a	resource	t	{}	industry	\N
455f57ad-4545-48ac-8552-459852027f1a	schedule	t	{}	industry	\N
b8a63c7f-10a0-4c8b-b34e-2dbef4297724	core	t	{}	industry	\N
b8a63c7f-10a0-4c8b-b34e-2dbef4297724	booking	t	{}	industry	\N
b8a63c7f-10a0-4c8b-b34e-2dbef4297724	crm	t	{}	industry	\N
b8a63c7f-10a0-4c8b-b34e-2dbef4297724	hr	t	{}	industry	\N
b8a63c7f-10a0-4c8b-b34e-2dbef4297724	invoice	t	{}	industry	\N
b8a63c7f-10a0-4c8b-b34e-2dbef4297724	catalog	t	{}	industry	\N
b8a63c7f-10a0-4c8b-b34e-2dbef4297724	resource	t	{}	industry	\N
b8a63c7f-10a0-4c8b-b34e-2dbef4297724	schedule	t	{}	industry	\N
c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	core	t	{}	industry	\N
c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	booking	t	{}	industry	\N
c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	crm	t	{}	industry	\N
c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	hr	t	{}	industry	\N
c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	invoice	t	{}	industry	\N
c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	catalog	t	{}	industry	\N
c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	resource	t	{}	industry	\N
c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	schedule	t	{}	industry	\N
dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	core	t	{}	industry	\N
dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	booking	t	{}	industry	\N
dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	crm	t	{}	industry	\N
dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	hr	t	{}	industry	\N
dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	invoice	t	{}	industry	\N
dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	catalog	t	{}	industry	\N
dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	resource	t	{}	industry	\N
dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	schedule	t	{}	industry	\N
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."tenants" ("id", "slug", "name", "industry", "status", "plan", "settings", "created_at", "updated_at", "plan_expires_at") FROM stdin;
8620e0f3-97c7-4cb4-9382-f06c521a1381	dulich_demo	Du Lịch Demo	travel	active	pro	{"misa": {"env": "mock", "enabled": true, "withCode": true, "invSeries": "1C26TDL"}, "brand": {"tagline": "Hành trình trọn vẹn – Giá minh bạch – Hỗ trợ 24/7", "primaryColor": "#0369a1"}, "company": {"address": "123 Nguyễn Huệ, Quận 1, TP.HCM", "taxCode": "0312345678", "legalName": "Công ty TNHH Du Lịch Demo"}, "contact": {"zalo": "0901234567", "email": "booking@dulichdemo.vn", "phone": "0901234567", "address": "123 Nguyễn Huệ, Quận 1, TP.HCM", "hotline": "1900 0000"}, "invoice": {"prefix": "DL", "defaultVatRate": 8}, "bankAccounts": [{"id": "vcb-main", "bankBin": "970436", "bankName": "Vietcombank", "isDefault": true, "accountName": "CONG TY TNHH DU LICH DEMO", "accountNumber": "0123456789"}]}	2026-11-04 09:49:14.798779+00	2026-11-04 09:49:14.798779+00	\N
3b80d278-2af7-4dae-b58a-2dbd991b4182	ketoan_demo	Kế Toán Tín Việt Demo	accounting	active	pro	{"misa": {"env": "mock", "enabled": true, "withCode": true, "invSeries": "1C26TDV"}, "brand": {"tagline": "Sổ sách gọn gàng – Thuế đúng hạn", "primaryColor": "#1d4ed8"}, "company": {"address": "150 Cộng Hòa, Tân Bình, TP.HCM", "taxCode": "0315678901", "legalName": "Công ty TNHH Dịch vụ Kế toán Tín Việt Demo"}, "contact": {"email": "tuvan@ketoandemo.vn", "phone": "0906789012", "address": "150 Cộng Hòa, Tân Bình, TP.HCM"}, "invoice": {"prefix": "KE", "defaultVatRate": 10}, "bankAccounts": [{"id": "vcb-main", "bankBin": "970436", "bankName": "Vietcombank", "isDefault": true, "accountName": "CONG TY TNHH DICH VU KE TOAN TIN VIET DEMO", "accountNumber": "0123456789"}]}	2026-11-04 09:49:14.927361+00	2026-11-04 09:49:14.927361+00	\N
455f57ad-4545-48ac-8552-459852027f1a	cafe_demo	Mộc Cà Phê Demo	cafe	active	pro	{"misa": {"env": "mock", "enabled": true, "withCode": true, "invSeries": "1C26TDV"}, "brand": {"tagline": "Góc nhỏ bình yên giữa phố", "primaryColor": "#92400e"}, "company": {"address": "12 Nguyễn Thị Minh Khai, Quận 3, TP.HCM", "taxCode": "8012345678", "legalName": "Hộ kinh doanh Mộc Cà Phê"}, "contact": {"email": "hello@cafedemo.vn", "phone": "0903456789", "address": "12 Nguyễn Thị Minh Khai, Quận 3, TP.HCM"}, "invoice": {"prefix": "CA", "defaultVatRate": 8}, "bankAccounts": [{"id": "vcb-main", "bankBin": "970436", "bankName": "Vietcombank", "isDefault": true, "accountName": "HO KINH DOANH MOC CA PHE", "accountNumber": "0123456789"}]}	2026-11-04 09:49:14.998973+00	2026-11-04 09:49:14.998973+00	\N
b8a63c7f-10a0-4c8b-b34e-2dbef4297724	khachsan_demo	Sea Breeze Hotel Demo	hotel	active	pro	{"misa": {"env": "mock", "enabled": true, "withCode": true, "invSeries": "1C26TDV"}, "brand": {"tagline": "Nghỉ ngơi như ở nhà", "primaryColor": "#0f766e"}, "company": {"address": "20 Võ Nguyên Giáp, Sơn Trà, Đà Nẵng", "taxCode": "0401234567", "legalName": "Công ty TNHH Sea Breeze Demo"}, "contact": {"email": "reservation@khachsandemo.vn", "phone": "0905678901", "address": "20 Võ Nguyên Giáp, Sơn Trà, Đà Nẵng", "hotline": "1900 3333"}, "invoice": {"prefix": "KH", "defaultVatRate": 8}, "bankAccounts": [{"id": "vcb-main", "bankBin": "970436", "bankName": "Vietcombank", "isDefault": true, "accountName": "CONG TY TNHH SEA BREEZE DEMO", "accountNumber": "0123456789"}]}	2026-11-04 09:49:15.115094+00	2026-11-04 09:49:15.115094+00	\N
c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	nhahang_demo	Nhà Hàng Quê Nhà Demo	restaurant	active	pro	{"misa": {"env": "mock", "enabled": true, "withCode": true, "invSeries": "1C26TDV"}, "brand": {"tagline": "Hương vị Việt – Đậm đà từng món", "primaryColor": "#b91c1c"}, "company": {"address": "88 Hai Bà Trưng, Quận 1, TP.HCM", "taxCode": "0314567890", "legalName": "Công ty TNHH Quê Nhà Demo"}, "contact": {"email": "datban@nhahangdemo.vn", "phone": "0904567890", "address": "88 Hai Bà Trưng, Quận 1, TP.HCM", "hotline": "1900 2222"}, "invoice": {"prefix": "NH", "defaultVatRate": 8}, "bankAccounts": [{"id": "vcb-main", "bankBin": "970436", "bankName": "Vietcombank", "isDefault": true, "accountName": "CONG TY TNHH QUE NHA DEMO", "accountNumber": "0123456789"}]}	2026-11-04 09:49:15.165171+00	2026-11-04 09:49:15.165171+00	\N
dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	spa_demo	Lotus Spa Demo	spa	active	pro	{"misa": {"env": "mock", "enabled": true, "withCode": true, "invSeries": "1C26TDV"}, "brand": {"tagline": "Thư giãn trọn vẹn – Chăm sóc từ tâm", "primaryColor": "#be185d"}, "company": {"address": "45 Lê Lợi, Quận 1, TP.HCM", "taxCode": "0313456789", "legalName": "Công ty TNHH Lotus Spa Demo"}, "contact": {"email": "booking@spademo.vn", "phone": "0902345678", "address": "45 Lê Lợi, Quận 1, TP.HCM", "hotline": "1900 1111"}, "invoice": {"prefix": "SP", "defaultVatRate": 8}, "bankAccounts": [{"id": "vcb-main", "bankBin": "970436", "bankName": "Vietcombank", "isDefault": true, "accountName": "CONG TY TNHH LOTUS SPA DEMO", "accountNumber": "0123456789"}]}	2026-11-04 09:49:15.213727+00	2026-11-04 09:49:15.213727+00	\N
\.


--
-- Data for Name: tour_departures; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."tour_departures" ("id", "tenant_id", "tour_id", "depart_date", "seats_total", "seats_booked", "price", "status") FROM stdin;
9ee30df4-472a-4145-8a8b-bb155127572b	8620e0f3-97c7-4cb4-9382-f06c521a1381	d5dd00f2-7b7e-400d-8804-2efd57347d94	2026-11-10	20	0	\N	open
aff8a57c-44d7-41f2-b445-ab370f62213e	8620e0f3-97c7-4cb4-9382-f06c521a1381	d5dd00f2-7b7e-400d-8804-2efd57347d94	2026-11-17	30	0	\N	open
09450284-86a1-420c-87c2-b1524ab3027d	8620e0f3-97c7-4cb4-9382-f06c521a1381	d5dd00f2-7b7e-400d-8804-2efd57347d94	2026-11-24	20	0	\N	open
80b15627-c117-4d5e-a0e5-7c7f5d5989b2	8620e0f3-97c7-4cb4-9382-f06c521a1381	d5dd00f2-7b7e-400d-8804-2efd57347d94	2026-12-01	30	0	\N	open
45b17a0b-be4d-4fe0-a2b4-f5a2613115a7	8620e0f3-97c7-4cb4-9382-f06c521a1381	d5dd00f2-7b7e-400d-8804-2efd57347d94	2026-12-15	20	0	2601000	open
77980092-9414-4a59-8ef5-e5eeebed09b1	8620e0f3-97c7-4cb4-9382-f06c521a1381	b0f9f4a6-dd02-4e72-80cd-786810fd2797	2026-11-11	20	0	\N	open
d3fc6053-d775-4da1-952d-b43ea053fcb0	8620e0f3-97c7-4cb4-9382-f06c521a1381	b0f9f4a6-dd02-4e72-80cd-786810fd2797	2026-11-18	30	0	\N	open
12bdb41f-6a35-4d96-ab5a-1d76710ae859	8620e0f3-97c7-4cb4-9382-f06c521a1381	b0f9f4a6-dd02-4e72-80cd-786810fd2797	2026-11-25	20	0	\N	open
c8b9cbed-5cd2-48ef-a678-6515191a4422	8620e0f3-97c7-4cb4-9382-f06c521a1381	b0f9f4a6-dd02-4e72-80cd-786810fd2797	2026-12-02	30	0	\N	open
34654a0d-9db7-4b61-829f-125d5bfc7e6c	8620e0f3-97c7-4cb4-9382-f06c521a1381	b0f9f4a6-dd02-4e72-80cd-786810fd2797	2026-12-16	20	0	4131000	open
0437439d-cb1a-4ca6-9c21-5c74c850fc80	8620e0f3-97c7-4cb4-9382-f06c521a1381	f9e71693-145c-4f7d-b2c9-26f0cbbdae01	2026-11-12	20	0	\N	open
37c3d6c7-b7a5-4499-b92a-841f8b25084d	8620e0f3-97c7-4cb4-9382-f06c521a1381	f9e71693-145c-4f7d-b2c9-26f0cbbdae01	2026-11-19	30	0	\N	open
99f24605-e868-4bf2-afd8-76817d95fd55	8620e0f3-97c7-4cb4-9382-f06c521a1381	f9e71693-145c-4f7d-b2c9-26f0cbbdae01	2026-11-26	20	0	\N	open
cbaebd3e-c028-4f7f-aa58-e283858d5940	8620e0f3-97c7-4cb4-9382-f06c521a1381	f9e71693-145c-4f7d-b2c9-26f0cbbdae01	2026-12-03	30	0	\N	open
1840916d-c8ee-4bb3-9361-0616333ab0a1	8620e0f3-97c7-4cb4-9382-f06c521a1381	f9e71693-145c-4f7d-b2c9-26f0cbbdae01	2026-12-17	20	0	6291000	open
7b7abd01-a205-4da8-9f93-4ed479d8b7c7	8620e0f3-97c7-4cb4-9382-f06c521a1381	47edac9b-35e5-4e4b-b253-511574b7c594	2026-11-13	20	0	\N	open
e059df9c-c6c9-4951-82a0-8782c2e82abb	8620e0f3-97c7-4cb4-9382-f06c521a1381	47edac9b-35e5-4e4b-b253-511574b7c594	2026-11-20	30	0	\N	open
b15f185c-bccf-4ff7-b3c4-d5bb246b956b	8620e0f3-97c7-4cb4-9382-f06c521a1381	47edac9b-35e5-4e4b-b253-511574b7c594	2026-11-27	20	0	\N	open
c3d86d90-60fd-473a-ac19-128ff4759cbf	8620e0f3-97c7-4cb4-9382-f06c521a1381	47edac9b-35e5-4e4b-b253-511574b7c594	2026-12-04	30	0	\N	open
9900eafc-8ec3-4d75-8803-1666e36865a4	8620e0f3-97c7-4cb4-9382-f06c521a1381	47edac9b-35e5-4e4b-b253-511574b7c594	2026-12-18	20	0	3411000	open
f79b0ceb-67b9-4ce1-8f6c-2bac4199aa22	8620e0f3-97c7-4cb4-9382-f06c521a1381	1c5b1a2a-e47f-4534-89b1-a02f3c0fb9a9	2026-11-14	20	0	\N	open
dcc43981-8684-40e8-952b-89163ba1ecb7	8620e0f3-97c7-4cb4-9382-f06c521a1381	1c5b1a2a-e47f-4534-89b1-a02f3c0fb9a9	2026-11-21	30	0	\N	open
d1d1bbba-7bec-4162-9f5c-fdbdd317ed09	8620e0f3-97c7-4cb4-9382-f06c521a1381	1c5b1a2a-e47f-4534-89b1-a02f3c0fb9a9	2026-11-28	20	0	\N	open
d11a0534-5c90-4c54-a9fb-3ab5d50943b5	8620e0f3-97c7-4cb4-9382-f06c521a1381	1c5b1a2a-e47f-4534-89b1-a02f3c0fb9a9	2026-12-05	30	0	\N	open
750f2c80-b783-473b-9f62-f194ddcf9140	8620e0f3-97c7-4cb4-9382-f06c521a1381	1c5b1a2a-e47f-4534-89b1-a02f3c0fb9a9	2026-12-19	20	0	1701000	open
5c40248e-0f4e-458c-9a27-2b504950ec5c	8620e0f3-97c7-4cb4-9382-f06c521a1381	afe8e541-abf3-4a1d-bd12-c08de018a45e	2026-11-15	20	0	\N	open
2db94138-2708-41ca-8075-ecc1a9190b67	8620e0f3-97c7-4cb4-9382-f06c521a1381	afe8e541-abf3-4a1d-bd12-c08de018a45e	2026-11-22	30	0	\N	open
855eb841-60cd-4566-ad4b-03056e7c9dc2	8620e0f3-97c7-4cb4-9382-f06c521a1381	afe8e541-abf3-4a1d-bd12-c08de018a45e	2026-11-29	20	0	\N	open
86b1649e-098b-4a67-bba7-2b67479a70be	8620e0f3-97c7-4cb4-9382-f06c521a1381	afe8e541-abf3-4a1d-bd12-c08de018a45e	2026-12-06	30	0	\N	open
ecc58c15-01ff-481a-9642-d40da77a5431	8620e0f3-97c7-4cb4-9382-f06c521a1381	afe8e541-abf3-4a1d-bd12-c08de018a45e	2026-12-20	20	0	2961000	open
\.


--
-- Data for Name: tours; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."tours" ("id", "tenant_id", "slug", "title", "summary", "description", "location", "depart_from", "duration_days", "duration_nights", "base_price", "child_price", "image_url", "highlights", "itinerary", "is_published", "sort_order", "created_at", "updated_at") FROM stdin;
d5dd00f2-7b7e-400d-8804-2efd57347d94	8620e0f3-97c7-4cb4-9382-f06c521a1381	ha-long-du-thuyen-2n1d	Hạ Long – Ngủ đêm du thuyền 5 sao	Ngắm kỳ quan vịnh Hạ Long, chèo kayak hang Luồn, ngủ đêm trên du thuyền và tập Tai Chi lúc bình minh.	Ngắm kỳ quan vịnh Hạ Long, chèo kayak hang Luồn, ngủ đêm trên du thuyền và tập Tai Chi lúc bình minh.\n\nGiá bao gồm: xe đưa đón, khách sạn/du thuyền theo chương trình, các bữa ăn chính, vé tham quan, hướng dẫn viên, bảo hiểm du lịch.\nGiá không bao gồm: chi phí cá nhân, đồ uống, tiền tip, VAT (nếu xuất hóa đơn).	Quảng Ninh	Hà Nội	2	1	2890000	2190000	\N	["Du thuyền 5 sao, cabin ban công", "Chèo kayak hang Luồn", "Lớp nấu ăn trên boong", "Đón trả tận nơi tại Hà Nội"]	[{"day": "Ngày 1", "title": "Khởi hành – Quảng Ninh", "detail": "Đón khách tại điểm hẹn, di chuyển, nhận phòng và tham quan buổi chiều."}, {"day": "Ngày 2", "title": "Mua sắm đặc sản – Trở về", "detail": "Ăn sáng, tự do mua sắm, trả phòng và về lại điểm đón."}]	t	0	2026-11-04 09:49:14.798779+00	2026-11-04 09:49:14.798779+00
b0f9f4a6-dd02-4e72-80cd-786810fd2797	8620e0f3-97c7-4cb4-9382-f06c521a1381	da-nang-hoi-an-ba-na-3n2d	Đà Nẵng – Hội An – Bà Nà Hills	Cầu Vàng Bà Nà, phố cổ Hội An lung linh đèn lồng, biển Mỹ Khê và bán đảo Sơn Trà.	Cầu Vàng Bà Nà, phố cổ Hội An lung linh đèn lồng, biển Mỹ Khê và bán đảo Sơn Trà.\n\nGiá bao gồm: xe đưa đón, khách sạn/du thuyền theo chương trình, các bữa ăn chính, vé tham quan, hướng dẫn viên, bảo hiểm du lịch.\nGiá không bao gồm: chi phí cá nhân, đồ uống, tiền tip, VAT (nếu xuất hóa đơn).	Đà Nẵng	TP.HCM / Hà Nội	3	2	4590000	3490000	\N	["Vé cáp treo Bà Nà + buffet trưa", "Thả đèn hoa đăng sông Hoài", "Khách sạn 4★ gần biển", "Xe đưa đón suốt hành trình"]	[{"day": "Ngày 1", "title": "Khởi hành – Đà Nẵng", "detail": "Đón khách tại điểm hẹn, di chuyển, nhận phòng và tham quan buổi chiều."}, {"day": "Ngày 2", "title": "Khám phá trọn ngày", "detail": "Tham quan các điểm nổi bật theo chương trình, ăn trưa và tối đặc sản địa phương."}, {"day": "Ngày 3", "title": "Mua sắm đặc sản – Trở về", "detail": "Ăn sáng, tự do mua sắm, trả phòng và về lại điểm đón."}]	t	1	2026-11-04 09:49:14.798779+00	2026-11-04 09:49:14.798779+00
f9e71693-145c-4f7d-b2c9-26f0cbbdae01	8620e0f3-97c7-4cb4-9382-f06c521a1381	phu-quoc-4n3d	Phú Quốc – Grand World – Hòn Thơm	Cáp treo vượt biển Hòn Thơm, lặn ngắm san hô An Thới, Grand World và hoàng hôn Sunset Town.	Cáp treo vượt biển Hòn Thơm, lặn ngắm san hô An Thới, Grand World và hoàng hôn Sunset Town.\n\nGiá bao gồm: xe đưa đón, khách sạn/du thuyền theo chương trình, các bữa ăn chính, vé tham quan, hướng dẫn viên, bảo hiểm du lịch.\nGiá không bao gồm: chi phí cá nhân, đồ uống, tiền tip, VAT (nếu xuất hóa đơn).	Kiên Giang	TP.HCM	4	3	6990000	5290000	\N	["Cáp treo vượt biển dài nhất thế giới", "Tour 4 đảo + lặn san hô", "Resort 4★ có hồ bơi", "Vé máy bay khứ hồi"]	[{"day": "Ngày 1", "title": "Khởi hành – Kiên Giang", "detail": "Đón khách tại điểm hẹn, di chuyển, nhận phòng và tham quan buổi chiều."}, {"day": "Ngày 2", "title": "Khám phá trọn ngày", "detail": "Tham quan các điểm nổi bật theo chương trình, ăn trưa và tối đặc sản địa phương."}, {"day": "Ngày 3", "title": "Khám phá trọn ngày", "detail": "Tham quan các điểm nổi bật theo chương trình, ăn trưa và tối đặc sản địa phương."}, {"day": "Ngày 4", "title": "Mua sắm đặc sản – Trở về", "detail": "Ăn sáng, tự do mua sắm, trả phòng và về lại điểm đón."}]	t	2	2026-11-04 09:49:14.798779+00	2026-11-04 09:49:14.798779+00
47edac9b-35e5-4e4b-b253-511574b7c594	8620e0f3-97c7-4cb4-9382-f06c521a1381	sa-pa-fansipan-3n2d	Sa Pa – Chinh phục Fansipan	Nóc nhà Đông Dương, bản Cát Cát, ruộng bậc thang Mường Hoa và chợ đêm Sa Pa.	Nóc nhà Đông Dương, bản Cát Cát, ruộng bậc thang Mường Hoa và chợ đêm Sa Pa.\n\nGiá bao gồm: xe đưa đón, khách sạn/du thuyền theo chương trình, các bữa ăn chính, vé tham quan, hướng dẫn viên, bảo hiểm du lịch.\nGiá không bao gồm: chi phí cá nhân, đồ uống, tiền tip, VAT (nếu xuất hóa đơn).	Lào Cai	Hà Nội	3	2	3790000	2890000	\N	["Vé cáp treo Fansipan", "Xe giường nằm cao cấp", "Homestay view thung lũng", "Lẩu cá hồi đặc sản"]	[{"day": "Ngày 1", "title": "Khởi hành – Lào Cai", "detail": "Đón khách tại điểm hẹn, di chuyển, nhận phòng và tham quan buổi chiều."}, {"day": "Ngày 2", "title": "Khám phá trọn ngày", "detail": "Tham quan các điểm nổi bật theo chương trình, ăn trưa và tối đặc sản địa phương."}, {"day": "Ngày 3", "title": "Mua sắm đặc sản – Trở về", "detail": "Ăn sáng, tự do mua sắm, trả phòng và về lại điểm đón."}]	t	3	2026-11-04 09:49:14.798779+00	2026-11-04 09:49:14.798779+00
1c5b1a2a-e47f-4534-89b1-a02f3c0fb9a9	8620e0f3-97c7-4cb4-9382-f06c521a1381	mien-tay-can-tho-2n1d	Miền Tây – Cần Thơ – Chợ nổi Cái Răng	Chợ nổi Cái Răng lúc bình minh, vườn trái cây, đờn ca tài tử và bến Ninh Kiều về đêm.	Chợ nổi Cái Răng lúc bình minh, vườn trái cây, đờn ca tài tử và bến Ninh Kiều về đêm.\n\nGiá bao gồm: xe đưa đón, khách sạn/du thuyền theo chương trình, các bữa ăn chính, vé tham quan, hướng dẫn viên, bảo hiểm du lịch.\nGiá không bao gồm: chi phí cá nhân, đồ uống, tiền tip, VAT (nếu xuất hóa đơn).	Cần Thơ	TP.HCM	2	1	1890000	1290000	\N	["Ghe tham quan chợ nổi", "Vườn trái cây ăn thỏa thích", "Đờn ca tài tử Nam Bộ", "Khách sạn 3★ trung tâm"]	[{"day": "Ngày 1", "title": "Khởi hành – Cần Thơ", "detail": "Đón khách tại điểm hẹn, di chuyển, nhận phòng và tham quan buổi chiều."}, {"day": "Ngày 2", "title": "Mua sắm đặc sản – Trở về", "detail": "Ăn sáng, tự do mua sắm, trả phòng và về lại điểm đón."}]	t	4	2026-11-04 09:49:14.798779+00	2026-11-04 09:49:14.798779+00
afe8e541-abf3-4a1d-bd12-c08de018a45e	8620e0f3-97c7-4cb4-9382-f06c521a1381	da-lat-3n2d	Đà Lạt – Thành phố ngàn hoa	Đồi chè Cầu Đất, thác Datanla, quảng trường Lâm Viên và săn mây Đồi Đa Phú.	Đồi chè Cầu Đất, thác Datanla, quảng trường Lâm Viên và săn mây Đồi Đa Phú.\n\nGiá bao gồm: xe đưa đón, khách sạn/du thuyền theo chương trình, các bữa ăn chính, vé tham quan, hướng dẫn viên, bảo hiểm du lịch.\nGiá không bao gồm: chi phí cá nhân, đồ uống, tiền tip, VAT (nếu xuất hóa đơn).	Lâm Đồng	TP.HCM	3	2	3290000	2490000	\N	["Săn mây lúc bình minh", "Máng trượt thác Datanla", "Cà phê view đồi chè", "Xe giường nằm khứ hồi"]	[{"day": "Ngày 1", "title": "Khởi hành – Lâm Đồng", "detail": "Đón khách tại điểm hẹn, di chuyển, nhận phòng và tham quan buổi chiều."}, {"day": "Ngày 2", "title": "Khám phá trọn ngày", "detail": "Tham quan các điểm nổi bật theo chương trình, ăn trưa và tối đặc sản địa phương."}, {"day": "Ngày 3", "title": "Mua sắm đặc sản – Trở về", "detail": "Ăn sáng, tự do mua sắm, trả phòng và về lại điểm đón."}]	t	5	2026-11-04 09:49:14.798779+00	2026-11-04 09:49:14.798779+00
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."user_roles" ("user_id", "role_id") FROM stdin;
d4511f1f-9a08-4be5-9e96-bdb965d33c2c	3ff64cf0-0b94-494f-a356-d57bc3691c14
98da1b1a-c465-4c5d-9b3e-63d48aeb9f68	bb0badac-681c-46f9-af91-fb11c1461ab9
792d182b-c92d-4ab9-aade-08390d9d316e	43f7172f-0243-4813-a059-7645c5937c7f
35a0f8ff-72e7-4917-983d-13b5b3ddea99	1ef422da-4863-453e-8ad3-0e9f18e6c9d4
ca12f46e-8538-49b9-a292-9595e72458a1	5a442092-15fc-41ab-ba12-c988ee39b4b0
30c6ac2b-98d5-4269-93a5-c42a02dd6aa8	f5424a8e-cd06-453e-bcba-821f1da7aa8e
a9fcb9cf-f881-4314-a558-fdb8bb98818c	571ebf4a-105e-4440-8db4-4d90d9949540
1d1aae5b-3a1c-4630-ba53-5b01ebe647fe	5cd9c918-a267-4a9c-af2f-ccc9d66f36a1
925a47cd-7e2d-40e7-ae64-f715583edcee	8b644d1f-c0df-4724-8fad-a044661f1915
26604e4e-888d-41a5-8024-13181ce1fb19	ff980237-c444-432e-9d6e-90f3b3ef57b1
74d2dd54-aebc-40da-9eca-32a435a715bf	77638920-dfe1-4ddc-9dee-2a8a8358549d
dfa3f1e3-9a17-487a-90a7-452ceb021b3c	ee7e80a8-2dcb-4090-bad3-45bc0f71d1c1
3ef24c74-c555-4fcc-b87f-fc56003b1032	0f4666ca-1a00-4e13-82d0-cad86227073a
7a4cfbf0-46b2-463f-92ca-3f9868735862	039238a9-cf2e-4981-bc8b-263d4cb2f1f3
5b6cd821-731a-497a-be32-fe8f578ff63d	fdb62c08-b1d6-459f-9d00-85dadfaeed19
ed904081-6059-419c-9f5d-f236d7bc09d0	4b5046b7-88ca-4841-81d0-ef6455108bb4
1c4226b3-a9c5-44d5-8a07-6606959992da	f38d923c-4dc6-4a44-a439-e78708786569
427ce962-9f6d-4a84-a96d-52864ececedc	2d996584-30bb-44f9-af7e-0a897ef00ee1
b72224c3-4bd7-4a6f-84fd-3573582f7352	0e74dc23-f583-417b-a188-a8715396b436
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."users" ("id", "tenant_id", "email", "phone", "full_name", "password_hash", "status", "token_version", "failed_logins", "locked_until", "last_login_at", "created_at", "updated_at") FROM stdin;
d4511f1f-9a08-4be5-9e96-bdb965d33c2c	8620e0f3-97c7-4cb4-9382-f06c521a1381	admin@dulichdemo.vn	0900000001	Nguyễn Văn Chủ	$argon2id$v=19$m=19456,t=2,p=1$kkyTfMNzWzdissoq9OPbrQ$LgP3q7cv65zrju67YzcgkaYTK39t4iDdpLvPC3HvgXg	active	0	0	\N	\N	2026-11-04 09:49:14.798779+00	2026-11-04 09:49:14.798779+00
98da1b1a-c465-4c5d-9b3e-63d48aeb9f68	8620e0f3-97c7-4cb4-9382-f06c521a1381	letan@dulichdemo.vn	0900000002	Trần Thị Lễ Tân	$argon2id$v=19$m=19456,t=2,p=1$kkyTfMNzWzdissoq9OPbrQ$LgP3q7cv65zrju67YzcgkaYTK39t4iDdpLvPC3HvgXg	active	0	0	\N	\N	2026-11-04 09:49:14.798779+00	2026-11-04 09:49:14.798779+00
792d182b-c92d-4ab9-aade-08390d9d316e	8620e0f3-97c7-4cb4-9382-f06c521a1381	ketoan@dulichdemo.vn	0900000003	Lê Văn Kế Toán	$argon2id$v=19$m=19456,t=2,p=1$kkyTfMNzWzdissoq9OPbrQ$LgP3q7cv65zrju67YzcgkaYTK39t4iDdpLvPC3HvgXg	active	0	0	\N	\N	2026-11-04 09:49:14.798779+00	2026-11-04 09:49:14.798779+00
35a0f8ff-72e7-4917-983d-13b5b3ddea99	8620e0f3-97c7-4cb4-9382-f06c521a1381	hdv@dulichdemo.vn	0900000004	Phạm Hướng Dẫn	$argon2id$v=19$m=19456,t=2,p=1$kkyTfMNzWzdissoq9OPbrQ$LgP3q7cv65zrju67YzcgkaYTK39t4iDdpLvPC3HvgXg	active	0	0	\N	\N	2026-11-04 09:49:14.798779+00	2026-11-04 09:49:14.798779+00
ca12f46e-8538-49b9-a292-9595e72458a1	3b80d278-2af7-4dae-b58a-2dbd991b4182	admin@ketoandemo.vn	\N	Chủ doanh nghiệp	$argon2id$v=19$m=19456,t=2,p=1$EDk0ctPMWho5/oVMu5enyw$0abtoyuFDPydW8dRbv18d/2C5RnpfkCBzRGt7ti64Rw	active	0	0	\N	\N	2026-11-04 09:49:14.927361+00	2026-11-04 09:49:14.927361+00
30c6ac2b-98d5-4269-93a5-c42a02dd6aa8	3b80d278-2af7-4dae-b58a-2dbd991b4182	letan@ketoandemo.vn	\N	Lễ tân	$argon2id$v=19$m=19456,t=2,p=1$EDk0ctPMWho5/oVMu5enyw$0abtoyuFDPydW8dRbv18d/2C5RnpfkCBzRGt7ti64Rw	active	0	0	\N	\N	2026-11-04 09:49:14.927361+00	2026-11-04 09:49:14.927361+00
a9fcb9cf-f881-4314-a558-fdb8bb98818c	3b80d278-2af7-4dae-b58a-2dbd991b4182	ketoan@ketoandemo.vn	\N	Kế toán	$argon2id$v=19$m=19456,t=2,p=1$EDk0ctPMWho5/oVMu5enyw$0abtoyuFDPydW8dRbv18d/2C5RnpfkCBzRGt7ti64Rw	active	0	0	\N	\N	2026-11-04 09:49:14.927361+00	2026-11-04 09:49:14.927361+00
1d1aae5b-3a1c-4630-ba53-5b01ebe647fe	455f57ad-4545-48ac-8552-459852027f1a	admin@cafedemo.vn	\N	Chủ doanh nghiệp	$argon2id$v=19$m=19456,t=2,p=1$BfOTAGx5hIt00HrIVewgoA$MrtT9nBIv4pvnEgwvbiLPLVtTKnlp+goB0DGjpyhlh4	active	0	0	\N	\N	2026-11-04 09:49:14.998973+00	2026-11-04 09:49:14.998973+00
925a47cd-7e2d-40e7-ae64-f715583edcee	455f57ad-4545-48ac-8552-459852027f1a	letan@cafedemo.vn	\N	Lễ tân	$argon2id$v=19$m=19456,t=2,p=1$BfOTAGx5hIt00HrIVewgoA$MrtT9nBIv4pvnEgwvbiLPLVtTKnlp+goB0DGjpyhlh4	active	0	0	\N	\N	2026-11-04 09:49:14.998973+00	2026-11-04 09:49:14.998973+00
26604e4e-888d-41a5-8024-13181ce1fb19	455f57ad-4545-48ac-8552-459852027f1a	ketoan@cafedemo.vn	\N	Kế toán	$argon2id$v=19$m=19456,t=2,p=1$BfOTAGx5hIt00HrIVewgoA$MrtT9nBIv4pvnEgwvbiLPLVtTKnlp+goB0DGjpyhlh4	active	0	0	\N	\N	2026-11-04 09:49:14.998973+00	2026-11-04 09:49:14.998973+00
74d2dd54-aebc-40da-9eca-32a435a715bf	b8a63c7f-10a0-4c8b-b34e-2dbef4297724	admin@khachsandemo.vn	\N	Chủ doanh nghiệp	$argon2id$v=19$m=19456,t=2,p=1$OLi5gwOo5FUtzc0zsc1Ueg$kJ3scgwBv+3Bge0LFiin+3bOm5090Y2Fv64yzag4IwM	active	0	0	\N	\N	2026-11-04 09:49:15.115094+00	2026-11-04 09:49:15.115094+00
dfa3f1e3-9a17-487a-90a7-452ceb021b3c	b8a63c7f-10a0-4c8b-b34e-2dbef4297724	letan@khachsandemo.vn	\N	Lễ tân	$argon2id$v=19$m=19456,t=2,p=1$OLi5gwOo5FUtzc0zsc1Ueg$kJ3scgwBv+3Bge0LFiin+3bOm5090Y2Fv64yzag4IwM	active	0	0	\N	\N	2026-11-04 09:49:15.115094+00	2026-11-04 09:49:15.115094+00
3ef24c74-c555-4fcc-b87f-fc56003b1032	b8a63c7f-10a0-4c8b-b34e-2dbef4297724	ketoan@khachsandemo.vn	\N	Kế toán	$argon2id$v=19$m=19456,t=2,p=1$OLi5gwOo5FUtzc0zsc1Ueg$kJ3scgwBv+3Bge0LFiin+3bOm5090Y2Fv64yzag4IwM	active	0	0	\N	\N	2026-11-04 09:49:15.115094+00	2026-11-04 09:49:15.115094+00
7a4cfbf0-46b2-463f-92ca-3f9868735862	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	admin@nhahangdemo.vn	\N	Chủ doanh nghiệp	$argon2id$v=19$m=19456,t=2,p=1$okER99PoKSi4K9yXiR53TQ$lT4zb+JoelubL/me6j6b87QvMTzxPgw6eTpHOGPWzcA	active	0	0	\N	\N	2026-11-04 09:49:15.165171+00	2026-11-04 09:49:15.165171+00
5b6cd821-731a-497a-be32-fe8f578ff63d	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	letan@nhahangdemo.vn	\N	Lễ tân	$argon2id$v=19$m=19456,t=2,p=1$okER99PoKSi4K9yXiR53TQ$lT4zb+JoelubL/me6j6b87QvMTzxPgw6eTpHOGPWzcA	active	0	0	\N	\N	2026-11-04 09:49:15.165171+00	2026-11-04 09:49:15.165171+00
ed904081-6059-419c-9f5d-f236d7bc09d0	c0baa6b3-57e5-427c-bd9d-1df8f8d0a6d7	ketoan@nhahangdemo.vn	\N	Kế toán	$argon2id$v=19$m=19456,t=2,p=1$okER99PoKSi4K9yXiR53TQ$lT4zb+JoelubL/me6j6b87QvMTzxPgw6eTpHOGPWzcA	active	0	0	\N	\N	2026-11-04 09:49:15.165171+00	2026-11-04 09:49:15.165171+00
1c4226b3-a9c5-44d5-8a07-6606959992da	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	admin@spademo.vn	\N	Chủ doanh nghiệp	$argon2id$v=19$m=19456,t=2,p=1$iqSBcdcY8NPGyQ9lonlnCQ$stcRAaRDL6Dn6x+UxlKy47HXBoPWYk7jk5x2dVn/Yl8	active	0	0	\N	\N	2026-11-04 09:49:15.213727+00	2026-11-04 09:49:15.213727+00
427ce962-9f6d-4a84-a96d-52864ececedc	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	letan@spademo.vn	\N	Lễ tân	$argon2id$v=19$m=19456,t=2,p=1$iqSBcdcY8NPGyQ9lonlnCQ$stcRAaRDL6Dn6x+UxlKy47HXBoPWYk7jk5x2dVn/Yl8	active	0	0	\N	\N	2026-11-04 09:49:15.213727+00	2026-11-04 09:49:15.213727+00
b72224c3-4bd7-4a6f-84fd-3573582f7352	dd79dea0-c0d1-4eb7-9d67-844cc4c0f6cd	ketoan@spademo.vn	\N	Kế toán	$argon2id$v=19$m=19456,t=2,p=1$iqSBcdcY8NPGyQ9lonlnCQ$stcRAaRDL6Dn6x+UxlKy47HXBoPWYk7jk5x2dVn/Yl8	active	0	0	\N	\N	2026-11-04 09:49:15.213727+00	2026-11-04 09:49:15.213727+00
\.


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: -
--

SELECT pg_catalog.setval('"drizzle"."__drizzle_migrations_id_seq"', 6, true);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY "drizzle"."__drizzle_migrations"
    ADD CONSTRAINT "__drizzle_migrations_pkey" PRIMARY KEY ("id");


--
-- Name: addon_orders addon_orders_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."addon_orders"
    ADD CONSTRAINT "addon_orders_code_unique" UNIQUE ("code");


--
-- Name: addon_orders addon_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."addon_orders"
    ADD CONSTRAINT "addon_orders_pkey" PRIMARY KEY ("id");


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");


--
-- Name: booking_requests booking_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."booking_requests"
    ADD CONSTRAINT "booking_requests_pkey" PRIMARY KEY ("id");


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_pkey" PRIMARY KEY ("id");


--
-- Name: catalog_categories catalog_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."catalog_categories"
    ADD CONSTRAINT "catalog_categories_pkey" PRIMARY KEY ("id");


--
-- Name: catalog_items catalog_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."catalog_items"
    ADD CONSTRAINT "catalog_items_pkey" PRIMARY KEY ("id");


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_pkey" PRIMARY KEY ("id");


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");


--
-- Name: invoice_items invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id");


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");


--
-- Name: invoices invoices_public_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_public_token_unique" UNIQUE ("public_token");


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");


--
-- Name: platform_admins platform_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id");


--
-- Name: platform_admins platform_admins_username_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_username_unique" UNIQUE ("username");


--
-- Name: platform_audit_logs platform_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."platform_audit_logs"
    ADD CONSTRAINT "platform_audit_logs_pkey" PRIMARY KEY ("id");


--
-- Name: reservations reservations_no_overlap; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_no_overlap" EXCLUDE USING "gist" ("resource_id" WITH =, "tstzrange"("start_at", "end_at", '[)'::"text") WITH &&) WHERE (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'checked_in'::"text"])));


--
-- Name: reservations reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_pkey" PRIMARY KEY ("id");


--
-- Name: resources resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."resources"
    ADD CONSTRAINT "resources_pkey" PRIMARY KEY ("id");


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");


--
-- Name: tax_tasks tax_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tax_tasks"
    ADD CONSTRAINT "tax_tasks_pkey" PRIMARY KEY ("id");


--
-- Name: tenant_domains tenant_domains_domain_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tenant_domains"
    ADD CONSTRAINT "tenant_domains_domain_unique" UNIQUE ("domain");


--
-- Name: tenant_domains tenant_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tenant_domains"
    ADD CONSTRAINT "tenant_domains_pkey" PRIMARY KEY ("id");


--
-- Name: tenant_modules tenant_modules_tenant_id_module_key_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tenant_modules"
    ADD CONSTRAINT "tenant_modules_tenant_id_module_key_pk" PRIMARY KEY ("tenant_id", "module_key");


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");


--
-- Name: tenants tenants_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_slug_unique" UNIQUE ("slug");


--
-- Name: tour_departures tour_departures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tour_departures"
    ADD CONSTRAINT "tour_departures_pkey" PRIMARY KEY ("id");


--
-- Name: tours tours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tours"
    ADD CONSTRAINT "tours_pkey" PRIMARY KEY ("id");


--
-- Name: user_roles user_roles_user_id_role_id_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_id_pk" PRIMARY KEY ("user_id", "role_id");


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");


--
-- Name: addon_orders_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "addon_orders_status_idx" ON "public"."addon_orders" USING "btree" ("status");


--
-- Name: addon_orders_tenant_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "addon_orders_tenant_idx" ON "public"."addon_orders" USING "btree" ("tenant_id", "created_at");


--
-- Name: audit_tenant_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "audit_tenant_created_idx" ON "public"."audit_logs" USING "btree" ("tenant_id", "created_at");


--
-- Name: booking_tenant_code_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "booking_tenant_code_uq" ON "public"."booking_requests" USING "btree" ("tenant_id", "code");


--
-- Name: booking_tenant_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "booking_tenant_status_idx" ON "public"."booking_requests" USING "btree" ("tenant_id", "status", "created_at");


--
-- Name: catalog_items_tenant_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "catalog_items_tenant_idx" ON "public"."catalog_items" USING "btree" ("tenant_id", "category_id");


--
-- Name: customers_tenant_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "customers_tenant_email_idx" ON "public"."customers" USING "btree" ("tenant_id", "email");


--
-- Name: customers_tenant_phone_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "customers_tenant_phone_uq" ON "public"."customers" USING "btree" ("tenant_id", "phone") WHERE ("phone" IS NOT NULL);


--
-- Name: departures_tour_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "departures_tour_date_idx" ON "public"."tour_departures" USING "btree" ("tour_id", "depart_date");


--
-- Name: invoices_tenant_code_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "invoices_tenant_code_uq" ON "public"."invoices" USING "btree" ("tenant_id", "code");


--
-- Name: platform_audit_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "platform_audit_created_idx" ON "public"."platform_audit_logs" USING "btree" ("created_at");


--
-- Name: reservations_booking_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "reservations_booking_idx" ON "public"."reservations" USING "btree" ("booking_id");


--
-- Name: reservations_tenant_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "reservations_tenant_time_idx" ON "public"."reservations" USING "btree" ("tenant_id", "start_at");


--
-- Name: resources_tenant_kind_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "resources_tenant_kind_idx" ON "public"."resources" USING "btree" ("tenant_id", "kind");


--
-- Name: roles_tenant_key_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "roles_tenant_key_uq" ON "public"."roles" USING "btree" ("tenant_id", "key");


--
-- Name: sessions_refresh_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "sessions_refresh_uq" ON "public"."sessions" USING "btree" ("refresh_hash");


--
-- Name: sessions_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "sessions_user_idx" ON "public"."sessions" USING "btree" ("user_id");


--
-- Name: tax_tasks_due_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "tax_tasks_due_idx" ON "public"."tax_tasks" USING "btree" ("tenant_id", "due_date");


--
-- Name: tax_tasks_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "tax_tasks_uq" ON "public"."tax_tasks" USING "btree" ("contract_id", "kind", "period");


--
-- Name: tours_tenant_slug_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "tours_tenant_slug_uq" ON "public"."tours" USING "btree" ("tenant_id", "slug");


--
-- Name: users_tenant_email_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "users_tenant_email_uq" ON "public"."users" USING "btree" ("tenant_id", "email") WHERE ("email" IS NOT NULL);


--
-- Name: users_tenant_phone_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "users_tenant_phone_uq" ON "public"."users" USING "btree" ("tenant_id", "phone") WHERE ("phone" IS NOT NULL);


--
-- Name: addon_orders addon_orders_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."addon_orders"
    ADD CONSTRAINT "addon_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;


--
-- Name: addon_orders addon_orders_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."addon_orders"
    ADD CONSTRAINT "addon_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;


--
-- Name: booking_requests booking_requests_assigned_to_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."booking_requests"
    ADD CONSTRAINT "booking_requests_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE SET NULL;


--
-- Name: booking_requests booking_requests_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."booking_requests"
    ADD CONSTRAINT "booking_requests_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;


--
-- Name: booking_requests booking_requests_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."booking_requests"
    ADD CONSTRAINT "booking_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;


--
-- Name: branches branches_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;


--
-- Name: catalog_categories catalog_categories_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."catalog_categories"
    ADD CONSTRAINT "catalog_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;


--
-- Name: catalog_items catalog_items_category_id_catalog_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."catalog_items"
    ADD CONSTRAINT "catalog_items_category_id_catalog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."catalog_categories"("id") ON DELETE SET NULL;


--
-- Name: catalog_items catalog_items_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."catalog_items"
    ADD CONSTRAINT "catalog_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;


--
-- Name: contracts contracts_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;


--
-- Name: contracts contracts_item_id_catalog_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_item_id_catalog_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."catalog_items"("id") ON DELETE SET NULL;


--
-- Name: contracts contracts_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;


--
-- Name: customers customers_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;


--
-- Name: employees employees_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL;


--
-- Name: employees employees_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;


--
-- Name: employees employees_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;


--
-- Name: invoice_items invoice_items_invoice_id_invoices_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;


--
-- Name: invoices invoices_booking_id_booking_requests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_booking_id_booking_requests_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."booking_requests"("id") ON DELETE SET NULL;


--
-- Name: invoices invoices_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;


--
-- Name: invoices invoices_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;


--
-- Name: invoices invoices_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;


--
-- Name: payments payments_invoice_id_invoices_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;


--
-- Name: payments payments_received_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;


--
-- Name: payments payments_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;


--
-- Name: platform_audit_logs platform_audit_logs_admin_id_platform_admins_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."platform_audit_logs"
    ADD CONSTRAINT "platform_audit_logs_admin_id_platform_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."platform_admins"("id") ON DELETE SET NULL;


--
-- Name: reservations reservations_booking_id_booking_requests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_booking_id_booking_requests_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."booking_requests"("id") ON DELETE CASCADE;


--
-- Name: reservations reservations_item_id_catalog_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_item_id_catalog_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."catalog_items"("id") ON DELETE SET NULL;


--
-- Name: reservations reservations_resource_id_resources_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE CASCADE;


--
-- Name: reservations reservations_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;


--
-- Name: resources resources_item_id_catalog_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."resources"
    ADD CONSTRAINT "resources_item_id_catalog_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."catalog_items"("id") ON DELETE SET NULL;


--
-- Name: resources resources_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."resources"
    ADD CONSTRAINT "resources_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;


--
-- Name: roles roles_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;


--
-- Name: sessions sessions_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;


--
-- Name: tax_tasks tax_tasks_contract_id_contracts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tax_tasks"
    ADD CONSTRAINT "tax_tasks_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE CASCADE;


--
-- Name: tax_tasks tax_tasks_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tax_tasks"
    ADD CONSTRAINT "tax_tasks_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;


--
-- Name: tax_tasks tax_tasks_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tax_tasks"
    ADD CONSTRAINT "tax_tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;


--
-- Name: tenant_domains tenant_domains_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tenant_domains"
    ADD CONSTRAINT "tenant_domains_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;


--
-- Name: tenant_modules tenant_modules_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tenant_modules"
    ADD CONSTRAINT "tenant_modules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;


--
-- Name: tour_departures tour_departures_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tour_departures"
    ADD CONSTRAINT "tour_departures_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;


--
-- Name: tour_departures tour_departures_tour_id_tours_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tour_departures"
    ADD CONSTRAINT "tour_departures_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE CASCADE;


--
-- Name: tours tours_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tours"
    ADD CONSTRAINT "tours_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;


--
-- Name: user_roles user_roles_role_id_roles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;


--
-- Name: users users_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


