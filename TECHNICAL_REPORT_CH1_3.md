# IRIS — Integrated Retail Intelligence System
## Technical Report: Chapters 1–3

**Applied (Entrepreneurship) Project**
Submitted to the Department of Computer Science & Information Systems, Ashesi University,
in partial fulfilment of the requirements for the award of a Bachelor of Science degree.

| | |
|---|---|
| **Edward Ofosu-Mensah** | Computer Science |
| **Kirk Kudoto** | Computer Science |

---

## Declaration

We hereby declare that this Applied Project is the result of our own original work and that no part of it has been presented for another degree in this university or elsewhere.

Candidate's Signature: ................................................................ Candidate's Signature: ................................................................

Candidate's Name: ................................................................ Candidate's Name: ................................................................

Date: ................................................................ Date: ................................................................

I hereby declare that the preparation and presentation of this Applied Project was supervised in accordance with the guidelines on supervision of Applied Projects laid down by Ashesi University.

Supervisor's Signature: ................................................................................................

Supervisor's Name: ................................................................................................

Date: ................................................................................................

---

## Acknowledgement

We would like to express our deepest gratitude to God for the strength, clarity of mind, and perseverance that sustained us throughout the development of IRIS. This journey tested our limits and His grace carried us through every obstacle.

We extend heartfelt thanks to 1NRI Worldwide Ltd. for providing the operational context, real-world business challenges, and domain expertise that grounded this project in genuine purpose. Their openness in sharing how the business works — from how orders are managed to how customers discover products — shaped every design decision we made.

To our supervisor and to the Department of Computer Science & Information Systems at Ashesi University, thank you for the academic rigour and mentorship that guided the quality of this work. We are equally grateful to our peers and friends who gave honest feedback during our testing phase and helped us build something we are proud of.

Finally, to our families — thank you for your patience and unwavering support during the long nights and long weeks that this project demanded.

---

## Abstract

Small and medium-sized enterprises (SMEs) in the fashion sector operating in Sub-Saharan Africa face a fundamental operational challenge: their business data is fragmented across disconnected tools — WhatsApp for customer communication, Instagram for marketing, third-party payment processors, and manual spreadsheets for inventory. This fragmentation prevents business owners from deriving the cross-channel insights necessary for informed, data-driven decision making.

This report presents the design and development of IRIS (Integrated Retail Intelligence System), a custom e-commerce and ERP platform built specifically for 1NRI Worldwide Ltd., a Ghanaian fashion SME. IRIS replaces the company's collection of ad-hoc digital tools with a unified platform that consolidates product management, order processing, inventory tracking, customer relationships, and business analytics into a single system.

The platform comprises four integrated components: a customer-facing e-commerce storefront, a business management admin dashboard, a RESTful NestJS backend API, and a Python-based machine learning recommendation engine.

The system integrates Paystack for payment processing and LetsFish for transactional SMS communications. A hybrid recommendation engine combining collaborative filtering with text and image similarity provides personalised product discovery for customers. A role-based access control system governs staff access to administrative functions across three tiers: admin, manager, and staff.

This report describes the requirements, architectural design, and technical implementation of the IRIS platform, demonstrating how a contextually designed digital solution can address the specific operational realities of African fashion SMEs.

---

## Table of Contents

- [Chapter 1: Introduction](#chapter-1-introduction)
  - [1.1 Problem Overview](#11-problem-overview)
  - [1.2 Problem Background](#12-problem-background)
  - [1.3 Related Work](#13-related-work)
  - [1.4 End Product](#14-end-product)
- [Chapter 2: Requirements Analysis](#chapter-2-requirements-analysis)
  - [2.1 Introduction](#21-introduction)
  - [2.2 Stakeholder Analysis](#22-stakeholder-analysis)
  - [2.3 Functional Requirements](#23-functional-requirements)
  - [2.4 Non-Functional Requirements](#24-non-functional-requirements)
  - [2.5 Requirements Traceability](#25-requirements-traceability)
  - [2.6 Requirement Prioritisation](#26-requirement-prioritisation)
- [Chapter 3: System Architecture and Design](#chapter-3-system-architecture-and-design)
  - [3.1 Introduction](#31-introduction)
  - [3.2 Architectural Principles and Patterns](#32-architectural-principles-and-patterns)
  - [3.3 High-Level System Architecture](#33-high-level-system-architecture)
  - [3.4 Database Design](#34-database-design)
  - [3.5 Client-Server Architecture](#35-client-server-architecture)
  - [3.6 Authentication, Authorization, and Security](#36-authentication-authorization-and-security)
  - [3.7 Process Architecture](#37-process-architecture)
  - [3.8 Integration Architecture](#38-integration-architecture)
  - [3.9 Deployment Architecture](#39-deployment-architecture)
- [References](#references)
- [Appendices](#appendices)

---

# Chapter 1: Introduction

## 1.1 Problem Overview

Globally, the e-commerce landscape has experienced exponential growth. Tohidi et al. [1] provide evidence of a notable shift in consumer preferences towards online sales, driving the expansion of digital retail markets. Despite this, small to medium-sized enterprises (SMEs) in emerging markets — particularly in Africa — have faced significant barriers to digital transformation. These challenges are well-documented, as per the Trade and Development wing of the United Nations [2]. This disparity is especially pronounced in the fashion sector, where only 17% of SMEs achieve full digital tool adoption, compared to 54% of larger brands [3]. This technological divide creates competitive disadvantages for fashion SMEs when competing against larger, more established brands within sub-Saharan Africa.

Fashion SMEs operate in a data and technology-intensive environment. Their business operations span supply chain management for fabric sourcing, inventory control for managing stock, social media marketing for brand visibility, and e-commerce as a primary accessible sales channel. While these businesses rely on digital tools for each of these operations, the valuable data generated across these channels tends to be fragmented and siloed. As a result, combined insights that could drive data-driven decision-making remain inaccessible. Larger, more established brands are able to utilise Enterprise Resource Planning (ERP) systems — integrated software solutions designed to manage and automate core business functions including finance, supply chain, inventory, human resources, and customer relationship management [4].

For larger brands, comprehensive ERP solutions with seamless e-commerce integration have enabled holistic operational visibility [5]. However, for SMEs, adoption of such tools is far less common. Among the barriers to adoption, prohibitive costs, lack of localised solutions, inadequate technical support infrastructure, and limited integration with regional payment gateways stand out as the most significant [11, 23].

This paper presents the development of IRIS, an integrated e-commerce and ERP platform specifically designed for 1NRI Worldwide Ltd., a Ghanaian fashion SME. Our custom solution addresses data fragmentation by consolidating product management, inventory tracking, order processing, customer relationships, and business analytics into a single unified platform.

## 1.2 Problem Background

SMEs in the fashion sector face distinct operational challenges that differentiate them from traditional retail businesses. The fashion supply chain involves multiple stages: fabric and material sourcing, production coordination, quality control, inventory management, marketing through social media channels, and customer acquisition via e-commerce platforms. Each stage generates valuable data, yet this information remains siloed across disconnected systems [6].

Many fashion businesses in the African context rely on ad-hoc digital tools: WhatsApp Business for customer communication, Instagram and TikTok for brand marketing, third-party payment processors like Paystack for transactions, and spreadsheets or tools like QuickBooks for inventory management. Whilst these tools bring great value as standalone systems, owners of fashion SMEs are unable to derive the extent to which decisions made in one area drive outcomes in another — for example, how a marketing campaign correlates with inventory depletion, or how customer behaviour patterns should inform restocking decisions.

Data fragmentation represents the central challenge facing the average fashion SME seeking digital transformation. The success of e-commerce-based brands relies heavily on data-driven insights drawn from across all operational sections [7]. However, the tools at their disposal are often used disjointly, eliminating the possibility for a centralised pool of data from which business intelligence can be adequately generated and utilised. On the other hand, ERP systems available on the market are not targeted towards SMEs, but rather for larger businesses with dedicated, sizeable budgets.

For 1NRI Worldwide Ltd. specifically, this fragmentation manifests in several concrete ways: products and inventory are tracked in spreadsheets disconnected from actual sales, there is no unified view of who the customers are and what they have purchased, and there is no mechanism for building customer loyalty through structured programmes.

## 1.3 Related Work

### 1.3.1 E-commerce Analytics Platforms

The evolution of e-commerce analytics platforms has been pivotal in shaping the digital transformation of retail businesses globally. State-of-the-art solutions, such as Triple Whale, exemplify the integration of multi-channel data consolidation, advanced attribution modelling, and predictive analytics for inventory and customer management, serving over 50,000 brands worldwide [8]. These platforms enable businesses to optimise operations by aggregating data from diverse sources — ranging from sales channels and advertising platforms to inventory systems — into unified dashboards that facilitate actionable insights and strategic decision-making [8–10].

However, the adoption of such platforms in African markets faces significant challenges. High subscription costs, often exceeding the revenue thresholds of most African fashion SMEs, and a lack of integration with local payment systems and mobile money platforms limit their accessibility and utility [11–13]. African-focused digital platforms have emerged to address these gaps, offering tailored solutions that integrate with regional payment ecosystems and support local business models [11, 13]. For example, platforms like Oze provide SME analytics specifically designed for African entrepreneurs, while Jumia and other regional players have developed digital infrastructures that accommodate the unique needs of African e-commerce, including mobile money integration and localised logistics [12, 13, 11].

Recent research emphasises the significance of context-specific analytics and the necessity for platforms that cater to the operational realities of African SMEs, including lower average transaction values, informal business practices, and the prevalence of mobile-first commerce [11, 13, 14]. The proliferation of digital platforms in Africa is further supported by the rapid expansion of mobile money and fintech ecosystems, which have become critical enablers of e-commerce adoption and financial inclusion across the continent [11, 13, 15, 16].

### 1.3.2 Digital Transformation in Fashion

Digital transformation in the fashion industry is characterised by the adoption of technologies that enhance supply chain transparency, enable real-time inventory management, and support data-driven production planning [17–19]. Studies have shown that digital platforms facilitate operational agility, allowing fashion businesses to respond dynamically to shifting market demands and consumer preferences [17, 18, 20]. Key success factors include the integration of supply chain data, personalised marketing through customer data platforms, and the implementation of systems that support variant-level inventory management [17–20].

While much of the literature focuses on established fashion enterprises in developed markets, there is a growing body of research examining the digitalisation of African fashion supply chains. These studies underscore the importance of platforms that accommodate the unique characteristics of the fashion sector — such as seasonal product cycles, style and trend sensitivity, and the complexity of size and colour variants [17–20]. African fashion SMEs, in particular, benefit from digital solutions tailored to their operational contexts, including mobile-based inventory management, localised e-commerce platforms, and integration with regional logistics providers [11, 13, 21].

Empirical evidence from Nigeria and other African markets demonstrates that e-commerce adoption significantly enhances the profitability and competitiveness of fashion SMEs, provided that digital infrastructure and logistics are strategically integrated [21]. The emergence of platforms like Selar and the expansion of mobile money-driven commerce in countries such as Ghana, Kenya, and Nigeria further illustrate the transformative potential of digital technologies in the African fashion industry [11, 13, 15].

### 1.3.3 ERP Solutions for African Markets

The implementation of global ERP solutions in African markets has been extensively analysed, revealing persistent barriers related to technical support, integration with local financial systems, and regulatory compliance [22, 11, 23]. Platforms such as Microsoft Dynamics and Odoo, despite their comprehensive feature sets, often struggle to achieve widespread adoption among African SMEs due to misalignments with local business practices and infrastructural constraints [22, 11, 23].

A critical challenge is the limited availability of localised technical support, with most ERP vendors maintaining minimal physical presence on the continent, thereby necessitating reliance on remote assistance that may lack contextual understanding [11, 23]. Integration with African mobile money systems and regional banks remains limited, frequently requiring costly custom development and undermining the core value proposition of unified data management [11, 23]. Additionally, multi-currency functionality and compliance features are often designed for Western regulatory environments, necessitating significant customisation to address the complexities of cross-border African trade and informal exchange rates [11, 23].

Recent research advocates for the development of ERP solutions specifically architected for African SMEs, emphasising the need for platforms that integrate seamlessly with local payment ecosystems, support contextually appropriate workflows, and provide robust reporting tailored to regional operational realities [11, 23, 13]. The rise of African-focused digital platforms and the increasing adoption of mobile money-driven ERP functionalities signal a shift towards more contextually relevant solutions that address the unique operational realities of African businesses [11, 13, 15, 16].

Collectively, these findings highlight the necessity of specialised digital platforms that combine e-commerce and ERP capabilities, designed to meet the specific needs of fashion SMEs in Sub-Saharan Africa. Such platforms must address the shortcomings of global enterprise solutions by offering localised integration, affordable pricing models, and support for the diverse payment and regulatory environments prevalent across the continent [11, 13, 23, 21].

## 1.4 End Product

The end product is IRIS (Integrated Retail Intelligence System), a purpose-built e-commerce and business management platform developed for 1NRI Worldwide Ltd. The platform consolidates the company's previously fragmented operational tools — spreadsheets, third-party marketplaces, manual order tracking — into a single integrated system.

IRIS is comprised of four interconnected components:

**Customer-Facing E-commerce Storefront:** A server-side rendered web application that provides customers with a product browsing experience, including advanced filtering by gender, product type, and vendor, a shopping cart, and a checkout flow integrated with Paystack for payment processing.

**Business Management Admin Dashboard:** A separate web application accessible only to authorised staff, providing a comprehensive view of all business operations. The dashboard supports product management (create, edit, publish), order management (view, update status, export), inventory tracking with movement logs, and customer data access. The admin dashboard is governed by a role-based access control system with three staff roles: admin, manager, and staff — each with a defined set of permissions.

**RESTful Backend API:** A modular NestJS application serving both the customer storefront and the admin dashboard. The backend exposes REST endpoints for authentication, product catalogue operations, order management, inventory, payments, SMS communications, and product recommendations. It communicates with the Supabase database and serves as the orchestration layer for all business logic.

**Machine Learning Recommendation Engine:** A Python-based FastAPI service that provides personalised product recommendations to customers. The engine employs a hybrid approach combining collaborative filtering (based on purchase behaviour), text similarity (based on product descriptions via sentence embeddings), and image similarity (via CLIP image embeddings), weighted and combined via a FAISS nearest-neighbour index. For users without a purchase history, the engine falls back to a popularity-based model.

**Popup Sales (In-Person POS System):** A fully integrated point-of-sale module designed to support 1NRI's in-person popup events. Staff create and manage popup events, process walk-in customer orders (capturing items, discounts, and customer details), and accept multiple payment methods including cash, MTN Mobile Money (via Paystack's MoMo charge API), and split payments. The system handles the full payment lifecycle for MoMo payments — including OTP submission and payment verification — and supports order holds, cancellations, and partial or full refunds with automated inventory restoration and SMS confirmation to the customer. All popup sales feed into the same shared product catalogue and inventory, ensuring stock levels remain accurate across both online and in-person channels.

The platform integrates Paystack as its payment gateway, supporting online checkout for the storefront and direct Mobile Money charges for in-person popup orders. LetsFish, a pan-African communications API, handles transactional SMS (order confirmations, refund confirmations) and voice OTP calls. Transactional emails — including signup OTP verification and password reset links — are delivered via Resend, configured as the SMTP provider for the Supabase Auth email system. The entire platform is backed by Supabase, an open-source Backend-as-a-Service built on PostgreSQL, which provides the database, authentication, and row-level security infrastructure.

---

# Chapter 2: Requirements Analysis

## 2.1 Introduction

The requirement analysis for IRIS addresses the critical operational challenges facing fashion SMEs in Sub-Saharan Africa, particularly data fragmentation, inadequate business intelligence, and limited access to affordable, localised digital solutions. This chapter delineates both functional and non-functional requirements derived from stakeholder analysis, market research, and the specific operational needs of 1NRI Worldwide Ltd. as a representative fashion SME.

Requirements analysis forms the foundation of successful software development, particularly for enterprise systems like ERP platforms [23, 24]. Functional requirements define what a system must do and what its features and functions are, while non-functional requirements describe the general properties and quality attributes of a system [27]. For ERP systems specifically, gathering comprehensive requirements is crucial, as studies by Gartner indicate that the top reason for ERP implementation failure is a lack of understanding of these requirements [29].

The requirements framework is structured to ensure the platform delivers a unified solution that consolidates disparate data sources, provides actionable insights, and integrates seamlessly with the regional digital ecosystem. Each requirement directly addresses one or more of the key challenges identified in Chapter 1.

## 2.2 Stakeholder Analysis

The primary stakeholders for IRIS include:

- **Business Owners and Management:** Require comprehensive visibility into business operations, real-time analytics for strategic decision-making, and consolidated reporting across all business functions. Their needs centre on understanding sales trends, inventory performance, and overall business health through intuitive dashboards.

- **Operations Staff:** Need efficient tools for inventory management, order processing, and supply chain coordination. They require streamlined workflows that reduce manual data entry and facilitate seamless communication between procurement, production, and sales functions. The role-based access model must reflect the reality that different staff members require different levels of system access.

- **Marketing Personnel:** Require the ability to manage collections, launch limited-time promotional events (popup sales), and track customer engagement. Their tools must support the brand's strategy and community building.

- **Customers:** Expect a reliable, user-friendly e-commerce experience with support for local payment methods, order tracking capabilities, and responsive customer service. Their requirements include mobile-optimised interfaces.

## 2.3 Functional Requirements

Functional requirements define the specific capabilities and features IRIS must provide to address the operational needs of 1NRI Worldwide Ltd. Each requirement is mapped to the core problems of data fragmentation and limited digital integration identified in the problem background.

**FR1: Native E-commerce Storefront**
The platform must provide a fully functional customer-facing e-commerce interface supporting product browsing with filtering and search, product variant selection (size, colour, style combinations), shopping cart management, and a multi-step checkout process with integrated payment. The storefront must be the primary and authoritative sales channel, replacing ad-hoc tools.

**FR2: Integrated Inventory Management System**
The platform must provide comprehensive inventory tracking at the variant level, supporting fashion-specific attributes including size and colour. The system must automatically update inventory levels when sales occur and maintain an audit log of all stock movements, recording the quantity before and after each change, the type of movement, and the responsible staff member.

**FR3: Local Payment Gateway Integration**
The platform must integrate with Paystack, a major African payment processor, to handle customer payments. The integration must support one-time purchase payments with webhook-based payment confirmation to trigger order fulfilment.

**FR4: Business Management Dashboard**
The platform must provide a separate, role-gated administrative interface enabling authorised staff to manage all aspects of the business: product catalogue, orders, inventory, customer data, payment records, popup sales events, and system user accounts.

**FR5: Customer Relationship Management**
The platform must maintain comprehensive customer profiles aggregating data from all touchpoints, including purchase history and communication preferences. The admin dashboard must provide access to customer lists and detailed individual profiles.

**FR6: Role-Based Access Control and Multi-User Support**
The platform must support multiple administrative user accounts with granular permissions control. Three staff roles must be defined — admin, manager, and staff — each with a specific and non-overlapping set of permissions governing access to products, orders, customers, inventory, analytics, settings, and user management.

**FR7: SMS Notification System**
The platform must send transactional SMS messages to customers at key lifecycle events: order confirmation and refund confirmation. All sent messages must be logged with delivery status.

**FR8: Product Recommendations**
The platform must provide personalised product recommendations to customers. For authenticated customers with a purchase history, recommendations should be derived from their behavioural data. For new or guest users, recommendations should fall back to a popularity-based model. Similar product recommendations should also be available on individual product pages.

**FR9: Popup Sales — In-Person Point of Sale**
The platform must support the creation and management of in-person popup sales events. Staff must be able to create events, process walk-in customer orders by selecting products and variants from the shared catalogue, apply discounts, and capture payment via cash, Mobile Money (via Paystack MoMo charge), or split methods. The system must handle the full MoMo payment lifecycle (charge initiation, OTP submission, payment verification), support order holds, and process full or partial refunds with inventory restoration. All popup sales must draw from the same product catalogue and decrement the same inventory as the online store, ensuring stock consistency across channels.

**FR10: Transactional Email**
The platform must send transactional emails to customers at key events: signup OTP verification and password reset. Emails must be delivered reliably and must include appropriate security measures to prevent enumeration attacks.

## 2.4 Non-Functional Requirements

Non-functional requirements define the quality attributes and constraints that ensure the platform is viable, reliable, and sustainable for fashion SMEs operating in African markets.

**NFR1: Performance and Scalability**
The platform must maintain responsive performance under typical SME workloads. Server-side rendered pages must load within acceptable time frames under standard network conditions. The architecture must be capable of scaling as the business grows.

**NFR2: Reliability and Availability**
The platform must maintain high availability with minimal unplanned downtime. The data layer must implement backup and recovery capabilities to protect critical business data, including product catalogues, order histories, and customer information.

**NFR3: Mobile Responsiveness and Cross-Platform Compatibility**
The platform must provide fully functional interfaces optimised for mobile devices, recognising that mobile commerce dominates African e-commerce and that many SME owners and their customers primarily access digital services via smartphones. All user interfaces must be responsive across viewport sizes.

**NFR4: Security and Data Protection**
The platform must implement comprehensive security measures that protect customer payment information, business financial data, and proprietary information. This includes encrypted data transmission (HTTPS), JWT-based session management, row-level security policies on all sensitive database tables, input validation at both the API and frontend layers, and HMAC signature verification for all inbound payment webhooks.

**NFR5: Usability and User Experience**
The platform must prioritise intuitive user interfaces requiring minimal training, particularly for the admin dashboard used by operations staff who may not have deep technical proficiency. Guided workflows, clear feedback states, and consistent design language must be maintained across both the customer-facing and administrative interfaces.

**NFR6: Cost-Effectiveness and Pricing Model**
The platform's underlying infrastructure choices must favour open-source and consumption-based pricing models that are affordable for fashion SMEs, avoiding the prohibitive licensing costs of enterprise ERP solutions while maintaining comprehensive functionality.

**NFR7: Integration and Extensibility**
The platform must provide well-structured APIs enabling integration with third-party services, future feature additions, and customisation to accommodate evolving business needs without requiring core system modifications. The RESTful API must be designed with modularity to support future extension.

## 2.5 Requirements Traceability

The functional and non-functional requirements specified in this chapter directly address the core challenges identified in Chapter 1:

**Data Fragmentation:** FR1 (E-commerce Storefront), FR4 (Admin Dashboard), FR2 (Inventory), and FR5 (CRM) consolidate scattered data sources into unified repositories, eliminating the silos that prevent holistic business insight. All transactional data — sales, inventory movements, customer interactions — is stored in a single Supabase PostgreSQL database, queryable from both the storefront and the admin dashboard.

**Local Payment Integration:** FR3 (Paystack Integration) addresses the critical need for a payment solution trusted in the Ghanaian market. The Paystack integration handles one-time purchases with webhook-based confirmation ensuring orders are only fulfilled upon payment success.

**Communication with Customers:** FR7 (SMS Notification System) replaces ad-hoc WhatsApp messaging with automated, logged, and auditable transactional SMS communications. All messages are sent through the LetsFish API and logged in the database for audit purposes.

**Security and Access Control:** FR6 (RBAC) and NFR4 (Security) address the need for safe multi-user access to business data. The permissions matrix ensures that staff members can only access and modify data within their authorisation scope, reducing the risk of accidental or unauthorised data modification.

**Scalability of Recommendations:** FR8 (Product Recommendations) and NFR1 (Performance) address the opportunity to provide a personalised shopping experience comparable to larger platforms while ensuring system performance does not degrade as the product catalogue and customer base grow.

The subsequent chapters detail the system architecture, implementation approach, and validation methodologies, demonstrating how these requirements are fulfilled in the delivered IRIS platform.

## 2.6 Requirement Prioritisation

Using the MoSCoW method (Must Have, Should Have, Could Have, Won't Have), requirements are prioritised for the minimum viable product (MVP) and subsequent iterations [26, 29].

**Must Have (MVP — Phase 1):**
- FR1: Native E-commerce Storefront (core revenue channel)
- FR2: Integrated Inventory Management (fundamental operational need)
- FR3: Local Payment Gateway Integration (critical for customer transactions)
- FR4: Business Management Dashboard (operational necessity)
- FR6: Role-Based Access Control (essential for security and multi-user operation)
- NFR2: Reliability and Availability
- NFR4: Security and Data Protection

**Should Have (Phase 2):**
- FR5: Customer Relationship Management
- FR7: SMS Notification System
- FR8: Product Recommendations
- FR9: Popup Sales Management
- NFR1: Performance and Scalability optimisations
- NFR5: Usability and User Experience refinements

**Could Have (Phase 3):**
- Social commerce integrations (Instagram Shopping, WhatsApp Business API)
- FR Supply Chain and Procurement Management
- Multi-currency support (GHS, NGN, USD)
- NFR3: Advanced Mobile PWA features
- NFR7: Extensive third-party API extensibility

This phased approach ensured rapid delivery of core value to 1NRI Worldwide Ltd. while establishing a foundation for systematic feature expansion aligned with business growth.

---

# Chapter 3: System Architecture and Design

## 3.1 Introduction

This chapter presents the comprehensive system architecture and design for IRIS as it was built and delivered. The architecture is designed to address the requirements identified in Chapter 2, with particular emphasis on unifying data management, ensuring contextual appropriateness for an African fashion SME, and providing a scalable and secure foundation. The architecture prioritises modularity — enabling the four application components to be developed, deployed, and scaled independently — and maintainability, so that 1NRI's technical team or future developers can extend the platform without disrupting core functionality.

A key distinction from the initial architectural proposal is that IRIS was ultimately built as a four-component monorepo rather than a single Next.js application. The decision to separate the customer storefront, admin dashboard, and backend API into distinct applications was driven by security boundaries (admin routes require different session contexts than customer routes), scalability (each component can scale independently), and separation of concerns (the recommendation engine's Python stack is entirely isolated from the TypeScript applications).

## 3.2 Architectural Principles and Patterns

The platform's architecture is guided by the following core principles:

1. **Separation of Concerns:** The system is structured into four distinct applications (customer frontend, admin frontend, NestJS backend API, Python recommender), each with a clearly defined responsibility. This enables independent development, testing, and deployment of each component.

2. **API-First Design:** All business logic is exposed through well-defined RESTful endpoints on the NestJS backend. Both the customer storefront and the admin dashboard consume this API, ensuring that business logic is centralised and not duplicated across client applications.

3. **Data Centralisation:** A single Supabase PostgreSQL database serves as the authoritative data store for the entire platform. All components — customer frontend, admin dashboard, and the NestJS backend — interact with the same underlying database, eliminating data silos between operational and customer-facing contexts.

4. **Defence in Depth:** Security is enforced at multiple layers: JWT authentication at the API gateway, row-level security (RLS) policies at the database layer, role-based permission checks in the NestJS guards, and input validation via Zod (frontend) and class-validator (backend). No single layer of security is relied upon exclusively.

5. **Graceful Degradation:** Non-critical services, specifically the Python recommendation engine, are designed to degrade gracefully. If the recommender service is unavailable, the system falls back to popularity-based recommendations rather than failing the user's request.

## 3.3 High-Level System Architecture

IRIS employs a four-tier architecture with a separate machine learning microservice for recommendations.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                           │
│                                                                     │
│   ┌──────────────────────────┐  ┌──────────────────────────────┐   │
│   │  Customer Storefront     │  │   Admin Dashboard            │   │
│   │  Next.js 16 / React 19  │  │   Next.js 16 / React 19      │   │
│   │  Port: 3000              │  │   Port: 3001                 │   │
│   │                          │  │                              │   │
│   │  • Product browsing      │  │  • Product management        │   │
│   │  • Cart & checkout       │  │  • Order management          │   │
│   │  • Customer dashboard    │  │  • Inventory tracking        │   │
│   │  • Recommendations UI    │  │  • Customer data             │   │
│   └────────────┬─────────────┘  └──────────────┬───────────────┘   │
└────────────────┼────────────────────────────────┼───────────────────┘
                 │ REST / JSON (HTTPS)             │ REST / JSON (HTTPS)
                 ▼                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       APPLICATION LAYER                             │
│                                                                     │
│                  ┌──────────────────────────────┐                  │
│                  │   NestJS Backend API          │                  │
│                  │   TypeScript 5 / Port: 4000  │                  │
│                  │   Global prefix: /api         │                  │
│                  │                              │                  │
│                  │  Modules:                    │                  │
│                  │  • Auth          • Products  │                  │
│                  │  • Profile       • Inventory │                  │
│                  │  • Orders        • Payments  │                  │
│                  │  • Collections   • Settings  │                  │
│                  │  • SMS           • Reviews   │                  │
│                  │  • Newsletter    • Export    │                  │
│                  │  • PopupSales    • Comms     │                  │
│                  │  • Recommendations (proxy)   │                  │
│                  └──────────┬────────┬──────────┘                  │
└─────────────────────────────┼────────┼─────────────────────────────┘
                              │        │ HTTP (internal)
                              │        ▼
                              │  ┌─────────────────────────────┐
                              │  │  ML Recommendation Engine   │
                              │  │  Python / FastAPI           │
                              │  │                             │
                              │  │  • Collaborative filtering  │
                              │  │  • Text similarity (SBERT)  │
                              │  │  • Image similarity (CLIP)  │
                              │  │  • FAISS nearest-neighbour  │
                              │  │  • Cold-start fallback      │
                              │  └─────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                │
│                                                                     │
│               ┌──────────────────────────────────┐                 │
│               │        Supabase Cloud             │                 │
│               │   (PostgreSQL 14.1)               │                 │
│               │                                   │                 │
│               │  ┌──────────┐  ┌───────────────┐  │                 │
│               │  │PostgreSQL│  │ Supabase Auth │  │                 │
│               │  │Database  │  │ (JWT / email) │  │                 │
│               │  └──────────┘  └───────────────┘  │                 │
│               │  ┌──────────┐  ┌───────────────┐  │                 │
│               │  │  Row-    │  │  File Storage │  │                 │
│               │  │  Level   │  │ (product imgs)│  │                 │
│               │  │ Security │  └───────────────┘  │                 │
│               │  └──────────┘                     │                 │
│               └──────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────────────┘
```

**Figure 1: IRIS High-Level System Architecture**

### 3.3.1 Presentation Layer

The presentation layer consists of two independent Next.js 16 applications, both built with React 19 and TypeScript.

**Customer-Facing E-commerce Storefront (Port 3000):** A responsive web application optimised for both desktop and mobile devices. It supports product browsing, variant selection, shopping cart management, and Paystack-integrated checkout. Server-side rendering (SSR) is used for product and collection pages to ensure optimal load performance and search engine discoverability. Client-side state is managed with Zustand (shopping cart) and TanStack Query (server data fetching and caching).

**Business Management Admin Dashboard (Port 3001):** A separate web application accessible only to authenticated staff. It provides interfaces for product management, order management, inventory tracking, customer data viewing, payment records, popup sales administration, and system user/role management. It consumes the same NestJS backend API as the storefront but accesses admin-only endpoints.

Both interfaces are built with Tailwind CSS 4 for styling and use React Hook Form with Zod for form handling and validation.

### 3.3.2 Application Layer

**NestJS Backend API (Port 4000):** The core application layer is a modular NestJS 11 application built with TypeScript 5. It exposes all business logic through REST endpoints under the global prefix `/api`. It accepts CORS requests from both frontend origins (ports 3000 and 3001), enforces JWT authentication globally via a guard, and applies a global validation pipe using class-validator and class-transformer for DTO validation. The application is composed of sixteen modules, each encapsulating a distinct business domain.

**Python Recommendation Engine:** A FastAPI/Uvicorn microservice implementing the hybrid recommendation model. It operates as an independent service that the NestJS backend calls via HTTP. This architectural decision isolates the Python data science stack (PyTorch, FAISS, scikit-learn) from the TypeScript environment, enabling independent development and deployment.

### 3.3.3 Data Layer

The data layer utilises Supabase, an open-source Backend-as-a-Service built on PostgreSQL 14.1, providing a managed PostgreSQL database, JWT-based authentication via Supabase Auth, row-level security (RLS) policy enforcement, and file storage for product images. The NestJS backend connects to Supabase using both the anonymous client (for user-scoped operations that respect RLS) and the service role client (for admin-scoped operations that bypass RLS), switching between them based on the context of each operation.

## 3.4 Database Design

The database schema models all domain entities required for integrated e-commerce and ERP operations. The schema is managed through version-controlled SQL migration files stored in the `supabase/migrations/` directory.

### 3.4.1 Entity Design Overview

**User and Identity Entities:**
- **`profiles`**: The central user record, keyed to Supabase Auth's `auth.users` table. Stores contact information, role assignment, and notification preferences.

**Product and Catalogue Entities:**
- **`products`**: The master product catalogue. Each product has a URL-safe `handle`, title, description, base price, compare-at price, gender target, product type, vendor, tags, and publish status. Soft-deletes are supported via a `deleted_at` field.
- **`product_variants`**: Variant records belonging to each product, modelling up to three option dimensions (e.g., Size/M, Colour/Black). Each variant carries its own price, compare-at price, SKU, barcode, and inventory quantity.
- **`product_images`**: Ordered image gallery for each product, with URL, alt text, and position.
- **`collections`**: Named groupings of products (e.g., "New Arrivals", "Summer Edit").
- **`collection_products`**: Junction table mapping products to collections with a position field for manual ordering.

**Order and Transaction Entities:**
- **`orders`**: The top-level order record. Contains the customer reference (`user_id` → `profiles`), `order_number`, status, subtotal, discount, total, shipping address (stored as JSON), and Paystack payment reference.
- **`order_items`**: Line items for each order, linking to the order and the product with quantity, unit price, and total price at the time of purchase.

**Inventory Entities:**
- **`inventory_movements`**: An append-only audit log of every stock change. Records the variant affected, the quantity change (positive or negative), the previous and new quantities, movement type (e.g., "sale", "restock", "adjustment"), and the staff member who made the change.

**Communication Entities:**
- **`sms_logs`**: Records every SMS sent through the platform, including the recipient phone number, message content, type (e.g., "order_confirm", "popup_refund_confirm"), status, and timestamp.
- **`communication_logs`**: A broader audit table for all outbound communications (email and SMS), supporting compliance and operational oversight.
- **`newsletter_subscribers`**: Email addresses of users who have subscribed to marketing communications.

**Promotional Entities:**
- **`popup_sales`**: Time-limited promotional events with defined start and end dates, associated with specific products and discount parameters.

**Popup Sales Entities:**
- **`popup_events`**: Records each in-person popup event with a name, description, location, event date, status (draft/active/closed), and the staff member who created it.
- **`popup_orders`**: Each order placed at a popup event. Captures customer details (name, phone, email), the serving staff member, order status (`active` → `awaiting_payment` → `confirmed` → `completed` → `refunded`/`cancelled`/`on_hold`), payment method, payment reference, subtotal, discount, and total. Order numbers follow the format `POP-YYYY-XXXX`.
- **`popup_order_items`**: Line items within each popup order, referencing the shared `product_variants` catalogue.
- **`popup_split_payments`**: Records each leg of a split payment, capturing the method (cash/MoMo/card), amount, network, phone, and reference.
- **`popup_refunds`**: Records refunds against popup orders, including the refund amount, reason, Paystack refund ID (for MoMo orders), and whether a confirmation SMS was sent.

**Review Entities:**
- **`reviews`**: Customer product reviews with rating and text content.

### 3.4.2 Schema Design

**Authentication and Identity Layer:**
All user-related records leverage Supabase Auth:
- UUID primary keys throughout for security and scalability.
- `profiles.id` is a foreign key to `auth.users.id`, created automatically on user registration.
- JWT-based session tokens with automatic refresh managed by Supabase Auth.
- Audit fields (`created_at`, `updated_at`) on all mutable tables.

**Product Catalogue Modelling:**
The product schema captures the following attributes:
- Identity: `id` (UUID), `title`, `handle` (URL-safe slug, unique), `vendor`.
- Categorisation: `gender` (men/women/all), `product_type`, `tags` (array), `collections` (via junction table).
- Pricing: `base_price`, `compare_at_price` (for displaying strikethrough prices).
- Lifecycle: `published` (boolean visibility control), `status`, `created_by`, soft-delete via `deleted_at`.

Variant-level attributes:
- Options: up to three option name/value pairs (e.g., `option1_name: "Size"`, `option1_value: "M"`).
- Pricing: per-variant `price` and `compare_at_price`, enabling variant-specific pricing.
- Inventory: `inventory_quantity` on each variant, decremented on purchase.
- Identity: `sku`, `barcode`.

**Order Tracking Mechanism:**
Each order record implements:
- Customer linkage via `user_id` foreign key to `profiles`.
- A human-readable `order_number` for customer-facing references.
- Status workflow: pending → confirmed → processing → shipped → delivered → cancelled.
- Payment reconciliation via `paystack_reference`, matched by the Paystack webhook handler.

### 3.4.3 Relational Mapping

Core relationships enforced through foreign key constraints:

**User–Order Relationships:**
- One profile → many orders (1:N)
- One order → many order items (1:N)
- One order item → one product (N:1)

**Product–Inventory Relationships:**
- One product → many variants (1:N)
- One product → many images (1:N)
- One product → many collections (N:M via `collection_products`)
- One variant → many inventory movements (1:N)

**Communication Relationships:**
- One profile → many SMS logs (1:N)

```
┌──────────────────────────────────────────────────────────────────────┐
│                     ENTITY-RELATIONSHIP DIAGRAM                      │
└──────────────────────────────────────────────────────────────────────┘

 ┌─────────────┐         ┌─────────────────────────────────────────┐
 │  profiles   │         │               products                  │
 │─────────────│         │─────────────────────────────────────────│
 │ id (PK)     │         │ id (PK)                                 │
 │ email       │         │ title                                   │
 │ first_name  │         │ handle (unique)                         │
 │ last_name   │         │ description                             │
 │ phone_number│         │ base_price                              │
 │ role        │◄────┐   │ compare_at_price                        │
 │ subscription│     │   │ gender / product_type / vendor          │
 │ _tier       │     │   │ tags[]                                  │
 │ paystack_   │     │   │ published / status                      │
 │ _codes      │     │   │ created_by / deleted_at                 │
 └──────┬──────┘     │   └──────┬──────────────────────────────────┘
        │            │          │ 1                        │ 1
        │ 1          │          │ N                        │ N
        │ N          │    ┌─────▼──────────┐    ┌─────────▼──────────┐
 ┌──────▼──────┐     │    │product_variants│    │  product_images    │
 │   orders    │     │    │────────────────│    │────────────────────│
 │─────────────│     │    │ id (PK)        │    │ id (PK)            │
 │ id (PK)     │     │    │ product_id(FK) │    │ product_id (FK)    │
 │ user_id(FK) │─────┘    │ option1_name/  │    │ url                │
 │ order_number│          │ _value         │    │ alt_text           │
 │ status      │          │ option2_name/  │    │ position           │
 │ subtotal    │          │ _value         │    └────────────────────┘
 │ discount    │          │ price          │
 │ total       │          │ sku / barcode  │         ┌───────────────────┐
 │ paystack_   │          │ inventory_     │    1    │inventory_movements│
 │ _reference  │          │ _quantity      │◄────────│───────────────────│
 │ is_inner_   │          └────────────────┘    N    │ id (PK)           │
 │ _circle_ord │                                     │ variant_id (FK)   │
 └──────┬──────┘                                     │ quantity_change   │
        │ 1                                          │ previous_qty      │
        │ N                                          │ new_qty           │
 ┌──────▼──────┐                                     │ movement_type     │
 │ order_items │                                     │ created_by        │
 │─────────────│                                     └───────────────────┘
 │ id (PK)     │
 │ order_id(FK)│   ┌──────────────────────────────┐
 │ product_id  │   │        collections           │
 │ product_name│   │──────────────────────────────│
 │ quantity    │   │ id (PK) / title / handle     │
 │ unit_price  │   └──────────────────────────────┘
 │ total_price │
 └─────────────┘
                              │ N:M via collection_products
                              └──────────────────────────────►  products

ENUMS:
  user_role: public | staff | manager | admin
```

**Figure 2: IRIS Entity-Relationship Diagram**

### 3.4.4 Security and Compliance Controls

**Row-Level Security (RLS):**
Supabase RLS policies are applied to ensure:
- Customers can only read and modify their own profile, orders, and order items.
- Admin operations (product creation, order status updates, inventory management) are performed via the service role client in the NestJS backend, which bypasses RLS under controlled, authenticated conditions.

**Data Integrity Constraints:**
- `NOT NULL` constraints on critical fields: order number, product handle, variant product_id, SMS phone number.
- `UNIQUE` constraints on product handles (to preserve URL integrity) and Supabase Auth-enforced unique email addresses.
- `CHECK` constraints for valid price ranges and inventory quantities.
- `CASCADE` rules ensuring that deleting a product cascades appropriate cleanup to variants and images (with soft-deletes preferred for order data integrity).

**Audit and Compliance:**
- All tables include `created_at` and `updated_at` timestamp fields.
- Soft deletes (via `deleted_at`) on products preserve referential integrity with order history.
- `inventory_movements` provides a complete, append-only audit trail of all stock changes.
- `communication_logs` and `sms_logs` provide auditable records of all outbound communications.

## 3.5 Client-Server Architecture

IRIS adopts a modern decoupled client-server architecture with a clear separation between the presentation clients and the application server.

```
┌───────────────────────────────────────────────────────────────┐
│                        USER DEVICES                           │
│              Web Browser (Desktop & Mobile)                   │
└──────────────────────────┬────────────────────────────────────┘
                           │
                ┌──────────▼──────────┐
                │    CDN / Edge       │
                │  (Static Assets)    │
                └──────────┬──────────┘
                           │
       ┌───────────────────┼──────────────────────┐
       │                   │                      │
       ▼                   ▼                      ▼
┌──────────────┐  ┌──────────────────┐  ┌────────────────────┐
│  Customer    │  │   Admin          │  │   NestJS API       │
│  Storefront  │  │   Dashboard      │  │   Port 4000        │
│  Port 3000   │  │   Port 3001      │  │                    │
│              │  │                  │  │  JWT Auth Guard    │
│  Next.js SSR │  │  Next.js SSR     │  │  (global)          │
│  + CSR       │  │  + CSR           │  │                    │
│              │  │                  │  │  REST endpoints    │
│  Zustand     │  │  React Query     │  │  /api/*            │
│  (cart)      │  │  (server state)  │  │                    │
│  TanStack    │  │  RHF + Zod       │  │  Validation Pipe   │
│  Query       │  │  (forms)         │  │  (class-validator) │
└──────┬───────┘  └────────┬─────────┘  └──────────┬─────────┘
       │                   │                        │
       │  REST/HTTPS       │  REST/HTTPS            │
       └───────────────────┴────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │     Supabase Cloud     │
              │   PostgreSQL + Auth    │
              │   + RLS + Storage      │
              └────────────────────────┘

Communication Protocols:
  • HTTPS for all client-server communication
  • JSON data format for all API requests and responses
  • JWT Bearer tokens for API authentication
  • HMAC SHA-512 signature verification for Paystack webhooks
```

**Figure 3: IRIS Client-Server Architecture**

**Frontend Application (Customer Storefront):**
- Server-side rendering (SSR) via Next.js App Router for product and collection pages, ensuring fast initial load times and SEO discoverability.
- Client-side state management: Zustand for the shopping cart (persisted to localStorage), TanStack Query for server state caching and background re-fetching.
- API integration via typed fetch wrappers in `lib/api/`, communicating with the NestJS backend over HTTPS with JWT Bearer tokens injected from the Supabase session.

**Frontend Application (Admin Dashboard):**
- Next.js App Router with server components for data fetching on protected pages.
- Route protection enforced by Next.js middleware checking for a valid admin session before rendering any dashboard routes.
- React Query for data fetching with automatic cache invalidation on mutations.
- React Hook Form with Zod schemas for all form inputs, ensuring type-safe validation before API calls.

**Backend Services (NestJS API):**
- RESTful API with all routes prefixed `/api`.
- CORS configured to accept requests from `http://localhost:3000` and `http://localhost:3001`.
- Global `JwtAuthGuard` applied to all routes by default; individual routes or controllers are exempted via the `@Public()` decorator.
- Global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` to strip and reject unexpected fields on all DTOs.

## 3.6 Authentication, Authorization, and Security

### Authentication Mechanism

**Customer Authentication:**
Customer authentication is handled entirely by Supabase Auth:
- Email and password-based signup and login.
- On signup, a trigger automatically creates a corresponding `profiles` record with the user's ID.
- JWT tokens are issued by Supabase Auth and stored in secure, httpOnly cookies managed by the `@supabase/ssr` package.
- Password reset via email OTP link.
- The NestJS backend validates customer JWTs using the Supabase JWT secret, extracting user identity (email, user ID) for use in service logic.

**Admin Authentication:**
Admin authentication uses the same Supabase Auth infrastructure but is managed through a separate login flow at `/admin/login`. Admin sessions are validated by the NestJS backend, which checks not only the JWT validity but also that the decoded user's role is `staff`, `manager`, or `admin` before granting access to admin endpoints.

### Authorization Framework: Role-Based Access Control (RBAC)

IRIS implements a six-role permission model, with three customer-facing roles and three administrative roles.

**Customer Roles (managed via `user_role` enum on `profiles`):**

| Role | Description |
|---|---|
| `public` | Standard authenticated customer. Can browse products, place orders, manage their own profile. |

**Administrative Roles (enforce access to the admin dashboard):**

| Role | Description |
|---|---|
| `staff` | Can view orders and update order status. Read-only access to products and customer list. |
| `manager` | All staff permissions, plus: create/edit/publish products, process refunds, update customer info, manage inventory, view analytics. |
| `admin` | All manager permissions, plus: delete products, manage system settings, manage admin user accounts (create, update, delete). |

The full permissions matrix is defined as a compile-time constant in the frontend codebase and enforced at the API layer in the NestJS backend:

```
┌─────────────────────┬─────────┬─────────┬─────────┐
│ Permission          │  Staff  │ Manager │  Admin  │
├─────────────────────┼─────────┼─────────┼─────────┤
│ products:read       │    ✓    │    ✓    │    ✓    │
│ products:create     │         │    ✓    │    ✓    │
│ products:update     │         │    ✓    │    ✓    │
│ products:delete     │         │         │    ✓    │
│ products:publish    │         │    ✓    │    ✓    │
├─────────────────────┼─────────┼─────────┼─────────┤
│ orders:read         │    ✓    │    ✓    │    ✓    │
│ orders:update       │    ✓    │    ✓    │    ✓    │
│ orders:refund       │         │    ✓    │    ✓    │
├─────────────────────┼─────────┼─────────┼─────────┤
│ customers:read      │    ✓    │    ✓    │    ✓    │
│ customers:update    │         │    ✓    │    ✓    │
├─────────────────────┼─────────┼─────────┼─────────┤
│ inventory:read      │    ✓    │    ✓    │    ✓    │
│ inventory:update    │         │    ✓    │    ✓    │
├─────────────────────┼─────────┼─────────┼─────────┤
│ analytics:read      │         │    ✓    │    ✓    │
├─────────────────────┼─────────┼─────────┼─────────┤
│ settings:read       │         │         │    ✓    │
│ settings:update     │         │         │    ✓    │
├─────────────────────┼─────────┼─────────┼─────────┤
│ users:read          │         │         │    ✓    │
│ users:create        │         │         │    ✓    │
│ users:update        │         │         │    ✓    │
│ users:delete        │         │         │    ✓    │
└─────────────────────┴─────────┴─────────┴─────────┘
```

**Figure 4: IRIS RBAC Permission Matrix**

### Security Measures

- **Transport Security:** All client-server communication is enforced over HTTPS in production. JWT tokens are never transmitted in query strings.
- **Input Validation:** Zod schemas validate all form inputs on the frontend. Class-validator DTOs validate all incoming API payloads on the backend, with the `whitelist` flag stripping unrecognised fields to prevent parameter pollution.
- **Webhook Security:** Paystack webhook payloads are verified using HMAC SHA-512 signatures computed with the Paystack secret key before any business logic is executed.
- **Database Security:** Supabase RLS policies ensure that even if an attacker obtained a user's JWT, they could only access their own data at the database level.
- **CORS Protection:** The NestJS backend explicitly whitelists only the two frontend origins, rejecting cross-origin requests from any other domain.

## 3.7 Process Architecture

This section describes the key operational workflows implemented within IRIS.

### Order Fulfilment Workflow

```
         Customer places order
                  │
                  ▼
     System validates inventory availability
         ┌────────┴────────┐
         │ Stock           │ No stock
         │ available?      │ available
         └────────┬────────┘
                  │ Yes           ┌──► Notify customer of
                  ▼               │    stock unavailability
     Initiate Paystack payment ───┘
         ┌────────┴────────┐
         │ Payment         │ Payment
         │ successful?     │ failed
         └────────┬────────┘
                  │ Yes           ┌──► Release inventory
                  ▼               │    reservation
     Confirm order (status:       │    Cancel order
     confirmed)                  │    Notify customer
                  │               │    of failure
                  ▼
     Decrement inventory_quantity
     on variant; log movement
                  │
                  ▼
     Send order confirmation SMS
     to customer (LetsFish)
                  │
                  ▼
     Admin processes order
     (updates status to shipped)
                  │
                  ▼
     Order marked delivered/complete
```

**Figure 5: Order Fulfilment Workflow**

### Inventory Management Workflow

```
     Admin creates/restocks product variant
                  │
                  ▼
     inventory_quantity updated on variant
     inventory_movements record created
     (movement_type: "restock")
                  │
     ┌────────────▼─────────────────────────┐
     │        Ongoing monitoring            │
     │                                      │
     │  On each sale:                       │
     │    • inventory_quantity decremented  │
     │    • movement_type: "sale" logged    │
     │                                      │
     │  On admin adjustment:                │
     │    • inventory_quantity updated      │
     │    • movement_type: "adjustment"     │
     │    • notes required                  │
     └──────────────────────────────────────┘
                  │
                  ▼
     Admin views inventory dashboard
     (current stock levels, movement history,
     filterable by product / movement type)
```

**Figure 7: Inventory Management Workflow**

### Recommendation Generation Workflow

```
     Request arrives at NestJS
     GET /api/recommendations/for-you
     (with or without JWT)
                  │
          ┌───────▴───────┐
          │ Authenticated │ Guest / No token
          │ user?         │
          └───────┬───────┘
                  │ Yes           ┌──► FastAPI cold_start service
                  ▼               │    returns popularity-ranked
     NestJS calls FastAPI         │    products
     /for-you?email=user@x.com    │
                  │               │
                  ▼               │
     FastAPI: check if user has   │
     interaction history in model │
         ┌────────┴────────┐      │
         │ Known user      │ Unknown user
         │                 │      │
         ▼                 └──────┘
     HybridModel.predict():
       score = 0.5 × CF_score
             + 0.3 × text_similarity
             + 0.2 × image_similarity
     FAISS index nearest-neighbour lookup
                  │
                  ▼
     Top-K products returned to NestJS
     NestJS returns product list to client
```

**Figure 8: Recommendation Generation Workflow**

## 3.8 Integration Architecture

### Paystack Payment Gateway Integration

Paystack is integrated at two levels within IRIS:

**Frontend Integration (react-paystack):** The customer storefront uses the `react-paystack` library to open the Paystack inline checkout modal directly from the browser. The customer's email and the order amount are passed to the modal. On completion, Paystack closes the modal and triggers an `onSuccess` callback with the payment reference.

**Backend Webhook Integration:** The authoritative payment confirmation happens via the Paystack webhook. Paystack sends a POST request to `/api/webhooks/paystack` upon a successful charge event. The NestJS `PaymentsService` verifies the HMAC SHA-512 signature of the incoming request body using the configured `PAYSTACK_SECRET_KEY` before processing. On a verified `charge.success` event, the order matching the payment reference is confirmed, its status is updated, and inventory is decremented. This two-step design (frontend callback + backend webhook) ensures that orders are only fulfilled on verified payment, not on optimistic frontend callbacks alone.

```
     Customer browser                  NestJS Backend            Paystack Servers
          │                                 │                          │
          │  Opens Paystack modal           │                          │
          │─────────────────────────────────────────────────────────► │
          │                                 │                          │
          │  Customer completes payment     │                          │
          │◄──────────────────────────────────────────────────────── │
          │                                 │                          │
          │  onSuccess callback fires        │                          │
          │  (reference in response)        │                          │
          │                                 │                          │
          │                                 │ POST /api/webhooks/      │
          │                                 │ paystack                 │
          │                                 │◄──────────────────────── │
          │                                 │                          │
          │                                 │ Verify HMAC-SHA512       │
          │                                 │ signature                │
          │                                 │                          │
          │                                 │ If charge.success:       │
          │                                 │  confirm order           │
          │                                 │  update inventory        │
          │                                 │  send SMS confirmation   │
```

**Figure 9: Paystack Payment Integration Flow**

### LetsFish Communications Integration

LetsFish (`https://api.letsfish.africa/v1`) is the pan-African communications provider integrated for both transactional SMS and voice OTP. The NestJS `LetsfishService` constructs and sends HTTP requests to the LetsFish API, authenticated via a Bearer token composed of the configured App ID and App Secret. All outbound communications — successful or failed — are persisted to the `communication_logs` table with the provider, type, recipient, message, and status.

**SMS (`POST /v1/sms`):** Phone numbers are normalised to international format without the leading `+` (e.g., `233241234567`) before dispatch. The following message types are defined:

| Message Type | Trigger |
|---|---|
| `order_confirm` | Paystack webhook confirms successful online order payment |
| `popup_refund_confirm` | Staff processes a refund on a popup order |

**Voice OTP (`POST /v1/voice-otp`):** Used to deliver one-time PIN codes via automated phone call. The `makeOtpCall()` method sends the OTP and normalised phone number to the LetsFish voice-OTP endpoint, which places a call to the recipient and reads out the code. The call ID is returned for reference tracking, and the attempt is logged to `communication_logs` with `type: 'voice_otp'`.

### Resend Email Integration

Transactional emails — including signup OTP verification codes and password reset links — are delivered via **Resend** (resend.com). Rather than being called directly in the NestJS application code, Resend is configured as the custom SMTP provider at the Supabase project level. This means all emails triggered by Supabase Auth events (e.g., `supabase.auth.signUp()`, `supabase.auth.resetPasswordForEmail()`, `supabase.auth.resend()`) are routed through Resend's SMTP relay for reliable delivery. This architecture keeps email infrastructure concerns at the platform configuration level, separate from application code.

### Popup Sales — Paystack MoMo Integration

The popup sales module uses a distinct Paystack integration path from the online storefront. Rather than the inline checkout modal (which requires a browser), in-person MoMo payments are processed via the **Paystack Charge API**, initiated server-side by the NestJS backend. The flow is as follows:

1. Staff creates a popup order and selects "Mobile Money" as the payment method.
2. The admin dashboard calls `POST /api/popup-sales/orders/:id/charge` with the customer's phone number and MoMo provider (e.g., MTN, Vodafone).
3. NestJS calls `POST https://api.paystack.co/charge` with the order amount (in pesewas), a synthetic email, and the `mobile_money` object.
4. Paystack returns a status of `send_otp` (the customer receives a USSD prompt) or prompts for OTP.
5. If OTP is required, staff collects the code from the customer and submits it via `POST /api/popup-sales/orders/:id/submit-otp`.
6. The order status is set to `awaiting_payment`. The Paystack webhook (`charge.success`) then confirms the payment, transitioning the order to `confirmed`.
7. Staff marks the order as `completed`, triggering inventory deduction and movement logging.

**Popup Refunds:** For MoMo-paid popup orders, refunds are processed via `POST https://api.paystack.co/refund`. The refund amount (full or partial, in pesewas) and the original transaction reference are submitted to Paystack. On success, the `popup_refunds` record is created, the order status is set to `refunded`, inventory is restored (with a `return` movement log), and a confirmation SMS is sent to the customer via LetsFish.

```
     Staff (Admin Dashboard)               NestJS Backend              Paystack / Customer
           │                                     │                            │
           │  POST /popup-sales/orders/:id/charge│                            │
           │────────────────────────────────────►│                            │
           │                                     │  POST /charge (MoMo)       │
           │                                     │───────────────────────────►│
           │                                     │  { status: send_otp }      │
           │                                     │◄───────────────────────────│
           │  { message: "OTP sent..." }          │        (Customer receives   │
           │◄────────────────────────────────────│         USSD / SMS prompt)  │
           │                                     │                            │
           │  Staff collects OTP from customer   │                            │
           │  POST /popup-sales/orders/:id/      │                            │
           │  submit-otp { otp }                 │                            │
           │────────────────────────────────────►│                            │
           │                                     │  POST /charge/submit_otp   │
           │                                     │───────────────────────────►│
           │                                     │  { status: success }       │
           │                                     │◄───────────────────────────│
           │  { paystack_status: "success" }      │                            │
           │◄────────────────────────────────────│                            │
           │                                     │  Webhook: charge.success   │
           │                                     │◄───────────────────────────│
           │                                     │  Order → "confirmed"       │
```

**Figure 11: Popup Sales MoMo Payment Flow**

### Recommendation Engine Integration

The Python FastAPI recommendation service is consumed by the NestJS `RecommendationsModule` via internal HTTP calls. Two endpoints are exposed:

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /recommendations/for-you?k=12` | `@Public()` (JWT optional) | Personalised recommendations for the logged-in user; falls back to popularity for guests |
| `GET /recommendations/similar/:handle?k=6` | `@Public()` | Content-based similar products for a given product handle |

If the Python service is unreachable, the NestJS service returns an empty array, and the frontend degrades gracefully — the recommendations section simply does not render, without breaking the page.

## 3.9 Deployment Architecture

The IRIS monorepo is structured to allow each component to be deployed independently, reflecting the architectural separation of concerns.

```
┌─────────────────────────────────────────────────────────────┐
│                      USER DEVICES                           │
│              Web Browser / Mobile Browser                   │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
                           ▼
              ┌────────────────────────┐
              │   CDN (Static Assets)  │
              │  JS bundles, images,   │
              │  CSS served from edge  │
              └────────────┬───────────┘
                           │
          ┌────────────────┼────────────────────┐
          │                │                    │
          ▼                ▼                    ▼
┌──────────────┐  ┌─────────────────┐  ┌──────────────────┐
│  Customer    │  │  Admin          │  │  NestJS Backend  │
│  Storefront  │  │  Dashboard      │  │  API             │
│  (Next.js)   │  │  (Next.js)      │  │  (Node.js)       │
│              │  │                 │  │                  │
│  Server-side │  │  Server-side    │  │  Containerised   │
│  rendering   │  │  rendering      │  │  deployment      │
│  + static    │  │  + static       │  │  PORT: 4000      │
│  export      │  │  export         │  │                  │
└──────────────┘  └─────────────────┘  └──────────┬───────┘
                                                   │
                          ┌────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  Python Recommender   │
              │  FastAPI / Uvicorn    │
              │  (containerised)      │
              └───────────┬───────────┘
                          │
                          ▼
          ┌───────────────────────────────────┐
          │          Supabase Cloud           │
          │  PostgreSQL + Auth + Storage + RLS│
          │  (managed, globally distributed)  │
          └───────────────────────────────────┘

External Services:
  • Paystack   — payment processing and webhooks
  • LetsFish   — transactional SMS delivery
```

**Figure 10: IRIS Deployment Architecture**

**Infrastructure Decisions:**

- **Customer Storefront and Admin Dashboard:** Both Next.js applications are optimised for deployment on edge-capable hosting platforms (such as Vercel) that provide automatic CDN distribution of static assets, server-side rendering at the edge, and zero-configuration deployments from the Git repository.

- **NestJS Backend API:** The Node.js backend is containerised for deployment. It requires persistent environment variables (database credentials, Paystack keys, LetsFish credentials, JWT secrets) to be injected at runtime.

- **Python Recommendation Engine:** The FastAPI service is containerised independently. It requires model artefacts (FAISS indexes, trained collaborative filtering model, embeddings) to be available at startup, either mounted from persistent storage or pre-baked into the container image. The service exposes HTTP on an internal port, reachable only by the NestJS backend.

- **Database:** Supabase Cloud (managed PostgreSQL) handles the data layer entirely, including connection pooling, automated backups, and geographic replication. Schema changes are applied via the versioned migration files in `supabase/migrations/`.

**Environment Strategy:**
- Development: all four applications run locally with hot reload.
- Staging: mirrors production; used for integration testing before release.
- Production: hardened configuration with all secrets managed through environment variables, no debug logging.

---

# References

[1] Tohidi, A.; Eckles, D.; Jadbabaie, A. Habits in Consumer Purchases: Evidence from Store Closures. Social Science Research Network: Rochester, NY April 7, 2022. https://doi.org/10.2139/ssrn.4077391.

[2] UNCTAD B2C E-COMMERCE INDEX 2016.

[3] Casciani, D.; Chkanikova, O.; Pal, R. Exploring the Nature of Digital Transformation in the Fashion Industry: Opportunities for Supply Chains, Business Models, and Sustainability-Oriented Innovations. Sustain. Sci. Pract. Policy 2022, 18 (1), 773–795. https://doi.org/10.1080/15487733.2022.2125640.

[4] Zangiacomi, A.; Pessot, E.; Fornasiero, R.; Bertetti, M.; Sacco, M. Moving towards Digitalization: A Multiple Case Study in Manufacturing. Prod. Plan. Control 2020, 31 (2–3), 143–157. https://doi.org/10.1080/09537287.2019.1631468.

[5] Achieng, M. S.; Malatji, M. Digital Transformation of Small and Medium Enterprises in Sub-Saharan Africa: A Scoping Review. J. Transdiscipl. Res. South. Afr. 2022, 18 (1), 13. https://doi.org/10.4102/td.v18i1.1257.

[6] How E-Commerce and SMEs Are Transforming Africa's Fashion Industries. The Business of Fashion. https://www.businessoffashion.com/events/global-markets/bof-live-how-e-commerce-and-smes-are-transforming-africas-fashion-industries/ (accessed 2025-11-26).

[7] (PDF) Data-Driven Decision Making for E-Business Success: A Review. ResearchGate 2025. https://doi.org/10.9734/ajrcos/2025/v18i4616.

[8] Cósta, J.; Castro, R. SMEs Must Go Online - E-Commerce as an Escape Hatch for Resilience and Survivability. J. Theor. Appl. Electron. Commer. Res. 2021, 16, 3043–3062. https://doi.org/10.3390/jtaer16070166.

[9] Bradlow, E. T.; Gangwar, M.; Kopalle, P.; Voleti, S. The Role of Big Data and Predictive Analytics in Retailing. Journal of Retailing 2017, 93 (1), 79–95. https://doi.org/10.1016/j.jretai.2016.12.004.

[10] Munshi, A. A.; Alhindi, A.; Qadah, T.; Alqurashi, A. An Electronic Commerce Big Data Analytics Architecture and Platform. Applied Sciences 2023, 13 (19), 10962. https://doi.org/10.3390/app131910962.

[11] Lay, J.; Tafese, T. Africa's Emergent Tech Sector: Characteristics and Development Implications. Africa Spectrum 2025, 60, 106–126. https://doi.org/10.1177/00020397241306454.

[12] Badran, M. Digital Platforms in Africa: A Case-Study of Jumia Egypt's Digital Platform. Telecommunications Policy 2021, 45 (4), 102077. https://doi.org/10.1016/j.telpol.2020.102077.

[13] Thiaw, C. A. L. Mapping of Digital Platforms and e-Commerce Emergence in Africa: Evidence from Senegal. Platforms 2024, 2 (1), 1–18. https://doi.org/10.3390/platforms2010003.

[14] Kabanda, S.; Brown, I. A Structuration Analysis of Small and Medium Enterprise (SME) Adoption of E-Commerce: The Case of Tanzania. Telematics and Informatics 2017, 34 (7), 118–132. https://doi.org/10.1016/j.tele.2017.01.002.

[15] Nguimkeu, P.; Okou, C. Leveraging Digital Technologies to Boost Productivity in the Informal Sector in Sub-Saharan Africa. Review of Policy Research 2021, 38 (4), 456–474. https://doi.org/10.1111/ropr.12441.

[16] Awad, A.; Albaity, M. ICT and Economic Growth in Sub-Saharan Africa: Transmission Channels and Effects. Telecommunications Policy 2022, 46 (5), 102381. https://doi.org/10.1016/j.telpol.2022.102381.

[17] Yang, Y.; Chen, N.; Chen, H. The Digital Platform, Enterprise Digital Transformation, and Enterprise Performance of Cross-Border E-Commerce. J. Theor. Appl. Electron. Commer. Res. 2023, 18, 777–794. https://doi.org/10.3390/jtaer18020040.

[18] Liu, S.; Liu, C. Mapping the Digital Transformation in the Fashion Industry: The Past, Present and Future. Journal of Fashion Marketing and Management: An International Journal 2025. https://doi.org/10.1108/jfmm-09-2024-0380.

[19] Pereira, A.; Moura, J.; Costa, E.; Vieira, T.; Landim, A.; Bazaki, E.; Wanick, V. Customer Models for Artificial Intelligence-Based Decision Support in Fashion Online Retail Supply Chains. Decision Support Systems 2022, 158, 113795. https://doi.org/10.1016/j.dss.2022.113795.

[20] Ishfaq, R.; Gibson, B. Digital Supply Chains in Omnichannel Retail: A Conceptual Framework. Journal of Business Logistics 2021, 42 (2), 185–204. https://doi.org/10.1111/jbl.12277.

[21] Aina, A. T.; Wepukhulu, J. Effect of E-Commerce Adoption on Operating Profitability of Small and Medium-Scale Fashion Retailers in Lagos, Nigeria. African Journal of Management and Business Research 2025, 12 (2), 45–62. https://doi.org/10.62154/ajmbr.2025.019.01020.

[22] Mariani, M.; Wamba, S. F. Exploring How Consumer Goods Companies Innovate in the Digital Age: The Role of Big Data Analytics Companies. Journal of Business Research 2020, 121, 338–352. https://doi.org/10.1016/j.jbusres.2020.09.012.

[23] Awa, H. O.; Ojiabo, O. U. A Model of Adoption Determinants of ERP within T-O-E Framework. Information Technology & People 2016, 29 (4), 901–930. https://doi.org/10.1108/itp-03-2015-0068.

[24] Artsiom Baranouski. 2024. How to Build an ERP System: A Guide to Gathering Functional and Non-Functional Requirements. Medium. https://aranouski.medium.com/how-to-build-an-erp-system-a-guide-to-gathering-functional-and-non-functional-requirements-cbd7130ba925

[25] 2024. Functional and Nonfunctional Requirements Specification. AltexSoft. https://www.altexsoft.com/blog/functional-and-non-functional-requirements-specification-and-types/

[26] 2025. Breaking Cloud ERP Adoption Barriers for South African SMEs. https://www.astraia.co.za/breaking-cloud-erp-adoption-barriers-for-south-african-smes/

[27] Functional and Non Functional Requirements (UPDATED 2025). https://www.softwaretestinghelp.com/functional-and-non-functional-requirements/

[28] Download Free ERP Functional Requirements Document. https://www.erpresearch.com/en-us/erp-functional-requirements

[29] MoSCoW Prioritization. ProductPlan. https://www.productplan.com/glossary/moscow-prioritization/

---

# Appendices

## Appendix 1: Order Fulfilment Workflow (Detailed)

```
         ●  START
         │
         ▼
┌─────────────────────────┐
│  Customer places order  │
│  (cart → checkout)      │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  System validates       │
│  inventory_quantity     │
│  for each variant       │
└──────┬──────────────────┘
       │
       ├─── Stock NOT available ──────────────────────────────────────┐
       │                                                              │
       │ Stock available                                              ▼
       ▼                                               ┌─────────────────────────┐
┌─────────────────────────┐                            │  Notify customer:       │
│  Initiate Paystack      │                            │  item out of stock      │
│  payment (inline modal) │                            └─────────────────────────┘
└──────┬──────────────────┘                                           │
       │                                                              ▼
       ├─── Payment FAILED ──────────────────────────────────────────┐●  END
       │                                                              │
       │ Payment successful                                           ▼
       ▼                                               ┌─────────────────────────┐
┌─────────────────────────┐                            │  Cancel order           │
│  Paystack webhook fires │                            │  Notify customer of     │
│  charge.success event   │                            │  payment failure        │
│  HMAC verified          │                            └─────────────────────────┘
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│  Order status →         │
│  "confirmed"            │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│  Decrement inventory_   │
│  quantity on variant    │
│  Log inventory_movement │
│  (type: "sale")         │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│  Send order confirmation│
│  SMS via LetsFish       │
│  Log to sms_logs        │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│  Admin views order in   │
│  dashboard              │
│  Updates status to      │
│  "shipped" with tracking│
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│  Order status →         │
│  "delivered"            │
└──────┬──────────────────┘
       │
       ▼
       ● END
```

## Appendix 2: Inventory Management Workflow (Detailed)

```
       ●  START
       │
       ▼
┌───────────────────────────────────────┐
│  Monitor stock levels via dashboard   │
│  (per variant, all products)          │
└──────────────────┬────────────────────┘
                   │
       ┌───────────▼──────────┐
       │  Stock below         │  No
       │  reorder threshold?  ├──────────────► Stock level sufficient ──┐
       └───────────┬──────────┘                                         │
                   │ Yes                                                 │
                   ▼                                                     │
       ┌───────────────────────┐                                        │
       │  Admin manually       │                                        │
       │  restocks product     │                                        │
       │  variant quantity     │                                        │
       └───────────┬───────────┘                                        │
                   │                                                     │
                   ▼                                                     │
       ┌───────────────────────┐                                        │
       │  Update               │                                        │
       │  inventory_quantity   │◄───────────────────────────────────────┘
       │  on variant           │
       └───────────┬───────────┘
                   │
                   ▼
       ┌───────────────────────┐
       │  Create               │
       │  inventory_movement   │
       │  record               │
       │  (type, qty, notes,   │
       │   created_by)         │
       └───────────┬───────────┘
                   │
                   ▼
       ┌───────────────────────┐
       │  Movement visible in  │
       │  admin inventory log  │
       └───────────────────────┘
                   │
                   ▼
                   ● END
```

## Appendix 3: Analytics / Admin Dashboard Data Flow

```
       ●  START: Admin loads dashboard
       │
       ▼
┌─────────────────────────────────────────┐
│  Admin dashboard requests data          │
│  from NestJS API (/api/*)               │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  NestJS validates JWT + checks role     │
│  permission for requested resource      │
└──────────────────┬──────────────────────┘
                   │
       ┌───────────▼──────────────┐
       │  Role has permission?    │  No ───► 403 Forbidden
       └───────────┬──────────────┘
                   │ Yes
                   ▼
┌─────────────────────────────────────────┐
│  NestJS service queries Supabase        │
│  (service role client for admin scope)  │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  Data returned and rendered in          │
│  admin dashboard UI                     │
│                                         │
│  Available views:                       │
│  • Orders (status, customer, amount)    │
│  • Products (published, stock levels)   │
│  • Inventory (movements, current qty)   │
│  • Customers (profile, order history)   │
│  • Payments (references, amounts)       │
│  • Popup Sales (active, upcoming)       │
│  • Communications (SMS logs)            │
│  • Settings (users, roles)              │
└─────────────────────────────────────────┘
                   │
                   ▼
                   ● END
```

## Appendix 4: NestJS Backend Module Reference

| Module | Controller Prefix | Key Responsibilities |
|---|---|---|
| `AuthModule` | `/api/auth` | Signup, login, logout, password reset, OTP |
| `ProfileModule` | `/api/profile` | Read/update user profile |
| `ProductsModule` | `/api/products` | Product CRUD, publish/unpublish, search |
| `CollectionsModule` | `/api/collections` | Collection CRUD, product assignments |
| `InventoryModule` | `/api/inventory` | Stock levels, movement logs, adjustments |
| `OrdersModule` | `/api/orders` | Order creation, status updates, history |
| `PaymentsModule` | `/api/payments` | Paystack webhook handler, admin payment list |
| `LetsfishModule` | (internal) | SMS send abstraction, phone normalisation |
| `SmsModule` | `/api/sms` | Trigger-based SMS for lifecycle events |
| `SettingsModule` | `/api/settings` | Admin user management, role assignment |
| `NewsletterModule` | `/api/newsletter` | Subscribe/unsubscribe, subscriber list |
| `ExportModule` | `/api/export` | Data export (orders, customers) |
| `RecommendationsModule` | `/api/recommendations` | Proxy to Python FastAPI recommender |
| `ReviewsModule` | `/api/reviews` | Product review CRUD |
| `PopupSalesModule` | `/api/popup-sales` | In-person POS: events, orders, MoMo charge, OTP submit, payment verify, refunds, customer creation |
| `CommunicationsModule` | `/api/communications` | Communication log query and audit (SMS + voice OTP) |

## Appendix 5: Popup Sales Order Lifecycle

```
       ● START: Staff creates popup event
         (name, location, event_date, status: active)
                  │
                  ▼
       Staff creates order for walk-in customer
       (items from shared catalogue, discount, notes)
                  │
                  ▼
       ┌──────────────────────────────────────┐
       │  Order status: "active"              │
       │  Order number: POP-YYYY-XXXX         │
       └───────────────┬──────────────────────┘
                       │
       ┌───────────────▼──────────────────────┐
       │  Select payment method               │
       ├──────────────────────────────────────┤
       │  Cash / Split  │  Mobile Money (MoMo)│
       └───────┬────────┴──────────┬──────────┘
               │                  │
               │ Cash confirmed    │ Initiate MoMo charge
               │                  │ via Paystack API
               │                  │
               │                  ▼
               │        Order → "awaiting_payment"
               │        Customer receives USSD/OTP
               │                  │
               │        Staff submits OTP
               │                  │
               │        Paystack webhook confirms
               │                  │
               ▼                  ▼
       ┌──────────────────────────────────────┐
       │  Order status: "confirmed"           │
       └───────────────┬──────────────────────┘
                       │
                       ▼
       Staff completes order
       (marks as "completed")
                       │
                       ▼
       ┌──────────────────────────────────────┐
       │  Inventory decremented per item      │
       │  inventory_movements logged          │
       │  (movement_type: "sale")             │
       └──────────────────────────────────────┘

       ── If refund needed ────────────────────

       Staff initiates refund (full or partial)
                       │
                       ▼
       If MoMo: Paystack refund API called
       popup_refunds record created
       Order → "refunded"
       Inventory restored (movement_type: "return")
       SMS confirmation sent to customer via LetsFish

                       ● END
```

## Appendix 6: Communication Integrations Summary

| Channel | Provider | Integration Point | Events |
|---|---|---|---|
| **Transactional Email** | Resend (via Supabase SMTP) | Supabase Auth | Signup OTP, Password reset |
| **SMS** | LetsFish (`/v1/sms`) | NestJS LetsfishService | Order confirm, Popup refund confirm |
| **Voice OTP** | LetsFish (`/v1/voice-otp`) | NestJS LetsfishService | OTP delivery via automated phone call |

All LetsFish communications (SMS and voice OTP) are logged to the `communication_logs` table with provider, type, recipient, message, status, and error metadata. Resend delivery is managed at the Supabase infrastructure level and does not require application-level logging.

---

*End of Chapters 1–3*

*Chapters 4 (Implementation), 5 (Testing and Results), and 6 (Conclusions and Recommendations) to follow.*
