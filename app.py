import streamlit as st
import tensorflow as tf
from tensorflow.keras import layers
import numpy as np

# ── Page config ───────────────────────────────────────────────────────────────
st.set_page_config(page_title="MiniGPT · Shakespeare", page_icon="🎭", layout="centered")

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=JetBrains+Mono:wght@400;600&family=Crimson+Pro:ital,wght@0,400;1,400&display=swap');

:root {
    --bg: #0c0b09; --bg2: #141210; --bg3: #1e1c18;
    --gold: #c9a84c; --cream: #f0e6c8; --muted: #6a6050; --border: #2a2620;
}

html, body, [class*="css"] { background: var(--bg) !important; color: var(--cream) !important; }
.stApp { background: var(--bg) !important; }
#MainMenu, footer, header { visibility: hidden; }

.hero {
    text-align: center; padding: 3.5rem 1rem 2.5rem;
    border-bottom: 1px solid var(--border);
    background: radial-gradient(ellipse 80% 40% at 50% 0%, rgba(201,168,76,0.07) 0%, transparent 70%);
    margin-bottom: 2rem;
}
.eyebrow {
    font-family: 'JetBrains Mono', monospace; font-size: 0.68rem;
    letter-spacing: 0.3em; color: var(--gold); text-transform: uppercase; margin-bottom: 0.8rem;
}
.hero h1 {
    font-family: 'Playfair Display', Georgia, serif !important;
    font-size: clamp(2.2rem, 5vw, 3.4rem); font-weight: 700;
    color: var(--cream); margin: 0 0 0.6rem; line-height: 1.15;
}
.hero p {
    font-family: 'Crimson Pro', Georgia, serif; font-size: 1.15rem;
    color: var(--muted); margin: 0; font-style: italic;
}
.output-box {
    background: var(--bg3); border: 1px solid var(--border);
    border-left: 3px solid var(--gold);
    border-radius: 2px; padding: 1.6rem 1.8rem;
    font-family: 'Crimson Pro', Georgia, serif;
    font-size: 1.08rem; line-height: 1.85;
    color: var(--cream); white-space: pre-wrap; min-height: 180px;
}
label, .stTextArea label, .stSlider label {
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.72rem !important; letter-spacing: 0.12em !important;
    text-transform: uppercase !important; color: var(--gold) !important;
}
.stTextArea textarea {
    background: var(--bg3) !important; color: var(--cream) !important;
    border: 1px solid var(--border) !important; border-radius: 2px !important;
    font-family: 'Crimson Pro', Georgia, serif !important; font-size: 1rem !important;
}
.stTextArea textarea:focus { border-color: var(--gold) !important; box-shadow: none !important; }
.stSlider [data-baseweb="slider"] > div > div > div { background: var(--gold) !important; }
.stButton > button {
    background: var(--gold) !important; color: #0c0b09 !important;
    border: none !important; border-radius: 2px !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.78rem !important; letter-spacing: 0.15em !important;
    text-transform: uppercase !important; font-weight: 600 !important;
    padding: 0.65rem 2.2rem !important; width: 100%;
}
.stButton > button:hover { opacity: 0.85 !important; }
.section-label {
    font-family: 'JetBrains Mono', monospace; font-size: 0.68rem;
    letter-spacing: 0.2em; text-transform: uppercase; color: var(--muted); margin-bottom: 0.8rem;
}
hr { border-color: var(--border) !important; margin: 1.5rem 0 !important; }
</style>
""", unsafe_allow_html=True)

# ── Model definition ──────────────────────────────────────────────────────────
BLOCK_SIZE = 64
EMBED_DIM  = 128
NUM_HEADS  = 4
FF_DIM     = 512
NUM_LAYERS = 4

class CausalSelfAttention(layers.Layer):
    def __init__(self, embed_dim, block_size, num_heads, dropout=0.3):
        super().__init__()
        self.mha       = layers.MultiHeadAttention(num_heads=num_heads, key_dim=embed_dim//num_heads, dropout=dropout)
        self.layernorm = layers.LayerNormalization()
        self.dropout   = layers.Dropout(dropout)
    def call(self, x):
        return self.layernorm(x + self.dropout(self.mha(query=x, key=x, value=x, use_causal_mask=True)))

class FeedForwardLayer(layers.Layer):
    def __init__(self, ff_dim, embed_dim, dropout=0.3):
        super().__init__()
        self.network = tf.keras.Sequential([
            layers.Dense(ff_dim, activation="relu"), layers.Dropout(dropout),
            layers.Dense(embed_dim),                 layers.Dropout(dropout),
        ])
        self.layernorm = layers.LayerNormalization()
    def call(self, x):
        return self.layernorm(x + self.network(x))

class TransformerBlock(layers.Layer):
    def __init__(self, embed_dim, num_heads, ff_dim, block_size):
        super().__init__()
        self.attnt = CausalSelfAttention(embed_dim, block_size, num_heads)
        self.ffn   = FeedForwardLayer(ff_dim, embed_dim)
    def call(self, x):
        return self.ffn(self.attnt(x))

class MiniGPT(tf.keras.Model):
    def __init__(self, embed_dim, num_heads, ff_dim, block_size, vocab_size, num_layers):
        super().__init__()
        self.token_emb = layers.Embedding(vocab_size, embed_dim)
        self.pos_emb   = layers.Embedding(block_size, embed_dim)
        self.block     = [TransformerBlock(embed_dim, num_heads, ff_dim, block_size) for _ in range(num_layers)]
        self.layernorm = layers.LayerNormalization()
        self.head      = layers.Dense(vocab_size)
    def call(self, x):
        seq_len = tf.shape(x)[1]
        x = self.token_emb(x) + self.pos_emb(tf.range(seq_len))
        for block in self.block:
            x = block(x)
        return self.head(self.layernorm(x))

# ── Load model ────────────────────────────────────────────────────────────────
@st.cache_resource
def load_model():
    import os, pickle
    if not os.path.exists("vocab.pkl") or not os.path.exists("model_weights.weights.h5"):
        return None
    with open("vocab.pkl", "rb") as f:
        vectorizer = pickle.load(f)
    devectorizer = {v: k for k, v in vectorizer.items()}
    vocab_size   = len(vectorizer)
    encode = lambda x: [vectorizer[c] for c in x if c in vectorizer]
    decode = lambda y: "".join(devectorizer.get(i, "") for i in y)
    model = MiniGPT(vocab_size=vocab_size, embed_dim=EMBED_DIM, num_heads=NUM_HEADS,
                    ff_dim=FF_DIM, block_size=BLOCK_SIZE, num_layers=NUM_LAYERS)
    model(tf.zeros((1, BLOCK_SIZE), dtype=tf.int32))
    model.load_weights("model_weights.weights.h5")
    return model, encode, decode

def generate(model, encode, decode, prompt, length, temperature):
    ids = encode(prompt)
    if not ids:
        return prompt
    for _ in range(length):
        x       = tf.constant([ids[-BLOCK_SIZE:]])
        logits  = model(x, training=False)[0, -1] / max(temperature, 1e-5)
        ids.append(int(tf.random.categorical([logits], 1)[0, 0]))
    return decode(ids)

# ── Hero ──────────────────────────────────────────────────────────────────────
st.markdown("""
<div class="hero">
    <div class="eyebrow">Character-level Transformer · TensorFlow</div>
    <h1>MiniGPT</h1>
    <p>Trained on the complete works of Shakespeare</p>
</div>
""", unsafe_allow_html=True)

result       = load_model()
model_loaded = result is not None
if model_loaded:
    model, encode, decode = result

# ── Controls ──────────────────────────────────────────────────────────────────
col1, col2 = st.columns(2)
with col1:
    length = st.slider("Generation length (characters)", 100, 1000, 400, 50)
with col2:
    temperature = st.slider("Temperature", 0.1, 2.0, 0.8, 0.05,
                            help="Lower = more predictable · Higher = more creative")

prompt      = st.text_area("Prompt", value="ROMEO:\n", height=90)
generate_btn = st.button("✦ Generate", use_container_width=True)

st.markdown("<hr>", unsafe_allow_html=True)
st.markdown('<div class="section-label">Generated text</div>', unsafe_allow_html=True)

out = st.empty()

if not model_loaded:
    out.markdown("""
<div class="output-box" style="color:#6a6050;font-style:italic;">
No weights found. Place <code style="font-family:monospace;color:#c9a84c">model_weights.weights.h5</code>
and <code style="font-family:monospace;color:#c9a84c">vocab.pkl</code> next to <code style="font-family:monospace;color:#c9a84c">app.py</code>, then restart.
</div>""", unsafe_allow_html=True)
elif generate_btn:
    with st.spinner(""):
        text = generate(model, encode, decode, prompt.strip() or "ROMEO:\n", length, temperature)
    out.markdown(f'<div class="output-box">{text}</div>', unsafe_allow_html=True)
else:
    out.markdown('<div class="output-box" style="color:#4a4438;font-style:italic;">Press Generate to conjure some Shakespeare…</div>',
                 unsafe_allow_html=True)

st.markdown("""
<div style="text-align:center;padding:2.5rem 0 1rem;font-family:'JetBrains Mono',monospace;
            font-size:0.65rem;letter-spacing:0.2em;color:#3a3630;text-transform:uppercase;">
    MiniGPT · 4 Transformer Layers · 128-dim Embeddings · 4 Attention Heads
</div>
""", unsafe_allow_html=True)