(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = 'finance-ai-transactions-v1';
  const cfgUrl = window.FINANCE_AI_SUPABASE_URL;
  const cfgKey = window.FINANCE_AI_SUPABASE_PUBLISHABLE_KEY;
  const status = (message) => { $('cloudStatus').textContent = message; };
  const readLocal = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { throw new Error('Não foi possível ler os dados locais. Nenhuma alteração foi feita.'); }
  };
  const writeLocal = (rows) => {
    // Write to the existing key; never clear or replace it with an empty array on failure.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  };
  const ensureSyncIds = (rows) => rows.map((row) => {
    if (row._syncId) return row;
    const id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('local-' + Date.now() + '-' + Math.random().toString(36).slice(2));
    return { ...row, _syncId: id };
  });
  const validConfig = cfgUrl && /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cfgUrl) && cfgKey && !cfgKey.includes('COLE_AQUI');
  if (!window.supabase || !validConfig) {
    status('Supabase ainda não configurado. O Finance AI continua usando somente os dados locais. Preencha supabase-config.js com a chave publishable (ou anon) do seu projeto.');
    ['signInBtn','signUpBtn','resetBtn'].forEach(id => $(id).disabled = true);
    return;
  }
  const client = window.supabase.createClient(cfgUrl, cfgKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  let currentUser = null;
  const showSession = (session) => {
    currentUser = session && session.user ? session.user : null;
    $('authFields').style.display = currentUser ? 'none' : 'block';
    $('signedInFields').style.display = currentUser ? 'block' : 'none';
    if (currentUser) {
      $('accountLabel').textContent = 'Sessão autenticada: ' + currentUser.email + '. Seus registros ainda são locais até você escolher sincronizar.';
      status('Conta autenticada. Nenhuma sincronização foi executada automaticamente.');
    } else {
      status('Sem sessão iniciada. Os dados locais continuam neste dispositivo.');
    }
  };
  const withBusy = async (buttonId, action) => {
    const b = $(buttonId); b.disabled = true;
    try { await action(); } catch (e) { status('Não foi possível concluir: ' + (e && e.message ? e.message : 'erro inesperado')); }
    finally { b.disabled = false; }
  };
  $('signUpBtn').onclick = () => withBusy('signUpBtn', async () => {
    const email = $('authEmail').value.trim(), password = $('authPassword').value;
    if (!email || password.length < 8) throw new Error('Informe um e-mail válido e uma senha com pelo menos 8 caracteres.');
    const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: window.location.href.split('#')[0] } });
    if (error) throw error;
    status(data.session ? 'Conta criada e sessão iniciada.' : 'Cadastro enviado. Confira seu e-mail para confirmar a conta e depois entre.');
    if (data.session) showSession(data.session);
  });
  $('signInBtn').onclick = () => withBusy('signInBtn', async () => {
    const email = $('authEmail').value.trim(), password = $('authPassword').value;
    if (!email || !password) throw new Error('Informe e-mail e senha.');
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    showSession(data.session);
  });
  $('resetBtn').onclick = () => withBusy('resetBtn', async () => {
    const email = $('authEmail').value.trim();
    if (!email) throw new Error('Informe seu e-mail no campo acima.');
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: window.location.href.split('#')[0] });
    if (error) throw error;
    status('Se o endereço estiver cadastrado, você receberá instruções para redefinir a senha.');
  });
  $('signOutBtn').onclick = () => withBusy('signOutBtn', async () => {
    const { error } = await client.auth.signOut(); if (error) throw error; showSession(null);
  });
  $('uploadLocalBtn').onclick = () => withBusy('uploadLocalBtn', async () => {
    if (!currentUser) throw new Error('Entre na conta antes de sincronizar.');
    const local = ensureSyncIds(readLocal());
    if (!local.length) { status('Não há transações locais para enviar. Nenhum dado foi alterado.'); return; }
    const rows = local.map(t => {
      const amount = Number(t.amount);
      if (!t.date || !t.desc || !t.cat || !['income','expense'].includes(t.type) || !Number.isFinite(amount) || amount <= 0) throw new Error('Há uma transação local com campos inválidos. O envio foi interrompido.');
      return { user_id: currentUser.id, client_id: t._syncId, transaction_date: t.date, description: String(t.desc).slice(0,120), category: String(t.cat || 'Outros'), transaction_type: t.type, amount };
    });
    // Store stable sync identifiers locally before uploading; original transaction fields remain intact.
    writeLocal(local);
    const { error } = await client.from('transactions').upsert(rows, { onConflict: 'user_id,client_id' });
    if (error) {
      status('O envio falhou; os dados locais e seus identificadores de sincronização foram mantidos. A página será recarregada para evitar sobrescrita por estado antigo.');
      window.location.reload();
      return;
    }
    status('Cópia enviada com sucesso: ' + rows.length + ' transações. Os dados locais foram mantidos. Recarregando para manter os identificadores de sincronização.');
    window.location.reload();
  });
  $('downloadCloudBtn').onclick = () => withBusy('downloadCloudBtn', async () => {
    if (!currentUser) throw new Error('Entre na conta antes de baixar dados.');
    const { data, error } = await client.from('transactions').select('client_id, transaction_date, description, category, transaction_type, amount').order('transaction_date', { ascending: false });
    if (error) throw error;
    const local = ensureSyncIds(readLocal());
    const merged = new Map(local.map(t => [t._syncId, t]));
    for (const row of (data || [])) {
      if (!row.client_id) continue;
      if (!merged.has(row.client_id)) merged.set(row.client_id, { id: row.client_id, _syncId: row.client_id, date: row.transaction_date, desc: row.description, cat: row.category, type: row.transaction_type, amount: Number(row.amount) });
    }
    const result = Array.from(merged.values());
    writeLocal(result);
    status('Mesclagem concluída: ' + result.length + ' transações locais/remotas combinadas. Os registros locais existentes foram preservados.');
    // Refresh dashboard to show the merged localStorage records.
    window.location.reload();
  });
  client.auth.getSession().then(({ data, error }) => {
    if (error) status('Não foi possível verificar a sessão. Seus dados locais permanecem intactos.');
    showSession(data && data.session ? data.session : null);
  });
  client.auth.onAuthStateChange((_event, session) => showSession(session));
})();
