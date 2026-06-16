import "react-native-get-random-values";
import "react-native-url-polyfill/auto";

import React, { useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  FlatList,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { downloadAsset, loadModel, completion } from "@qvac/sdk";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
};

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Loading AI model..." },
  ]);

  const [chats, setChats] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>("default");
  const [showHistory, setShowHistory] = useState(false);

  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [modelId, setModelId] = useState<any>(null);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadChats();
    setupModel();
  }, []);

  useEffect(() => {
    saveCurrentChat();
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  async function loadChats() {
    const saved = await AsyncStorage.getItem("chat_history");
    if (saved) {
      const parsed = JSON.parse(saved);
      setChats(parsed);

      if (parsed.length > 0) {
        setCurrentChatId(parsed[0].id);
        setMessages(parsed[0].messages);
      }
    }
  }

  async function saveCurrentChat() {
    if (messages.length === 0) return;

    const title =
      messages.find((m) => m.role === "user")?.content.slice(0, 30) ||
      "New Chat";

    const updatedChat: ChatSession = {
      id: currentChatId,
      title,
      messages,
    };

    setChats((prev) => {
      const exists = prev.find((c) => c.id === currentChatId);

      let updated;

      if (exists) {
        updated = prev.map((c) =>
          c.id === currentChatId ? updatedChat : c
        );
      } else {
        updated = [updatedChat, ...prev];
      }

      AsyncStorage.setItem("chat_history", JSON.stringify(updated));
      return updated;
    });
  }

  async function setupModel() {
    try {
      const MODEL_URL =
        "https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf";

      setMessages([{ role: "assistant", content: "Downloading model..." }]);

      await downloadAsset({ assetSrc: MODEL_URL });

      setMessages([{ role: "assistant", content: "Loading model..." }]);

      const id = await loadModel({
        modelSrc: MODEL_URL,
        modelType: "llm",
        modelConfig: {
          device: "gpu",
          ctx_size: 1024,
        },
      });

      setModelId(id);
      setMessages([{ role: "assistant", content: "AI Ready! Ask me anything." }]);
      setLoading(false);
    } catch (error: any) {
      setMessages([
        {
          role: "assistant",
          content: "Error loading model: " + String(error?.message || error),
        },
      ]);
      setLoading(false);
    }
  }

  function newChat() {
    const id = Date.now().toString();
    setCurrentChatId(id);
    setMessages([{ role: "assistant", content: "New chat started." }]);
    setPrompt("");
    setShowHistory(false);
  }

  function openChat(chat: ChatSession) {
    setCurrentChatId(chat.id);
    setMessages(chat.messages);
    setShowHistory(false);
  }

  async function askAI() {
    if (!modelId || !prompt.trim() || thinking) return;

    const userText = prompt.trim();
    setPrompt("");

    const oldMessages = [...messages];

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userText },
      { role: "assistant", content: "" },
    ]);

    setThinking(true);

    try {
      const result = completion({
        modelId,
        history: [
          {
            role: "system",
            content: "Answer clearly and shortly in 3 to 5 lines only.",
          },
          ...oldMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          {
            role: "user",
            content: userText,
          },
        ],
        stream: true,
      });

      let finalText = "";

      for await (const token of result.tokenStream) {
        finalText += token;

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: finalText,
          };
          return updated;
        });
      }
    } catch (error: any) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Inference failed: " + String(error?.message || error),
        };
        return updated;
      });
    } finally {
      setThinking(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowHistory(!showHistory)}>
            <Text style={styles.headerButton}>☰</Text>
          </TouchableOpacity>

          <View>
            <Text style={styles.title}>Local AI</Text>
            <Text style={styles.status}>
              {loading ? "Loading..." : "Offline AI Ready"}
            </Text>
          </View>

          <TouchableOpacity onPress={newChat}>
            <Text style={styles.headerButton}>＋</Text>
          </TouchableOpacity>
        </View>

        {showHistory && (
          <View style={styles.historyBox}>
            <Text style={styles.historyTitle}>Chat History</Text>

            <FlatList
              data={chats}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.historyItem}
                  onPress={() => openChat(item)}
                >
                  <Text style={styles.historyText}>{item.title}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        <ScrollView
          ref={scrollRef}
          style={styles.chat}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg, index) => {
            const isUser = msg.role === "user";

            return (
              <View
                key={index}
                style={[
                  styles.messageRow,
                  isUser ? styles.userRow : styles.aiRow,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    isUser ? styles.userBubble : styles.aiBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      isUser ? styles.userText : styles.aiText,
                    ]}
                  >
                    {msg.content || "Thinking..."}
                  </Text>
                </View>
              </View>
            );
          })}

          {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            placeholder="Message Local AI..."
            placeholderTextColor="#8e8e93"
            style={styles.input}
            multiline
            editable={!loading && !thinking}
          />

          <TouchableOpacity
            onPress={askAI}
            disabled={loading || thinking || !prompt.trim()}
            style={[
              styles.sendButton,
              (loading || thinking || !prompt.trim()) && styles.sendDisabled,
            ]}
          >
            <Text style={styles.sendText}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0f0f10",
  },
  container: {
    flex: 1,
  },
  header: {
    height: 64,
    paddingHorizontal: 16,
    backgroundColor: "#171719",
    borderBottomWidth: 1,
    borderBottomColor: "#242426",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerButton: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "600",
  },
  title: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  status: {
    color: "#a0a0a5",
    fontSize: 12,
    textAlign: "center",
  },
  historyBox: {
    maxHeight: 220,
    backgroundColor: "#1d1d20",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    padding: 12,
  },
  historyTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  historyItem: {
    padding: 12,
    backgroundColor: "#2a2a2d",
    borderRadius: 10,
    marginBottom: 8,
  },
  historyText: {
    color: "#fff",
    fontSize: 15,
  },
  chat: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageRow: {
    marginVertical: 6,
    flexDirection: "row",
  },
  userRow: {
    justifyContent: "flex-end",
  },
  aiRow: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: "#2f80ed",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: "#262628",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: "#ffffff",
  },
  aiText: {
    color: "#f1f1f1",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === "android" ? 14 : 22,
    backgroundColor: "#171719",
    borderTopWidth: 1,
    borderTopColor: "#242426",
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 46,
    backgroundColor: "#262628",
    color: "#ffffff",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  sendDisabled: {
    backgroundColor: "#555",
  },
  sendText: {
    color: "#000",
    fontSize: 22,
    fontWeight: "700",
  },
});