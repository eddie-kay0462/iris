import {
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { Public } from '../common/decorators/public.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('recommendations')
@UseGuards(PermissionsGuard)
export class RecommendationsController {
    constructor(private readonly recommendationsService: RecommendationsService) { }

    /**
     * GET /recommendations/for-you?k=12
     *
     * Returns personalised recommendations for the currently logged-in user.
     * Falls back to popularity for guests (no token) or unknown users.
     */
    @Public()
    @Get('for-you')
    async forYou(
        @Request() req: any,
        @Query('k') k = '12',
    ): Promise<any[]> {
        // req.user is set by JwtAuthGuard when a valid token is present.
        // If no token, req.user is undefined (route is @Public).
        const email: string | null = req.user?.email ?? null;
        return this.recommendationsService.getPersonalised(email, parseInt(k, 10));
    }

    /**
     * GET /recommendations/similar/:handle?k=6
     *
     * Returns products similar to the given product handle.
     * Always public — no auth needed for content-based similarity.
     */
    @Public()
    @Get('similar/:handle')
    async similar(
        @Param('handle') handle: string,
        @Query('k') k = '6',
    ): Promise<any[]> {
        return this.recommendationsService.getSimilar(handle, parseInt(k, 10));
    }
}
