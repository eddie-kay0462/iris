import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductsService } from '../products/products.service';

interface RecommenderItem {
    product_id: number;
    score: number;
    name: string;
}

interface RecommenderResponse {
    recommendations: RecommenderItem[];
    strategy: string;
}


@Injectable()
export class RecommendationsService {
    private readonly logger = new Logger(RecommendationsService.name);
    private readonly recommenderUrl: string;

    // In-memory cache of the handle → integer_id map (loaded once per startup)
    private productHandleMap: Map<string, number> = new Map();
    private integerIdToHandleMap: Map<number, string> = new Map();
    private mapLoaded = false;

    constructor(
        private readonly configService: ConfigService,
        private readonly productsService: ProductsService,
    ) {
        this.recommenderUrl =
            this.configService.get<string>('RECOMMENDER_URL') ||
            'http://localhost:8000';
    }

    /**
     * Load the product_map from the recommender's /product-map endpoint.
     * Falls back gracefully if the recommender is offline.
     */
    private async ensureMapLoaded(): Promise<void> {
        if (this.mapLoaded) return;
        try {
            const res = await fetch(`${this.recommenderUrl}/product-map`, {
                signal: AbortSignal.timeout(3000),
            });
            if (!res.ok) return;
            const data: Record<string, number> = await res.json();
            for (const [handle, id] of Object.entries(data)) {
                this.productHandleMap.set(handle, id);
                this.integerIdToHandleMap.set(id, handle);
            }
            this.mapLoaded = true;
            this.logger.log(
                `Loaded ${this.productHandleMap.size} product handle mappings`,
            );
        } catch {
            this.logger.warn('Could not load product map from recommender');
        }
    }

    /**
     * Returns personalised product recommendations for a user identified by email.
     * Falls back to popularity for unknown/guest users.
     * Returns [] if the recommender is offline.
     */
    async getPersonalised(userEmail: string | null, k = 12): Promise<any[]> {
        try {
            await this.ensureMapLoaded();

            // Get the integer user_id from the recommender by passing the email as a
            // query param. The recommender resolves it or falls back to popularity.
            const url = userEmail
                ? `${this.recommenderUrl}/recommend/user/by-email?email=${encodeURIComponent(userEmail)}&k=${k}`
                : `${this.recommenderUrl}/recommend/user/popular?k=${k}`;

            const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
            if (!res.ok) return [];

            const data: RecommenderResponse = await res.json();
            return this.resolveProducts(data.recommendations);
        } catch {
            this.logger.warn('Recommender offline — returning empty personalised list');
            return [];
        }
    }

    /**
     * Returns products similar to the given product handle.
     * Returns [] if the recommender is offline or handle is unknown.
     */
    async getSimilar(productHandle: string, k = 6): Promise<any[]> {
        try {
            await this.ensureMapLoaded();

            const productId = this.productHandleMap.get(productHandle);
            if (productId === undefined) {
                this.logger.warn(
                    `Handle "${productHandle}" not in recommender map — no similar products`,
                );
                return [];
            }

            const res = await fetch(
                `${this.recommenderUrl}/recommend/product/${productId}?k=${k}`,
                { signal: AbortSignal.timeout(5000) },
            );
            if (!res.ok) return [];

            const data: RecommenderResponse = await res.json();
            return this.resolveProducts(data.recommendations);
        } catch {
            this.logger.warn('Recommender offline — returning empty similar list');
            return [];
        }
    }

    /**
     * Maps integer product IDs back to handles and fetches full Product records
     * from Supabase via ProductsService.
     */
    private async resolveProducts(items: RecommenderItem[]): Promise<any[]> {
        if (!items || items.length === 0) return [];

        const handles = items
            .map((item) => this.integerIdToHandleMap.get(item.product_id))
            .filter((h): h is string => !!h);

        if (handles.length === 0) return [];

        const results = await Promise.allSettled(
            handles.map((handle) => this.productsService.findOnePublic(handle)),
        );

        return results
            .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
            .map((r) => r.value);
    }
}
