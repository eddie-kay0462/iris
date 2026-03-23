import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { OverviewQueryDto, RevenueChartDto, ReportQueryDto } from './dto/query-analytics.dto';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('analytics')
@UseGuards(PermissionsGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  // ─── Dashboard / Overview ─────────────────────────────────────────────────

  /**
   * GET /analytics/overview
   * High-level KPIs: revenue, orders, AOV, new customers.
   * Supports period = 7d | 30d | 90d | 12m | custom (with from/to).
   */
  @Get('overview')
  @RequirePermission('analytics:read')
  getOverview(@Query() query: OverviewQueryDto) {
    return this.analyticsService.getOverview(query);
  }

  /**
   * GET /analytics/revenue-chart
   * Revenue time series split by online vs popup.
   * Supports granularity = day | week | month.
   */
  @Get('revenue-chart')
  @RequirePermission('analytics:read')
  getRevenueChart(@Query() query: RevenueChartDto) {
    return this.analyticsService.getRevenueChart(query);
  }

  // ─── Product Analytics ────────────────────────────────────────────────────

  /**
   * GET /analytics/top-products
   * Top products ranked by revenue (combined online + popup).
   */
  @Get('top-products')
  @RequirePermission('analytics:read')
  getTopProducts(@Query() query: ReportQueryDto) {
    return this.analyticsService.getTopProducts(query);
  }

  // ─── Customer Analytics ───────────────────────────────────────────────────

  /**
   * GET /analytics/customers
   * Customer growth, role breakdown, top spenders.
   */
  @Get('customers')
  @RequirePermission('analytics:read')
  getCustomerAnalytics(@Query() query: ReportQueryDto) {
    return this.analyticsService.getCustomerAnalytics(query);
  }

  // ─── Popup Analytics ──────────────────────────────────────────────────────

  /**
   * GET /analytics/popup
   * Per-event revenue, payment method split, top popup products.
   */
  @Get('popup')
  @RequirePermission('analytics:read')
  getPopupAnalytics(@Query() query: ReportQueryDto) {
    return this.analyticsService.getPopupAnalytics(query);
  }

  // ─── Inventory ────────────────────────────────────────────────────────────

  /**
   * GET /analytics/inventory
   * Inventory value snapshot: retail value, cost value, out-of-stock count.
   */
  @Get('inventory')
  @RequirePermission('analytics:read')
  getInventorySnapshot() {
    return this.analyticsService.getInventorySnapshot();
  }

  // ─── Reports ──────────────────────────────────────────────────────────────

  /**
   * GET /analytics/reports/sales
   * Full order-level sales report for a given period.
   * Useful for accountants and the business owner.
   */
  @Get('reports/sales')
  @RequirePermission('analytics:read')
  getSalesReport(@Query() query: ReportQueryDto) {
    return this.analyticsService.getSalesReport(query);
  }

  /**
   * GET /analytics/reports/financial-summary
   * Periodic (daily/weekly/monthly) P&L-style breakdown:
   * gross revenue, discounts, shipping, tax, net revenue.
   */
  @Get('reports/financial-summary')
  @RequirePermission('analytics:read')
  getFinancialSummary(@Query() query: ReportQueryDto) {
    return this.analyticsService.getFinancialSummary(query);
  }

  /**
   * GET /analytics/reports/product-performance
   * Per-product: units sold, revenue, average selling price.
   */
  @Get('reports/product-performance')
  @RequirePermission('analytics:read')
  getProductPerformanceReport(@Query() query: ReportQueryDto) {
    return this.analyticsService.getProductPerformanceReport(query);
  }

  /**
   * GET /analytics/reports/customer-acquisition
   * New signups and newsletter subscribers over time.
   */
  @Get('reports/customer-acquisition')
  @RequirePermission('analytics:read')
  getCustomerAcquisitionReport(@Query() query: ReportQueryDto) {
    return this.analyticsService.getCustomerAcquisitionReport(query);
  }

  /**
   * GET /analytics/reports/discounts
   * How much discount was given, by type, as % of revenue.
   */
  @Get('reports/discounts')
  @RequirePermission('analytics:read')
  getDiscountReport(@Query() query: ReportQueryDto) {
    return this.analyticsService.getDiscountReport(query);
  }

  /**
   * GET /analytics/reports/payment-methods
   * Order & revenue breakdown by payment provider (online) and method (popup).
   */
  @Get('reports/payment-methods')
  @RequirePermission('analytics:read')
  getPaymentMethodsReport(@Query() query: ReportQueryDto) {
    return this.analyticsService.getPaymentMethodsReport(query);
  }
}
