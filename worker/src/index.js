const SHOPIFY_API_VERSION = '2024-10';
const SOUTHPORT_LOCATION_ID = 'gid://shopify/Location/11565400107';
const INVENTORY_SAFETY_BUFFER = 3;

let cachedToken = null;
let tokenExpiry = 0;
let cachedOnlineStorePubId = null;

async function getAccessToken(env) {
  // Use direct access token if available (simplest approach)
  if (env.SHOPIFY_ACCESS_TOKEN) return env.SHOPIFY_ACCESS_TOKEN;

  // Fallback to client credentials OAuth
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;

  const res = await fetch(`https://${env.SHOPIFY_STORE}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.SHOPIFY_CLIENT_ID,
      client_secret: env.SHOPIFY_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });

  if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = now + ((data.expires_in || 3600) - 300) * 1000;
  return cachedToken;
}

async function shopifyGraphQL(env, query, variables = {}) {
  const token = await getAccessToken(env);
  const res = await fetch(
    `https://${env.SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({ query, variables }),
    }
  );
  if (!res.ok) throw new Error(`GraphQL error: ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

async function shopifyREST(env, path, method = 'GET', body = null) {
  const token = await getAccessToken(env);
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(
    `https://${env.SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}${path}`,
    opts
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`REST error ${res.status}: ${text}`);
  }
  return res.json();
}

function isAuthorized(request, env) {
  const pw = request.headers.get('X-Portal-Password');
  if (pw && env.PORTAL_PASSWORD && pw === env.PORTAL_PASSWORD) return true;
  const auth = request.headers.get('Authorization');
  if (auth && env.API_KEY && auth === `Bearer ${env.API_KEY}`) return true;
  return false;
}

function isAdminAuthorized(request, env) {
  const pw = request.headers.get('X-Admin-Password');
  return pw && env.ADMIN_PASSWORD && pw === env.ADMIN_PASSWORD;
}

async function getAdminSettings(env) {
  const raw = await env.DRAFT_STORE.get('admin_settings');
  if (!raw) return { productTags: [], sales: [] };
  return JSON.parse(raw);
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Portal-Password, X-Admin-Password',
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

function error(message, status = 500) {
  return json({ error: message }, status);
}

async function getOnlineStorePublicationId(env) {
  if (cachedOnlineStorePubId) return cachedOnlineStorePubId;

  try {
    const gql = `
      query {
        publications(first: 20) {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    `;
    const data = await shopifyGraphQL(env, gql);
    const pub = data.publications?.edges?.find((e) =>
      e.node.name.toLowerCase() === 'online store'
    );
    if (pub) {
      cachedOnlineStorePubId = pub.node.id;
    }
  } catch (err) {
    console.log('Failed to look up Online Store publication:', err.message);
  }

  return cachedOnlineStorePubId;
}

// --- Route Handlers ---

async function handlePing() {
  return json({ ok: true });
}

async function handleDebugAuth(env) {
  try {
    const tokenUrl = `https://${env.SHOPIFY_STORE}/admin/oauth/access_token`;
    const body = {
      client_id: env.SHOPIFY_CLIENT_ID,
      client_secret: env.SHOPIFY_CLIENT_SECRET,
      grant_type: 'client_credentials',
    };
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return json({
      debug: true,
      tokenUrl,
      clientIdSet: !!env.SHOPIFY_CLIENT_ID,
      clientSecretSet: !!env.SHOPIFY_CLIENT_SECRET,
      storeSet: !!env.SHOPIFY_STORE,
      store: env.SHOPIFY_STORE,
      httpStatus: res.status,
      response: text,
    });
  } catch (err) {
    return json({ debug: true, error: err.message });
  }
}

async function handleSearchCompanies(env, url) {
  const query = url.searchParams.get('q') || '';
  if (!query) return json([]);

  const gql = `
    query SearchCompanies($query: String!) {
      companies(first: 20, query: $query) {
        edges {
          node {
            id
            name
            locations(first: 10) {
              edges {
                node {
                  id
                  name
                  shippingAddress {
                    address1
                    city
                    province
                    country
                  }
                  buyerExperienceConfiguration {
                    paymentTermsTemplate {
                      name
                    }
                  }
                  roleAssignments(first: 1) {
                    edges {
                      node {
                        companyContact {
                          id
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await shopifyGraphQL(env, gql, { query });
  const results = [];

  for (const companyEdge of data.companies.edges) {
    const company = companyEdge.node;

    for (const locEdge of company.locations.edges) {
      const loc = locEdge.node;
      const addr = loc.shippingAddress;
      const addressParts = [addr?.address1, addr?.city, addr?.province, addr?.country].filter(Boolean);
      const contactId = loc.roleAssignments?.edges?.[0]?.node?.companyContact?.id || '';

      results.push({
        id: loc.id,
        companyId: company.id,
        companyContactId: contactId,
        companyName: company.name,
        locationName: loc.name,
        address: addressParts.join(', '),
        contactName: '',
        contactEmail: '',
      });
    }
  }

  return json(results);
}

async function handleSearchProducts(env, url) {
  const query = url.searchParams.get('q') || '';
  if (!query) return json([]);

  // Load admin settings for tag filtering and discounts
  const adminSettings = await getAdminSettings(env);

  const baseQuery = query.includes(':') ? query : `title:*${query}* OR sku:${query}*`;
  let searchQuery = `(${baseQuery}) AND status:active`;

  // Add tag filter if admin has configured product tags
  if (adminSettings.productTags && adminSettings.productTags.length > 0) {
    const tagFilter = adminSettings.productTags.map((t) => `tag:'${t}'`).join(' OR ');
    searchQuery += ` AND (${tagFilter})`;
  }

  // Look up Online Store publication ID for filtering
  const publicationId = await getOnlineStorePublicationId(env);

  // Product query — include publishedOnPublication if we have the publication ID
  const gqlBasic = publicationId
    ? `
      query SearchProducts($query: String!, $publicationId: ID!) {
        products(first: 20, query: $query) {
          edges {
            node {
              id
              title
              tags
              publishedOnPublication(publicationId: $publicationId)
              images(first: 1) {
                edges {
                  node {
                    url
                  }
                }
              }
              variants(first: 50) {
                edges {
                  node {
                    id
                    title
                    sku
                    price
                    compareAtPrice
                    inventoryQuantity
                    image {
                      url
                    }
                  }
                }
              }
            }
          }
        }
      }
    `
    : `
      query SearchProducts($query: String!) {
        products(first: 20, query: $query) {
          edges {
            node {
              id
              title
              tags
              images(first: 1) {
                edges {
                  node {
                    url
                  }
                }
              }
              variants(first: 50) {
                edges {
                  node {
                    id
                    title
                    sku
                    price
                    compareAtPrice
                    inventoryQuantity
                    image {
                      url
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

  const variables = publicationId
    ? { query: searchQuery, publicationId }
    : { query: searchQuery };

  const data = await shopifyGraphQL(env, gqlBasic, variables);
  const variants = [];

  for (const prodEdge of data.products.edges) {
    const product = prodEdge.node;

    // Skip products not published on the Online Store
    if (publicationId && product.publishedOnPublication === false) continue;

    const productImage = product.images?.edges?.[0]?.node?.url || null;
    const productTags = product.tags || [];

    // Check if any active sale applies to this product
    let discountPercentage = 0;
    const activeSales = adminSettings.sales?.filter((s) => s.active) || [];
    for (const sale of activeSales) {
      if (productTags.some((t) => t.toLowerCase() === sale.tag.toLowerCase())) {
        discountPercentage = Math.max(discountPercentage, sale.percentage);
      }
    }

    for (const varEdge of product.variants.edges) {
      const v = varEdge.node;
      const rawQty = v.inventoryQuantity ?? 0;
      const bufferedQty = Math.max(0, rawQty - INVENTORY_SAFETY_BUFFER);

      variants.push({
        id: v.id,
        productId: product.id,
        title: v.title,
        productTitle: product.title,
        sku: v.sku || '',
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        imageUrl: v.image?.url || productImage,
        inventoryQuantity: bufferedQty,
        available: bufferedQty > 0,
        discountPercentage,
      });
    }
  }

  // Try to get Southport-specific inventory (requires read_inventory scope)
  try {
    const inventoryItemIds = variants.map((v) => v.id);
    if (inventoryItemIds.length > 0) {
      const invGql = `
        query GetInventoryAtLocation($locationId: ID!) {
          location(id: $locationId) {
            inventoryLevels(first: 100) {
              edges {
                node {
                  item {
                    variant {
                      id
                    }
                  }
                  quantities(names: ["available", "incoming"]) {
                    name
                    quantity
                  }
                }
              }
            }
          }
        }
      `;
      const invData = await shopifyGraphQL(env, invGql, { locationId: SOUTHPORT_LOCATION_ID });
      const levels = invData.location?.inventoryLevels?.edges || [];

      // Build maps of variantId -> available/incoming quantity at Southport
      const southportStock = {};
      const southportIncoming = {};
      for (const edge of levels) {
        const variantId = edge.node.item?.variant?.id;
        if (!variantId) continue;
        const available = edge.node.quantities?.find((q) => q.name === 'available');
        const incoming = edge.node.quantities?.find((q) => q.name === 'incoming');
        if (available) southportStock[variantId] = available.quantity;
        if (incoming) southportIncoming[variantId] = incoming.quantity;
      }

      // Update variants with Southport-specific stock and incoming data
      for (const variant of variants) {
        if (variant.id in southportStock) {
          const buffered = Math.max(0, southportStock[variant.id] - INVENTORY_SAFETY_BUFFER);
          variant.inventoryQuantity = buffered;
          variant.available = buffered > 0;
        }
        variant.incomingQuantity = southportIncoming[variant.id] || 0;
      }
    }
  } catch (err) {
    // read_inventory scope not available — stick with total inventory
    console.log('Southport inventory lookup skipped (likely missing read_inventory scope):', err.message);
  }

  return json(variants);
}

async function handleGetOrders(env, url) {
  const companyId = url.searchParams.get('companyId') || '';
  if (!companyId) return json([]);

  const gql = `
    query GetCompanyOrders($companyId: ID!) {
      company(id: $companyId) {
        orders(first: 20, reverse: true) {
          edges {
            node {
              id
              name
              createdAt
              totalPriceSet {
                shopMoney {
                  amount
                }
              }
              displayFinancialStatus
              displayFulfillmentStatus
              lineItems(first: 1) {
                edges {
                  node {
                    id
                  }
                }
                pageInfo {
                  hasNextPage
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await shopifyGraphQL(env, gql, { companyId });
  const orders = (data.company?.orders?.edges || []).map((e) => {
    const o = e.node;
    return {
      id: o.id,
      name: o.name,
      createdAt: o.createdAt,
      totalPrice: o.totalPriceSet?.shopMoney?.amount || '0.00',
      financialStatus: (o.displayFinancialStatus || 'unknown').toLowerCase(),
      fulfillmentStatus: (o.displayFulfillmentStatus || 'unfulfilled').toLowerCase(),
      lineItemCount: o.lineItems?.edges?.length || 0,
    };
  });

  return json(orders);
}

async function handleCreateDraftOrder(env, request) {
  const body = await request.json();
  const { companyLocationId, newCustomer, lineItems, notes, shippingMethod } = body;

  if (!lineItems?.length) {
    return error('Missing lineItems', 400);
  }
  if (!companyLocationId && !newCustomer) {
    return error('Must provide companyLocationId or newCustomer', 400);
  }

  const shippingLabels = {
    parcel_post: 'Australia Post - PARCEL POST + SIGNATURE',
    express_post: 'Australia Post - EXPRESS POST + SIGNATURE',
    star_track: 'Star Track',
    free_shipping: 'Free Standard Shipping Over $500',
  };

  const noteLines = [];

  // If new customer, format their details into the notes
  if (newCustomer) {
    noteLines.push('--- NEW CUSTOMER DETAILS ---');
    noteLines.push(`Stockist First Name: ${newCustomer.firstName || ''}`);
    noteLines.push(`Stockist Last Name: ${newCustomer.lastName || ''}`);
    noteLines.push(`Company Name: ${newCustomer.companyName || ''}`);
    noteLines.push(`Delivery Street Address: ${newCustomer.streetAddress || ''}`);
    if (newCustomer.shopNumber) {
      noteLines.push(`Delivery Shop Number: ${newCustomer.shopNumber}`);
    }
    noteLines.push(`Delivery Suburb: ${newCustomer.suburb || ''}`);
    noteLines.push(`Delivery State: ${newCustomer.state || ''}`);
    noteLines.push(`Delivery Postcode: ${newCustomer.postcode || ''}`);
    noteLines.push(`Stockist Phone Number: ${newCustomer.phone || ''}`);
    noteLines.push(`Stockist Email Address: ${newCustomer.email || ''}`);
    noteLines.push('--- END NEW CUSTOMER DETAILS ---');
    noteLines.push('');
  }

  if (notes) noteLines.push(notes);
  if (shippingMethod && shippingLabels[shippingMethod]) {
    noteLines.push(`Preferred shipping: ${shippingLabels[shippingMethod]}`);
  }

  const gql = `
    mutation CreateDraftOrder($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder {
          id
          name
          invoiceUrl
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const input = {
    lineItems: lineItems.map((li) => ({
      variantId: li.variantId,
      quantity: li.quantity,
    })),
    note: noteLines.join('\n'),
    tags: newCustomer ? ['Sales Agent App', 'New Customer'] : ['Sales Agent App'],
  };

  // If existing B2B company, attach the purchasing entity
  if (companyLocationId) {
    const lookupGql = `
      query LookupLocation($locationId: ID!) {
        companyLocation(id: $locationId) {
          company {
            id
            contacts(first: 1) {
              edges {
                node {
                  id
                }
              }
            }
            contactRoles(first: 1) {
              edges {
                node {
                  id
                }
              }
            }
          }
          roleAssignments(first: 1) {
            edges {
              node {
                companyContact {
                  id
                }
              }
            }
          }
        }
      }
    `;

    const lookupData = await shopifyGraphQL(env, lookupGql, { locationId: companyLocationId });
    const locationData = lookupData.companyLocation;
    if (!locationData?.company) {
      return error('Company not found for this location', 400);
    }

    const companyId = locationData.company.id;
    let companyContactId = locationData.roleAssignments?.edges?.[0]?.node?.companyContact?.id;

    // If no role assignment exists at this location, auto-assign one
    if (!companyContactId) {
      const contact = locationData.company.contacts?.edges?.[0]?.node;
      const role = locationData.company.contactRoles?.edges?.[0]?.node;
      if (!contact) {
        return error('No contact found for this company', 400);
      }
      if (!role) {
        return error('No contact role defined for this company', 400);
      }

      const assignGql = `
        mutation AssignRole($companyContactId: ID!, $companyContactRoleId: ID!, $companyLocationId: ID!) {
          companyContactAssignRole(
            companyContactId: $companyContactId
            companyContactRoleId: $companyContactRoleId
            companyLocationId: $companyLocationId
          ) {
            companyContactRoleAssignment {
              id
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const assignResult = await shopifyGraphQL(env, assignGql, {
        companyContactId: contact.id,
        companyContactRoleId: role.id,
        companyLocationId,
      });

      const assignErrors = assignResult.companyContactAssignRole?.userErrors;
      if (assignErrors?.length) {
        return error('Failed to assign role: ' + assignErrors.map((e) => e.message).join(', '), 400);
      }

      companyContactId = contact.id;
    }

    input.purchasingEntity = {
      purchasingCompany: {
        companyId,
        companyContactId,
        companyLocationId,
      },
    };
  }

  // If new customer, set shipping address on the draft order
  if (newCustomer) {
    const addressParts = [newCustomer.streetAddress];
    if (newCustomer.shopNumber) addressParts.unshift(newCustomer.shopNumber);

    input.shippingAddress = {
      firstName: newCustomer.firstName,
      lastName: newCustomer.lastName,
      company: newCustomer.companyName,
      address1: addressParts.join(', '),
      city: newCustomer.suburb,
      province: newCustomer.state,
      zip: newCustomer.postcode,
      country: 'AU',
      phone: newCustomer.phone,
    };
  }

  const data = await shopifyGraphQL(env, gql, { input });
  const result = data.draftOrderCreate;

  if (result.userErrors?.length) {
    return error(result.userErrors.map((e) => e.message).join(', '), 400);
  }

  return json({
    id: result.draftOrder.id,
    name: result.draftOrder.name,
    invoiceUrl: result.draftOrder.invoiceUrl,
  });
}

// --- Draft Storage (KV) ---

async function handleSaveDraft(env, request) {
  const body = await request.json();
  const id = body.id || `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const draft = {
    id,
    companyLocationId: body.companyLocationId || '',
    companyId: body.companyId || '',
    companyContactId: body.companyContactId || '',
    companyName: body.companyName || '',
    locationName: body.locationName || '',
    newCustomer: body.newCustomer || null,
    lineItems: body.lineItems,
    notes: body.notes || '',
    shippingMethod: body.shippingMethod || '',
    subtotal: body.lineItems.reduce((s, li) => s + li.price * li.quantity, 0),
    gst: body.lineItems.reduce((s, li) => s + li.gst * li.quantity, 0),
    total: body.lineItems.reduce((s, li) => s + (li.price + li.gst) * li.quantity, 0),
    createdAt: new Date().toISOString(),
    status: 'draft',
  };

  const index = JSON.parse((await env.DRAFT_STORE.get('draft_index')) || '[]');
  const existingIdx = index.indexOf(id);
  if (existingIdx === -1) index.unshift(id);

  await env.DRAFT_STORE.put(`draft:${id}`, JSON.stringify(draft));
  await env.DRAFT_STORE.put('draft_index', JSON.stringify(index));

  return json({ id });
}

async function handleGetDrafts(env) {
  const index = JSON.parse((await env.DRAFT_STORE.get('draft_index')) || '[]');
  const drafts = [];

  for (const id of index) {
    const raw = await env.DRAFT_STORE.get(`draft:${id}`);
    if (raw) drafts.push(JSON.parse(raw));
  }

  return json(drafts);
}

async function handleDeleteDraft(env, id) {
  const index = JSON.parse((await env.DRAFT_STORE.get('draft_index')) || '[]');
  const filtered = index.filter((i) => i !== id);

  await env.DRAFT_STORE.delete(`draft:${id}`);
  await env.DRAFT_STORE.put('draft_index', JSON.stringify(filtered));

  return json({ ok: true });
}

// --- Admin Handlers ---

async function handleAdminGetSettings(env) {
  const settings = await getAdminSettings(env);
  return json(settings);
}

async function handleAdminUpdateSettings(env, request) {
  const body = await request.json();
  const settings = {
    productTags: Array.isArray(body.productTags) ? body.productTags : [],
    sales: Array.isArray(body.sales) ? body.sales.map((s) => ({
      id: s.id || `sale_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      tag: s.tag || '',
      percentage: Number(s.percentage) || 0,
      active: s.active !== false,
    })) : [],
  };
  await env.DRAFT_STORE.put('admin_settings', JSON.stringify(settings));
  return json(settings);
}

async function handleAdminGetTags(env) {
  // Fetch all unique tags from Shopify products
  const gql = `
    query {
      products(first: 100, query: "status:active") {
        edges {
          node {
            tags
          }
        }
      }
    }
  `;
  const data = await shopifyGraphQL(env, gql);
  const tagSet = new Set();
  for (const edge of data.products.edges) {
    for (const tag of edge.node.tags) {
      tagSet.add(tag);
    }
  }
  const tags = Array.from(tagSet).sort();
  return json(tags);
}

// --- Router ---

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/health') return json({ status: 'ok' });
    if (path === '/api/debug-auth') return await handleDebugAuth(env);

    // Admin routes (separate auth)
    if (path.startsWith('/api/admin/')) {
      if (path === '/api/admin/verify' && request.method === 'POST') {
        return json({ ok: isAdminAuthorized(request, env) });
      }
      if (!isAdminAuthorized(request, env)) {
        return error('Unauthorized', 401);
      }
      try {
        if (path === '/api/admin/settings' && request.method === 'GET') return await handleAdminGetSettings(env);
        if (path === '/api/admin/settings' && request.method === 'PUT') return await handleAdminUpdateSettings(env, request);
        if (path === '/api/admin/tags' && request.method === 'GET') return await handleAdminGetTags(env);
        return error('Not found', 404);
      } catch (err) {
        console.error('Admin error:', err);
        return error(err.message || 'Internal server error', 500);
      }
    }

    // Agent routes
    if (!isAuthorized(request, env)) {
      return error('Unauthorized', 401);
    }

    try {
      if (path === '/api/ping') return handlePing();
      if (path === '/api/companies' && request.method === 'GET') return await handleSearchCompanies(env, url);
      if (path === '/api/products' && request.method === 'GET') return await handleSearchProducts(env, url);
      if (path === '/api/orders' && request.method === 'GET') return await handleGetOrders(env, url);
      if (path === '/api/draft-orders' && request.method === 'POST') return await handleCreateDraftOrder(env, request);
      if (path === '/api/drafts' && request.method === 'POST') return await handleSaveDraft(env, request);
      if (path === '/api/drafts' && request.method === 'GET') return await handleGetDrafts(env);
      if (path.startsWith('/api/drafts/') && request.method === 'DELETE') {
        const draftId = decodeURIComponent(path.split('/api/drafts/')[1]);
        return await handleDeleteDraft(env, draftId);
      }

      return error('Not found', 404);
    } catch (err) {
      console.error('Worker error:', err);
      return error(err.message || 'Internal server error', 500);
    }
  },
};
