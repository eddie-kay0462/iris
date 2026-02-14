import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';

@Injectable()
export class CollectionsService {
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
        .from('collections')
        .select('id')
        .eq('handle', handle)
        .limit(1);

      if (!data || data.length === 0) return handle;
      handle = `${base}-${suffix}`;
      suffix++;
    }
  }

  async findPublic() {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('collections')
      .select('*')
      .eq('published', true)
      .is('deleted_at', null)
      .order('title', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async findOnePublic(idOrHandle: string) {
    const db = this.supabase.getAdminClient();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrHandle,
      );

    let q = db
      .from('collections')
      .select(
        '*, collection_products(position, product:products(*, product_variants(*), product_images(*)))',
      )
      .eq('published', true)
      .is('deleted_at', null);

    if (isUuid) {
      q = q.eq('id', idOrHandle);
    } else {
      q = q.eq('handle', idOrHandle);
    }

    const { data, error } = await q.single();
    if (error || !data) throw new NotFoundException('Collection not found');
    return data;
  }

  async findAdmin() {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('collections')
      .select('*, collection_products(product_id)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((c) => ({
      ...c,
      product_count: c.collection_products?.length || 0,
      collection_products: undefined,
    }));
  }

  async create(dto: CreateCollectionDto) {
    const db = this.supabase.getAdminClient();
    const handle =
      dto.handle || (await this.generateUniqueHandle(dto.title));

    const { data, error } = await db
      .from('collections')
      .insert({ ...dto, handle })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, dto: UpdateCollectionDto) {
    const db = this.supabase.getAdminClient();

    const { data: existing } = await db
      .from('collections')
      .select('id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (!existing) throw new NotFoundException('Collection not found');

    const { data, error } = await db
      .from('collections')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async softDelete(id: string) {
    const db = this.supabase.getAdminClient();
    const { error } = await db
      .from('collections')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return { message: 'Collection deleted' };
  }

  async addProducts(collectionId: string, productIds: string[]) {
    const db = this.supabase.getAdminClient();

    // Get max position
    const { data: existing } = await db
      .from('collection_products')
      .select('position')
      .eq('collection_id', collectionId)
      .order('position', { ascending: false })
      .limit(1);

    let position = existing && existing.length > 0 ? existing[0].position + 1 : 0;

    const rows = productIds.map((productId) => ({
      collection_id: collectionId,
      product_id: productId,
      position: position++,
    }));

    const { error } = await db
      .from('collection_products')
      .upsert(rows, { onConflict: 'collection_id,product_id' });

    if (error) throw error;
    return { message: `${productIds.length} products added` };
  }

  async removeProduct(collectionId: string, productId: string) {
    const db = this.supabase.getAdminClient();
    const { error } = await db
      .from('collection_products')
      .delete()
      .eq('collection_id', collectionId)
      .eq('product_id', productId);

    if (error) throw error;
    return { message: 'Product removed from collection' };
  }
}
