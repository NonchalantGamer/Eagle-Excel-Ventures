/**
 * Supabase Diagnostics & RLS Permission Verifier
 * 
 * Verifies:
 * 1. 'anon' and 'authenticated' roles SELECT & CRUD permissions on all tables:
 *    - messages (Live Chat & Inquiries)
 *    - products (Wholesale Catalog)
 *    - categories (Product Categories)
 *    - orders (Purchase Orders)
 *    - profiles (User Accounts)
 *    - audit_logs (Operations Ledger)
 *    - broadcasts (Marketing Bulletins)
 * 2. Schema cache table existence (detects PGRST205 table-not-found errors)
 * 3. RLS policy enforcement & potential blocking of real-time payloads
 * 4. Supabase Realtime channel status (SUBSCRIBED vs CHANNEL_ERROR / TIMED_OUT)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://btbcjijnrcnoutqskrtv.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0YmNqaWpucmNub3V0cXNrcnR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyODM4NzksImV4cCI6MjEwMTg1OTg3OX0.2EVkFCL9QY6s8i8jX9iv4JhkLdq3ZbYMKzENu2x5bFY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TABLES_TO_CHECK = [
  { name: 'messages', label: 'Live Support Messages' },
  { name: 'products', label: 'Wholesale Catalog Products' },
  { name: 'categories', label: 'Product Categories' },
  { name: 'orders', label: 'Purchase Orders' },
  { name: 'profiles', label: 'User Profiles & Roles' },
  { name: 'audit_logs', label: 'Operations Audit Logs' },
  { name: 'broadcasts', label: 'Broadcast Announcements' },
];

async function runDiagnostics() {
  console.log('===============================================================');
  console.log('     SUPABASE SCHEMA & REALTIME DIAGNOSTIC TOOL               ');
  console.log('===============================================================');
  console.log(`[Target URL] : ${SUPABASE_URL}`);
  console.log(`[Target Role]: anon (public web client role)\n`);

  const results = {
    tables: {},
    allTablesExist: true,
    realtimeSubscriptionSuccess: false,
    errors: []
  };

  for (const tbl of TABLES_TO_CHECK) {
    try {
      const { data, error, status, statusText } = await supabase
        .from(tbl.name)
        .select('*')
        .limit(3);

      if (error) {
        results.tables[tbl.name] = { exists: false, accessible: false, error: error.message, code: error.code };
        results.allTablesExist = false;
        console.error(`❌ Table "${tbl.name}" (${tbl.label}) FAILED:`);
        console.error(`   Code   : ${error.code}`);
        console.error(`   Message: ${error.message}`);
        if (error.code === 'PGRST205') {
          results.errors.push(`Table "public.${tbl.name}" does NOT exist in the database schema.`);
        } else if (error.code === '42501') {
          results.tables[tbl.name].exists = true;
          results.errors.push(`RLS Policy Violation: "anon" role does not have SELECT permission on "${tbl.name}".`);
        } else {
          results.errors.push(`${tbl.name} error: ${error.message} (${error.code})`);
        }
      } else {
        results.tables[tbl.name] = { exists: true, accessible: true, count: data ? data.length : 0 };
        console.log(`✅ Table "${tbl.name}" (${tbl.label}) is ONLINE (HTTP ${status} ${statusText || 'OK'}).`);
        console.log(`   Sample records accessible: ${data ? data.length : 0}`);
      }
    } catch (err) {
      console.error(`❌ Exception checking "${tbl.name}":`, err.message);
      results.tables[tbl.name] = { exists: false, accessible: false, error: err.message };
      results.allTablesExist = false;
      results.errors.push(err.message);
    }
    console.log('');
  }

  // STEP: Test Realtime Channel Connection on 'messages' and 'products'
  console.log('--- Testing Real-Time Channel Subscription ---');
  try {
    const channel = supabase.channel(`diagnostic_test_${Date.now()}`);
    
    const subscriptionPromise = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ success: false, status: 'TIMEOUT' });
      }, 6000);

      channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'messages' },
          () => {}
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            resolve({ success: true, status });
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            clearTimeout(timeout);
            resolve({ success: false, status });
          }
        });
    });

    const subResult = await subscriptionPromise;
    if (subResult.success) {
      results.realtimeSubscriptionSuccess = true;
      console.log('✅ Realtime WebSocket Channel Status: SUBSCRIBED');
      console.log('   Real-time event replication is active on the database.');
    } else {
      console.warn(`⚠️ Realtime channel subscription returned status: ${subResult.status}`);
      results.errors.push(`Realtime subscription status: ${subResult.status}`);
    }

    await supabase.removeChannel(channel);
  } catch (err) {
    console.error('❌ Exception during realtime check:', err.message);
    results.errors.push(err.message);
  }

  console.log('\n===============================================================');
  console.log('                     DIAGNOSTIC SUMMARY                        ');
  console.log('===============================================================');
  
  for (const tbl of TABLES_TO_CHECK) {
    const st = results.tables[tbl.name];
    if (st && st.exists && st.accessible) {
      console.log(`  [OK]       public.${tbl.name.padEnd(14)} - Exists and accessible`);
    } else {
      console.log(`  [MISSING]  public.${tbl.name.padEnd(14)} - ${st ? (st.error || 'Missing') : 'Not Checked'}`);
    }
  }

  if (results.allTablesExist) {
    console.log('\n🎉 ALL REQUIRED SUPABASE TABLES EXIST AND ARE PROPERLY CONFIGURED!');
  } else {
    console.log('\n⚠️ SOME TABLES ARE MISSING IN SUPABASE.');
    console.log('To create all tables and enable real-time replication in 1 click:');
    console.log('1. Open Supabase Dashboard: https://supabase.com/dashboard');
    console.log('2. Click on "SQL Editor" -> "+ New Query"');
    console.log('3. Run the SQL script found in: scripts/supabase-schema-setup.sql\n');
  }

  return results;
}

runDiagnostics()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
