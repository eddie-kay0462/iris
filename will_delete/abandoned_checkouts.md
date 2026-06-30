<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta http-equiv="Content-Style-Type" content="text/css">
  <title></title>
  <meta name="Generator" content="Cocoa HTML Writer">
  <meta name="CocoaVersion" content="2685.6">
  <style type="text/css">
    p.p1 {margin: 0.0px 0.0px 0.0px 0.0px; font: 12.0px Helvetica}
    p.p2 {margin: 0.0px 0.0px 0.0px 0.0px; font: 12.0px Helvetica; min-height: 14.0px}
  </style>
</head>
<body>
<p class="p1">---</p>
<p class="p1">Abandoned checkouts description</p>
<p class="p1">---</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">  </span>Retrieve a list of incomplete checkouts. Each Checkout object includes a URL to the online checkout, where the customer can complete their purchase.</p>
<p class="p1">api_version: 2026-01<span class="Apple-converted-space">   </span></p>
<p class="p2"><br></p>
<p class="p1">source_url: https://shopify.dev/docs/api/admin-rest/latest/resources/abandoned-checkouts</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">  </span>md: https://shopify.dev/docs/api/admin-rest/latest/resources/abandoned-checkouts.md <span class="Apple-converted-space"> </span></p>
<p class="p2"><span class="Apple-converted-space">    </span></p>
<p class="p1">api_name: admin-rest <span class="Apple-converted-space"> </span></p>
<p class="p2"><br></p>
<p class="p1">api_type: rest</p>
<p class="p2"><br></p>
<p class="p1">---</p>
<p class="p2"><br></p>
<p class="p1">The REST Admin API is a legacy API as of October 1, 2024. Starting April 1, 2025, all new public apps must be built exclusively with the [GraphQL Admin API](https://shopify.dev/docs/api/admin-graphql). For details and migration steps, visit our [migration guide](https://shopify.dev/docs/apps/build/graphql/migrate).</p>
<p class="p2"><br></p>
<p class="p1"># Abandoned checkouts</p>
<p class="p2"><br></p>
<p class="p1">**Requires \`orders\` access scope.:**</p>
<p class="p2"><br></p>
<p class="p1">**Requires access to \[protected customer data]\(https://shopify.dev/apps/store/data-protection/protected-customer-data).:**</p>
<p class="p2"><br></p>
<p class="p1">You can use the [Abandoned checkouts](https://shopify.dev/api/admin-rest/latest/resources/abandoned-checkouts#resource_object) resource to retrieve a list and a count of abandoned checkouts. A checkout is considered abandoned after the customer has added contact information, but before the customer has completed their purchase.</p>
<p class="p2"><br></p>
<p class="p1">This resource may be helpful to complete the following actions:</p>
<p class="p2"><br></p>
<p class="p1">* Gather marketing information on customers who have abandoned their cart.</p>
<p class="p1">* Use information to remarket to abandoned checkout customers.</p>
<p class="p1">* Understand customers’ behavior.</p>
<p class="p1">* Track abandoned checkouts over time.</p>
<p class="p1">* View abandoned checkout items.</p>
<p class="p2"><br></p>
<p class="p1">\#</p>
<p class="p2"><br></p>
<p class="p1">## Endpoints</p>
<p class="p2"><br></p>
<p class="p1">* [get](https://shopify.dev/docs/api/admin-rest/latest/resources/abandoned-checkouts.md#get-checkouts?created-at-max=2013-10-12T07:05:27-02:00)</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">  </span>[/admin/api/latest/checkouts.​json?created\_​at\_​max=2013-10-12T07:05:27-02:00](https://shopify.dev/docs/api/admin-rest/latest/resources/abandoned-checkouts.md#get-checkouts?created-at-max=2013-10-12T07:05:27-02:00)</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">  </span>Retrieves a count of checkouts</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">  </span>[abandonedCheckoutsCount](https://shopify.dev/docs/api/admin-graphql/latest/queries/abandonedCheckoutsCount?example=retrieves-a-count-of-checkouts)</p>
<p class="p2"><br></p>
<p class="p1">* [get](https://shopify.dev/docs/api/admin-rest/latest/resources/abandoned-checkouts.md#get-checkouts?limit=1)</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">  </span>[/admin/api/latest/checkouts.​json?limit=1](https://shopify.dev/docs/api/admin-rest/latest/resources/abandoned-checkouts.md#get-checkouts?limit=1)</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">  </span>Retrieves a list of abandoned checkouts</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">  </span>[abandonedCheckouts](https://shopify.dev/docs/api/admin-graphql/latest/queries/abandonedCheckouts?example=retrieves-a-list-of-abandoned-checkouts)</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">## The Abandoned checkouts resource</p>
<p class="p2"><br></p>
<p class="p1">### Properties</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">abandoned\_checkout\_url</p>
<p class="p2"><br></p>
<p class="p1">-&gt;[abandonedCheckoutUrl](https://shopify.dev/docs/api/admin-graphql/latest/objects/AbandonedCheckout#field-AbandonedCheckout.fields.abandonedCheckoutUrl)</p>
<p class="p2"><br></p>
<p class="p1">The recovery URL that's sent to a customer so they can recover their checkout.</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">billing\_address</p>
<p class="p2"><br></p>
<p class="p1">[](https://shopify.dev/apps/store/data-protection/protected-customer-data)</p>
<p class="p2"><br></p>
<p class="p1">-&gt;[billingAddress](https://shopify.dev/docs/api/admin-graphql/latest/objects/AbandonedCheckout#field-AbandonedCheckout.fields.billingAddress)</p>
<p class="p2"><br></p>
<p class="p1">The mailing address associated with the payment method. It has the following properties:</p>
<p class="p2"><br></p>
<p class="p1">* **address1**: The street address of the billing address.</p>
<p class="p1">* **address2**: An optional additional field for the street address of the billing address.</p>
<p class="p1">* **city**: The city of the billing address.</p>
<p class="p1">* **company**: The company of the person associated with the billing address.</p>
<p class="p1">* **country**: The name of the country of the billing address.</p>
<p class="p1">* **country\_code**: The two-letter code ([ISO 3166-1 alpha-2 format](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)) for the country of the billing address.</p>
<p class="p1">* **default**: Whether this is the default address for the customer.</p>
<p class="p1">* **first\_name**: The first name of the person associated with the payment method.</p>
<p class="p1">* **last\_name**: The last name of the person associated with the payment method.</p>
<p class="p1">* **latitude**: The latitude of the billing address.</p>
<p class="p1">* **longitude**: The longitude of the billing address.</p>
<p class="p1">* **name**: The full name of the person associated with the payment method.</p>
<p class="p1">* **phone**: The phone number at the billing address.</p>
<p class="p1">* **province**: The name of the state or province of the billing address.</p>
<p class="p1">* **province\_code**: The alphanumeric abbreviation of the state or province of the billing address.</p>
<p class="p1">* **zip**: The zip or postal code of the billing address.</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">buyer\_accepts\_marketing</p>
<p class="p2"><br></p>
<p class="p1">-&gt;[emailMarketingConsent](https://shopify.dev/docs/api/admin-graphql/latest/objects/Customer#field-Customer.fields.emailMarketingConsent)</p>
<p class="p2"><br></p>
<p class="p1">Whether the customer would like to receive email updates from the shop. This is set by the **I want to receive occasional emails about new products, promotions and other news** checkbox during checkout.</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">buyer\_accepts\_sms\_marketing</p>
<p class="p2"><br></p>
<p class="p1">-&gt;[smsMarketingConsent](https://shopify.dev/docs/api/admin-graphql/latest/objects/Customer#field-Customer.fields.smsMarketingConsent)</p>
<p class="p2"><br></p>
<p class="p1">Whether the customer would like to receive SMS updates from the shop. This is set by the **Text me with news and offers** checkbox during checkout.</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">cart\_token</p>
<p class="p2"><br></p>
<p class="p1">**deprecated**</p>
<p class="p2"><br></p>
<p class="p1">The ID for the cart that's attached to the checkout.</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">closed\_at</p>
<p class="p2"><br></p>
<p class="p1">**deprecated**</p>
<p class="p2"><br></p>
<p class="p1">The date and time ([ISO 8601 format](https://en.wikipedia.org/wiki/ISO_8601)) when the checkout was closed. If the checkout was not closed, then this value is `null`.</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">completed\_at</p>
<p class="p2"><br></p>
<p class="p1">-&gt;[completedAt](https://shopify.dev/docs/api/admin-graphql/latest/objects/AbandonedCheckout#field-AbandonedCheckout.fields.completedAt)</p>
<p class="p2"><br></p>
<p class="p1">The date and time ([ISO 8601 format](https://en.wikipedia.org/wiki/ISO_8601)) when the checkout was completed. For abandoned checkouts, this value is `null` until a customer completes the checkout using the recovery URL.</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">created\_at</p>
<p class="p2"><br></p>
<p class="p1">-&gt;[createdAt](https://shopify.dev/docs/api/admin-graphql/latest/objects/AbandonedCheckout#field-AbandonedCheckout.fields.createdAt)</p>
<p class="p2"><br></p>
<p class="p1">The date and time ([ISO 8601 format](https://en.wikipedia.org/wiki/ISO_8601)) when the checkout was created.</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">currency</p>
<p class="p2"><br></p>
<p class="p1">**deprecated**</p>
<p class="p2"><br></p>
<p class="p1">The three-letter code ([ISO 4217](https://en.wikipedia.org/wiki/ISO_4217) format) of the shop's default currency at the time of checkout. For the currency that the customer used at checkout, see `presentment_currency`.</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">customer</p>
<p class="p2"><br></p>
<p class="p1">[](https://shopify.dev/apps/store/data-protection/protected-customer-data)</p>
<p class="p2"><br></p>
<p class="p1">-&gt;[customer](https://shopify.dev/docs/api/admin-graphql/latest/objects/AbandonedCheckout#field-AbandonedCheckout.fields.customer)</p>
<p class="p2"><br></p>
<p class="p1">The customer details associated with the abandoned checkout. For more information, refer to the [Customer](https://shopify.dev/api/admin-rest/latest/resources/customer) resource.</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">customer\_locale</p>
<p class="p2"><br></p>
<p class="p1">-&gt;[locale](https://shopify.dev/docs/api/admin-graphql/latest/objects/Customer#field-Customer.fields.locale)</p>
<p class="p2"><br></p>
<p class="p1">The two or three-letter language code, optionally followed by a region modifier. Example values: `en`, `en-CA`.</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">device\_id</p>
<p class="p2"><br></p>
<p class="p1">**deprecated**</p>
<p class="p2"><br></p>
<p class="p1">The ID of the Shopify POS device that created the checkout. This field is **deprecated**.</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">{}</p>
<p class="p2"><br></p>
<p class="p1">## The Abandoned checkouts resource</p>
<p class="p2"><br></p>
<p class="p1">```json</p>
<p class="p1">{</p>
<p class="p1"><span class="Apple-converted-space">  </span>"abandoned_checkout_url": "https://www.snowdevil.ca/14168/checkouts/0123456789abcdef0456456789abcdef/recover?key=6dacd6065bb80268bda857ee",</p>
<p class="p1"><span class="Apple-converted-space">  </span>"billing_address": {</p>
<p class="p1"><span class="Apple-converted-space">    </span>"address1": "Chestnut Street 92",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"address2": "",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"city": "Louisville",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"company": null,</p>
<p class="p1"><span class="Apple-converted-space">    </span>"country": "United States",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"country_code": "US",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"default": true,</p>
<p class="p1"><span class="Apple-converted-space">    </span>"first_name": "Greg",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"id": 207119551,</p>
<p class="p1"><span class="Apple-converted-space">    </span>"last_name": "Piotrowski",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"name": "Greg Piotrowski",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"phone": "555-625-1199",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"province": "Kentucky",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"province_code": "KY",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"zip": "40202"</p>
<p class="p1"><span class="Apple-converted-space">  </span>},</p>
<p class="p1"><span class="Apple-converted-space">  </span>"buyer_accepts_marketing": false,</p>
<p class="p1"><span class="Apple-converted-space">  </span>"buyer_accepts_sms_marketing": false,</p>
<p class="p1"><span class="Apple-converted-space">  </span>"cart_token": "0123456789abcdef0456456789abcdef",</p>
<p class="p1"><span class="Apple-converted-space">  </span>"closed_at": null,</p>
<p class="p1"><span class="Apple-converted-space">  </span>"completed_at": null,</p>
<p class="p1"><span class="Apple-converted-space">  </span>"created_at": "2008-01-10T11:00:00-05:00",</p>
<p class="p1"><span class="Apple-converted-space">  </span>"currency": {</p>
<p class="p1"><span class="Apple-converted-space">    </span>"currency": "USD"</p>
<p class="p1"><span class="Apple-converted-space">  </span>},</p>
<p class="p1"><span class="Apple-converted-space">  </span>"customer": {</p>
<p class="p1"><span class="Apple-converted-space">    </span>"accepts_marketing": false,</p>
<p class="p1"><span class="Apple-converted-space">    </span>"created_at": "2012-03-13T16:09:55-04:00",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"email": "bob.norman@mail.example.com",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"first_name": "Bob",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"id": 207119551,</p>
<p class="p1"><span class="Apple-converted-space">    </span>"last_name": "Norman",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"note": null,</p>
<p class="p1"><span class="Apple-converted-space">    </span>"orders_count": "0",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"state": null,</p>
<p class="p1"><span class="Apple-converted-space">    </span>"total_spent": "0.00",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"updated_at": "2012-03-13T16:09:55-04:00",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"tags": "tagcity"</p>
<p class="p1"><span class="Apple-converted-space">  </span>},</p>
<p class="p1"><span class="Apple-converted-space">  </span>"customer_locale": "fr",</p>
<p class="p1"><span class="Apple-converted-space">  </span>"device_id": 1,</p>
<p class="p1"><span class="Apple-converted-space">  </span>"discount_codes": [</p>
<p class="p1"><span class="Apple-converted-space">    </span>{</p>
<p class="p1"><span class="Apple-converted-space">      </span>"discount_code": {</p>
<p class="p1"><span class="Apple-converted-space">        </span>"id": 507328175,</p>
<p class="p1"><span class="Apple-converted-space">        </span>"code": "WINTERSALE20OFF",</p>
<p class="p1"><span class="Apple-converted-space">        </span>"usage_count": 0,</p>
<p class="p1"><span class="Apple-converted-space">        </span>"created_at": "2017-09-25T19:32:28-04:00",</p>
<p class="p1"><span class="Apple-converted-space">        </span>"updated_at": "2017-09-25T19:32:28-04:00"</p>
<p class="p1"><span class="Apple-converted-space">      </span>}</p>
<p class="p1"><span class="Apple-converted-space">    </span>}</p>
<p class="p1"><span class="Apple-converted-space">  </span>],</p>
<p class="p1"><span class="Apple-converted-space">  </span>"email": "bob.norman@mail.example.com",</p>
<p class="p1"><span class="Apple-converted-space">  </span>"gateway": "authorize_net",</p>
<p class="p1"><span class="Apple-converted-space">  </span>"id": 450789469,</p>
<p class="p1"><span class="Apple-converted-space">  </span>"landing_site": "http://www.example.com?source=abc",</p>
<p class="p1"><span class="Apple-converted-space">  </span>"line_items": {</p>
<p class="p1"><span class="Apple-converted-space">    </span>"price": 214,</p>
<p class="p1"><span class="Apple-converted-space">    </span>"product_id": 431300801,</p>
<p class="p1"><span class="Apple-converted-space">    </span>"quantity": 4,</p>
<p class="p1"><span class="Apple-converted-space">    </span>"sku": "SKU123",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"title": "Jib",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"variant_id": 233402193,</p>
<p class="p1"><span class="Apple-converted-space">    </span>"variant_title": "Green",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"vendor": "Ottawa Sail Shop"</p>
<p class="p1"><span class="Apple-converted-space">  </span>},</p>
<p class="p1"><span class="Apple-converted-space">  </span>"location_id": 1,</p>
<p class="p1"><span class="Apple-converted-space">  </span>"note": null,</p>
<p class="p1"><span class="Apple-converted-space">  </span>"phone": {</p>
<p class="p1"><span class="Apple-converted-space">    </span>"phone": "+13125551212"</p>
<p class="p1"><span class="Apple-converted-space">  </span>},</p>
<p class="p1"><span class="Apple-converted-space">  </span>"presentment_currency": {</p>
<p class="p1"><span class="Apple-converted-space">    </span>"presentment_currency": "USD"</p>
<p class="p1"><span class="Apple-converted-space">  </span>},</p>
<p class="p1"><span class="Apple-converted-space">  </span>"referring_site": "http://www.anexample.com",</p>
<p class="p1"><span class="Apple-converted-space">  </span>"shipping_address": {</p>
<p class="p1"><span class="Apple-converted-space">    </span>"address1": "Chestnut Street 92",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"address2": "Apt 2",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"city": "Louisville",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"company": null,</p>
<p class="p1"><span class="Apple-converted-space">    </span>"country": "United States",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"first_name": "Bob",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"last_name": "Norman",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"latitude": "45.41634",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"longitude": "-75.6868",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"phone": "555-625-1199",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"province": "Kentucky",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"zip": "40202",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"name": "Bob Norman",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"country_code": "US",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"province_code": "KY"</p>
<p class="p1"><span class="Apple-converted-space">  </span>},</p>
<p class="p1"><span class="Apple-converted-space">  </span>"sms_marketing_phone": "+16135555555",</p>
<p class="p1"><span class="Apple-converted-space">  </span>"shipping_lines": {</p>
<p class="p1"><span class="Apple-converted-space">    </span>"code": "Free Shipping",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"price": "0.00",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"source": "shopify",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"title": "Free Shipping"</p>
<p class="p1"><span class="Apple-converted-space">  </span>},</p>
<p class="p1"><span class="Apple-converted-space">  </span>"source_name": "web",</p>
<p class="p1"><span class="Apple-converted-space">  </span>"subtotal_price": "398.00",</p>
<p class="p1"><span class="Apple-converted-space">  </span>"tax_lines": {</p>
<p class="p1"><span class="Apple-converted-space">    </span>"price": "11.94",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"rate": 0.06,</p>
<p class="p1"><span class="Apple-converted-space">    </span>"title": "State Tax",</p>
<p class="p1"><span class="Apple-converted-space">    </span>"channel_liable": true</p>
<p class="p1"><span class="Apple-converted-space">  </span>},</p>
<p class="p1"><span class="Apple-converted-space">  </span>"taxes_included": false,</p>
<p class="p1"><span class="Apple-converted-space">  </span>"token": "b1946ac92492d2347c6235b4d2611184",</p>
<p class="p1"><span class="Apple-converted-space">  </span>"total_discounts": "0.00",</p>
<p class="p1"><span class="Apple-converted-space">  </span>"total_duties": "105.31",</p>
<p class="p1"><span class="Apple-converted-space">  </span>"total_line_items_price": "398.00",</p>
<p class="p1"><span class="Apple-converted-space">  </span>"total_price": "409.94",</p>
<p class="p1"><span class="Apple-converted-space">  </span>"total_tax": "11.94",</p>
<p class="p1"><span class="Apple-converted-space">  </span>"total_weight": 400,</p>
<p class="p1"><span class="Apple-converted-space">  </span>"updated_at": "2012-08-24T14:02:15-04:00",</p>
<p class="p1"><span class="Apple-converted-space">  </span>"user_id": 1</p>
<p class="p1">}</p>
<p class="p1">```</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">## getRetrieves a count of checkouts</p>
<p class="p2"><br></p>
<p class="p1">[abandonedCheckoutsCount](https://shopify.dev/docs/api/admin-graphql/latest/queries/abandonedCheckoutsCount?example=retrieves-a-count-of-checkouts)</p>
<p class="p2"><br></p>
<p class="p1">Retrieves a count of checkouts from the past 90 days</p>
<p class="p2"><br></p>
<p class="p1">### Parameters</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">api\_version</p>
<p class="p2"><br></p>
<p class="p1">**string**</p>
<p class="p2"><br></p>
<p class="p1">**required**</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">created\_at\_max</p>
<p class="p2"><br></p>
<p class="p1">Count checkouts created before the specified date. (format: 2014-04-25T16:15:47-04:00)</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">created\_at\_min</p>
<p class="p2"><br></p>
<p class="p1">Count checkouts created after the specified date. (format: 2014-04-25T16:15:47-04:00)</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">since\_id</p>
<p class="p2"><br></p>
<p class="p1">Restrict results to after the specified ID.</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">status</p>
<p class="p2"><br></p>
<p class="p1">**default open**</p>
<p class="p2"><br></p>
<p class="p1">Count checkouts with a given status.</p>
<p class="p2"><br></p>
<p class="p1">* **open**: Count only open abandoned checkouts.</p>
<p class="p2"><br></p>
<p class="p1">* **closed**: Count only closed abandoned checkouts that have been archived.</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">updated\_at\_max</p>
<p class="p2"><br></p>
<p class="p1">Count checkouts last updated before the specified date. (format: 2014-04-25T16:15:47-04:00)</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">updated\_at\_min</p>
<p class="p2"><br></p>
<p class="p1">Count checkouts last updated after the specified date. (format: 2014-04-25T16:15:47-04:00)</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">### Examples</p>
<p class="p2"><br></p>
<p class="p1">### Count abandoned checkouts created before date specified</p>
<p class="p2"><br></p>
<p class="p1">### Query parameters</p>
<p class="p2"><br></p>
<p class="p1">created\_​at\_​max=​2013-10-12T07:05:27-02:00</p>
<p class="p2"><br></p>
<p class="p1">Count checkouts created before the specified date. (format: 2014-04-25T16:15:47-04:00)</p>
<p class="p2"><br></p>
<p class="p1">### Count all abandoned checkouts</p>
<p class="p2"><br></p>
<p class="p1">### Count closed abandoned checkouts</p>
<p class="p2"><br></p>
<p class="p1">### Query parameters</p>
<p class="p2"><br></p>
<p class="p1">status=​closed</p>
<p class="p2"><br></p>
<p class="p1">**default open**</p>
<p class="p2"><br></p>
<p class="p1">Count checkouts with a given status.</p>
<p class="p2"><br></p>
<p class="p1">* **open**: Count only open abandoned checkouts.</p>
<p class="p2"><br></p>
<p class="p1">* **closed**: Count only closed abandoned checkouts that have been archived.</p>
<p class="p2"><br></p>
<p class="p1">get</p>
<p class="p2"><br></p>
<p class="p1">## /admin/api/2026-01/checkouts.​json?created\_​at\_​max=​2013-10-12T07:05:27-02:00</p>
<p class="p2"><br></p>
<p class="p1">```bash</p>
<p class="p1">curl -X GET "https://your-development-store.myshopify.com/admin/api/2026-01/checkouts.json?created_at_max=2013-10-12T07%3A05%3A27-02%3A00" \</p>
<p class="p1">-H "X-Shopify-Access-Token: {access_token}"</p>
<p class="p1">```</p>
<p class="p2"><br></p>
<p class="p1">{}</p>
<p class="p2"><br></p>
<p class="p1">## Response</p>
<p class="p2"><br></p>
<p class="p1">JSON</p>
<p class="p2"><br></p>
<p class="p1">```json</p>
<p class="p1">HTTP/1.1 200 OK</p>
<p class="p1">{</p>
<p class="p1"><span class="Apple-converted-space">  </span>"checkouts": [</p>
<p class="p1"><span class="Apple-converted-space">    </span>{</p>
<p class="p1"><span class="Apple-converted-space">      </span>"id": 450789469,</p>
<p class="p1"><span class="Apple-converted-space">      </span>"token": "2a1ace52255252df566af0faaedfbfa7",</p>
<p class="p1"><span class="Apple-converted-space">      </span>"cart_token": "68778783ad298f1c80c3bafcddeea02f",</p>
<p class="p1"><span class="Apple-converted-space">      </span>"email": "bob.norman@mail.example.com",</p>
<p class="p1"><span class="Apple-converted-space">      </span>"gateway": null,</p>
<p class="p1"><span class="Apple-converted-space">      </span>"buyer_accepts_marketing": false,</p>
<p class="p1"><span class="Apple-converted-space">      </span>"created_at": "2012-10-12T07:05:27-04:00",</p>
<p class="p1"><span class="Apple-converted-space">      </span>"updated_at": "2012-10-12T07:05:27-04:00",</p>
<p class="p1"><span class="Apple-converted-space">      </span>"landing_site": null,</p>
<p class="p1"><span class="Apple-converted-space">      </span>"note": null,</p>
<p class="p1"><span class="Apple-converted-space">      </span>"note_attributes": [</p>
<p class="p1"><span class="Apple-converted-space">        </span>{</p>
<p class="p1"><span class="Apple-converted-space">          </span>"name": "custom engraving",</p>
<p class="p1"><span class="Apple-converted-space">          </span>"value": "Happy Birthday"</p>
<p class="p1"><span class="Apple-converted-space">        </span>},</p>
<p class="p1"><span class="Apple-converted-space">        </span>{</p>
<p class="p1"><span class="Apple-converted-space">          </span>"name": "colour",</p>
<p class="p1"><span class="Apple-converted-space">          </span>"value": "green"</p>
<p class="p1"><span class="Apple-converted-space">        </span>}</p>
<p class="p1"><span class="Apple-converted-space">      </span>],</p>
<p class="p1"><span class="Apple-converted-space">      </span>"referring_site": null,</p>
<p class="p1"><span class="Apple-converted-space">      </span>"shipping_lines": [</p>
<p class="p1"><span class="Apple-converted-space">        </span>{</p>
<p class="p1"><span class="Apple-converted-space">          </span>"code": "Free Shipping",</p>
<p class="p1"><span class="Apple-converted-space">          </span>"price": "0.00",</p>
<p class="p1"><span class="Apple-converted-space">          </span>"original_shop_price": null,</p>
<p class="p1"><span class="Apple-converted-space">          </span>"original_rate_price": null,</p>
<p class="p1"><span class="Apple-converted-space">          </span>"original_shop_markup": null,</p>
<p class="p1"><span class="Apple-converted-space">          </span>"source": "shopify",</p>
<p class="p1"><span class="Apple-converted-space">          </span>"title": "Free Shipping",</p>
<p class="p1"><span class="Apple-converted-space">          </span>"presentment_title": null,</p>
<p class="p1"><span class="Apple-converted-space">          </span>"phone": null,</p>
<p class="p1">```</p>
<p class="p2"><br></p>
<p class="p1">### examples</p>
<p class="p2"><br></p>
<p class="p1">* #### Count abandoned checkouts created before date specified</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">  </span>#####</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">  </span>```curl</p>
<p class="p1"><span class="Apple-converted-space">  </span>curl -X GET "https://your-development-store.myshopify.com/admin/api/2026-01/checkouts.json?created_at_max=2013-10-12T07%3A05%3A27-02%3A00" \</p>
<p class="p1"><span class="Apple-converted-space">  </span>-H "X-Shopify-Access-Token: {access_token}"</p>
<p class="p1"><span class="Apple-converted-space">  </span>```</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">  </span>#### response</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">  </span>```json</p>
<p class="p1"><span class="Apple-converted-space">  </span>HTTP/1.1 200 OK{"checkouts":[{"id":450789469,"token":"2a1ace52255252df566af0faaedfbfa7","cart_token":"68778783ad298f1c80c3bafcddeea02f","email":"bob.norman@mail.example.com","gateway":null,"buyer_accepts_marketing":false,"created_at":"2012-10-12T07:05:27-04:00","updated_at":"2012-10-12T07:05:27-04:00","landing_site":null,"note":null,"note_attributes":[{"name":"custom engraving","value":"Happy Birthday"},{"name":"colour","value":"green"}],"referring_site":null,"shipping_lines":[{"code":"Free Shipping","price":"0.00","original_shop_price":null,"original_rate_price":null,"original_shop_markup":null,"source":"shopify","title":"Free Shipping","presentment_title":null,"phone":null,"tax_lines":null,"custom_tax_lines":null,"markup":null,"delivery_category":null,"carrier_identifier":null,"carrier_service_id":null,"api_client_id":null,"requested_fulfillment_service_id":null,"applied_discounts":[],"delivery_option_group_type":null,"delivery_expectation_range":null,"delivery_expectation_type":null,"estimated_delivery_time_range":null,"id":"5da41c1738454765","validation_context":null}],"taxes_included":false,"total_weight":400,"currency":"USD","completed_at":null,"closed_at":null,"user_id":null,"location_id":null,"source_identifier":null,"source_url":null,"device_id":null,"phone":null,"customer_locale":"en","line_items":[{"applied_discounts":[],"discount_allocations":[{"id":null,"amount":"19.90","description":"TENOFF","created_at":null,"application_type":"discount_code","discount_class":"ORDER"}],"key":"f32827a8d00b0a8d","destination_location_id":null,"fulfillment_service":"manual","gift_card":false,"grams":200,"origin_location_id":null,"presentment_title":"IPod Nano - 8GB","presentment_variant_title":"Red","product_id":632910392,"properties":null,"quantity":1,"requires_shipping":true,"sku":"IPOD2008RED","tax_lines":[],"taxable":true,"title":"IPod Nano - 8GB","variant_id":49148385,"variant_title":"Red","variant_price":null,"vendor":"Apple","user_id":null,"unit_price_measurement":null,"rank":null,"compare_at_price":null,"line_price":"199.00","price":"199.00"},{"applied_discounts":[],"discount_allocations":[{"id":null,"amount":"19.90","description":"TENOFF","created_at":null,"application_type":"discount_code","discount_class":"ORDER"}],"key":"7e8c529027b9a00e","destination_location_id":null,"fulfillment_service":"manual","gift_card":false,"grams":200,"origin_location_id":null,"presentment_title":"IPod Nano - 8GB","presentment_variant_title":"Pink","product_id":632910392,"properties":null,"quantity":1,"requires_shipping":true,"sku":"IPOD2008PINK","tax_lines":[],"taxable":true,"title":"IPod Nano - 8GB","variant_id":808950810,"variant_title":"Pink","variant_price":null,"vendor":"Apple","user_id":null,"unit_price_measurement":null,"rank":null,"compare_at_price":null,"line_price":"199.00","price":"199.00"}],"name":"#450789469","source":null,"abandoned_checkout_url":"https://checkout.local/548380009/checkouts/2a1ace52255252df566af0faaedfbfa7/recover","discount_codes":[{"code":"TENOFF","amount":"39.80","type":"percentage"}],"tax_lines":[{"price":"21.49","rate":0.06,"title":"State Tax","channel_liable":null}],"source_name":"web","presentment_currency":"USD","buyer_accepts_sms_marketing":false,"sms_marketing_phone":null,"total_discounts":"39.80","total_line_items_price":"398.00","total_price":"379.69","total_tax":"21.49","subtotal_price":"358.20","total_duties":null,"reservation_token":"0123456789abcdef0123456789zjkw","billing_address":{"first_name":"Bob","address1":"Chestnut Street 92","phone":"+1(502)-459-2181","city":"Louisville","zip":"40202","province":"Kentucky","country":"United States","last_name":"Norman","address2":"","company":null,"latitude":45.41634,"longitude":-75.6868,"name":"Bob Norman","country_code":"US","province_code":"KY"},"shipping_address":{"first_name":"Bob","address1":"Chestnut Street 92","phone":"+1(502)-459-2181","city":"Louisville","zip":"40202","province":"Kentucky","country":"United States","last_name":"Norman","address2":"","company":null,"latitude":45.41634,"longitude":-75.6868,"name":"Bob Norman","country_code":"US","province_code":"KY"},"customer":{"id":207119551,"created_at":"2026-01-09T22:32:40-05:00","updated_at":"2026-01-09T22:32:40-05:00","first_name":"Bob","last_name":"Norman","state":"disabled","note":null,"verified_email":true,"multipass_identifier":null,"tax_exempt":false,"email":"bob.norman@mail.example.com","phone":"+16136120707","currency":"USD","tax_exemptions":[],"admin_graphql_api_id":"gid://shopify/Customer/207119551","default_address":{"id":207119551,"customer_id":207119551,"first_name":null,"last_name":null,"company":null,"address1":"Chestnut Street 92","address2":"","city":"Louisville","province":"Kentucky","country":"United States","zip":"40202","phone":"555-625-1199","name":"","province_code":"KY","country_code":"US","country_name":"United States","default":true}}}]}</p>
<p class="p1"><span class="Apple-converted-space">  </span>```</p>
<p class="p2"><br></p>
<p class="p1">* #### Count all abandoned checkouts</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">  </span>#####</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">  </span>```curl</p>
<p class="p1"><span class="Apple-converted-space">  </span>curl -X GET "https://your-development-store.myshopify.com/admin/api/2026-01/checkouts.json" \</p>
<p class="p1"><span class="Apple-converted-space">  </span>-H "X-Shopify-Access-Token: {access_token}"</p>
<p class="p1"><span class="Apple-converted-space">  </span>```</p>
<p class="p2"><br></p>
<p class="p1">* #### Count closed abandoned checkouts</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">  </span>#####</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">  </span>```curl</p>
<p class="p1"><span class="Apple-converted-space">  </span>curl -X GET "https://your-development-store.myshopify.com/admin/api/2026-01/checkouts.json?status=closed" \</p>
<p class="p1"><span class="Apple-converted-space">  </span>-H "X-Shopify-Access-Token: {access_token}"</p>
<p class="p1"><span class="Apple-converted-space">  </span>```</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">## getRetrieves a list of abandoned checkouts</p>
<p class="p2"><br></p>
<p class="p1">[abandonedCheckouts](https://shopify.dev/docs/api/admin-graphql/latest/queries/abandonedCheckouts?example=retrieves-a-list-of-abandoned-checkouts)</p>
<p class="p2"><br></p>
<p class="p1">Retrieves a list of abandoned checkouts.</p>
<p class="p2"><br></p>
<p class="p1">### Parameters</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">api\_version</p>
<p class="p2"><br></p>
<p class="p1">**string**</p>
<p class="p2"><br></p>
<p class="p1">**required**</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">created\_at\_max</p>
<p class="p2"><br></p>
<p class="p1">Show checkouts created before the specified date. (format: 2014-04-25T16:15:47-04:00)</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">created\_at\_min</p>
<p class="p2"><br></p>
<p class="p1">Show checkouts created after the specified date. (format: 2014-04-25T16:15:47-04:00)</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">limit</p>
<p class="p2"><br></p>
<p class="p1">**≤ 250**</p>
<p class="p2"><br></p>
<p class="p1">**default 50**</p>
<p class="p2"><br></p>
<p class="p1">The maximum number of results to show.</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">since\_id</p>
<p class="p2"><br></p>
<p class="p1">Restrict results to after the specified ID.</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">status</p>
<p class="p2"><br></p>
<p class="p1">**default open**</p>
<p class="p2"><br></p>
<p class="p1">Show only checkouts with a given status.</p>
<p class="p2"><br></p>
<p class="p1">* **open**: Show only open abandoned checkouts.</p>
<p class="p2"><br></p>
<p class="p1">* **closed**: Count only closed abandoned checkouts that have been archived.</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">updated\_at\_max</p>
<p class="p2"><br></p>
<p class="p1">Show checkouts last updated before the specified date. (format: 2014-04-25T16:15:47-04:00)</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">updated\_at\_min</p>
<p class="p2"><br></p>
<p class="p1">Show checkouts last updated after the specified date. (format: 2014-04-25T16:15:47-04:00)</p>
<p class="p2"><br></p>
<p class="p1">***</p>
<p class="p2"><br></p>
<p class="p1">### Examples</p>
<p class="p2"><br></p>
<p class="p1">### Retrieve a limited number of abandoned checkouts</p>
<p class="p2"><br></p>
<p class="p1">### Query parameters</p>
<p class="p2"><br></p>
<p class="p1">limit=​1</p>
<p class="p2"><br></p>
<p class="p1">**≤ 250**</p>
<p class="p2"><br></p>
<p class="p1">**default 50**</p>
<p class="p2"><br></p>
<p class="p1">The maximum number of results to show.</p>
<p class="p2"><br></p>
<p class="p1">### Retrieve all abandoned checkouts</p>
<p class="p2"><br></p>
<p class="p1">### Retrieve checkouts created before date specified</p>
<p class="p2"><br></p>
<p class="p1">### Query parameters</p>
<p class="p2"><br></p>
<p class="p1">created\_​at\_​max=​2013-10-12T07:05:27-02:00</p>
<p class="p2"><br></p>
<p class="p1">Show checkouts created before the specified date. (format: 2014-04-25T16:15:47-04:00)</p>
<p class="p2"><br></p>
<p class="p1">### Retrieve closed abandoned checkouts</p>
<p class="p2"><br></p>
<p class="p1">### Query parameters</p>
<p class="p2"><br></p>
<p class="p1">status=​closed</p>
<p class="p2"><br></p>
<p class="p1">**default open**</p>
<p class="p2"><br></p>
<p class="p1">Show only checkouts with a given status.</p>
<p class="p2"><br></p>
<p class="p1">* **open**: Show only open abandoned checkouts.</p>
<p class="p2"><br></p>
<p class="p1">* **closed**: Count only closed abandoned checkouts that have been archived.</p>
<p class="p2"><br></p>
<p class="p1">get</p>
<p class="p2"><br></p>
<p class="p1">## /admin/api/2026-01/checkouts.​json?limit=​1</p>
<p class="p2"><br></p>
<p class="p1">```bash</p>
<p class="p1">curl -X GET "https://your-development-store.myshopify.com/admin/api/2026-01/checkouts.json?limit=1" \</p>
<p class="p1">-H "X-Shopify-Access-Token: {access_token}"</p>
<p class="p1">```</p>
<p class="p2"><br></p>
<p class="p1">{}</p>
<p class="p2"><br></p>
<p class="p1">## Response</p>
<p class="p2"><br></p>
<p class="p1">JSON</p>
<p class="p2"><br></p>
<p class="p1">```json</p>
<p class="p1">HTTP/1.1 200 OK</p>
<p class="p1">{</p>
<p class="p1"><span class="Apple-converted-space">  </span>"checkouts": [</p>
<p class="p1"><span class="Apple-converted-space">    </span>{</p>
<p class="p1"><span class="Apple-converted-space">      </span>"id": 450789469,</p>
<p class="p1"><span class="Apple-converted-space">      </span>"token": "2a1ace52255252df566af0faaedfbfa7",</p>
<p class="p1"><span class="Apple-converted-space">      </span>"cart_token": "68778783ad298f1c80c3bafcddeea02f",</p>
<p class="p1"><span class="Apple-converted-space">      </span>"email": "bob.norman@mail.example.com",</p>
<p class="p1"><span class="Apple-converted-space">      </span>"gateway": null,</p>
<p class="p1"><span class="Apple-converted-space">      </span>"buyer_accepts_marketing": false,</p>
<p class="p1"><span class="Apple-converted-space">      </span>"created_at": "2012-10-12T07:05:27-04:00",</p>
<p class="p1"><span class="Apple-converted-space">      </span>"updated_at": "2012-10-12T07:05:27-04:00",</p>
<p class="p1"><span class="Apple-converted-space">      </span>"landing_site": null,</p>
<p class="p1"><span class="Apple-converted-space">      </span>"note": null,</p>
<p class="p1"><span class="Apple-converted-space">      </span>"note_attributes": [</p>
<p class="p1"><span class="Apple-converted-space">        </span>{</p>
<p class="p1"><span class="Apple-converted-space">          </span>"name": "custom engraving",</p>
<p class="p1"><span class="Apple-converted-space">          </span>"value": "Happy Birthday"</p>
<p class="p1"><span class="Apple-converted-space">        </span>},</p>
<p class="p1"><span class="Apple-converted-space">        </span>{</p>
<p class="p1"><span class="Apple-converted-space">          </span>"name": "colour",</p>
<p class="p1"><span class="Apple-converted-space">          </span>"value": "green"</p>
<p class="p1"><span class="Apple-converted-space">        </span>}</p>
<p class="p1"><span class="Apple-converted-space">      </span>],</p>
<p class="p1"><span class="Apple-converted-space">      </span>"referring_site": null,</p>
<p class="p1"><span class="Apple-converted-space">      </span>"shipping_lines": [</p>
<p class="p1"><span class="Apple-converted-space">        </span>{</p>
<p class="p1"><span class="Apple-converted-space">          </span>"code": "Free Shipping",</p>
<p class="p1"><span class="Apple-converted-space">          </span>"price": "0.00",</p>
<p class="p1"><span class="Apple-converted-space">          </span>"original_shop_price": null,</p>
<p class="p1"><span class="Apple-converted-space">          </span>"original_rate_price": null,</p>
<p class="p1"><span class="Apple-converted-space">          </span>"original_shop_markup": null,</p>
<p class="p1"><span class="Apple-converted-space">          </span>"source": "shopify",</p>
<p class="p1"><span class="Apple-converted-space">          </span>"title": "Free Shipping",</p>
<p class="p1"><span class="Apple-converted-space">          </span>"presentment_title": null,</p>
<p class="p1"><span class="Apple-converted-space">          </span>"phone": null,</p>
<p class="p1">```</p>
<p class="p2"><br></p>
<p class="p1">### examples</p>
<p class="p2"><br></p>
<p class="p1">* #### Retrieve a limited number of abandoned checkouts</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">  </span>#####</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">  </span>```curl</p>
<p class="p1"><span class="Apple-converted-space">  </span>curl -X GET "https://your-development-store.myshopify.com/admin/api/2026-01/checkouts.json?limit=1" \</p>
<p class="p1"><span class="Apple-converted-space">  </span>-H "X-Shopify-Access-Token: {access_token}"</p>
<p class="p1"><span class="Apple-converted-space">  </span>```</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">  </span>#### response</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">  </span>```json</p>
<p class="p1"><span class="Apple-converted-space">  </span>HTTP/1.1 200 OK{"checkouts":[{"id":450789469,"token":"2a1ace52255252df566af0faaedfbfa7","cart_token":"68778783ad298f1c80c3bafcddeea02f","email":"bob.norman@mail.example.com","gateway":null,"buyer_accepts_marketing":false,"created_at":"2012-10-12T07:05:27-04:00","updated_at":"2012-10-12T07:05:27-04:00","landing_site":null,"note":null,"note_attributes":[{"name":"custom engraving","value":"Happy Birthday"},{"name":"colour","value":"green"}],"referring_site":null,"shipping_lines":[{"code":"Free Shipping","price":"0.00","original_shop_price":null,"original_rate_price":null,"original_shop_markup":null,"source":"shopify","title":"Free Shipping","presentment_title":null,"phone":null,"tax_lines":null,"custom_tax_lines":null,"markup":null,"delivery_category":null,"carrier_identifier":null,"carrier_service_id":null,"api_client_id":null,"requested_fulfillment_service_id":null,"applied_discounts":[],"delivery_option_group_type":null,"delivery_expectation_range":null,"delivery_expectation_type":null,"estimated_delivery_time_range":null,"id":"5da41c1738454765","validation_context":null}],"taxes_included":false,"total_weight":400,"currency":"USD","completed_at":null,"closed_at":null,"user_id":null,"location_id":null,"source_identifier":null,"source_url":null,"device_id":null,"phone":null,"customer_locale":"en","line_items":[{"applied_discounts":[],"discount_allocations":[{"id":null,"amount":"19.90","description":"TENOFF","created_at":null,"application_type":"discount_code","discount_class":"ORDER"}],"key":"f32827a8d00b0a8d","destination_location_id":null,"fulfillment_service":"manual","gift_card":false,"grams":200,"origin_location_id":null,"presentment_title":"IPod Nano - 8GB","presentment_variant_title":"Red","product_id":632910392,"properties":null,"quantity":1,"requires_shipping":true,"sku":"IPOD2008RED","tax_lines":[],"taxable":true,"title":"IPod Nano - 8GB","variant_id":49148385,"variant_title":"Red","variant_price":null,"vendor":"Apple","user_id":null,"unit_price_measurement":null,"rank":null,"compare_at_price":null,"line_price":"199.00","price":"199.00"},{"applied_discounts":[],"discount_allocations":[{"id":null,"amount":"19.90","description":"TENOFF","created_at":null,"application_type":"discount_code","discount_class":"ORDER"}],"key":"7e8c529027b9a00e","destination_location_id":null,"fulfillment_service":"manual","gift_card":false,"grams":200,"origin_location_id":null,"presentment_title":"IPod Nano - 8GB","presentment_variant_title":"Pink","product_id":632910392,"properties":null,"quantity":1,"requires_shipping":true,"sku":"IPOD2008PINK","tax_lines":[],"taxable":true,"title":"IPod Nano - 8GB","variant_id":808950810,"variant_title":"Pink","variant_price":null,"vendor":"Apple","user_id":null,"unit_price_measurement":null,"rank":null,"compare_at_price":null,"line_price":"199.00","price":"199.00"}],"name":"#450789469","source":null,"abandoned_checkout_url":"https://checkout.local/548380009/checkouts/2a1ace52255252df566af0faaedfbfa7/recover","discount_codes":[{"code":"TENOFF","amount":"39.80","type":"percentage"}],"tax_lines":[{"price":"21.49","rate":0.06,"title":"State Tax","channel_liable":null}],"source_name":"web","presentment_currency":"USD","buyer_accepts_sms_marketing":false,"sms_marketing_phone":null,"total_discounts":"39.80","total_line_items_price":"398.00","total_price":"379.69","total_tax":"21.49","subtotal_price":"358.20","total_duties":null,"reservation_token":"0123456789abcdef0123456789zjkw","billing_address":{"first_name":"Bob","address1":"Chestnut Street 92","phone":"+1(502)-459-2181","city":"Louisville","zip":"40202","province":"Kentucky","country":"United States","last_name":"Norman","address2":"","company":null,"latitude":45.41634,"longitude":-75.6868,"name":"Bob Norman","country_code":"US","province_code":"KY"},"shipping_address":{"first_name":"Bob","address1":"Chestnut Street 92","phone":"+1(502)-459-2181","city":"Louisville","zip":"40202","province":"Kentucky","country":"United States","last_name":"Norman","address2":"","company":null,"latitude":45.41634,"longitude":-75.6868,"name":"Bob Norman","country_code":"US","province_code":"KY"},"customer":{"id":207119551,"created_at":"2026-01-09T22:32:40-05:00","updated_at":"2026-01-09T22:32:40-05:00","first_name":"Bob","last_name":"Norman","state":"disabled","note":null,"verified_email":true,"multipass_identifier":null,"tax_exempt":false,"email":"bob.norman@mail.example.com","phone":"+16136120707","currency":"USD","tax_exemptions":[],"admin_graphql_api_id":"gid://shopify/Customer/207119551","default_address":{"id":207119551,"customer_id":207119551,"first_name":null,"last_name":null,"company":null,"address1":"Chestnut Street 92","address2":"","city":"Louisville","province":"Kentucky","country":"United States","zip":"40202","phone":"555-625-1199","name":"","province_code":"KY","country_code":"US","country_name":"United States","default":true}}}]}</p>
<p class="p1"><span class="Apple-converted-space">  </span>```</p>
<p class="p2"><br></p>
<p class="p1">* #### Retrieve all abandoned checkouts</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">  </span>#####</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">  </span>```curl</p>
<p class="p1"><span class="Apple-converted-space">  </span>curl -X GET "https://your-development-store.myshopify.com/admin/api/2026-01/checkouts.json" \</p>
<p class="p1"><span class="Apple-converted-space">  </span>-H "X-Shopify-Access-Token: {access_token}"</p>
<p class="p1"><span class="Apple-converted-space">  </span>```</p>
<p class="p2"><br></p>
<p class="p1">* #### Retrieve checkouts created before date specified</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">  </span>#####</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">  </span>```curl</p>
<p class="p1"><span class="Apple-converted-space">  </span>curl -X GET "https://your-development-store.myshopify.com/admin/api/2026-01/checkouts.json?created_at_max=2013-10-12T07%3A05%3A27-02%3A00" \</p>
<p class="p1"><span class="Apple-converted-space">  </span>-H "X-Shopify-Access-Token: {access_token}"</p>
<p class="p1"><span class="Apple-converted-space">  </span>```</p>
<p class="p2"><br></p>
<p class="p1">* #### Retrieve closed abandoned checkouts</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">  </span>#####</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">  </span>```curl</p>
<p class="p1"><span class="Apple-converted-space">  </span>curl -X GET "https://your-development-store.myshopify.com/admin/api/2026-01/checkouts.json?status=closed" \</p>
<p class="p1"><span class="Apple-converted-space">  </span>-H "X-Shopify-Access-Token: {access_token}"</p>
<p class="p1"><span class="Apple-converted-space">  </span>```</p>
<p class="p2"><br></p>
<p class="p1">&lt;/page&gt;</p>
</body>
</html>
