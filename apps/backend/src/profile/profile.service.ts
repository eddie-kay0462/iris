import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private supabaseService: SupabaseService) {}

  async getProfile(userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const supabase = this.supabaseService.getAdminClient();

    // Only update fields that were provided
    const updates: Record<string, unknown> = {};
    const allowedFields = [
      'first_name',
      'last_name',
      'phone_number',
      'email_notifications',
      'sms_notifications',
    ] as const;

    for (const field of allowedFields) {
      if (dto[field] !== undefined) {
        updates[field] = dto[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new NotFoundException('No valid fields to update');
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, profile };
  }
}
