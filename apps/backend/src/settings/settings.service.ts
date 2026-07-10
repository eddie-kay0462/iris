import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { ADMIN_ROLES, UserRole, getPermissionsForRole } from '../common/rbac/permissions';

@Injectable()
export class SettingsService {
  constructor(private supabase: SupabaseService) {}

  async findAdminUsers(query: { search?: string; page?: string; limit?: string }) {
    const db = this.supabase.getAdminClient();
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = db
      .from('profiles')
      .select('id, email, first_name, last_name, role, created_at, last_login_at', { count: 'exact' })
      .in('role', ADMIN_ROLES as unknown as string[]);

    if (query.search) {
      q = q.or(
        `email.ilike.%${query.search}%,first_name.ilike.%${query.search}%,last_name.ilike.%${query.search}%`,
      );
    }

    q = q.order('created_at', { ascending: false }).range(from, to);

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

  async updateUserRole(userId: string, role: string) {
    const db = this.supabase.getAdminClient();

    const { data: profile, error: findError } = await db
      .from('profiles')
      .select('id, email, role')
      .eq('id', userId)
      .single();

    if (findError || !profile) {
      throw new NotFoundException('User not found');
    }

    const { error } = await db
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) throw error;

    return { ...profile, role };
  }

  async createUser(dto: { email: string; role: string; first_name?: string; last_name?: string }) {
    const db = this.supabase.getAdminClient();
    const adminUrl = process.env.ADMIN_URL || 'http://localhost:3001';

    // Attempt to invite via Supabase
    const { data: invited, error: inviteError } = await db.auth.admin.inviteUserByEmail(
      dto.email,
      {
        redirectTo: `${adminUrl}/accept-invite`,
        data: { first_name: dto.first_name, last_name: dto.last_name },
      },
    );

    if (inviteError) {
      // If the user already exists (e.g. registered as a customer), look them up in
      // the profiles table, upgrade their role, and send a password reset email so
      // they can set a new password and access the admin panel.
      const isAlreadyRegistered =
        inviteError.message.toLowerCase().includes('already') ||
        inviteError.message.toLowerCase().includes('registered') ||
        inviteError.message.toLowerCase().includes('exists') ||
        inviteError.status === 422;

      if (isAlreadyRegistered) {
        const { data: profile, error: profileLookupError } = await db
          .from('profiles')
          .select('id, email, first_name, last_name')
          .eq('email', dto.email)
          .single();

        if (profileLookupError || !profile) {
          throw new BadRequestException(inviteError.message);
        }

        const { error: profileUpdateError } = await db.from('profiles').upsert({
          id: profile.id,
          email: dto.email,
          first_name: dto.first_name ?? profile.first_name,
          last_name: dto.last_name ?? profile.last_name,
          role: dto.role,
        });

        if (profileUpdateError) throw profileUpdateError;

        // Send password reset email pointing to admin accept-invite page
        await db.auth.resetPasswordForEmail(dto.email, {
          redirectTo: `${adminUrl}/accept-invite`,
        });

        return { id: profile.id, email: dto.email, role: dto.role, existing_user: true };
      }

      throw new BadRequestException(inviteError.message);
    }

    const userId = invited.user.id;

    // Create profile row with assigned role
    const { error: profileError } = await db.from('profiles').upsert({
      id: userId,
      email: dto.email,
      first_name: dto.first_name ?? null,
      last_name: dto.last_name ?? null,
      role: dto.role,
    });

    if (profileError) throw profileError;

    return { id: userId, email: dto.email, role: dto.role, existing_user: false };
  }

  async sendPasswordReset(userId: string) {
    const db = this.supabase.getAdminClient();

    const { data: profile, error: findError } = await db
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (findError || !profile) {
      throw new NotFoundException('User not found');
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    await db.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${frontendUrl}/api/auth/callback?next=/update-password`,
    });

    return { success: true, message: 'Password reset email sent' };
  }

  getRoles() {
    const roles: UserRole[] = ['admin', 'manager', 'staff', 'public'];
    return roles.map((role) => ({
      role,
      permissions: [...getPermissionsForRole(role)],
      description: ROLE_DESCRIPTIONS[role],
    }));
  }

  async getShippingOptions(): Promise<ShippingOption[]> {
    const db = this.supabase.getAdminClient();
    const { data } = await db
      .from('store_settings')
      .select('value')
      .eq('key', 'shipping_options')
      .single();

    if (!data) return DEFAULT_SHIPPING_OPTIONS;
    return data.value as ShippingOption[];
  }

  async updateShippingOptions(options: ShippingOption[]): Promise<ShippingOption[]> {
    const db = this.supabase.getAdminClient();
    const { error } = await db
      .from('store_settings')
      .upsert({ key: 'shipping_options', value: options, updated_at: new Date().toISOString() });

    if (error) throw error;
    return options;
  }

  /**
   * Flat shipping rates for international destinations, keyed by ISO-2 country
   * code. Domestic (Ghana) shipping uses the tiered `shipping_options` above;
   * these cover countries we ship to at a single per-country rate.
   */
  async getCountryShippingRates(): Promise<CountryShippingRate[]> {
    const db = this.supabase.getAdminClient();
    const { data } = await db
      .from('store_settings')
      .select('value')
      .eq('key', 'country_shipping_rates')
      .single();

    if (!data) return DEFAULT_COUNTRY_SHIPPING_RATES;
    return data.value as CountryShippingRate[];
  }

  async updateCountryShippingRates(
    rates: CountryShippingRate[],
  ): Promise<CountryShippingRate[]> {
    const db = this.supabase.getAdminClient();
    const { error } = await db
      .from('store_settings')
      .upsert({ key: 'country_shipping_rates', value: rates, updated_at: new Date().toISOString() });

    if (error) throw error;
    return rates;
  }

  /** Flat rate for a destination country, or null if we don't ship there. */
  async getShippingRateForCountry(countryCode: string): Promise<number | null> {
    const rates = await this.getCountryShippingRates();
    const match = rates.find((r) => r.country === countryCode);
    return match ? match.price : null;
  }

  /**
   * Site-wide announcement bar shown above the storefront header (sale notices,
   * shipping cut-offs, etc.). Public — read by every storefront page.
   */
  async getAnnouncementBanner(): Promise<AnnouncementBanner> {
    const db = this.supabase.getAdminClient();
    const { data } = await db
      .from('store_settings')
      .select('value')
      .eq('key', 'announcement_banner')
      .single();

    if (!data?.value) return DEFAULT_ANNOUNCEMENT_BANNER;
    return { ...DEFAULT_ANNOUNCEMENT_BANNER, ...(data.value as AnnouncementBanner) };
  }

  async updateAnnouncementBanner(
    banner: AnnouncementBanner,
  ): Promise<AnnouncementBanner> {
    const clean: AnnouncementBanner = {
      enabled: !!banner.enabled,
      text: (banner.text ?? '').trim(),
      link: (banner.link ?? '').trim(),
    };
    if (clean.enabled && !clean.text) {
      throw new BadRequestException('Banner text is required when the banner is enabled');
    }
    const db = this.supabase.getAdminClient();
    const { error } = await db
      .from('store_settings')
      .upsert({ key: 'announcement_banner', value: clean, updated_at: new Date().toISOString() });

    if (error) throw error;
    return clean;
  }

  async getStockHoldMinutes(): Promise<number> {
    const db = this.supabase.getAdminClient();
    const { data } = await db
      .from('store_settings')
      .select('value')
      .eq('key', 'stock_hold_minutes')
      .single();

    if (data?.value === undefined || data?.value === null) return DEFAULT_STOCK_HOLD_MINUTES;
    return Number(data.value);
  }

  async updateStockHoldMinutes(minutes: number): Promise<number> {
    if (!Number.isFinite(minutes) || minutes <= 0) {
      throw new BadRequestException('Stock hold minutes must be a positive number');
    }
    const db = this.supabase.getAdminClient();
    const { error } = await db
      .from('store_settings')
      .upsert({ key: 'stock_hold_minutes', value: minutes, updated_at: new Date().toISOString() });

    if (error) throw error;
    return minutes;
  }

  async getPreorderEtaText(): Promise<string> {
    const db = this.supabase.getAdminClient();
    const { data } = await db
      .from('store_settings')
      .select('value')
      .eq('key', 'preorder_eta_text')
      .single();

    if (!data?.value) return DEFAULT_PREORDER_ETA_TEXT;
    return String(data.value);
  }

  async updatePreorderEtaText(text: string): Promise<string> {
    if (!text || !text.trim()) {
      throw new BadRequestException('Pre-order ETA text cannot be empty');
    }
    const db = this.supabase.getAdminClient();
    const { error } = await db
      .from('store_settings')
      .upsert({ key: 'preorder_eta_text', value: text.trim(), updated_at: new Date().toISOString() });

    if (error) throw error;
    return text.trim();
  }

  // ─── Order numbering ───────────────────────────────────────────────────────
  // The sequential number the first real order should start at. Set to a clean
  // high value (e.g. 1001) so order numbers don't read as "order #1" and don't
  // leak volume. Order numbers stay zero-padded and sortable.

  private async getNumberSetting(key: string, fallback: number): Promise<number> {
    const db = this.supabase.getAdminClient();
    const { data } = await db
      .from('store_settings')
      .select('value')
      .eq('key', key)
      .single();
    if (data?.value === undefined || data?.value === null) return fallback;
    const n = Number(data.value);
    return Number.isFinite(n) ? n : fallback;
  }

  private async updateNumberSetting(key: string, value: number, min: number): Promise<number> {
    if (!Number.isFinite(value) || value < min) {
      throw new BadRequestException(`${key} must be a number >= ${min}`);
    }
    const db = this.supabase.getAdminClient();
    const { error } = await db
      .from('store_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw error;
    return value;
  }

  getOrderNumberStart(): Promise<number> {
    return this.getNumberSetting('order_number_start', DEFAULT_ORDER_NUMBER_START);
  }

  updateOrderNumberStart(value: number): Promise<number> {
    return this.updateNumberSetting('order_number_start', value, 1);
  }

  getPreorderNumberStart(): Promise<number> {
    return this.getNumberSetting('preorder_number_start', DEFAULT_ORDER_NUMBER_START);
  }

  updatePreorderNumberStart(value: number): Promise<number> {
    return this.updateNumberSetting('preorder_number_start', value, 1);
  }

  // ─── Road to HQ ────────────────────────────────────────────────────────────
  // Baseline lets us fold in historical (e.g. Shopify) units not stored in this
  // system; target is the goal shown on the homepage progress ring.

  getRoadToHqBaseline(): Promise<number> {
    return this.getNumberSetting('road_to_hq_baseline', DEFAULT_ROAD_TO_HQ_BASELINE);
  }

  updateRoadToHqBaseline(value: number): Promise<number> {
    return this.updateNumberSetting('road_to_hq_baseline', value, 0);
  }

  getRoadToHqTarget(): Promise<number> {
    return this.getNumberSetting('road_to_hq_target', DEFAULT_ROAD_TO_HQ_TARGET);
  }

  updateRoadToHqTarget(value: number): Promise<number> {
    return this.updateNumberSetting('road_to_hq_target', value, 1);
  }
}

export interface ShippingOption {
  id: string;
  label: string;
  estimate: string;
  price: number;
}

const DEFAULT_SHIPPING_OPTIONS: ShippingOption[] = [
  { id: 'standard', label: 'No rush shipping', estimate: '5-7 business days', price: 1 },
  { id: 'express', label: 'Express', estimate: '2-3 business days', price: 2 },
];

export interface CountryShippingRate {
  country: string; // ISO-2 destination country code, e.g. 'US'
  label: string;
  estimate: string;
  price: number; // flat rate in GHS
}

const DEFAULT_COUNTRY_SHIPPING_RATES: CountryShippingRate[] = [
  { country: 'US', label: 'United States', estimate: '10-15 business days', price: 900 },
];

export interface AnnouncementBanner {
  enabled: boolean;
  text: string;
  link: string; // optional URL; empty string = plain text banner
}

const DEFAULT_ANNOUNCEMENT_BANNER: AnnouncementBanner = {
  enabled: false,
  text: '',
  link: '',
};

const DEFAULT_STOCK_HOLD_MINUTES = 10;

const DEFAULT_ORDER_NUMBER_START = 1001;

const DEFAULT_ROAD_TO_HQ_BASELINE = 0;
const DEFAULT_ROAD_TO_HQ_TARGET = 6000;

const DEFAULT_PREORDER_ETA_TEXT = '10-15 working days';

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: 'Full access to all settings, users, and data.',
  manager: 'Manage products, orders, customers, and analytics.',
  staff: 'View products, orders, customers, and inventory.',
  public: 'Customer account — no admin access.',
};
