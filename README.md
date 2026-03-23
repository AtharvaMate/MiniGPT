<div align="center">

# 🤖 MiniGPT

### A Character-Level GPT Transformer Built From Scratch

[![Python](https://img.shields.io/badge/Python-3.12-blue?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.x-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white)](https://tensorflow.org/)
[![Keras](https://img.shields.io/badge/Keras-Deep%20Learning-D00000?style=for-the-badge&logo=keras&logoColor=white)](https://keras.io/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

> *Trained on Shakespeare. Speaks like Shakespeare (mostly).*

</div>

---

## 📖 About

**MiniGPT** is a from-scratch implementation of a GPT-style autoregressive language model using TensorFlow and Keras. It uses **character-level tokenization** and is trained on the complete works of Shakespeare to learn and generate coherent, stylistically accurate text.

The model stacks multiple **Transformer blocks** — each with causal multi-head self-attention and a feed-forward network — and uses **mixed-precision training** (`float16`) to maximize GPU efficiency.

---

## 🏗️ Architecture

```
Input Characters
      │
      ▼
┌─────────────────────────┐
│   Token Embedding        │  vocab_size → embed_dim (128)
│   Positional Embedding   │  block_size → embed_dim (128)
└──────────┬──────────────┘
           │  (sum)
           ▼
┌─────────────────────────┐
│   Transformer Block × 4  │
│  ┌───────────────────┐  │
│  │ CausalSelfAttention│  │  4 heads, causal mask
│  │  + Residual + LN  │  │
│  └────────┬──────────┘  │
│           ▼             │
│  ┌───────────────────┐  │
│  │  FeedForward Net  │  │  128 → 512 → 128
│  │  + Residual + LN  │  │
│  └───────────────────┘  │
└──────────┬──────────────┘
           │  (×4 stacked)
           ▼
┌─────────────────────────┐
│    Layer Normalization   │
└──────────┬──────────────┘
           ▼
┌─────────────────────────┐
│    Dense (vocab_size)    │  → logits over all characters
└─────────────────────────┘
           │
           ▼
    Next Character
```

---

## ⚙️ Hyperparameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| `BLOCK_SIZE` | `64` | Context window (tokens per sequence) |
| `BATCH_SIZE` | `256` | Sequences per training step |
| `EMBED_DIM` | `128` | Token & positional embedding size |
| `NUM_HEADS` | `4` | Attention heads per transformer block |
| `FF_DIM` | `512` | Feed-forward hidden layer width |
| `NUM_LAYERS` | `4` | Number of stacked transformer blocks |
| `EPOCHS` | `15` | Training epochs |
| `LEARNING_RATE` | `1e-4` | Adam optimizer learning rate |
| `DROPOUT` | `0.3` | Dropout rate (attention + FFN) |
| `PRECISION` | `mixed_float16` | GPU memory optimization |
| `GPU_MEMORY` | `5120 MB` | Logical GPU memory cap |

---

## 📊 Training Progress

The model was trained on an 90/10 train/validation split of the Shakespeare corpus.

| Epoch | Accuracy | Loss |
|-------|----------|------|
| 1 | 47.88% | 1.7549 |
| 2 | 56.63% | 1.4133 |
| 3 | 58.87% | 1.3286 |
| 4 | 60.18% | 1.2801 |
| 5 | 61.12% | 1.2459 |
| 6 | 61.88% | 1.2191 |
| 7 | 62.52% | 1.1971 |
| 8 | 63.10% | 1.1776 |
| 9 | 63.61% | 1.1606 |
| 10 | 64.07% | 1.1453 |
| 11 | 64.51% | 1.1310 |
| 12 | 64.91% | 1.1181 |
| 13 | 65.31% | 1.1059 |
| 14 | 65.68% | 1.0940 |
| **15** | **66.04%** | **1.0828** |

> **Final accuracy: 66.04% · Final loss: 1.0828** — trained from random weights, character by character.

---

## 🎭 Sample Output

Generated with `temperature=0.8`, prompt: `"ROMEO:\n"`

```
ROMEO:
You have purposed,
Hark, widow Dido's son Lucentio, sparition
They are obey. They are not folks
They heavy easy means for your came at thy clouds!

ANTONIO:
Tunis as we'll be well enter--

SEBASTIAN:
What is indeast thou hear'st so; he will live
I would not infection of him: if now I loved you will so?

ANTONIO:
He doth I see of him.

ANTONIO:
It is not so?

FERDINAND:
I say, as you do him.

ANTONIO:
Is not language! Come and know
What is it the fearfully.

SEBASTIAN:
We are the five order-seeiz
```

---

## 🚀 Getting Started

### Prerequisites

```bash
pip install tensorflow keras numpy
```

### Run Training

```bash
# Place your text corpus as input.txt in the project root
jupyter notebook main.ipynb
```

### Generate Text

```python
def generate(prompt, length=500, temperature=0.8):
    ids = encode(prompt)
    for _ in range(length):
        x = tf.constant([ids[-BLOCK_SIZE:]])
        logits = model(x, training=False)[0, -1] / temperature
        ids.append(int(tf.random.categorical([logits], 1)[0, 0]))
    return "".join(decode(ids))

print(generate("HAMLET:\n"))
```

> 🌡️ **Temperature tip:** Lower values (e.g. `0.5`) → more conservative/repetitive output. Higher values (e.g. `1.2`) → more creative/chaotic output.

---

## 📁 Project Structure

```
minigpt/
├── main.ipynb              # Full training notebook
├── input.txt               # Training corpus (Shakespeare)
├── model_weights.weights.h5 # Saved model weights (post-training)
└── vocab.pkl               # Character-to-index vocabulary mapping
```

---

## 🔬 Implementation Details

**Causal Self-Attention** — uses `use_causal_mask=True` in Keras's `MultiHeadAttention` to prevent the model from attending to future tokens during training. This is what makes the model *autoregressive*.

**Positional Embedding** — learned positional embeddings (not sinusoidal) are added to token embeddings, allowing the model to understand token position within the context window.

**Mixed Precision** — the `mixed_float16` policy stores weights in `float32` but performs computation in `float16`, roughly halving GPU memory usage and improving throughput on supported hardware.

**Data Pipeline** — uses `tf.data` with sliding window, shuffling, batching, caching and `AUTOTUNE` prefetching for fast, low-overhead data loading.

---

## 🛠️ Customization

You can experiment with different scales of the model:

| Size | `EMBED_DIM` | `NUM_HEADS` | `NUM_LAYERS` | `FF_DIM` |
|------|-------------|-------------|--------------|----------|
| Tiny | 64 | 2 | 2 | 256 |
| **Default** | **128** | **4** | **4** | **512** |
| Medium | 256 | 8 | 6 | 1024 |
| Large | 512 | 8 | 8 | 2048 |

Swap out `input.txt` for any plain-text corpus (novels, code, lyrics) to train on a different domain.

---

## 📚 References

- [Attention Is All You Need](https://arxiv.org/abs/1706.03762) — Vaswani et al., 2017
- [Language Models are Few-Shot Learners (GPT-3)](https://arxiv.org/abs/2005.14165) — Brown et al., 2020
- [The Illustrated Transformer](https://jalammar.github.io/illustrated-transformer/) — Jay Alammar
- Inspired by [nanoGPT](https://github.com/karpathy/nanoGPT) by Andrej Karpathy

---
