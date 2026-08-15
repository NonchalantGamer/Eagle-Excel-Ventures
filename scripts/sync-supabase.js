import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://btbcjijnrcnoutqskrtv.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0YmNqaWpucmNub3V0cXNrcnR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyODM4NzksImV4cCI6MjEwMTg1OTg3OX0.2EVkFCL9QY6s8i8jX9iv4JhkLdq3ZbYMKzENu2x5bFY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CATEGORIES = [
  { id: 'all', name: 'All Wholesale Categories', slug: 'all', description: 'Browse complete ready-to-dispatch inventory and bulk import lines', iconName: 'LayoutGrid', itemCount: 13 },
  { id: 'electronics', name: 'Commercial Electronics & Solar', slug: 'electronics', description: 'Enterprise audio, 4K teleconference hardware, pure sine solar inverters, and wholesale distribution tech.', iconName: 'Zap', itemCount: 3 },
  { id: 'building', name: 'Building & Construction Hardware', slug: 'building', description: 'Heavy-duty titanium brushless power tools, ANSI safety helmets, high-security commercial steel doors.', iconName: 'HardHat', itemCount: 3 },
  { id: 'machinery', name: 'Industrial & Packaging Machinery', slug: 'machinery', description: '12-Ton hydraulic workshop presses, automatic carton strapping & sealing machinery, master shrink packaging.', iconName: 'Cog', itemCount: 2 },
  { id: 'packaging', name: 'Commercial Packaging & Office', slug: 'packaging', description: 'Multi-wall 200# corrugated shipping master boxes, ergonomic executive task seating, dual-motor standing workstations.', iconName: 'Box', itemCount: 3 },
  { id: 'textiles', name: 'Fabrics & Commercial Textiles', slug: 'textiles', description: 'Premium Swiss voile brocade rolls (50yd master bolts) and genuine 100% cotton African wax Ankara bundles.', iconName: 'Scissors', itemCount: 2 }
];

async function syncAll() {
  console.log('--- Syncing Categories ---');
  await supabase.from('categories').delete().neq('id', 'none');
  const { data: catData, error: catErr } = await supabase.from('categories').insert(CATEGORIES).select();
  if (catErr) console.error('Category error:', catErr);
  else console.log(`Synced ${catData.length} categories.`);

  console.log('--- Syncing Products ---');
  const prods = JSON.parse(fs.readFileSync('server_data/products.json', 'utf8'));
  await supabase.from('products').delete().neq('id', 'none');
  const { data: prodData, error: prodErr } = await supabase.from('products').insert(prods).select();
  if (prodErr) console.error('Product error:', prodErr);
  else console.log(`Synced ${prodData.length} products to Supabase.`);

  console.log('--- Verify Products ---');
  const { data: finalProds } = await supabase.from('products').select('id, name, price');
  console.log('Active in Supabase:');
  finalProds.forEach(p => console.log(` - [${p.id}] ${p.name} ($${p.price})`));
}

syncAll().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
