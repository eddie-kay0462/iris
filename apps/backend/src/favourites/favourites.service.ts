import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class FavouritesService {
  private readonly supabaseUrl: string;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    this.supabaseUrl = this.configService.getOrThrow<string>('SUPABASE_URL');
  }

  private resolveImageUrl(src: string): string {
    if (!src) return src;
    if (src.startsWith('http://') || src.startsWith('https://')) return src;
    return `${this.supabaseUrl}/storage/v1/object/public/${src}`;
  }

  async getMyFavourites(userId: string) {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('user_favourites')
      .select('id, product_id, created_at, products(id, title, handle, base_price, product_images(src, position, alt_text))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      ...row,
      products: {
        ...(row.products as any),
        product_images: ((row.products as any)?.product_images ?? []).map((img: any) => ({
          ...img,
          src: this.resolveImageUrl(img.src),
        })),
      },
    }));
  }

  async add(productId: string, userId: string) {
    const db = this.supabase.getAdminClient();
    const { data: product } = await db.from('products').select('id').eq('id', productId).maybeSingle();
    if (!product) throw new NotFoundException('Product not found');
    await db
      .from('user_favourites')
      .upsert({ user_id: userId, product_id: productId }, { onConflict: 'user_id,product_id', ignoreDuplicates: true });
    return { ok: true };
  }

  async remove(productId: string, userId: string) {
    const db = this.supabase.getAdminClient();
    await db.from('user_favourites').delete().eq('user_id', userId).eq('product_id', productId);
    return { ok: true };
  }
}
