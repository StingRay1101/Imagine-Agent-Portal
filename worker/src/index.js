const SHOPIFY_API_VERSION = '2024-10';

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken(env) {
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

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Portal-Password',
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

// --- Route Handlers ---

async function handlePing() {
  return json({ ok: true });
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
                }
              }
            }
            contactRoles(first: 5) {
              edges {
                node {
                  name
                }
              }
            }
            contacts(first: 5) {
              edges {
                node {
                  customer {
                    firstName
                    lastName
                    email
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
    const contact = company.contacts?.edges?.[0]?.node?.customer;

    for (const locEdge of company.locations.edges) {
      const loc = locEdge.node;
      const addr = loc.shippingAddress;
      const addressParts = [addr?.address1, addr?.city, addr?.province, addr?.country].filter(Boolean);

      results.push({
        id: loc.id,
        companyId: company.id,
        companyName: company.name,
        locationName: loc.name,
        address: addressParts.join(', '),
        contactName: contact ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim() : '',
        contactEmail: contact?.email || '',
      });
    }
  }

  return json(results);
}

async function handleSearchProducts(env, url) {
  const query = url.searchParams.get('q') || '';
  if (!query) return json([]);

  const searchQuery = query.includes(':') ? query : `title:*${query}* OR sku:${query}*`;

  const gql = `
    query SearchProducts($query: String!) {
      products(first: 20, query: $query) {
        edges {
          node {
            id
            title
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

  const data = await shopifyGraphQL(env, gql, { query: searchQuery });
  const variants = [];

  for (const prodEdge of data.products.edges) {
    const product = prodEdge.node;
    const productImage = product.images?.edges?.[0]?.node?.url || null;

    for (const varEdge of product.variants.edges) {
      const v = varEdge.node;
      const qty = v.inventoryQuantity ?? 0;
      variants.push({
        id: v.id,
        productId: product.id,
        title: v.title,
        productTitle: product.title,
        sku: v.sku || '',
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        imageUrl: v.image?.url || productImage,
        inventoryQuantity: qty,
        available: qty > 0,
      });
    }
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
  const { companyLocationId, lineItems, notes, shippingMethod } = body;

  if (!companyLocationId || !lineItems?.length) {
    return error('Missing companyLocationId or lineItems', 400);
  }

  const shippingLabels = {
    parcel_post: 'Australia Post - PARCEL POST + SIGNATURE',
    express_post: 'Australia Post - EXPRESS POST + SIGNATURE',
    star_track: 'Star Track',
  };

  const noteLines = [];
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
    purchasingEntity: {
      purchasingCompany: {
        companyLocationId,
      },
    },
    lineItems: lineItems.map((li) => ({
      variantId: li.variantId,
      quantity: li.quantity,
    })),
    note: noteLines.join('\n'),
  };

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
    companyLocationId: body.companyLocationId,
    companyName: body.companyName,
    locationName: body.locationName,
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

// --- Router ---

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/health') return json({ status: 'ok' });

    if (!isAuthorized(request, env)) {
      return error('Unauthorized', 401);
    }

    try {
      if (path === '/api/ping') return handlePing();
      if (path === '/api/companies' && request.method === 'GET') return handleSearchCompanies(env, url);
      if (path === '/api/products' && request.method === 'GET') return handleSearchProducts(env, url);
      if (path === '/api/orders' && request.method === 'GET') return handleGetOrders(env, url);
      if (path === '/api/draft-orders' && request.method === 'POST') return handleCreateDraftOrder(env, request);
      if (path === '/api/drafts' && request.method === 'POST') return handleSaveDraft(env, request);
      if (path === '/api/drafts' && request.method === 'GET') return handleGetDrafts(env);
      if (path.startsWith('/api/drafts/') && request.method === 'DELETE') {
        const draftId = decodeURIComponent(path.split('/api/drafts/')[1]);
        return handleDeleteDraft(env, draftId);
      }

      return error('Not found', 404);
    } catch (err) {
      console.error('Worker error:', err);
      return error(err.message || 'Internal server error', 500);
    }
  },
};
