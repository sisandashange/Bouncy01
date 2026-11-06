import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../supabase';
import { c } from '../theme';

const Avatar = ({ name }) => (
  <View style={st.av}><Text style={st.avT}>{(name || '?')[0].toUpperCase()}</Text></View>
);

export default function ChatList({ me, onOpen }) {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [found, setFound] = useState([]);
  const searching = q.trim().length >= 2;

  const load = useCallback(async () => {
    const { data: convs } = await supabase.from('conversations')
      .select('id, title, created_at, conversation_members(user_id, profiles(display_name))')
      .order('created_at', { ascending: false });
    if (!convs) return;
    const last = {};
    if (convs.length) {
      const { data: msgs } = await supabase.from('messages').select('conversation_id, body, created_at')
        .in('conversation_id', convs.map((x) => x.id)).order('created_at', { ascending: false }).limit(300);
      (msgs || []).forEach((m) => { if (!last[m.conversation_id]) last[m.conversation_id] = m; });
    }
    setItems(convs.map((cv) => {
      const other = cv.conversation_members.find((m) => m.user_id !== me.id);
      const lm = last[cv.id];
      return { id: cv.id, otherId: other?.user_id, title: cv.title || other?.profiles?.display_name || 'Chat',
        preview: lm?.body, at: lm?.created_at || cv.created_at };
    }).sort((a, b) => (a.at < b.at ? 1 : -1)));
  }, [me.id]);

  useEffect(() => {
    load();
    const ch = supabase.channel('list-' + me.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  useEffect(() => {
    if (!searching) { setFound([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('id, display_name')
        .ilike('display_name', `%${q.trim()}%`).neq('id', me.id).limit(8);
      setFound(data || []);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const open = (x) => { setQ(''); onOpen({ id: x.id, title: x.title }); };

  const start = async (p) => {
    const ex = items.find((i) => i.otherId === p.id);
    if (ex) return open(ex);
    const { data: cv, error } = await supabase.from('conversations').insert({ created_by: me.id }).select('id').single();
    if (error) return;
    await supabase.from('conversation_members').insert([
      { conversation_id: cv.id, user_id: me.id }, { conversation_id: cv.id, user_id: p.id }]);
    open({ id: cv.id, title: p.display_name });
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={st.head}>
        <Text style={st.title}>Bouncy</Text>
        <Pressable onPress={() => supabase.auth.signOut()}><Text style={st.out}>Log out</Text></Pressable>
      </View>
      <TextInput style={st.search} value={q} onChangeText={setQ} autoCapitalize="none"
        placeholder="Find people to message" placeholderTextColor={c.muted} />
      <FlatList
        data={searching ? found : items}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={<Text style={st.empty}>
          {searching ? 'No one found. Check the spelling of their name.' : 'No chats yet. Search for a name above to start one.'}
        </Text>}
        renderItem={({ item }) => searching ? (
          <Pressable style={st.row} onPress={() => start(item)}>
            <Avatar name={item.display_name} />
            <View style={{ flex: 1 }}>
              <Text style={st.name}>{item.display_name}</Text>
              <Text style={st.prev}>Start a chat</Text>
            </View>
          </Pressable>
        ) : (
          <Pressable style={st.row} onPress={() => open(item)}>
            <Avatar name={item.title} />
            <View style={{ flex: 1 }}>
              <Text style={st.name}>{item.title}</Text>
              <Text style={st.prev} numberOfLines={1}>{item.preview || 'Say hi'}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12 },
  title: { color: c.text, fontSize: 34, fontWeight: '900', letterSpacing: -1.5 },
  out: { color: c.muted, fontSize: 15 },
  search: { backgroundColor: c.card, borderRadius: 16, color: c.text, fontSize: 16, padding: 14, margin: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 12 },
  av: { width: 50, height: 50, borderRadius: 25, backgroundColor: c.violet, alignItems: 'center', justifyContent: 'center' },
  avT: { color: '#fff', fontSize: 20, fontWeight: '800' },
  name: { color: c.text, fontSize: 17, fontWeight: '700' },
  prev: { color: c.muted, fontSize: 14, marginTop: 2 },
  empty: { color: c.muted, textAlign: 'center', marginTop: 60, paddingHorizontal: 40, fontSize: 15, lineHeight: 22 },
});
