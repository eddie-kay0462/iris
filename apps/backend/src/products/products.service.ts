import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

@Injectable()
export class ProductsService {
  constructor(private supabase: SupabaseService) {}

  private slugify(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async generateUniqueHandle(title: string): Promise<string> {
    const db = this.supabase.getAdminClient();
    const base = this.slugify(title);
    let handle = base;
    let suffix = 2;

    while (true) {
      const { data } = await db
        .from('products')
        .select('id')
        .eq('handle', handle)
        .limit(1);

      if (!data || data.length === 0) return handle;
      handle = `${base}-${suffix}`;
      suffix++;
    }
  }

  async findPublic(query: QueryProductsDto) {
    const db = this.supabase.getAdminClient();
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = db
      .from('products')
      .select(
        '*, product_variants(*), product_images(*)',
        { count: 'exact' },
      )
      .eq('published', true)
      .is('deleted_at', null);

    if (query.search) {
      q = q.ilike('title', `%${query.search}%`);
    }
    if (query.gender) {
      q = q.eq('gender', query.gender);
    }

    const sortBy = query.sort_by || 'created_at';
    const sortOrder = query.sort_order === 'asc';
    q = q.order(sortBy, { ascending: sortOrder }).range(from, to);

    const { data, count, error } = await q;
    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  async findOnePublic(idOrHandle: string) {
    const db = this.supabase.getAdminClient();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrHandle,
      );

    let q = db
      .from('products')
      .select('*, product_variants(*), product_images(*)')
      .eq('published', true)
      .is('deleted_at', null);

    if (isUuid) {
      q = q.eq('id', idOrHandle);
    } else {
      q = q.eq('handle', idOrHandle);
    }

    const { data, error } = await q.single();
    if (error || !data) throw new NotFoundException('Product not found');
    return data;
  }

  async findAdmin(query: QueryProductsDto) {
    const db = this.supabase.getAdminClient();
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = db
      .from('products')
      .select(
        '*, product_variants(*), product_images(*)',
        { count: 'exact' },
      )
      .is('deleted_at', null);

    if (query.search) {
      q = q.ilike('title', `%${query.search}%`);
    }
    if (query.status) {
      q = q.eq('status', query.status);
    }
    if (query.gender) {
      q = q.eq('gender', query.gender);
    }
    if (query.published === 'true') {
      q = q.eq('published', true);
    } else if (query.published === 'false') {
      q = q.eq('published', false);
    }

    const sortBy = query.sort_by || 'created_at';
    const sortOrder = query.sort_order === 'asc';
    q = q.order(sortBy, { ascending: sortOrder }).range(from, to);

    const { data, count, error } = await q;
    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  async findOneAdmin(id: string) {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('products')
      .select('*, product_variants(*), product_images(*)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) throw new NotFoundException('Product not found');
    return data;
  }

  async create(dto: CreateProductDto, userId: string) {
    const db = this.supabase.getAdminClient();
    const handle = dto.handle || (await this.generateUniqueHandle(dto.title));
    const { variants, ...productData } = dto;

    const { data: product, error } = await db
      .from('products')
      .insert({
        ...productData,
        handle,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    if (variants && variants.length > 0) {
      const variantRows = variants.map((v) => ({
        ...v,
        product_id: product.id,
      }));
      const { error: vError } = await db
        .from('product_variants')
        .insert(variantRows);
      if (vError) throw vError;
    }

    return this.findOneAdmin(product.id);
  }

  async update(id: string, dto: UpdateProductDto) {
    const db = this.supabase.getAdminClient();
    const { variants, ...productData } = dto;

    // Verify product exists
    await this.findOneAdmin(id);

    if (productData.handle) {
      // Ensure handle uniqueness if changing
      const { data: existing } = await db
        .from('products')
        .select('id')
        .eq('handle', productData.handle)
        .neq('id', id)
        .limit(1);
      if (existing && existing.length > 0) {
        productData.handle = await this.generateUniqueHandle(
          productData.title || productData.handle,
        );
      }
    }

    const { error } = await db
      .from('products')
      .update({ ...productData, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return this.findOneAdmin(id);
  }

  async softDelete(id: string) {
    const db = this.supabase.getAdminClient();
    await this.findOneAdmin(id);

    const { error } = await db
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return { message: 'Product deleted' };
  }

  async togglePublish(id: string) {
    const db = this.supabase.getAdminClient();
    const product = await this.findOneAdmin(id);

    const { error } = await db
      .from('products')
      .update({
        published: !product.published,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
    return this.findOneAdmin(id);
  }

  // --- Variants ---

  async addVariant(productId: string, dto: CreateVariantDto) {
    const db = this.supabase.getAdminClient();
    await this.findOneAdmin(productId);

    const { data, error } = await db
      .from('product_variants')
      .insert({ ...dto, product_id: productId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateVariant(
    productId: string,
    variantId: string,
    dto: UpdateVariantDto,
  ) {
    const db = this.supabase.getAdminClient();
    await this.findOneAdmin(productId);

    const { data, error } = await db
      .from('product_variants')
      .update(dto)
      .eq('id', variantId)
      .eq('product_id', productId)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('Variant not found');
    return data;
  }

  async deleteVariant(productId: string, variantId: string) {
    const db = this.supabase.getAdminClient();
    const { error } = await db
      .from('product_variants')
      .delete()
      .eq('id', variantId)
      .eq('product_id', productId);

    if (error) throw error;
    return { message: 'Variant deleted' };
  }

  // --- Images ---

  async addImage(productId: string, body: { url: string; alt_text?: string }) {
    const db = this.supabase.getAdminClient();
    await this.findOneAdmin(productId);

    // Get max position
    const { data: images } = await db
      .from('product_images')
      .select('position')
      .eq('product_id', productId)
      .order('position', { ascending: false })
      .limit(1);

    const position = images && images.length > 0 ? images[0].position + 1 : 0;

    const { data, error } = await db
      .from('product_images')
      .insert({
        product_id: productId,
        url: body.url,
        alt_text: body.alt_text,
        position,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteImage(productId: string, imageId: string) {
    const db = this.supabase.getAdminClient();
    const { error } = await db
      .from('product_images')
      .delete()
      .eq('id', imageId)
      .eq('product_id', productId);

    if (error) throw error;
    return { message: 'Image deleted' };
  }

  async reorderImages(productId: string, body: { image_ids: string[] }) {
    const db = this.supabase.getAdminClient();
    const updates = body.image_ids.map((imageId, index) =>
      db
        .from('product_images')
        .update({ position: index })
        .eq('id', imageId)
        .eq('product_id', productId),
    );

    await Promise.all(updates);
    return { message: 'Images reordered' };
  }
}
