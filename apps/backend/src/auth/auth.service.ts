import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../common/supabase/supabase.service';
import { ADMIN_ROLES, UserRole } from '../common/rbac/permissions';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpDto, ResendOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  constructor(
    private supabaseService: SupabaseService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });

    if (authError) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Fetch role from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    const role: UserRole = (profile?.role as UserRole) ?? 'public';

    const token = await this.signToken(
      authData.user.id,
      authData.user.email!,
      role,
    );

    return {
      access_token: token,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role,
      },
    };
  }

  async signup(dto: SignupDto) {
    const supabase = this.supabaseService.getAdminClient();

    // Use auth.signUp so Supabase sends an OTP email for verification
    const { data: authData, error: authError } =
      await supabase.auth.signUp({
        email: dto.email,
        password: dto.password,
        options: {
          data: {
            first_name: dto.first_name || null,
            last_name: dto.last_name || null,
            phone_number: dto.phone_number || null,
          },
        },
      });

    if (authError) {
      if (authError.message.includes('already been registered')) {
        throw new UnauthorizedException('User already registered');
      }
      throw new UnauthorizedException(authError.message);
    }

    if (!authData.user) {
      throw new UnauthorizedException('Failed to create user');
    }

    return {
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase.auth.verifyOtp({
      email: dto.email,
      token: dto.token,
      type: 'signup',
    });

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    if (!data.user) {
      throw new UnauthorizedException('Verification failed');
    }

    // Create profile record now that the user is verified
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      email: data.user.email,
      first_name: data.user.user_metadata?.first_name || null,
      last_name: data.user.user_metadata?.last_name || null,
      phone_number: data.user.user_metadata?.phone_number || null,
      role: 'public',
    });

    if (profileError) {
      console.error('Failed to create profile:', profileError.message);
    }

    const role: UserRole = 'public';
    const token = await this.signToken(
      data.user.id,
      data.user.email!,
      role,
    );

    return {
      access_token: token,
      user: {
        id: data.user.id,
        email: data.user.email,
        role,
      },
    };
  }

  async resendOtp(dto: ResendOtpDto) {
    const supabase = this.supabaseService.getAdminClient();

    const { error } = await supabase.auth.resend({
      email: dto.email,
      type: 'signup',
    });

    if (error) {
      console.error('Resend OTP error:', error.message);
    }

    // Always return success to prevent email enumeration
    return {
      success: true,
      message: 'If an account exists, a verification code has been sent',
    };
  }

  async logout(userId: string) {
    // Optionally invalidate Supabase session
    const supabase = this.supabaseService.getAdminClient();
    await supabase.auth.admin.signOut(userId);
    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const supabase = this.supabaseService.getAdminClient();

    const redirectTo = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/update-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(dto.email, {
      redirectTo,
    });

    if (error) {
      console.error('Password reset error:', error.message);
    }

    // Always return success to prevent email enumeration
    return {
      success: true,
      message:
        'If an account exists, a password reset email has been sent',
    };
  }

  async adminLogin(dto: LoginDto) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });

    if (authError) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Fetch role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      throw new ForbiddenException('Account does not have admin access');
    }

    const role = (profile.role as UserRole) ?? 'public';

    if (!ADMIN_ROLES.includes(role)) {
      throw new ForbiddenException('Account does not have admin access');
    }

    const token = await this.signToken(
      authData.user.id,
      authData.user.email!,
      role,
    );

    return {
      access_token: token,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role,
      },
    };
  }

  private async signToken(
    userId: string,
    email: string,
    role: UserRole,
  ): Promise<string> {
    return this.jwtService.signAsync({
      sub: userId,
      email,
      role,
    });
  }
}
