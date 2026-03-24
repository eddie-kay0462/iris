import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private client: SupabaseClient;
  private adminClient: SupabaseClient;
  private readonly supabaseUrl: string;
  private readonly anonKey: string;

  constructor(private configService: ConfigService) {
    this.supabaseUrl = this.configService.getOrThrow<string>('SUPABASE_URL');
    this.anonKey = this.configService.getOrThrow<string>('SUPABASE_ANON_KEY');
    const serviceRoleKey = this.configService.getOrThrow<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    this.client = createClient(this.supabaseUrl, this.anonKey);
    this.adminClient = createClient(this.supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /** Anon-key client (respects RLS) */
  getClient(): SupabaseClient {
    return this.client;
  }

  /** Service-role client (bypasses RLS). Never call auth.signInWithPassword on this. */
  getAdminClient(): SupabaseClient {
    return this.adminClient;
  }

  /**
   * Creates a fresh, throwaway anon-key client for auth sign-in operations.
   * Using a dedicated client prevents signInWithPassword from overwriting the
   * session on the shared adminClient, which would demote it from service-role
   * to user-scoped for all subsequent data queries.
   */
  createAuthClient(): SupabaseClient {
    return createClient(this.supabaseUrl, this.anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
}
