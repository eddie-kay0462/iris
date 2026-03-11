import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';

@Injectable()
export class ReviewsService {
  constructor(private supabase: SupabaseService) {}

  /** Admin: list all reviews with filters */
  async findAll(query: QueryReviewsDto) {
    const db = this.supabase.getAdminClient();
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = db
      .from('product_reviews')
      .select('*, products(id, title, handle)', { count: 'exact' });

    if (query.product_id) {
      q = q.eq('product_id', query.product_id);
    }
    if (query.is_approved === 'true') {
      q = q.eq('is_approved', true);
    } else if (query.is_approved === 'false') {
      q = q.eq('is_approved', false);
    }
    if (query.rating) {
      q = q.eq('rating', parseInt(query.rating, 10));
    }

    const sortBy = query.sort_by || 'created_at';
    const ascending = query.sort_order === 'asc';
    q = q.order(sortBy, { ascending }).range(from, to);

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

  /** Public: list approved reviews for a product with rating summary */
  async findApproved(productId: string, query: QueryReviewsDto) {
    const db = this.supabase.getAdminClient();
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '10', 10);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const [reviewsResult, summaryResult] = await Promise.all([
      db
        .from('product_reviews')
        .select('id, rating, title, review_text, name, is_verified_purchase, created_at', {
          count: 'exact',
        })
        .eq('product_id', productId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .range(from, to),
      db
        .from('product_reviews')
        .select('rating')
        .eq('product_id', productId)
        .eq('is_approved', true),
    ]);

    if (reviewsResult.error) throw reviewsResult.error;

    const ratings = (summaryResult.data || []).map((r) => r.rating);
    const totalRatings = ratings.length;
    const avgRating =
      totalRatings > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / totalRatings) * 10) / 10
        : 0;
    const distribution = [5, 4, 3, 2, 1].reduce(
      (acc, star) => {
        acc[star] = ratings.filter((r) => r === star).length;
        return acc;
      },
      {} as Record<number, number>,
    );

    return {
      data: reviewsResult.data || [],
      total: reviewsResult.count || 0,
      page,
      limit,
      totalPages: Math.ceil((reviewsResult.count || 0) / limit),
      summary: { avg_rating: avgRating, total: totalRatings, distribution },
    };
  }

  /** Authenticated user: submit a review */
  async create(
    productId: string,
    dto: CreateReviewDto,
    user: { sub: string; email?: string } | null,
  ) {
    const db = this.supabase.getAdminClient();

    // Verify product exists and is published
    const { data: product, error: productError } = await db
      .from('products')
      .select('id')
      .eq('id', productId)
      .eq('published', true)
      .is('deleted_at', null)
      .single();

    if (productError || !product) {
      throw new NotFoundException('Product not found');
    }

    // If authenticated, check for duplicate review
    if (user) {
      const { data: existing } = await db
        .from('product_reviews')
        .select('id')
        .eq('product_id', productId)
        .eq('user_id', user.sub)
        .limit(1);

      if (existing && existing.length > 0) {
        throw new BadRequestException('You have already reviewed this product');
      }
    }

    let isVerifiedPurchase = false;
    let orderId: string | null = null;

    // Check for verified purchase (two-step to avoid subquery)
    if (user) {
      const { data: deliveredOrders } = await db
        .from('orders')
        .select('id')
        .eq('user_id', user.sub)
        .eq('status', 'delivered');

      if (deliveredOrders && deliveredOrders.length > 0) {
        const orderIds = deliveredOrders.map((o) => o.id);
        const { data: orderItem } = await db
          .from('order_items')
          .select('id, order_id')
          .eq('product_id', productId)
          .in('order_id', orderIds)
          .limit(1);

        if (orderItem && orderItem.length > 0) {
          isVerifiedPurchase = true;
          orderId = orderItem[0].order_id;
        }
      }
    }

    const { data, error } = await db
      .from('product_reviews')
      .insert({
        product_id: productId,
        variant_id: dto.variant_id || null,
        user_id: user?.sub || null,
        email: user?.email || null,
        name: dto.name || null,
        rating: dto.rating,
        title: dto.title || null,
        review_text: dto.review_text || null,
        is_verified_purchase: isVerifiedPurchase,
        order_id: orderId,
        is_approved: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /** Admin: approve a review */
  async approve(id: string, adminId: string) {
    const db = this.supabase.getAdminClient();

    const { data, error } = await db
      .from('product_reviews')
      .update({
        is_approved: true,
        approved_by: adminId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('Review not found');
    return data;
  }

  /** Admin: delete a review */
  async remove(id: string) {
    const db = this.supabase.getAdminClient();

    const { error } = await db
      .from('product_reviews')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Review deleted' };
  }
}
