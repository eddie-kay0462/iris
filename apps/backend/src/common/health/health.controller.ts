import { Controller, Get } from '@nestjs/common';
import { Public } from '../decorators/public.decorator';

/**
 * Liveness probe for Caddy's active health checks and Docker's HEALTHCHECK.
 *
 * Deliberately checks nothing but "this process is up and answering". It must
 * not touch Supabase: if Supabase blips, a dependency-aware health check would
 * fail on every replica at once and Caddy would empty the upstream pool,
 * turning a degraded API into a completely unreachable one.
 */
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return {
      status: 'ok',
      // Which container answered — the load balancer hands each request to one
      // of several identical replicas, so this is how you tell them apart.
      instance: process.env.INSTANCE_ID ?? process.env.HOSTNAME ?? 'unknown',
      crons: process.env.RUN_CRONS === 'true',
      uptime: Math.round(process.uptime()),
    };
  }
}
