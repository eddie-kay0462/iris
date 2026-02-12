# **IRIS MVP: 6-Week Implementation Plan**

**Project Duration:** 6 weeks (42 days)
**Team Size:** 2 developers (1 Frontend, 1 Backend)
**Focus:** Must-Have MVP Features (Phase 1)

---

## **🎯 MVP Scope (Must-Have Features)**

### **Core Requirements**

* **FR1:** Multi-Channel Sales Integration
* **FR2:** Integrated Inventory Management
* **FR3:** Local Payment Gateway Integration
* **FR7:** Role-Based Access Control
* **NFR2:** Reliability and Availability
* **NFR4:** Security and Data Protection

### **Tech Stack**

* **Frontend:** Next.js 14+, React, TailwindCSS, TypeScript
* **Backend:** Next.js API Routes, Supabase (PostgreSQL), TypeScript
* **Payment:** Paystack, Flutterwave
* **Deployment:** Vercel (frontend), Supabase Cloud (database)
* **State Management:** React Context/Zustand
* **Forms:** React Hook Form + Zod validation

---

## **📋 Weekly Breakdown**

# **WEEK 1: Foundation & Authentication**

**Theme:** Project setup, authentication, and basic infrastructure

## **Backend Developer Tasks**

### **Day 1-2: Environment & Database Setup**

**Deliverables:**

- [ ] Initialize Next.js project with TypeScript
- [ ] Configure Supabase project and connection
- [ ] Import `iris_new_schema.sql` into Supabase
- [ ] Set up environment variables (.env.local, .env.production)
- [ ] Configure Supabase client with proper types
- [ ] Create database type generation script (`npm run db:types`)

**Files to Create:**

```
/lib/supabase/
  ├── client.ts          # Browser client
  ├── server.ts          # Server-side client
  └── middleware.ts      # Auth middleware
/types/
  └── database.types.ts  # Auto-generated from schema
```

**Code Example:**

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createClient = () => {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}
```

### **Day 3-4: Authentication API Routes**

**Deliverables:**

- [ ] Implement auth API routes using Supabase Auth
- [ ] Create user registration endpoint
- [ ] Create login/logout endpoints
- [ ] Implement password reset flow
- [ ] Create profile management endpoints
- [ ] Set up RLS policies for profiles table
- [ ] Write unit tests for auth flows

**API Routes to Create:**

```
/app/api/auth/
  ├── signup/route.ts
  ├── login/route.ts
  ├── logout/route.ts
  ├── reset-password/route.ts
  └── callback/route.ts
/app/api/profile/
  └── route.ts
```

**Key Implementation:**

```typescript
// app/api/auth/signup/route.ts
export async function POST(request: Request) {
  const { email, password, fullName, phone } = await request.json()
  const supabase = createClient()

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  // Create profile
  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user!.id,
    email,
    full_name: fullName,
    phone,
    role: 'public',
  })

  return NextResponse.json({ user: authData.user })
}
```

### **Day 5: Role-Based Access Control (RBAC)**

**Deliverables:**

- [ ] Create role checking utility functions
- [ ] Implement admin middleware
- [ ] Set up RLS policies for role-based access
- [ ] Create role assignment API (admin only)
- [ ] Document role permissions matrix

**Files to Create:**

```
/lib/rbac/
  ├── permissions.ts     # Role definitions
  ├── middleware.ts      # RBAC middleware
  └── utils.ts          # Helper functions
```

**Permission Matrix:**

```typescript
export const PERMISSIONS = {
  public: ['view_products', 'create_order', 'view_own_orders'],
  staff: ['manage_orders', 'update_inventory', 'view_analytics'],
  manager: ['manage_products', 'manage_staff', 'view_reports'],
  admin: ['*'], // All permissions
}
```

---

## **Frontend Developer Tasks**

### **Day 1-2: Project Structure & UI Foundation**

**Deliverables:**

- [ ] Set up Next.js project structure
- [ ] Configure TailwindCSS with custom theme
- [ ] Create design system components (Button, Input, Card, etc.)
- [ ] Set up routing structure
- [ ] Configure TypeScript paths and aliases
- [ ] Install and configure necessary dependencies

**Dependencies to Install:**

```bash
npm install @supabase/ssr @supabase/supabase-js
npm install react-hook-form zod @hookform/resolvers
npm install lucide-react # Icons
npm install sonner # Toast notifications
npm install zustand # State management
```

**Folder Structure:**

```
/app/
  ├── (auth)/
  │   ├── login/
  │   ├── signup/
  │   └── reset-password/
  ├── (dashboard)/
  │   ├── layout.tsx
  │   ├── products/
  │   ├── orders/
  │   └── inventory/
  └── (storefront)/
      ├── page.tsx
      └── products/
/components/
  ├── ui/              # Shadcn-style components
  ├── forms/
  └── layout/
```

### **Day 3-4: Authentication UI**

**Deliverables:**

- [ ] Build Login page with form validation
- [ ] Build Signup page with form validation
- [ ] Build Password Reset page
- [ ] Create auth state management (Zustand/Context)
- [ ] Implement protected route wrapper
- [ ] Add loading states and error handling
- [ ] Create user profile edit page

**Key Components:**

```typescript
// components/forms/LoginForm.tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    // Handle response
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  )
}
```

### **Day 5: Dashboard Layout & Navigation**

**Deliverables:**

- [ ] Create responsive dashboard layout
- [ ] Build navigation sidebar with role-based menu items
- [ ] Implement top navigation bar with user menu
- [ ] Create breadcrumb navigation
- [ ] Add mobile responsive navigation
- [ ] Implement role-based route protection

**Components:**

```
/components/layout/
  ├── DashboardLayout.tsx
  ├── Sidebar.tsx
  ├── Topbar.tsx
  └── ProtectedRoute.tsx
```

---

## **🔄 End of Week 1 Checkpoint**

**Sprint Review Meeting:**

* Demo authentication flow (signup, login, logout)
* Show dashboard layout with role-based navigation
* Review code quality and test coverage
* Confirm database setup and RLS policies
* Plan any adjustments for Week 2

---

# **WEEK 2: Product & Inventory Management**

**Theme:** Core catalog and inventory features

## **Backend Developer Tasks**

### **Day 1-2: Product Management API**

**Deliverables:**

- [ ] Create product CRUD endpoints
- [ ] Implement product variant management
- [ ] Build product search and filtering
- [ ] Create product image upload handling
- [ ] Implement product publishing workflow
- [ ] Add product validation middleware

**API Routes:**

```
/app/api/products/
  ├── route.ts              # GET (list), POST (create)
  ├── [id]/route.ts         # GET, PUT, DELETE
  ├── [id]/variants/route.ts
  ├── [id]/images/route.ts
  └── search/route.ts
```

**Key Endpoint:**

```typescript
// app/api/products/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const gender = searchParams.get('gender')
  
  const supabase = createClient()
  
  let query = supabase
    .from('products')
    .select(`
      *,
      product_variants (*),
      product_images (*)
    `, { count: 'exact' })
    .eq('published', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (gender) query = query.eq('gender', gender)

  const { data, error, count } = await query

  return NextResponse.json({
    products: data,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil((count || 0) / limit),
    },
  })
}
```

### **Day 3-4: Inventory Management API**

**Deliverables:**

- [ ] Create inventory tracking endpoints
- [ ] Implement inventory movement logging
- [ ] Build low stock alert system
- [ ] Create inventory adjustment endpoints
- [ ] Implement automatic inventory updates on order
- [ ] Add inventory reporting endpoints

**API Routes:**

```
/app/api/inventory/
  ├── route.ts                # Get inventory overview
  ├── [variantId]/route.ts    # Get/Update specific variant inventory
  ├── movements/route.ts      # Log movements
  ├── alerts/route.ts         # Low stock alerts
  └── adjust/route.ts         # Manual adjustments
```

**Inventory Update Logic:**

```typescript
// app/api/inventory/adjust/route.ts
export async function POST(request: Request) {
  const { variantId, quantityChange, reason, notes } = await request.json()
  const supabase = createClient()

  // Get current inventory
  const { data: variant } = await supabase
    .from('product_variants')
    .select('inventory_quantity')
    .eq('id', variantId)
    .single()

  const newQuantity = variant.inventory_quantity + quantityChange

  // Update variant inventory
  await supabase
    .from('product_variants')
    .update({ inventory_quantity: newQuantity })
    .eq('id', variantId)

  // Trigger logs via database trigger (already in schema)
  
  return NextResponse.json({ success: true, newQuantity })
}
```

### **Day 5: Collections & Attributes API**

**Deliverables:**

- [ ] Create collections management endpoints
- [ ] Build attributes and attribute values API
- [ ] Implement collection-product associations
- [ ] Create attribute filtering for products

**API Routes:**

```
/app/api/collections/
  ├── route.ts
  ├── [id]/route.ts
  └── [id]/products/route.ts
/app/api/attributes/
  ├── route.ts
  └── values/route.ts
```

---

## **Frontend Developer Tasks**

### **Day 1-2: Product Catalog UI (Storefront)**

**Deliverables:**

- [ ] Build product listing page with pagination
- [ ] Create product card component
- [ ] Implement product filtering (gender, price, etc.)
- [ ] Add product search functionality
- [ ] Build product detail page
- [ ] Create variant selector component (size, color)
- [ ] Add product image gallery

**Key Components:**

```
/app/(storefront)/
  └── products/
      ├── page.tsx              # Product listing
      └── [handle]/page.tsx     # Product detail
/components/storefront/
  ├── ProductCard.tsx
  ├── ProductGrid.tsx
  ├── ProductFilters.tsx
  ├── ProductDetail.tsx
  ├── VariantSelector.tsx
  └── ImageGallery.tsx
```

**Product Listing:**

```typescript
// app/(storefront)/products/page.tsx
export default async function ProductsPage({ searchParams }) {
  const products = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products?${new URLSearchParams(searchParams)}`)
    .then(res => res.json())

  return (
    <div className="container mx-auto px-4 py-8">
      <ProductFilters />
      <ProductGrid products={products.products} />
      <Pagination pagination={products.pagination} />
    </div>
  )
}
```

### **Day 3-4: Product Management UI (Admin Dashboard)**

**Deliverables:**

- [ ] Build admin product list view with actions
- [ ] Create product create/edit form
- [ ] Implement variant management interface
- [ ] Build image upload component with preview
- [ ] Add bulk actions (publish, delete)
- [ ] Create product status indicators

**Components:**

```
/app/(dashboard)/products/
  ├── page.tsx              # Product list
  ├── new/page.tsx          # Create product
  └── [id]/edit/page.tsx    # Edit product
/components/dashboard/products/
  ├── ProductForm.tsx
  ├── VariantManager.tsx
  ├── ImageUploader.tsx
  └── ProductTable.tsx
```

**Product Form:**

```typescript
// components/dashboard/products/ProductForm.tsx
const productSchema = z.object({
  title: z.string().min(1),
  handle: z.string().min(1),
  description: z.string(),
  base_price: z.number().positive(),
  gender: z.enum(['men', 'women', 'unisex']),
  product_type: z.string(),
  // ... other fields
})

export function ProductForm({ initialData, mode = 'create' }) {
  const form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: initialData,
  })

  const onSubmit = async (data) => {
    const endpoint = mode === 'create' 
      ? '/api/products'
      : `/api/products/${initialData.id}`
    
    await fetch(endpoint, {
      method: mode === 'create' ? 'POST' : 'PUT',
      body: JSON.stringify(data),
    })
  }

  return <form>{/* Form fields */}</form>
}
```

### **Day 5: Inventory Management UI**

**Deliverables:**

- [ ] Build inventory overview dashboard
- [ ] Create inventory adjustment form
- [ ] Display low stock alerts
- [ ] Build inventory movement history view
- [ ] Add stock level indicators
- [ ] Implement bulk inventory updates

**Components:**

```
/app/(dashboard)/inventory/
  └── page.tsx
/components/dashboard/inventory/
  ├── InventoryTable.tsx
  ├── StockAdjustment.tsx
  ├── LowStockAlerts.tsx
  └── MovementHistory.tsx
```

---

## **🔄 End of Week 2 Checkpoint**

* Demo product catalog (storefront + admin)
* Show inventory management features
* Test product creation and variant management
* Review API performance and data validation
* Verify RLS policies for products/inventory

---

# **WEEK 3: Shopping Cart & Order Management**

**Theme:** E-commerce functionality and order processing

## **Backend Developer Tasks**

### **Day 1-2: Shopping Cart API**

**Deliverables:**

- [ ] Create cart session management
- [ ] Implement add/remove/update cart items
- [ ] Build cart calculation logic (subtotal, tax, shipping)
- [ ] Create cart validation (stock availability)
- [ ] Implement cart persistence for logged-in users
- [ ] Add cart abandonment tracking

**API Routes:**

```
/app/api/cart/
  ├── route.ts           # GET, POST (add item)
  ├── items/[id]/route.ts # PUT (update), DELETE
  ├── clear/route.ts
  └── validate/route.ts
```

**Cart Logic:**

```typescript
// lib/cart/utils.ts
export function calculateCartTotals(items: CartItem[]) {
  const subtotal = items.reduce((sum, item) => 
    sum + (item.price * item.quantity), 0
  )
  const shipping = calculateShipping(subtotal)
  const tax = calculateTax(subtotal)
  const total = subtotal + shipping + tax

  return { subtotal, shipping, tax, total }
}
```

### **Day 3-5: Order Management API**

**Deliverables:**

- [ ] Create order creation endpoint
- [ ] Implement order status workflow
- [ ] Build order history retrieval
- [ ] Create order update endpoints (status, shipping)
- [ ] Implement inventory deduction on order
- [ ] Add order validation and error handling
- [ ] Create order status webhook handlers

**API Routes:**

```
/app/api/orders/
  ├── route.ts              # GET (list), POST (create)
  ├── [id]/route.ts         # GET, PUT
  ├── [id]/status/route.ts  # Update order status
  ├── [id]/items/route.ts   # Order items
  └── webhooks/
      └── status/route.ts   # External status updates
```

**Order Creation:**

```typescript
// app/api/orders/route.ts
export async function POST(request: Request) {
  const orderData = await request.json()
  const supabase = createClient()

  // Start transaction
  const { data: order, error } = await supabase.rpc('create_order_transaction', {
    user_id: orderData.userId,
    items: orderData.items,
    shipping_address: orderData.shippingAddress,
    payment_method: orderData.paymentMethod,
  })

  if (error) throw error

  // Deduct inventory for each item
  for (const item of orderData.items) {
    await supabase
      .from('product_variants')
      .update({ 
        inventory_quantity: supabase.raw('inventory_quantity - ?', [item.quantity])
      })
      .eq('id', item.variantId)
  }

  return NextResponse.json({ order })
}
```

---

## **Frontend Developer Tasks**

### **Day 1-2: Shopping Cart UI**

**Deliverables:**

- [ ] Build cart page with item list
- [ ] Create cart item component (quantity, remove)
- [ ] Implement cart summary with totals
- [ ] Add mini cart dropdown in header
- [ ] Create empty cart state
- [ ] Add cart item quantity controls
- [ ] Implement cart validation messages

**Components:**

```
/app/(storefront)/cart/
  └── page.tsx
/components/storefront/cart/
  ├── CartPage.tsx
  ├── CartItem.tsx
  ├── CartSummary.tsx
  ├── MiniCart.tsx
  └── EmptyCart.tsx
```

**Cart State Management:**

```typescript
// store/cartStore.ts
import create from 'zustand'
import { persist } from 'zustand/middleware'

interface CartStore {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (variantId: string) => void
  updateQuantity: (variantId: string, quantity: number) => void
  clearCart: () => void
}

export const useCart = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) => set((state) => ({
        items: [...state.items, item]
      })),
      // ... other methods
    }),
    { name: 'cart-storage' }
  )
)
```

### **Day 3-4: Checkout Flow**

**Deliverables:**

- [ ] Build multi-step checkout process
- [ ] Create shipping address form
- [ ] Implement order review page
- [ ] Add order confirmation page
- [ ] Create guest checkout option
- [ ] Implement form validation for checkout
- [ ] Add loading states during order creation

**Checkout Pages:**

```
/app/(storefront)/checkout/
  ├── page.tsx              # Shipping info
  ├── review/page.tsx       # Order review
  └── success/page.tsx      # Confirmation
/components/storefront/checkout/
  ├── CheckoutForm.tsx
  ├── ShippingForm.tsx
  ├── OrderReview.tsx
  └── OrderConfirmation.tsx
```

### **Day 5: Order Management UI (Admin)**

**Deliverables:**

- [ ] Build order list view with filters
- [ ] Create order detail page
- [ ] Implement order status update interface
- [ ] Add order search and filtering
- [ ] Create order export functionality
- [ ] Build order analytics widgets

**Components:**

```
/app/(dashboard)/orders/
  ├── page.tsx
  └── [id]/page.tsx
/components/dashboard/orders/
  ├── OrderTable.tsx
  ├── OrderDetail.tsx
  ├── OrderStatusUpdater.tsx
  └── OrderFilters.tsx
```

---

## **🔄 End of Week 3 Checkpoint**

* Demo complete shopping cart flow
* Show checkout process end-to-end
* Test order creation and inventory deduction
* Review order management interface
* Verify order status workflow

---

# **WEEK 4: Payment Integration**

**Theme:** Payment gateway integration (Paystack & Flutterwave)

## **Backend Developer Tasks**

### **Day 1-3: Paystack Integration**

**Deliverables:**

- [ ] Set up Paystack SDK and credentials
- [ ] Create payment initialization endpoint
- [ ] Implement payment verification webhook
- [ ] Build payment status tracking
- [ ] Create refund handling
- [ ] Implement currency conversion (GHS, NGN, USD, CAD)
- [ ] Add payment error handling

**API Routes:**

```
/app/api/payments/paystack/
  ├── initialize/route.ts
  ├── verify/route.ts
  └── webhooks/route.ts
```

**Payment Initialization:**

```typescript
// app/api/payments/paystack/initialize/route.ts
import { Paystack } from 'paystack-sdk'

const paystack = new Paystack(process.env.PAYSTACK_SECRET_KEY!)

export async function POST(request: Request) {
  const { orderId, amount, currency, email } = await request.json()

  const response = await paystack.transaction.initialize({
    email,
    amount: amount * 100, // Convert to kobo/cents
    currency,
    reference: `ORD-${orderId}-${Date.now()}`,
    callback_url: `${process.env.NEXT_PUBLIC_URL}/checkout/callback`,
    metadata: {
      order_id: orderId,
      custom_fields: [],
    },
  })

  // Save payment record
  const supabase = createClient()
  await supabase.from('payments').insert({
    order_id: orderId,
    amount,
    currency,
    provider: 'paystack',
    reference: response.data.reference,
    status: 'pending',
  })

  return NextResponse.json({
    authorization_url: response.data.authorization_url,
    reference: response.data.reference,
  })
}
```

**Webhook Handler:**

```typescript
// app/api/payments/paystack/webhooks/route.ts
import crypto from 'crypto'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('x-paystack-signature')

  // Verify webhook signature
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest('hex')

  if (hash !== signature) {
    return new Response('Invalid signature', { status: 401 })
  }

  const event = JSON.parse(body)

  if (event.event === 'charge.success') {
    const supabase = createClient()
    
    // Update payment status
    await supabase
      .from('payments')
      .update({ status: 'completed', completed_at: new Date() })
      .eq('reference', event.data.reference)

    // Update order status
    const orderId = event.data.metadata.order_id
    await supabase
      .from('orders')
      .update({ status: 'confirmed', payment_status: 'paid' })
      .eq('id', orderId)
  }

  return NextResponse.json({ received: true })
}
```

### **Day 4-5: Flutterwave Integration**

**Deliverables:**

- [ ] Set up Flutterwave SDK
- [ ] Create Flutterwave payment endpoints
- [ ] Implement Flutterwave webhook handling
- [ ] Build payment gateway selection logic
- [ ] Create unified payment interface
- [ ] Add payment reconciliation system

**API Routes:**

```
/app/api/payments/flutterwave/
  ├── initialize/route.ts
  ├── verify/route.ts
  └── webhooks/route.ts
```

**Gateway Abstraction:**

```typescript
// lib/payments/gateway.ts
export interface PaymentGateway {
  initialize(params: PaymentParams): Promise<PaymentResponse>
  verify(reference: string): Promise<VerificationResponse>
  refund(reference: string, amount: number): Promise<RefundResponse>
}

export class PaymentService {
  private gateways: Map<string, PaymentGateway>

  constructor() {
    this.gateways = new Map([
      ['paystack', new PaystackGateway()],
      ['flutterwave', new FlutterwaveGateway()],
    ])
  }

  async processPayment(gateway: string, params: PaymentParams) {
    const provider = this.gateways.get(gateway)
    if (!provider) throw new Error('Invalid gateway')
    return provider.initialize(params)
  }
}
```

---

## **Frontend Developer Tasks**

### **Day 1-2: Payment Gateway UI**

**Deliverables:**

- [ ] Build payment method selector
- [ ] Create Paystack payment modal integration
- [ ] Implement Flutterwave payment flow
- [ ] Add payment processing loading states
- [ ] Create payment success/failure pages
- [ ] Implement payment retry logic

**Components:**

```
/components/payments/
  ├── PaymentMethodSelector.tsx
  ├── PaystackButton.tsx
  ├── FlutterwaveButton.tsx
  ├── PaymentStatus.tsx
  └── PaymentCallback.tsx
```

**Paystack Integration:**

```typescript
// components/payments/PaystackButton.tsx
'use client'
import { PaystackButton as PaystackSDK } from 'react-paystack'

export function PaystackButton({ orderId, amount, email }) {
  const config = {
    email,
    amount: amount * 100,
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
    text: 'Pay with Paystack',
    onSuccess: (reference) => {
      // Verify payment
      fetch('/api/payments/paystack/verify', {
        method: 'POST',
        body: JSON.stringify({ reference: reference.reference }),
      })
    },
    onClose: () => {
      toast.error('Payment cancelled')
    },
  }

  return <PaystackSDK {...config} />
}
```

### **Day 3: Payment Callback Handling**

**Deliverables:**

- [ ] Build payment callback page
- [ ] Implement payment verification UI
- [ ] Create payment status polling
- [ ] Add redirect to order confirmation
- [ ] Handle payment errors gracefully

**Callback Page:**

```typescript
// app/(storefront)/checkout/callback/page.tsx
export default async function PaymentCallback({ searchParams }) {
  const { reference } = searchParams

  // Verify payment
  const response = await fetch(`/api/payments/verify?reference=${reference}`)
  const result = await response.json()

  if (result.status === 'success') {
    return <PaymentSuccess order={result.order} />
  } else {
    return <PaymentFailed error={result.error} />
  }
}
```

### **Day 4-5: Payment Management UI (Admin)**

**Deliverables:**

- [ ] Build payment transactions list
- [ ] Create payment detail view
- [ ] Implement payment reconciliation interface
- [ ] Add payment refund functionality
- [ ] Create payment analytics dashboard
- [ ] Build payment export functionality

**Components:**

```
/app/(dashboard)/payments/
  ├── page.tsx
  └── [id]/page.tsx
/components/dashboard/payments/
  ├── PaymentTable.tsx
  ├── PaymentDetail.tsx
  ├── RefundModal.tsx
  └── PaymentAnalytics.tsx
```

---

## **🔄 End of Week 4 Checkpoint**

* Demo complete payment flow with Paystack
* Show Flutterwave integration
* Test webhook handling
* Review payment reconciliation
* Verify multi-currency support

---

# **WEEK 5: Analytics & Reporting**

**Theme:** Business intelligence and data visualization

## **Backend Developer Tasks**

### **Day 1-2: Analytics Data API**

**Deliverables:**

- [ ] Create sales analytics endpoints
- [ ] Build inventory analytics API
- [ ] Implement customer analytics
- [ ] Create product performance metrics
- [ ] Build date range filtering
- [ ] Add data aggregation functions

**API Routes:**

```
/app/api/analytics/
  ├── sales/route.ts
  ├── inventory/route.ts
  ├── customers/route.ts
  ├── products/route.ts
  └── overview/route.ts
```

**Sales Analytics:**

```typescript
// app/api/analytics/sales/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const groupBy = searchParams.get('group_by') || 'day'

  const supabase = createClient()

  // Total sales
  const { data: totalSales } = await supabase
    .from('orders')
    .select('total_amount')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .eq('status', 'delivered')

  // Sales by time period
  const { data: salesByPeriod } = await supabase
    .rpc('get_sales_by_period', {
      start_date: startDate,
      end_date: endDate,
      period: groupBy,
    })

  // Top selling products
  const { data: topProducts } = await supabase
    .from('order_items')
    .select(`
      product_id,
      products(title),
      quantity:quantity.sum(),
      revenue:price.sum()
    `)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('revenue', { ascending: false })
    .limit(10)

  return NextResponse.json({
    totalSales: totalSales?.reduce((sum, o) => sum + o.total_amount, 0),
    salesByPeriod,
    topProducts,
  })
}
```

### **Day 3-4: Report Generation**

**Deliverables:**

- [ ] Create PDF report generation
- [ ] Build CSV export functionality
- [ ] Implement scheduled reports
- [ ] Create email report delivery
- [ ] Add custom report builder

**API Routes:**

```
/app/api/reports/
  ├── generate/route.ts
  ├── export/route.ts
  └── schedule/route.ts
```

**CSV Export:**

```typescript
// app/api/reports/export/route.ts
import { stringify } from 'csv-stringify/sync'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') // 'orders', 'products', etc.

  const supabase = createClient()
  const { data } = await supabase.from(type).select('*')

  const csv = stringify(data, {
    header: true,
    columns: Object.keys(data[0]),
  })

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${type}-${Date.now()}.csv"`,
    },
  })
}
```

### **Day 5: Performance Optimization**

**Deliverables:**

- [ ] Implement database query optimization
- [ ] Add caching layer (Redis/Vercel KV)
- [ ] Create database indexes for common queries
- [ ] Implement API response caching
- [ ] Add query result pagination

---

## **Frontend Developer Tasks**

### **Day 1-3: Analytics Dashboard**

**Deliverables:**

- [ ] Build main analytics dashboard
- [ ] Create sales charts (line, bar, pie)
- [ ] Implement inventory metrics display
- [ ] Add customer analytics widgets
- [ ] Create date range picker
- [ ] Build metric comparison cards
- [ ] Add real-time data updates

**Components:**

```
/app/(dashboard)/analytics/
  └── page.tsx
/components/dashboard/analytics/
  ├── SalesChart.tsx
  ├── InventoryMetrics.tsx
  ├── CustomerInsights.tsx
  ├── ProductPerformance.tsx
  ├── MetricCard.tsx
  └── DateRangePicker.tsx
```

**Chart Integration:**

```typescript
// components/dashboard/analytics/SalesChart.tsx
'use client'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

export function SalesChart({ data }) {
  const chartData = {
    labels: data.map(d => d.date),
    datasets: [
      {
        label: 'Sales',
        data: data.map(d => d.amount),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
      },
    ],
  }

  return <Line data={chartData} />
}
```

### **Day 4-5: Reports & Export UI**

**Deliverables:**

- [ ] Build report generation interface
- [ ] Create report preview component
- [ ] Implement CSV/PDF export buttons
- [ ] Add scheduled report configuration
- [ ] Create report history view
- [ ] Build custom report builder

**Components:**

```
/app/(dashboard)/reports/
  ├── page.tsx
  ├── new/page.tsx
  └── [id]/page.tsx
/components/dashboard/reports/
  ├── ReportBuilder.tsx
  ├── ReportPreview.tsx
  ├── ExportButton.tsx
  └── ScheduleReportModal.tsx
```

---

## **🔄 End of Week 5 Checkpoint**

* Demo analytics dashboard
* Show report generation
* Test data export functionality
* Review chart visualizations
* Verify data accuracy

---

# **WEEK 6: Testing, Polish & Deployment**

**Theme:** Quality assurance and production readiness

## **Backend Developer Tasks**

### **Day 1-2: Testing & Bug Fixes**

**Deliverables:**

- [ ] Write API integration tests
- [ ] Create database seed scripts
- [ ] Test payment webhooks thoroughly
- [ ] Verify RLS policies
- [ ] Fix critical bugs
- [ ] Add error logging (Sentry)

**Test Structure:**

```
/tests/
  ├── api/
  │   ├── products.test.ts
  │   ├── orders.test.ts
  │   ├── payments.test.ts
  │   └── inventory.test.ts
  ├── integration/
  │   └── order-flow.test.ts
  └── utils/
      └── test-helpers.ts
```

**Example Test:**

```typescript
// tests/api/products.test.ts
import { describe, it, expect } from 'vitest'

describe('Products API', () => {
  it('should create a new product', async () => {
    const response = await fetch('/api/products', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Product',
        handle: 'test-product',
        base_price: 100,
      }),
    })

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.product).toBeDefined()
  })
})
```

### **Day 3: Database Optimization**

**Deliverables:**

- [ ] Add missing database indexes
- [ ] Optimize slow queries
- [ ] Set up database backups
- [ ] Configure connection pooling
- [ ] Create database migration scripts

**Indexes to Add:**

```sql
-- Add indexes for common queries
CREATE INDEX idx_products_published ON products(published) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_gender ON products(gender) WHERE published = true;
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_inventory_movements_variant ON inventory_movements(variant_id);
```

### **Day 4-5: Production Setup**

**Deliverables:**

- [ ] Set up production environment variables
- [ ] Configure Vercel deployment
- [ ] Set up Supabase production database
- [ ] Configure custom domain
- [ ] Set up SSL certificates
- [ ] Configure environment secrets
- [ ] Set up monitoring (Vercel Analytics)

---

## **Frontend Developer Tasks**

### **Day 1-2: UI Polish & Responsiveness**

**Deliverables:**

- [ ] Fix UI bugs and inconsistencies
- [ ] Ensure mobile responsiveness across all pages
- [ ] Add loading skeletons
- [ ] Implement proper error boundaries
- [ ] Add toast notifications for user actions
- [ ] Optimize image loading (next/image)
- [ ] Test across browsers (Chrome, Safari, Firefox)

**Error Boundary:**

```typescript
// components/ErrorBoundary.tsx
'use client'
import { Component, ReactNode } from 'react'

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h1>Something went wrong</h1>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
```

### **Day 3: Performance Optimization**

**Deliverables:**

- [ ] Implement code splitting
- [ ] Add lazy loading for components
- [ ] Optimize bundle size
- [ ] Add service worker for offline support
- [ ] Implement image optimization
- [ ] Add prefetching for critical routes

**Bundle Analysis:**

```bash
# Add to package.json scripts
"analyze": "ANALYZE=true next build"
```

### **Day 4: User Testing & Feedback**

**Deliverables:**

- [ ] Conduct user acceptance testing (UAT)
- [ ] Create user documentation
- [ ] Build onboarding flow
- [ ] Add help tooltips
- [ ] Create video tutorials
- [ ] Gather feedback and prioritize fixes

### **Day 5: Final Deployment**

**Deliverables:**

- [ ] Deploy to production
- [ ] Verify all features in production
- [ ] Test payment flows in production
- [ ] Configure analytics tracking
- [ ] Set up error monitoring
- [ ] Create deployment checklist

---

## **🔄 End of Week 6 Final Review**

* Full system demo
* Production deployment verification
* Documentation review
* Performance metrics check
* User acceptance sign-off

---

## **📊 Success Metrics**

### **Technical Metrics**

- [ ] All MVP features implemented and tested
- [ ] Test coverage > 70%
- [ ] Page load time < 3 seconds
- [ ] Mobile responsiveness score > 90
- [ ] Zero critical security vulnerabilities

### **Business Metrics**

- [ ] Complete order flow functional (storefront → payment → fulfillment)
- [ ] Inventory management operational
- [ ] Payment gateways integrated and tested
- [ ] Admin dashboard fully functional
- [ ] Analytics and reporting working

---

## **🚨 Risk Mitigation**

### **Technical Risks**

1. **Payment Integration Delays**

   * Mitigation: Start payment integration early (Week 4)
   * Have sandbox environments ready

2. **Database Performance Issues**

   * Mitigation: Regular query optimization reviews
   * Load testing in Week 5

3. **Scope Creep**

   * Mitigation: Strict adherence to Must-Have features only
   * Log "nice-to-have" features for Phase 2

### **Communication**

* Daily stand-ups (15 min)
* End-of-week demos and reviews
* Shared task board (GitHub Projects/Linear)
* Code reviews for all merges

---

## **📝 Daily Workflow**

### **Backend Developer**

1. Morning: Review API endpoints to build
2. Implement endpoint with validation
3. Write tests for new functionality
4. Document API in OpenAPI spec
5. Code review frontend integration needs

### **Frontend Developer**

1. Morning: Review UI components to build
2. Implement components with proper types
3. Connect to backend APIs
4. Test responsiveness and edge cases
5. Document component usage

### **End of Day (Both)**

* Commit and push code
* Update task board
* Document blockers
* Quick sync on next day's plan

---

## **🛠️ Development Tools**

### **Required Setup**

* **Version Control:** Git + GitHub
* **Package Manager:** npm/pnpm
* **IDE:** VS Code with extensions:
  * ESLint
  * Prettier
  * TypeScript
  * Tailwind CSS IntelliSense
* **API Testing:** Postman/Thunder Client
* **Database:** Supabase Studio (web UI)

### **Recommended Extensions**

* Error Lens
* GitLens
* Auto Rename Tag
* Import Cost

---

## **📚 Documentation Deliverables**

1. **API Documentation** (Backend)

   * OpenAPI/Swagger specification
   * Authentication guide
   * Webhook documentation

2. **Component Library** (Frontend)

   * Storybook (optional)
   * Component usage examples
   * Design system guide

3. **User Guide**

   * Admin user manual
   * Customer FAQs
   * Video walkthroughs

4. **Developer Handoff**

   * Setup instructions
   * Environment configuration
   * Deployment guide

---

## **✅ Definition of Done**

A feature is considered "done" when:

1. Code is written and follows style guide
2. Unit tests are written and passing
3. Integration tests pass
4. Code review is complete
5. Documentation is updated
6. Feature is deployed to staging
7. Manual testing is complete
8. Stakeholder approval received

---

**Good luck with your implementation! 🚀**

Remember: Focus on building a solid MVP. Better to have fewer features that work perfectly than many features that are buggy. You can always add more in Phase 2!