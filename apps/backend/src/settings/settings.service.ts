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

    // Invite user via Supabase — creates auth user + sends invite email
    const adminUrl = process.env.ADMIN_URL || 'http://localhost:3001';
    const { data: invited, error: inviteError } = await db.auth.admin.inviteUserByEmail(
      dto.email,
      {
        redirectTo: `${adminUrl}/accept-invite`,
        data: { first_name: dto.first_name, last_name: dto.last_name },
      },
    );

    if (inviteError) {
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

    return { id: userId, email: dto.email, role: dto.role };
  }

  getRoles() {
    const roles: UserRole[] = ['admin', 'manager', 'staff', 'public'];
    return roles.map((role) => ({
      role,
      permissions: [...getPermissionsForRole(role)],
      description: ROLE_DESCRIPTIONS[role],
    }));
  }
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: 'Full access to all settings, users, and data.',
  manager: 'Manage products, orders, customers, and analytics.',
  staff: 'View products, orders, customers, and inventory.',
  public: 'Customer account — no admin access.',
};
