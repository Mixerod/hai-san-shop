import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record;

    if (!record) {
      return new Response('No record', { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: order } = await supabase
      .from('orders')
      .select('*, profiles(full_name, phone)')
      .eq('id', record.id)
      .single();

    const { data: tokens } = await supabase
      .from('admin_push_tokens')
      .select('token');

    if (!tokens || tokens.length === 0) {
      return new Response('No tokens', { status: 200 });
    }

    const customerName = order?.profiles?.full_name ?? 'Khách vãng lai';
    const amount = record.total_amount?.toLocaleString('vi-VN') ?? '0';

    const messages = tokens.map(({ token }: { token: string }) => ({
      to: token,
      channelId: 'orders',
      title: '🛒 Đơn hàng mới!',
      body: `${customerName} vừa đặt đơn ${amount}đ`,
      data: { type: 'new_order', orderId: record.id },
      sound: 'default',
      priority: 'high',
    }));

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log('Push result:', JSON.stringify(result));

    return new Response(JSON.stringify({ success: true, sent: messages.length }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
