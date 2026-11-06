import { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../supabase';
import { c } from '../theme';

function Bubble({ m, mine, pop }) {
  const sc = useRef(new Animated.Value(pop ? 0.8 : 1)).current;
  useEffect(() => {
    if (pop) Animated.spring(sc, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }).start();
  }, []);
  const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <Animated.View style={[st.bub, mine ? st.mine : st.theirs, { transform: [{ scale: sc }] }]}>
      <Text style={st.body}>{m.body}</Text>
      <Text style={[st.time, mine && { color: '#D9CFFF' }]}>{time}</Text>
    </Animated.View>
  );
}

export default function Chat({ me, chat, onBack }) {
  const [msgs, setMsgs] = useState([]); // newest first
  const [text, setText] = useState('');
  const fresh = useRef(new Set());
  const press = useRef(new Animated.Value(1)).current;

  const add = (m) => setMsgs((p) => (p.some((x) => x.id === m.id) ? p : [m, ...p]));

  useEffect(() => {
    let on = true;
    supabase.from('messages').select('*').eq('conversation_id', chat.id)
      .order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => on && setMsgs((p) => [...p, ...(data || []).filter((d) => !p.some((x) => x.id === d.id))]));
    const ch = supabase.channel('chat-' + chat.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${chat.id}` },
        ({ new: m }) => { fresh.current.add(m.id); add(m); })
      .subscribe();
    return () => { on = false; supabase.removeChannel(ch); };
  }, [chat.id]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    const { data, error } = await supabase.from('messages')
      .insert({ conversation_id: chat.id, sender_id: me.id, body }).select().single();
    if (error) { setText(body); return; }
    fresh.current.add(data.id);
    add(data);
  };

  const spring = (v) => Animated.spring(press, { toValue: v, friction: 3, tension: 200, useNativeDriver: true }).start();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={st.head}>
        <Pressable onPress={onBack} hitSlop={12}><Text style={st.back}>‹</Text></Pressable>
        <Text style={st.title}>{chat.title}</Text>
      </View>
      <FlatList
        inverted
        data={msgs}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 14, gap: 6 }}
        renderItem={({ item }) => <Bubble m={item} mine={item.sender_id === me.id} pop={fresh.current.has(item.id)} />}
        ListFooterComponent={null}
      />
      <View style={st.bar}>
        <TextInput style={st.input} value={text} onChangeText={setText} multiline
          placeholder="Message" placeholderTextColor={c.muted} />
        <Pressable onPress={send} onPressIn={() => spring(0.82)} onPressOut={() => spring(1)}>
          <Animated.View style={[st.send, { transform: [{ scale: press }] }]}>
            <Text style={st.sendT}>↑</Text>
          </Animated.View>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.line },
  back: { color: c.sun, fontSize: 38, lineHeight: 38 },
  title: { color: c.text, fontSize: 20, fontWeight: '800' },
  bub: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  mine: { alignSelf: 'flex-end', backgroundColor: c.violet, borderBottomRightRadius: 6 },
  theirs: { alignSelf: 'flex-start', backgroundColor: c.card, borderBottomLeftRadius: 6 },
  body: { color: c.text, fontSize: 16, lineHeight: 21 },
  time: { color: c.muted, fontSize: 11, marginTop: 3, alignSelf: 'flex-end' },
  bar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12 },
  input: { flex: 1, backgroundColor: c.card, borderRadius: 22, color: c.text, fontSize: 16, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, maxHeight: 120 },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.sun, alignItems: 'center', justifyContent: 'center' },
  sendT: { color: c.ink, fontSize: 24, fontWeight: '900' },
});
