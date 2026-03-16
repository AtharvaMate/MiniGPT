// ===== MiniGPT Interactive Teaching Website — JavaScript =====

// ============ SIDEBAR ============
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const hamburger = document.getElementById('hamburger');

function toggleSidebar() {
  sidebar.classList.toggle('open');
  overlay.classList.toggle('visible');
}

hamburger.addEventListener('click', toggleSidebar);
overlay.addEventListener('click', toggleSidebar);

// Close sidebar on nav click
sidebar.querySelectorAll('nav a').forEach(a => {
  a.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
  });
});

// ============ SCROLL ANIMATIONS ============
const sections = document.querySelectorAll('section');
const navLinks = document.querySelectorAll('.sidebar nav a');

const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      // Update active nav
      const id = e.target.id;
      navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + id));
    }
  });
}, { threshold: 0.15 });

sections.forEach(s => observer.observe(s));

// ============ COPY CODE BUTTONS ============
document.querySelectorAll('.copy-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const block = btn.closest('.code-block');
    const lines = block.querySelectorAll('.line-content');
    const text = Array.from(lines).map(l => l.textContent).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = '✓ Copied';
      setTimeout(() => btn.textContent = 'Copy', 1500);
    });
  });
});

// ============ LINE-BY-LINE EXPLANATIONS ============
document.querySelectorAll('.code-body .line[data-explain]').forEach(line => {
  line.style.cursor = 'pointer';
  line.addEventListener('click', () => {
    const panel = line.nextElementSibling;
    if (panel && panel.classList.contains('explain-panel')) {
      panel.classList.toggle('show');
    } else {
      // Find the panel after this line
      const id = line.dataset.explain;
      const p = document.getElementById('exp-' + id);
      if (p) p.classList.toggle('show');
    }
  });
});

// ============ TOKENIZER DEMO ============
const tokInput = document.getElementById('tok-input');
const tokOutput = document.getElementById('tok-output');

// Simple character-level tokenizer
const sampleChars = ['\n', ' ', '!', '#', '$', '&', "'", '(', ')', '*', ',', '-', '.', '/', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ':', ';', '?', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '[', ']', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
const ch2i = {};
sampleChars.forEach((c, i) => ch2i[c] = i);

function tokenize(s) {
  return Array.from(s).map(c => ch2i[c] !== undefined ? ch2i[c] : '?');
}

if (tokInput) {
  tokInput.addEventListener('input', () => {
    const val = tokInput.value;
    if (!val) { tokOutput.innerHTML = '<span style="color:var(--text3)">Type something above...</span>'; return; }
    const tokens = tokenize(val);
    const html = Array.from(val).map((c, i) => {
      const hue = (tokens[i] * 4.5) % 360;
      const display = c === ' ' ? '␣' : c === '\n' ? '↵' : c;
      return `<span style="display:inline-flex;flex-direction:column;align-items:center;margin:2px;">
        <span style="padding:4px 6px;background:hsla(${hue},70%,60%,0.15);border:1px solid hsla(${hue},70%,60%,0.3);border-radius:4px;color:hsla(${hue},70%,70%,1);font-size:1rem;">${display}</span>
        <span style="font-size:0.7rem;color:var(--text3);margin-top:2px;">${tokens[i]}</span>
      </span>`;
    }).join('');
    tokOutput.innerHTML = html;
  });
  // Trigger initial
  tokInput.dispatchEvent(new Event('input'));
}

// ============ SLIDING WINDOW DEMO ============
const windowSlider = document.getElementById('window-slider');
const windowContainer = document.getElementById('window-container');
const windowSeqLen = 5;
const windowText = 'Hello World!';

function renderWindow(offset) {
  if (!windowContainer) return;
  const chars = Array.from(windowText);
  let html = '<div class="window-chars">';
  chars.forEach((c, i) => {
    const isInput = i >= offset && i < offset + windowSeqLen;
    const isTarget = i >= offset + 1 && i < offset + windowSeqLen + 1;
    let cls = '';
    if (isInput && isTarget) cls = 'overlap';
    else if (isInput) cls = 'in-window';
    else if (isTarget) cls = 'in-target';
    const display = c === ' ' ? '␣' : c;
    html += `<div class="window-char ${cls}">${display}</div>`;
  });
  html += '</div>';
  html += `<div style="font-size:0.8rem;color:var(--text2);margin-top:0.3rem;">
    <span style="color:var(--blue);">Input[${offset}:${offset + windowSeqLen}]</span> = "${windowText.slice(offset, offset + windowSeqLen)}" &nbsp;→&nbsp;
    <span style="color:var(--green);">Target[${offset + 1}:${offset + windowSeqLen + 1}]</span> = "${windowText.slice(offset + 1, offset + windowSeqLen + 1)}"
  </div>`;
  windowContainer.innerHTML = html;
}

if (windowSlider) {
  windowSlider.max = windowText.length - windowSeqLen - 1;
  windowSlider.addEventListener('input', () => renderWindow(parseInt(windowSlider.value)));
  renderWindow(0);
}

// ============ CAUSAL MASK DEMO ============
function renderCausalMask() {
  const cont = document.getElementById('mask-grid');
  if (!cont) return;
  const word = 'Hello';
  const n = word.length;

  let html = '<div class="attn-grid-wrap">';
  // Top labels
  html += '<div class="attn-labels">';
  html += '<span></span>'; // corner
  for (let j = 0; j < n; j++) html += `<span>${word[j]}</span>`;
  html += '</div>';

  html += `<div style="display:flex;gap:3px;">`;
  // Side labels
  html += '<div style="display:flex;flex-direction:column;gap:3px;">';
  for (let i = 0; i < n; i++) html += `<span class="attn-labels" style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;"><span style="width:auto;">${word[i]}</span></span>`;
  html += '</div>';

  // Grid
  html += `<div class="attn-grid" style="grid-template-columns:repeat(${n}, 36px);">`;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const allowed = j <= i;
      const bg = allowed ? `hsla(${150 + (i - j) * 30},60%,50%,${0.2 + (1 - (i - j) / n) * 0.4})` : 'rgba(255,255,255,0.02)';
      const txt = allowed ? '✓' : '✕';
      const clr = allowed ? 'var(--green)' : 'var(--red)';
      html += `<div class="attn-cell" style="background:${bg};color:${clr}">${txt}</div>`;
    }
  }
  html += '</div></div>';
  html += '<div style="font-size:0.8rem;color:var(--text3);margin-top:0.5rem;">✓ = can attend &nbsp; ✕ = blocked (future token)</div>';
  html += '</div>';
  cont.innerHTML = html;
}
renderCausalMask();

// ============ TEMPERATURE DEMO ============
const tempSlider = document.getElementById('temp-slider');
const tempVal = document.getElementById('temp-val');
const probContainer = document.getElementById('prob-bars');

const baseLogits = { 'e': 5.2, 'a': 3.1, 'o': 2.8, 't': 2.0, 'n': 1.5, 'r': 1.0, 's': 0.5, 'x': -0.5 };

function softmax(logits, temp) {
  const scaled = logits.map(l => l / temp);
  const maxL = Math.max(...scaled);
  const exps = scaled.map(l => Math.exp(l - maxL));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sum);
}

function renderTemperature(temp) {
  if (!probContainer) return;
  const chars = Object.keys(baseLogits);
  const logits = Object.values(baseLogits);
  const probs = softmax(logits, temp);

  const colors = ['#7c5cfc', '#a78bfa', '#60a5fa', '#22d3ee', '#34d399', '#fb923c', '#f472b6', '#f87171'];

  let html = '';
  probs.forEach((p, i) => {
    const h = Math.max(2, p * 300);
    const pct = (p * 100).toFixed(1);
    html += `<div class="prob-bar-wrap">
      <div class="prob-bar-pct">${pct}%</div>
      <div class="prob-bar" style="height:${h}px;background:${colors[i]}"></div>
      <div class="prob-bar-label">${chars[i]}</div>
    </div>`;
  });
  probContainer.innerHTML = html;
}

if (tempSlider) {
  tempSlider.addEventListener('input', () => {
    const t = parseFloat(tempSlider.value);
    tempVal.textContent = t.toFixed(1);
    renderTemperature(t);
  });
  renderTemperature(1.0);
}

// ============ RESIDUAL CONNECTION DEMO ============
function initResidualDemo() {
  const btn = document.getElementById('residual-btn');
  const viz = document.getElementById('residual-viz');
  if (!btn || !viz) return;

  let step = 0;
  const steps = [
    { html: '<div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;"><div style="padding:0.6rem 1rem;background:rgba(96,165,250,0.15);border:1px solid rgba(96,165,250,0.3);border-radius:8px;color:var(--blue)">x = input</div><div style="color:var(--text3)">→ Starting value</div></div>', desc: 'We start with input <strong>x</strong>.' },
    { html: '<div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;"><div style="padding:0.6rem 1rem;background:rgba(96,165,250,0.15);border:1px solid rgba(96,165,250,0.3);border-radius:8px;color:var(--blue)">x</div><div style="color:var(--text3)">→</div><div style="padding:0.6rem 1rem;background:rgba(244,114,182,0.15);border:1px solid rgba(244,114,182,0.3);border-radius:8px;color:var(--pink)">Attention(x)</div></div>', desc: 'Pass x through attention to get the transformed output.' },
    { html: '<div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;"><div style="padding:0.6rem 1rem;background:rgba(96,165,250,0.15);border:1px solid rgba(96,165,250,0.3);border-radius:8px;color:var(--blue)">x</div><div style="color:var(--text3)">+</div><div style="padding:0.6rem 1rem;background:rgba(244,114,182,0.15);border:1px solid rgba(244,114,182,0.3);border-radius:8px;color:var(--pink)">Attention(x)</div><div style="color:var(--text3)">=</div><div style="padding:0.6rem 1rem;background:rgba(251,146,60,0.15);border:1px solid rgba(251,146,60,0.3);border-radius:8px;color:var(--orange)">x + Attention(x)</div></div>', desc: '<strong>Add the original x back!</strong> This is the residual. Even if attention learns nothing useful, the original info survives.' },
    { html: '<div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;"><div style="padding:0.6rem 1rem;background:rgba(251,146,60,0.15);border:1px solid rgba(251,146,60,0.3);border-radius:8px;color:var(--orange)">x + Attention(x)</div><div style="color:var(--text3)">→</div><div style="padding:0.6rem 1rem;background:rgba(52,211,153,0.15);border:1px solid rgba(52,211,153,0.3);border-radius:8px;color:var(--green)">LayerNorm(...)</div></div>', desc: '<strong>Normalize</strong> to keep values stable. Prevents numbers from growing too large or small.' }
  ];

  btn.addEventListener('click', () => {
    step = (step + 1) % steps.length;
    viz.innerHTML = `<div style="margin-bottom:0.75rem">${steps[step].html}</div><div style="color:var(--text2);font-size:0.9rem">${steps[step].desc}</div>`;
    btn.textContent = step === steps.length - 1 ? '↻ Restart' : 'Next →';
  });

  viz.innerHTML = `<div style="margin-bottom:0.75rem">${steps[0].html}</div><div style="color:var(--text2);font-size:0.9rem">${steps[0].desc}</div>`;
}
initResidualDemo();

// ============ EMBEDDING DEMO ============
function initEmbeddingDemo() {
  const cont = document.getElementById('embed-demo');
  if (!cont) return;

  const word = 'cat';
  // Fake 4-dim embeddings
  const tokEmbs = { c: [0.2, -0.5, 0.8, 0.1], a: [0.7, 0.3, -0.2, 0.9], t: [-0.1, 0.6, 0.4, -0.3] };
  const posEmbs = [[0.1, 0.0, 0.1, -0.1], [0.0, 0.2, -0.1, 0.1], [-0.1, 0.1, 0.0, 0.2]];

  let html = '<div style="overflow-x:auto;">';
  html += '<table style="border-collapse:separate;border-spacing:6px;font-family:JetBrains Mono,monospace;font-size:0.8rem;">';

  // Header
  html += '<tr><td></td>';
  for (let d = 0; d < 4; d++) html += `<td style="text-align:center;color:var(--text3);padding:4px 8px;">d${d}</td>`;
  html += '</tr>';

  // Token embeddings
  Array.from(word).forEach((c, i) => {
    html += `<tr><td style="color:var(--blue);padding-right:12px;">tok('${c}')</td>`;
    tokEmbs[c].forEach(v => {
      const bg = v > 0 ? `rgba(96,165,250,${Math.abs(v) * 0.4})` : `rgba(244,114,182,${Math.abs(v) * 0.4})`;
      html += `<td style="text-align:center;padding:6px 12px;background:${bg};border-radius:4px;">${v.toFixed(1)}</td>`;
    });
    html += '</tr>';
  });

  // Plus
  html += '<tr><td style="color:var(--text3);">+</td><td colspan="4"></td></tr>';

  // Position embeddings
  Array.from(word).forEach((c, i) => {
    html += `<tr><td style="color:var(--green);padding-right:12px;">pos(${i})</td>`;
    posEmbs[i].forEach(v => {
      const bg = v > 0 ? `rgba(52,211,153,${Math.abs(v) * 0.6})` : `rgba(251,146,60,${Math.abs(v) * 0.6})`;
      html += `<td style="text-align:center;padding:6px 12px;background:${bg};border-radius:4px;">${v.toFixed(1)}</td>`;
    });
    html += '</tr>';
  });

  // Equals
  html += '<tr><td style="color:var(--text3);">=</td><td colspan="4"></td></tr>';

  // Sum
  Array.from(word).forEach((c, i) => {
    html += `<tr><td style="color:var(--orange);padding-right:12px;">final</td>`;
    tokEmbs[c].forEach((v, d) => {
      const sum = v + posEmbs[i][d];
      const bg = `rgba(251,146,60,${Math.min(Math.abs(sum) * 0.35, 0.5)})`;
      html += `<td style="text-align:center;padding:6px 12px;background:${bg};border-radius:4px;font-weight:600;">${sum.toFixed(1)}</td>`;
    });
    html += '</tr>';
  });

  html += '</table></div>';
  cont.innerHTML = html;
}
initEmbeddingDemo();
