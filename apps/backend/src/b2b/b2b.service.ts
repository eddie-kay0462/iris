import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { ActivityLogService } from '../common/activity/activity-log.service';
import { toE164 } from '../common/utils/phone';
import { round2 } from '../analytics/analytics.constants';
import { fetchAll, num } from '../analytics/reports/report-context';
import { B2bCostLine, computeB2bFinancials } from './b2b-math';
import {
  B2B_OPEN_STATUSES,
  B2bStatus,
  canTransition,
  completionDateError,
  financialsLocked,
} from './b2b-rules';
import {
  CreateB2bClientDto,
  QueryB2bClientsDto,
  UpdateB2bClientDto,
} from './dto/client.dto';
import {
  B2bCostLineDto,
  B2bSummaryQueryDto,
  CreateB2bOrderDto,
  QueryB2bOrdersDto,
  UpdateB2bOrderDto,
  UpdateB2bOrderStatusDto,
} from './dto/order.dto';

/** Postgres unique_violation. */
const UNIQUE_VIOLATION = '23505';

const ORDER_LIST_SELECT =
  'id, order_number, client_id, title, status, units, unit_price, total_cost, revenue, gross_profit, ' +
  'expected_start_date, expected_delivery_date, completed_at, cancelled_at, created_at, updated_at, ' +
  'client:b2b_clients(id, name, contact_name)';

const ORDER_DETAIL_SELECT =
  '*, client:b2b_clients(*), cost_lines:b2b_order_cost_lines(id, label, kind, amount, sort_order)';

/** Just what the stats need from every order. */
const ORDER_STATS_SELECT =
  'id, client_id, status, units, revenue, total_cost, gross_profit, expected_delivery_date, completed_at, created_at';

interface OrderStatsRow {
  id: string;
  client_id: string;
  status: B2bStatus;
  units: number;
  revenue: number | string;
  total_cost: number | string;
  gross_profit: number | string;
  expected_delivery_date: string | null;
  completed_at: string | null;
  created_at: string;
}

/** Strip the characters that would break out of a PostgREST `or=(…)` filter. */
const searchTerm = (raw?: string): string | null => {
  const s = (raw ?? '').replace(/[,()%*\\]/g, ' ').trim();
  return s.length > 0 ? s : null;
};

const blankToNull = (v: string | null | undefined): string | null => {
  const s = v?.trim();
  return s ? s : null;
};

const today = (): string => new Date().toISOString().slice(0, 10);

@Injectable()
export class B2bService {
  constructor(
    private supabase: SupabaseService,
    private activityLog: ActivityLogService,
  ) {}

  // ─── Clients ────────────────────────────────────────────────────────────────

  async listClients(query: QueryB2bClientsDto) {
    const db = this.supabase.getAdminClient();

    let q = db.from('b2b_clients').select('*').order('name', { ascending: true });
    if (query.include_archived !== 'true') q = q.is('archived_at', null);
    const term = searchTerm(query.search);
    if (term) {
      q = q.or(`name.ilike.%${term}%,contact_name.ilike.%${term}%,contact_email.ilike.%${term}%`);
    }

    const [{ data: clients, error }, orders] = await Promise.all([q, this.allOrderStats()]);
    if (error) throw error;

    const byClient = new Map<string, OrderStatsRow[]>();
    for (const o of orders) {
      if (!byClient.has(o.client_id)) byClient.set(o.client_id, []);
      byClient.get(o.client_id)!.push(o);
    }

    return (clients ?? []).map((c: any) => ({
      ...c,
      stats: this.clientStats(byClient.get(c.id) ?? []),
    }));
  }

  async getClient(id: string) {
    const db = this.supabase.getAdminClient();
    const [{ data: client, error }, { data: orders, error: ordersError }] = await Promise.all([
      db.from('b2b_clients').select('*').eq('id', id).maybeSingle(),
      db
        .from('b2b_orders')
        .select(ORDER_LIST_SELECT)
        .eq('client_id', id)
        .order('created_at', { ascending: false }),
    ]);
    if (error) throw error;
    if (ordersError) throw ordersError;
    if (!client) throw new NotFoundException('Client not found');

    const rows = (orders ?? []) as any[];
    return {
      ...client,
      stats: this.clientStats(rows),
      orders: rows.map((o) => this.withListFinancials(o)),
    };
  }

  async createClient(dto: CreateB2bClientDto, adminId: string) {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('b2b_clients')
      .insert({
        name: dto.name.trim(),
        contact_name: blankToNull(dto.contact_name),
        contact_phone: toE164(dto.contact_phone),
        contact_email: blankToNull(dto.contact_email)?.toLowerCase() ?? null,
        notes: blankToNull(dto.notes),
      })
      .select('*')
      .single();
    if (error) this.rethrowClientError(error);

    await this.activityLog.log({
      action: 'create',
      entityType: 'b2b_client',
      entityId: data.id,
      adminId,
      changes: { name: data.name },
    });
    return data;
  }

  async updateClient(id: string, dto: UpdateB2bClientDto, adminId: string) {
    const db = this.supabase.getAdminClient();
    const patch: Record<string, unknown> = {};
    // @IsOptional lets null through; a company name can't be cleared, so skip it.
    if (dto.name != null) patch.name = dto.name.trim();
    if (dto.contact_name !== undefined) patch.contact_name = blankToNull(dto.contact_name);
    if (dto.contact_phone !== undefined) patch.contact_phone = toE164(dto.contact_phone);
    if (dto.contact_email !== undefined) {
      patch.contact_email = blankToNull(dto.contact_email)?.toLowerCase() ?? null;
    }
    if (dto.notes !== undefined) patch.notes = blankToNull(dto.notes);
    if (dto.archived !== undefined) patch.archived_at = dto.archived ? new Date().toISOString() : null;

    if (Object.keys(patch).length === 0) return this.getClient(id);

    const { data, error } = await db
      .from('b2b_clients')
      .update(patch)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) this.rethrowClientError(error);
    if (!data) throw new NotFoundException('Client not found');

    await this.activityLog.log({
      action: dto.archived === true ? 'archive' : dto.archived === false ? 'restore' : 'update',
      entityType: 'b2b_client',
      entityId: id,
      adminId,
      changes: patch,
    });
    return data;
  }

  private rethrowClientError(error: any): never {
    if (error?.code === UNIQUE_VIOLATION) {
      throw new ConflictException('A client with this name already exists');
    }
    throw error;
  }

  private clientStats(orders: Pick<OrderStatsRow, 'status' | 'units' | 'revenue' | 'created_at'>[]) {
    const live = orders.filter((o) => o.status !== 'cancelled');
    const completed = live.filter((o) => o.status === 'completed');
    const open = live.filter((o) => B2B_OPEN_STATUSES.includes(o.status));
    const lastOrderAt = live.reduce<string | null>(
      (latest, o) => (!latest || o.created_at > latest ? o.created_at : latest),
      null,
    );
    return {
      orders: live.length,
      completedOrders: completed.length,
      openOrders: open.length,
      revenue: round2(completed.reduce((s, o) => s + num(o.revenue), 0)),
      units: completed.reduce((s, o) => s + (o.units ?? 0), 0),
      pipelineValue: round2(open.reduce((s, o) => s + num(o.revenue), 0)),
      lastOrderAt,
    };
  }

  // ─── Orders: read ──────────────────────────────────────────────────────────

  async listOrders(query: QueryB2bOrdersDto) {
    const db = this.supabase.getAdminClient();
    const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10) || 20));
    const from = (page - 1) * limit;

    let q = db
      .from('b2b_orders')
      .select(ORDER_LIST_SELECT, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (query.status === 'open') q = q.in('status', B2B_OPEN_STATUSES);
    else if (query.status) q = q.eq('status', query.status);
    if (query.client_id) q = q.eq('client_id', query.client_id);
    const term = searchTerm(query.search);
    if (term) q = q.or(`order_number.ilike.%${term}%,title.ilike.%${term}%`);

    const { data, count, error } = await q;
    if (error) throw error;

    return {
      data: ((data ?? []) as any[]).map((o) => this.withListFinancials(o)),
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    };
  }

  async getOrder(id: string) {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('b2b_orders')
      .select(ORDER_DETAIL_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException('B2B order not found');

    const order = data as any;
    const costLines = [...(order.cost_lines ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((l) => ({ ...l, amount: num(l.amount) }));

    return {
      ...order,
      cost_lines: costLines,
      overdue: this.isOverdue(order),
      financials: computeB2bFinancials({
        units: order.units,
        unitPrice: num(order.unit_price),
        costLines,
      }),
    };
  }

  /** A list row carries the stored totals; derive what the tables show from them. */
  private withListFinancials(o: any) {
    const revenue = num(o.revenue);
    const grossProfit = num(o.gross_profit);
    return {
      ...o,
      overdue: this.isOverdue(o),
      unit_cost: o.units > 0 ? round2(num(o.total_cost) / o.units) : 0,
      margin_pct: revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : null,
    };
  }

  private isOverdue(o: { status: B2bStatus; expected_delivery_date: string | null }): boolean {
    return (
      B2B_OPEN_STATUSES.includes(o.status) &&
      !!o.expected_delivery_date &&
      o.expected_delivery_date < today()
    );
  }

  // ─── Orders: write ─────────────────────────────────────────────────────────

  async createOrder(dto: CreateB2bOrderDto, adminId: string) {
    const db = this.supabase.getAdminClient();
    await this.assertClientUsable(dto.client_id);
    this.assertTimeline(dto.expected_start_date ?? null, dto.expected_delivery_date ?? null);

    const lines = this.cleanLines(dto.cost_lines);
    const financials = computeB2bFinancials({
      units: dto.units,
      unitPrice: dto.unit_price,
      costLines: lines,
    });

    const { data: orderNumber, error: numberError } = await db.rpc('next_b2b_order_number');
    if (numberError || !orderNumber) {
      throw new InternalServerErrorException(
        `Could not allocate a B2B order number: ${numberError?.message ?? 'no value returned'}`,
      );
    }

    const { data: order, error } = await db
      .from('b2b_orders')
      .insert({
        order_number: orderNumber,
        client_id: dto.client_id,
        title: dto.title.trim(),
        notes: blankToNull(dto.notes),
        status: dto.status ?? 'draft',
        units: dto.units,
        unit_price: dto.unit_price,
        total_cost: financials.totalCost,
        expected_start_date: dto.expected_start_date ?? null,
        expected_delivery_date: dto.expected_delivery_date ?? null,
        created_by: adminId,
      })
      .select('id')
      .single();
    if (error) throw error;

    try {
      await this.saveFinancials(order.id, dto.units, dto.unit_price, financials.totalCost, lines);
    } catch (err) {
      // Don't leave an order behind whose cost lines never landed.
      await db.from('b2b_orders').delete().eq('id', order.id);
      throw err;
    }

    await this.activityLog.log({
      action: 'create',
      entityType: 'b2b_order',
      entityId: order.id,
      adminId,
      changes: {
        order_number: orderNumber,
        client_id: dto.client_id,
        units: dto.units,
        unit_price: dto.unit_price,
        total_cost: financials.totalCost,
        revenue: financials.revenue,
      },
    });

    return this.getOrder(order.id);
  }

  async updateOrder(id: string, dto: UpdateB2bOrderDto, adminId: string) {
    const db = this.supabase.getAdminClient();
    const existing = await this.getOrder(id);

    // `!= null` throughout: @IsOptional lets an explicit null through, and none
    // of these fields can be cleared.
    const touchesFinancials =
      dto.units != null || dto.unit_price != null || dto.cost_lines != null;
    if (touchesFinancials && financialsLocked(existing.status)) {
      throw new BadRequestException(
        existing.status === 'completed'
          ? 'This order is completed. Reopen it before changing units, price or costs.'
          : 'This order is cancelled. Restore it before changing units, price or costs.',
      );
    }

    if (dto.client_id != null && dto.client_id !== existing.client_id) {
      await this.assertClientUsable(dto.client_id);
    }

    const start =
      dto.expected_start_date !== undefined ? dto.expected_start_date : existing.expected_start_date;
    const delivery =
      dto.expected_delivery_date !== undefined
        ? dto.expected_delivery_date
        : existing.expected_delivery_date;
    this.assertTimeline(start, delivery);

    const patch: Record<string, unknown> = {};
    if (dto.client_id != null) patch.client_id = dto.client_id;
    if (dto.title != null) patch.title = dto.title.trim();
    if (dto.notes !== undefined) patch.notes = blankToNull(dto.notes);
    if (dto.expected_start_date !== undefined) patch.expected_start_date = dto.expected_start_date;
    if (dto.expected_delivery_date !== undefined) {
      patch.expected_delivery_date = dto.expected_delivery_date;
    }

    if (Object.keys(patch).length > 0) {
      const { error } = await db.from('b2b_orders').update(patch).eq('id', id);
      if (error) throw error;
    }

    const changes: Record<string, unknown> = { ...patch };
    if (touchesFinancials) {
      const units = dto.units ?? existing.units;
      const unitPrice = dto.unit_price ?? num(existing.unit_price);
      const lines = dto.cost_lines ? this.cleanLines(dto.cost_lines) : existing.cost_lines;
      const financials = computeB2bFinancials({ units, unitPrice, costLines: lines });
      await this.saveFinancials(id, units, unitPrice, financials.totalCost, lines);
      Object.assign(changes, {
        units,
        unit_price: unitPrice,
        total_cost: financials.totalCost,
        revenue: financials.revenue,
        previous: {
          units: existing.units,
          unit_price: num(existing.unit_price),
          total_cost: num(existing.total_cost),
        },
      });
    }

    if (Object.keys(changes).length > 0) {
      await this.activityLog.log({
        action: 'update',
        entityType: 'b2b_order',
        entityId: id,
        adminId,
        changes,
      });
    }

    return this.getOrder(id);
  }

  async updateStatus(id: string, dto: UpdateB2bOrderStatusDto, adminId: string) {
    const db = this.supabase.getAdminClient();
    const existing = await this.getOrder(id);
    const from = existing.status as B2bStatus;
    const to = dto.status;

    if (from === to) return existing;
    if (!canTransition(from, to)) {
      throw new BadRequestException(`A ${from.replace('_', ' ')} order cannot move to ${to.replace('_', ' ')}`);
    }
    if (dto.completed_at && to !== 'completed') {
      throw new BadRequestException('A completion date only applies when completing an order');
    }

    const patch: Record<string, unknown> = { status: to };
    if (to === 'completed') {
      const completedAt = dto.completed_at ? new Date(dto.completed_at) : new Date();
      const dateError = completionDateError(completedAt);
      if (dateError) throw new BadRequestException(dateError);
      patch.completed_at = completedAt.toISOString();
    } else {
      patch.completed_at = null;
    }
    patch.cancelled_at = to === 'cancelled' ? new Date().toISOString() : null;

    // Guard on the status we read, so two people moving the same order at once
    // can't both succeed from a stale view of it.
    const { data, error } = await db
      .from('b2b_orders')
      .update(patch)
      .eq('id', id)
      .eq('status', from)
      .select('id');
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new ConflictException('This order was changed by someone else. Refresh and try again.');
    }

    await this.activityLog.log({
      action: 'status_change',
      entityType: 'b2b_order',
      entityId: id,
      adminId,
      changes: {
        order_number: existing.order_number,
        from,
        to,
        completed_at: patch.completed_at,
      },
    });

    return this.getOrder(id);
  }

  private cleanLines(lines: B2bCostLineDto[]): (B2bCostLine & { label: string })[] {
    return lines.map((l) => ({ label: l.label.trim(), kind: l.kind, amount: l.amount }));
  }

  private async saveFinancials(
    orderId: string,
    units: number,
    unitPrice: number,
    totalCost: number,
    lines: { label: string; kind: string; amount: number }[],
  ) {
    const { error } = await this.supabase.getAdminClient().rpc('set_b2b_order_financials', {
      p_order_id: orderId,
      p_units: units,
      p_unit_price: unitPrice,
      p_total_cost: totalCost,
      p_lines: lines.map(({ label, kind, amount }) => ({ label, kind, amount })),
    });
    if (error) {
      throw new InternalServerErrorException(`Could not save the order's costs: ${error.message}`);
    }
  }

  private async assertClientUsable(clientId: string) {
    const { data, error } = await this.supabase
      .getAdminClient()
      .from('b2b_clients')
      .select('id, archived_at')
      .eq('id', clientId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new BadRequestException('Client not found');
    if (data.archived_at) throw new BadRequestException('This client is archived. Restore it first.');
  }

  private assertTimeline(start: string | null, delivery: string | null) {
    if (start && delivery && delivery.slice(0, 10) < start.slice(0, 10)) {
      throw new BadRequestException('Expected delivery cannot be before the expected start');
    }
  }

  // ─── Summary ───────────────────────────────────────────────────────────────

  private allOrderStats(): Promise<OrderStatsRow[]> {
    const db = this.supabase.getAdminClient();
    return fetchAll<OrderStatsRow>((a, b) =>
      db.from('b2b_orders').select(ORDER_STATS_SELECT).order('created_at').range(a, b),
    );
  }

  /**
   * Headline figures for the B2B page. Revenue, units and margin cover orders
   * completed inside the window (by completion date); pipeline, overdue and
   * client counts describe the business as it stands now.
   */
  async getSummary(query: B2bSummaryQueryDto) {
    const db = this.supabase.getAdminClient();
    const to = query.to ?? new Date().toISOString();
    const from = query.from ?? null;

    const [orders, { count: totalClients, error: clientsError }] = await Promise.all([
      this.allOrderStats(),
      db.from('b2b_clients').select('id', { count: 'exact', head: true }).is('archived_at', null),
    ]);
    if (clientsError) throw clientsError;

    const completedBetween = (start: string | null, end: string) =>
      orders.filter(
        (o) =>
          o.status === 'completed' &&
          !!o.completed_at &&
          (!start || o.completed_at >= start) &&
          o.completed_at <= end,
      );

    const totals = (rows: OrderStatsRow[]) => {
      const revenue = rows.reduce((s, o) => s + num(o.revenue), 0);
      const grossProfit = rows.reduce((s, o) => s + num(o.gross_profit), 0);
      return {
        revenue: round2(revenue),
        totalCost: round2(rows.reduce((s, o) => s + num(o.total_cost), 0)),
        grossProfit: round2(grossProfit),
        units: rows.reduce((s, o) => s + (o.units ?? 0), 0),
        orders: rows.length,
        averageOrderValue: rows.length > 0 ? round2(revenue / rows.length) : 0,
        marginPct: revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : null,
      };
    };

    const current = completedBetween(from, to);

    // The previous window is the same length, ending 1ms before this one starts.
    let previous: ReturnType<typeof totals> | null = null;
    if (from) {
      const span = new Date(to).getTime() - new Date(from).getTime();
      const prevTo = new Date(new Date(from).getTime() - 1).toISOString();
      const prevFrom = new Date(new Date(from).getTime() - span).toISOString();
      previous = totals(completedBetween(prevFrom, prevTo));
    }

    // On time = delivered on or before the promised date, among orders that had one.
    const measured = current.filter((o) => o.expected_delivery_date);
    const onTime = measured.filter(
      (o) => o.completed_at!.slice(0, 10) <= o.expected_delivery_date!,
    ).length;

    const open = orders.filter((o) => B2B_OPEN_STATUSES.includes(o.status));
    const overdue = open.filter(
      (o) => o.expected_delivery_date && o.expected_delivery_date < today(),
    ).length;

    const activeClients = new Set([
      ...open.map((o) => o.client_id),
      ...current.map((o) => o.client_id),
    ]).size;

    return {
      period: { from, to },
      ...totals(current),
      previous,
      onTime: {
        rate: measured.length > 0 ? Math.round((onTime / measured.length) * 1000) / 10 : null,
        onTime,
        measured: measured.length,
      },
      pipeline: {
        orders: open.length,
        units: open.reduce((s, o) => s + (o.units ?? 0), 0),
        revenue: round2(open.reduce((s, o) => s + num(o.revenue), 0)),
        byStatus: Object.fromEntries(
          B2B_OPEN_STATUSES.map((s) => [s, open.filter((o) => o.status === s).length]),
        ),
      },
      overdue,
      clients: { total: totalClients ?? 0, active: activeClients },
    };
  }
}
