


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


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'public',
    'admin',
    'manager',
    'staff'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_drop_products"("drop_handle" "text") RETURNS TABLE("id" "uuid", "handle" "text", "title" "text", "base_price" numeric, "sort_order" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id, p.handle, p.title, p.base_price, dp.sort_order
  FROM products p
  JOIN drop_products dp ON dp.product_id = p.id
  JOIN drops d ON d.id = dp.drop_id
  WHERE d.handle = drop_handle
    AND d.is_active = true
    AND p.published = true
    AND p.deleted_at IS NULL
  ORDER BY dp.sort_order, p.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_drop_products"("drop_handle" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_products_by_gender"("target_gender" "text") RETURNS TABLE("id" "uuid", "handle" "text", "title" "text", "base_price" numeric, "gender" "text", "product_type" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id, p.handle, p.title, p.base_price, p.gender, p.product_type
  FROM products p
  WHERE p.gender = target_gender
    AND p.published = true
    AND p.deleted_at IS NULL
  ORDER BY p.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_products_by_gender"("target_gender" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_inventory_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.inventory_quantity != NEW.inventory_quantity) THEN
    INSERT INTO inventory_movements (
      variant_id,
      quantity_change,
      quantity_before,
      quantity_after,
      movement_type,
      notes
    ) VALUES (
      NEW.id,
      NEW.inventory_quantity - OLD.inventory_quantity,
      OLD.inventory_quantity,
      NEW.inventory_quantity,
      CASE
        WHEN NEW.inventory_quantity > OLD.inventory_quantity THEN 'restock'
        ELSE 'adjustment'
      END,
      'Automatic log from stock update'
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_inventory_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_order_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
    INSERT INTO order_status_history (
      order_id,
      from_status,
      to_status,
      notes
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      'Automatic log from status update'
    );
    
    -- Update shipped_at
    IF NEW.status = 'shipped' AND OLD.status != 'shipped' THEN
      NEW.shipped_at = NOW();
    END IF;
    
    -- Update delivered_at
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
      NEW.delivered_at = NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_order_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_activity_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "admin_id" "uuid",
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "changes" "jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_activity_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attribute_values" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "attribute_id" "uuid" NOT NULL,
    "value" "text" NOT NULL,
    "display_value" "text" NOT NULL,
    "hex_color" "text",
    "image_url" "text",
    "position" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."attribute_values" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attributes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "type" "text" DEFAULT 'text'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "attributes_type_check" CHECK (("type" = ANY (ARRAY['text'::"text", 'color'::"text", 'image'::"text"])))
);


ALTER TABLE "public"."attributes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campaign_images" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "src" "text" NOT NULL,
    "alt_text" "text",
    "caption" "text",
    "sort_order" integer DEFAULT 1,
    "width" integer,
    "height" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."campaign_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campaign_products" (
    "campaign_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."campaign_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campaigns" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "handle" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "campaign_type" "text" DEFAULT 'lookbook'::"text",
    "hero_image_url" "text",
    "hero_video_url" "text",
    "is_active" boolean DEFAULT true,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "campaigns_campaign_type_check" CHECK (("campaign_type" = ANY (ARRAY['lookbook'::"text", 'influencer'::"text", 'seasonal'::"text", 'collab'::"text", 'editorial'::"text"])))
);


ALTER TABLE "public"."campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."collection_products" (
    "collection_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "position" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."collection_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."collections" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "handle" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "image_url" "text",
    "published" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."collections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."drop_products" (
    "drop_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."drop_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."drops" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "handle" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "early_access_start" timestamp with time zone,
    "public_release_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone,
    "hero_image_url" "text",
    "logo_image_url" "text",
    "is_active" boolean DEFAULT true,
    "season" "text",
    "year" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."drops" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_movements" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "variant_id" "uuid" NOT NULL,
    "quantity_change" integer NOT NULL,
    "quantity_before" integer NOT NULL,
    "quantity_after" integer NOT NULL,
    "movement_type" "text" NOT NULL,
    "reference_id" "uuid",
    "reference_type" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "inventory_movements_movement_type_check" CHECK (("movement_type" = ANY (ARRAY['sale'::"text", 'restock'::"text", 'adjustment'::"text", 'return'::"text", 'damaged'::"text", 'transfer'::"text", 'preorder'::"text"])))
);


ALTER TABLE "public"."inventory_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "variant_id" "uuid",
    "product_name" "text" NOT NULL,
    "variant_title" "text",
    "sku" "text",
    "quantity" integer NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "total_price" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "order_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_status_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "from_status" "text",
    "to_status" "text" NOT NULL,
    "notes" "text",
    "changed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."order_status_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "order_number" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "subtotal" numeric(10,2) NOT NULL,
    "discount" numeric(10,2) DEFAULT 0,
    "shipping_cost" numeric(10,2) DEFAULT 0,
    "tax" numeric(10,2) DEFAULT 0,
    "total" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'GHS'::"text",
    "shipping_address" "jsonb",
    "billing_address" "jsonb",
    "tracking_number" "text",
    "carrier" "text",
    "shipped_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "payment_provider" "text",
    "payment_reference" "text",
    "payment_status" "text",
    "customer_notes" "text",
    "internal_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    CONSTRAINT "orders_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'processing'::"text", 'shipped'::"text", 'delivered'::"text", 'cancelled'::"text", 'refunded'::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."preorders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "variant_id" "uuid" NOT NULL,
    "preorder_start" timestamp with time zone NOT NULL,
    "preorder_end" timestamp with time zone NOT NULL,
    "expected_ship_date" timestamp with time zone,
    "max_quantity" integer,
    "max_per_customer" integer DEFAULT 1,
    "total_preordered" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."preorders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_images" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "variant_id" "uuid",
    "src" "text" NOT NULL,
    "alt_text" "text",
    "position" integer DEFAULT 1,
    "width" integer,
    "height" integer,
    "image_type" "text" DEFAULT 'product'::"text",
    "option1_value" "text",
    "option2_value" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "product_images_image_type_check" CHECK (("image_type" = ANY (ARRAY['product'::"text", 'variant'::"text", 'lifestyle'::"text"])))
);


ALTER TABLE "public"."product_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_reviews" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "variant_id" "uuid",
    "user_id" "uuid",
    "email" "text",
    "name" "text",
    "rating" integer NOT NULL,
    "title" "text",
    "review_text" "text",
    "is_verified_purchase" boolean DEFAULT false,
    "order_id" "uuid",
    "is_approved" boolean DEFAULT false,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "product_reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."product_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_variants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "option1_name" "text" DEFAULT 'Color'::"text",
    "option1_value" "text",
    "option2_name" "text" DEFAULT 'Size'::"text",
    "option2_value" "text",
    "option3_name" "text",
    "option3_value" "text",
    "price" numeric(10,2) NOT NULL,
    "compare_at_price" numeric(10,2),
    "cost_per_item" numeric(10,2),
    "sku" "text",
    "barcode" "text",
    "inventory_quantity" integer DEFAULT 0,
    "inventory_policy" "text" DEFAULT 'deny'::"text",
    "weight" numeric(10,2),
    "weight_unit" "text" DEFAULT 'kg'::"text",
    "available" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "product_variants_inventory_policy_check" CHECK (("inventory_policy" = ANY (ARRAY['deny'::"text", 'continue'::"text"]))),
    CONSTRAINT "product_variants_weight_unit_check" CHECK (("weight_unit" = ANY (ARRAY['kg'::"text", 'g'::"text", 'lb'::"text", 'oz'::"text"])))
);


ALTER TABLE "public"."product_variants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "handle" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "base_price" numeric(10,2),
    "status" "text" DEFAULT 'active'::"text",
    "vendor" "text",
    "product_type" "text",
    "tags" "text"[],
    "published" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "gender" "text",
    "gsm" integer,
    "deleted_at" timestamp with time zone,
    "seo_title" "text",
    "seo_description" "text",
    "is_new_arrival" boolean DEFAULT false,
    "is_best_seller" boolean DEFAULT false,
    "is_featured" boolean DEFAULT false,
    "early_access_start" timestamp with time zone,
    "public_release_date" timestamp with time zone,
    CONSTRAINT "products_gender_check" CHECK (("gender" = ANY (ARRAY['men'::"text", 'women'::"text", 'unisex'::"text"]))),
    CONSTRAINT "products_gsm_check" CHECK ((("gsm" IS NULL) OR (("gsm" >= 100) AND ("gsm" <= 500)))),
    CONSTRAINT "products_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'draft'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "phone_number" "text",
    "first_name" "text",
    "last_name" "text",
    "role" "public"."user_role" DEFAULT 'public'::"public"."user_role",
    "email_notifications" boolean DEFAULT true,
    "sms_notifications" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_login_at" timestamp with time zone
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_alerts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "variant_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "notified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."stock_alerts" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_activity_logs"
    ADD CONSTRAINT "admin_activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attribute_values"
    ADD CONSTRAINT "attribute_values_attribute_id_value_key" UNIQUE ("attribute_id", "value");



ALTER TABLE ONLY "public"."attribute_values"
    ADD CONSTRAINT "attribute_values_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attributes"
    ADD CONSTRAINT "attributes_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."attributes"
    ADD CONSTRAINT "attributes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaign_images"
    ADD CONSTRAINT "campaign_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaign_products"
    ADD CONSTRAINT "campaign_products_pkey" PRIMARY KEY ("campaign_id", "product_id");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_handle_key" UNIQUE ("handle");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collection_products"
    ADD CONSTRAINT "collection_products_pkey" PRIMARY KEY ("collection_id", "product_id");



ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_handle_key" UNIQUE ("handle");



ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."drop_products"
    ADD CONSTRAINT "drop_products_pkey" PRIMARY KEY ("drop_id", "product_id");



ALTER TABLE ONLY "public"."drops"
    ADD CONSTRAINT "drops_handle_key" UNIQUE ("handle");



ALTER TABLE ONLY "public"."drops"
    ADD CONSTRAINT "drops_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."preorders"
    ADD CONSTRAINT "preorders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_handle_key" UNIQUE ("handle");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_phone_number_key" UNIQUE ("phone_number");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_alerts"
    ADD CONSTRAINT "stock_alerts_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_activity_logs_action" ON "public"."admin_activity_logs" USING "btree" ("action");



CREATE INDEX "idx_activity_logs_admin" ON "public"."admin_activity_logs" USING "btree" ("admin_id");



CREATE INDEX "idx_activity_logs_created" ON "public"."admin_activity_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_activity_logs_entity" ON "public"."admin_activity_logs" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_attribute_values_attribute" ON "public"."attribute_values" USING "btree" ("attribute_id");



CREATE INDEX "idx_campaign_images_campaign" ON "public"."campaign_images" USING "btree" ("campaign_id");



CREATE INDEX "idx_campaign_images_order" ON "public"."campaign_images" USING "btree" ("sort_order");



CREATE INDEX "idx_campaign_products_campaign" ON "public"."campaign_products" USING "btree" ("campaign_id");



CREATE INDEX "idx_campaign_products_product" ON "public"."campaign_products" USING "btree" ("product_id");



CREATE INDEX "idx_campaigns_active" ON "public"."campaigns" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_campaigns_handle" ON "public"."campaigns" USING "btree" ("handle");



CREATE INDEX "idx_campaigns_type" ON "public"."campaigns" USING "btree" ("campaign_type");



CREATE INDEX "idx_collection_products_collection" ON "public"."collection_products" USING "btree" ("collection_id");



CREATE INDEX "idx_collection_products_product" ON "public"."collection_products" USING "btree" ("product_id");



CREATE INDEX "idx_collections_deleted" ON "public"."collections" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NOT NULL);



CREATE INDEX "idx_collections_handle" ON "public"."collections" USING "btree" ("handle");



CREATE INDEX "idx_collections_published" ON "public"."collections" USING "btree" ("published");



CREATE INDEX "idx_drop_products_drop" ON "public"."drop_products" USING "btree" ("drop_id");



CREATE INDEX "idx_drop_products_product" ON "public"."drop_products" USING "btree" ("product_id");



CREATE INDEX "idx_drops_active" ON "public"."drops" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_drops_dates" ON "public"."drops" USING "btree" ("public_release_date", "end_date");



CREATE INDEX "idx_drops_handle" ON "public"."drops" USING "btree" ("handle");



CREATE INDEX "idx_images_position" ON "public"."product_images" USING "btree" ("position");



CREATE INDEX "idx_images_product_id" ON "public"."product_images" USING "btree" ("product_id");



CREATE INDEX "idx_images_type" ON "public"."product_images" USING "btree" ("image_type");



CREATE INDEX "idx_images_variant_id" ON "public"."product_images" USING "btree" ("variant_id");



CREATE INDEX "idx_inventory_movements_created" ON "public"."inventory_movements" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_inventory_movements_reference" ON "public"."inventory_movements" USING "btree" ("reference_type", "reference_id");



CREATE INDEX "idx_inventory_movements_type" ON "public"."inventory_movements" USING "btree" ("movement_type");



CREATE INDEX "idx_inventory_movements_variant" ON "public"."inventory_movements" USING "btree" ("variant_id");



CREATE INDEX "idx_order_history_order" ON "public"."order_status_history" USING "btree" ("order_id", "created_at" DESC);



CREATE INDEX "idx_order_items_order" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_product" ON "public"."order_items" USING "btree" ("product_id");



CREATE INDEX "idx_order_items_variant" ON "public"."order_items" USING "btree" ("variant_id");



CREATE INDEX "idx_orders_created" ON "public"."orders" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_orders_number" ON "public"."orders" USING "btree" ("order_number");



CREATE INDEX "idx_orders_payment_ref" ON "public"."orders" USING "btree" ("payment_reference");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_orders_user" ON "public"."orders" USING "btree" ("user_id");



CREATE INDEX "idx_preorders_active" ON "public"."preorders" USING "btree" ("is_active", "preorder_start", "preorder_end");



CREATE INDEX "idx_preorders_product" ON "public"."preorders" USING "btree" ("product_id");



CREATE INDEX "idx_preorders_variant" ON "public"."preorders" USING "btree" ("variant_id");



CREATE INDEX "idx_products_best_sellers" ON "public"."products" USING "btree" ("is_best_seller", "created_at" DESC) WHERE (("is_best_seller" = true) AND ("deleted_at" IS NULL));



CREATE INDEX "idx_products_deleted" ON "public"."products" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NOT NULL);



CREATE INDEX "idx_products_gender_type" ON "public"."products" USING "btree" ("gender", "product_type") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_products_handle" ON "public"."products" USING "btree" ("handle");



CREATE INDEX "idx_products_new_arrivals" ON "public"."products" USING "btree" ("is_new_arrival", "created_at" DESC) WHERE (("is_new_arrival" = true) AND ("deleted_at" IS NULL));



CREATE INDEX "idx_products_published" ON "public"."products" USING "btree" ("published");



CREATE INDEX "idx_products_status" ON "public"."products" USING "btree" ("status");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_phone" ON "public"."profiles" USING "btree" ("phone_number");



CREATE INDEX "idx_reviews_approved" ON "public"."product_reviews" USING "btree" ("is_approved", "created_at" DESC) WHERE ("is_approved" = true);



CREATE INDEX "idx_reviews_product" ON "public"."product_reviews" USING "btree" ("product_id");



CREATE INDEX "idx_reviews_rating" ON "public"."product_reviews" USING "btree" ("product_id", "rating");



CREATE INDEX "idx_reviews_user" ON "public"."product_reviews" USING "btree" ("user_id");



CREATE INDEX "idx_reviews_variant" ON "public"."product_reviews" USING "btree" ("variant_id");



CREATE INDEX "idx_stock_alerts_email" ON "public"."stock_alerts" USING "btree" ("email");



CREATE INDEX "idx_stock_alerts_user" ON "public"."stock_alerts" USING "btree" ("user_id");



CREATE INDEX "idx_stock_alerts_variant" ON "public"."stock_alerts" USING "btree" ("variant_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_variants_available" ON "public"."product_variants" USING "btree" ("available");



CREATE INDEX "idx_variants_low_stock" ON "public"."product_variants" USING "btree" ("inventory_quantity") WHERE (("inventory_quantity" < 10) AND ("available" = true));



CREATE INDEX "idx_variants_options" ON "public"."product_variants" USING "btree" ("option1_value", "option2_value");



CREATE INDEX "idx_variants_product_id" ON "public"."product_variants" USING "btree" ("product_id");



CREATE INDEX "idx_variants_sku" ON "public"."product_variants" USING "btree" ("sku");



CREATE OR REPLACE TRIGGER "trigger_log_inventory_change" AFTER UPDATE ON "public"."product_variants" FOR EACH ROW EXECUTE FUNCTION "public"."log_inventory_change"();



CREATE OR REPLACE TRIGGER "trigger_log_order_status_change" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."log_order_status_change"();



CREATE OR REPLACE TRIGGER "update_collections_updated_at" BEFORE UPDATE ON "public"."collections" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_product_images_updated_at" BEFORE UPDATE ON "public"."product_images" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_product_variants_updated_at" BEFORE UPDATE ON "public"."product_variants" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."admin_activity_logs"
    ADD CONSTRAINT "admin_activity_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."attribute_values"
    ADD CONSTRAINT "attribute_values_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_images"
    ADD CONSTRAINT "campaign_images_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_products"
    ADD CONSTRAINT "campaign_products_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_products"
    ADD CONSTRAINT "campaign_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collection_products"
    ADD CONSTRAINT "collection_products_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collection_products"
    ADD CONSTRAINT "collection_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."drop_products"
    ADD CONSTRAINT "drop_products_drop_id_fkey" FOREIGN KEY ("drop_id") REFERENCES "public"."drops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."drop_products"
    ADD CONSTRAINT "drop_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."preorders"
    ADD CONSTRAINT "preorders_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."preorders"
    ADD CONSTRAINT "preorders_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_alerts"
    ADD CONSTRAINT "stock_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_alerts"
    ADD CONSTRAINT "stock_alerts_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE;



CREATE POLICY "Public attribute values are viewable by everyone" ON "public"."attribute_values" FOR SELECT USING (true);



CREATE POLICY "Public attributes are viewable by everyone" ON "public"."attributes" FOR SELECT USING (true);



CREATE POLICY "Public can view active campaigns" ON "public"."campaigns" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public can view active drops" ON "public"."drops" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public can view active preorders" ON "public"."preorders" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public can view approved reviews" ON "public"."product_reviews" FOR SELECT USING (("is_approved" = true));



CREATE POLICY "Public can view campaign images" ON "public"."campaign_images" FOR SELECT USING (true);



CREATE POLICY "Public can view campaign products" ON "public"."campaign_products" FOR SELECT USING (true);



CREATE POLICY "Public can view drop products" ON "public"."drop_products" FOR SELECT USING (true);



CREATE POLICY "Public collection products are viewable by everyone" ON "public"."collection_products" FOR SELECT USING (true);



CREATE POLICY "Public collections are viewable by everyone" ON "public"."collections" FOR SELECT USING (("published" = true));



CREATE POLICY "Public images are viewable by everyone" ON "public"."product_images" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."products"
  WHERE (("products"."id" = "product_images"."product_id") AND ("products"."published" = true)))));



CREATE POLICY "Public products are viewable by everyone" ON "public"."products" FOR SELECT USING (("published" = true));



CREATE POLICY "Public variants are viewable by everyone" ON "public"."product_variants" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."products"
  WHERE (("products"."id" = "product_variants"."product_id") AND ("products"."published" = true)))));



CREATE POLICY "Users can manage own stock alerts" ON "public"."stock_alerts" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own orders" ON "public"."orders" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own stock alerts" ON "public"."stock_alerts" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."admin_activity_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."attribute_values" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."attributes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaign_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaign_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collection_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."drop_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."drops" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_movements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_status_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."preorders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_variants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_alerts" ENABLE ROW LEVEL SECURITY;


REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT ALL ON SCHEMA "public" TO PUBLIC;




