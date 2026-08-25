import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface ActivityLogEntry {
  action: string;
  entityType: string;
  entityId?: string | null;
  changes?: Record<string, unknown> | null;
  /** The admin who did it. The admin app's own logger never populated this. */
  adminId?: string | null;
}

/**
 * Writes to admin_activity_logs, the feed behind /activity in the admin app.
 *
 * The admin app has its own logActivity helper, but it is called from exactly
 * one file and never fills in admin_id. Logging from the backend instead means
 * the record is written where the mutation actually happens, by the code that
 * already knows who the caller is.
 *
 * Never throws: an audit write must not be able to fail a business operation.
 */
@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(private supabase: SupabaseService) {}

  async log(entry: ActivityLogEntry): Promise<void> {
    try {
      const db = this.supabase.getAdminClient();
      const { error } = await db.from('admin_activity_logs').insert({
        admin_id: entry.adminId ?? null,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId ?? null,
        changes: entry.changes ?? null,
      });
      if (error) throw error;
    } catch (err: any) {
      this.logger.warn(
        `Failed to write activity log (${entry.action} ${entry.entityType}): ${err?.message}`,
      );
    }
  }
}
