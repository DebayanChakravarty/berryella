// berryella-product-slider.js
class BerryellaProductSlider extends HTMLElement {
    static get observedAttributes() { return ["data"]; }
  
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._items = [];
      this._index = 0;
  
      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <style>
          :host{ display:block; --ink:#f5f3ee; --muted:white; --radius:18px;
                 --left-color:#1d1b1b; --right-color:#151414;
                 --t-fast:160ms; --t-med:260ms; font-family: Montserrat, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
          .stage{
            width:100%; border-radius:var(--radius); overflow:hidden; position:relative;
            box-shadow:0 18px 50px rgba(0,0,0,.35); border:1px solid rgba(255,255,255,.08);
            isolation:isolate; background:#0d0c0c; color:var(--ink);
            touch-action: pan-y; /* keeps vertical page scroll intact */
          }
          .stage::before,.stage::after{ content:""; position:absolute; inset:0; z-index:-1 }
          .stage::before{
            background: linear-gradient(90deg, var(--left-color) 0%, color-mix(in oklab, var(--left-color) 80%, transparent) 100%);
            clip-path: polygon(0 0, 50% 0, 50% 100%, 0% 100%);
          }
          .stage::after{
            background: linear-gradient(270deg, var(--right-color) 0%, color-mix(in oklab, var(--right-color) 80%, transparent) 100%);
            clip-path: polygon(50% 0, 100% 0, 100% 100%, 50% 100%);
          }
          .divider{ position:absolute; left:50%; top:0; bottom:0; width:2px;
            background: linear-gradient(180deg, rgba(255,255,255,.18), rgba(255,255,255,.04)); filter: blur(.4px); pointer-events:none; z-index:1; }
  
          .slide{
            position:relative; display:grid; grid-template-columns: 1fr auto 1fr; align-items:center;
            min-height: 560px; padding: 20px 18px 72px; gap: 0;
            transition: transform var(--t-fast) ease; /* for swipe snapback */
            will-change: transform;
          }
  
          /* CENTER media */
          .media{ grid-column:2; position:relative; width:min(38vw, 440px); max-width:440px; aspect-ratio:1/1; display:grid; place-items:center; margin:auto; }
          .halo{ position:absolute; inset:0; border-radius:28px;
            background: radial-gradient(60% 50% at 50% 40%, rgba(255,255,255,.10), transparent 70%),
                        radial-gradient(80% 60% at 50% 70%, rgba(0,0,0,.35), transparent 70%);
            border:1px solid rgba(255,255,255,.10); box-shadow: inset 0 1px 0 rgba(255,255,255,.06);
          }
          .bug{ position:absolute; inset:0; margin:auto; width:86%; height:86%; object-fit:contain;
                filter: drop-shadow(0 18px 40px rgba(0,0,0,.55)); transform: translateY(6px); }
          .badge{ position:absolute; left:8px; top:8px; background: rgba(255,255,255,.15);
                  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
                  border:1px solid rgba(255,255,255,.18); color:#fff; font-size:12px; font-weight:700;
                  padding:6px 10px; border-radius:999px; }
  
          /* LEFT panel (table) */
          .panel-left{ grid-column:1; padding: 24px 18px 24px 24px; display:flex; justify-content:center }
          .classify{ width:100%; max-width: 420px; background: rgba(255,255,255,.05);
            border:1px solid rgba(255,255,255,.10); border-radius: 16px; padding: 16px; box-shadow: 0 8px 28px rgba(0,0,0,.25); }
          .classify h3{ margin:0 0 12px; font-size:13px; letter-spacing:.25px; text-transform:uppercase; color:var(--muted) }
          .tbl{ width:100%; border-collapse: separate; border-spacing:0; background: rgba(0,0,0,.18);
            border:1px solid rgba(255,255,255,.10); border-radius:12px; overflow:hidden; }
          .tbl thead th{ text-align:left; font-weight:700; font-size:13px; color:#fff; background: rgba(255,255,255,.10);
            padding:10px 12px; border-bottom:1px solid rgba(255,255,255,.12); }
          .tbl tbody td{ font-size:14px; color:var(--ink); padding:10px 12px; border-bottom:1px dashed rgba(255,255,255,.08); vertical-align:top; }
          .tbl tbody tr:nth-child(odd) td{ background: rgba(255,255,255,.03) }
          .tbl tbody tr:last-child td{ border-bottom:0 }
          .tbl .key{ color:var(--muted); width:40% }
  
          /* RIGHT panel (content + cart) */
          .panel-right{ grid-column:3; padding: 24px 24px 24px 18px; display:flex; justify-content:center }
          .content{ width:100%; max-width: 420px }
          .title{ margin:0 0 8px 0; font-family: "Playfair Display", serif; font-size: clamp(26px, 3.2vw, 44px); line-height:1.1; }
          .accent{ height:6px; width:100%; border-radius:999px; background: var(--right-color); opacity:.85; margin: 10px 0 16px }
          .meta{ margin:0; display:grid; gap:10px; font-size:14px; color:var(--muted) }
          .meta span b{ color:var(--ink); margin-right:6px; font-weight:700 }
  
          .cart-btn{ margin-top:18px; display:inline-block; padding:10px 20px; font-size:15px; font-weight:600; border-radius:999px;
            background: var(--right-color); border:1px solid rgba(255,255,255,.18); color:#fff; cursor:pointer;
            transition: background var(--t-fast) ease, transform var(--t-fast) ease; }
          .cart-btn:hover{ background: color-mix(in oklab, var(--right-color) 80%, white 20%); transform: translateY(-2px) }
          .cart-btn:active{ transform: translateY(0) }
  
          /* controls */
          .controls{ position:absolute; left:0; right:0; bottom:12px; display:flex; justify-content:center; align-items:center; gap:12px }
          .btn{ width:42px; height:42px; border-radius:12px; background: rgba(255,255,255,.08);
            border:1px solid rgba(255,255,255,.14); display:grid; place-items:center; cursor:pointer; color:#fff;
            transition: transform var(--t-fast) ease, background var(--t-fast) ease, border-color var(--t-fast) ease; }
          .btn:hover{ transform:translateY(-2px); background: rgba(255,255,255,.14); border-color: rgba(255,255,255,.22) }
          .btn svg{ width:18px; height:18px }
          .dots{ display:flex; gap:8px }
          .dot{ width:10px; height:10px; border-radius:50%; border:2px solid rgba(255,255,255,.55); opacity:.55; cursor:pointer;
                transition:transform var(--t-fast) ease, opacity var(--t-fast) ease, border-color var(--t-fast) ease, background var(--t-fast) ease; }
          .dot:hover{ transform:translateY(-1px); opacity:.9 }
          .dot.active{ background:#fff; border-color:#fff; opacity:1 }
  
          /* animations */
          .slide.enter .media      { animation: popIn var(--t-med) ease both }
          .slide.enter .panel-left { animation: fadeUp var(--t-med) ease both }
          .slide.enter .panel-right{ animation: fadeUp var(--t-med) ease var(--t-fast) both }
          .slide.leave .media      { animation: slideOut var(--t-med) ease both }
          .slide.leave .panel-left,
          .slide.leave .panel-right{ animation: fadeOut var(--t-fast) ease both }
  
          @keyframes popIn{ from{ transform: scale(.98); opacity:0 } to{ transform: scale(1); opacity:1 } }
          @keyframes fadeUp{ from{ transform: translateY(6px); opacity:0 } to{ transform: translateY(0); opacity:1 } }
          @keyframes slideOut{ from{ transform: translateX(0) } to{ transform: translateX(-10px); opacity:0 } }
          @keyframes fadeOut{ from{ opacity:1 } to{ opacity:0 } }
  
          /* mobile */
          @media (max-width: 880px){
            .slide{ grid-template-columns:1fr; grid-auto-rows:auto; padding:14px 12px 76px; min-height:auto }
            .panel-left{ grid-column:1; order:3; padding: 6px 6px 10px }
            .panel-right{ grid-column:1; order:2; padding: 6px 6px 4px }
            .media{ grid-column:1; order:1; width:min(86vw, 320px); max-width:320px; margin: 6px auto 8px }
            .halo{ border-radius:20px } .bug{ width:84%; height:84% }
            .title{ font-size: clamp(22px, 6vw, 30px) } .meta{ font-size:13px }
            .classify{ max-width:none; padding: 12px }
            .tbl thead th{ font-size:12px; padding:8px 10px } .tbl tbody td{ font-size:13px; padding:8px 10px }
            .cart-btn{ width:100%; padding:12px 0; font-size:14px }
            .btn{ width:38px; height:38px; border-radius:10px } .btn svg{ width:16px; height:16px } .dot{ width:9px; height:9px }
          }
          @media (max-width: 540px){
            .media{ width:min(88vw, 260px); max-width:260px } .bug{ width:82%; height:82% }
            .title{ font-size: clamp(20px, 6.2vw, 26px) } .meta{ font-size:12px }
            .btn{ width:36px; height:36px } .dot{ width:9px; height:9px }
          }
          @media (max-width: 380px){
            .media{ width:min(90vw, 210px); max-width:210px } .bug{ width:80%; height:80% }
            .dot{ width:8px; height:8px }
          }
        </style>
  
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700;900&family=Playfair+Display:wght@700&display=swap">
  
        <div class="stage">
          <span class="divider" aria-hidden="true"></span>
  
          <div class="slide" part="slide">
            <!-- LEFT -->
            <div class="panel-left">
              <div class="classify">
                <table class="tbl" aria-label="Classification table">
                  <thead><tr><th>Attribute</th><th>Value</th></tr></thead>
                  <tbody id="classBody"></tbody>
                </table>
              </div>
            </div>
  
            <!-- CENTER -->
            <div class="media">
              <span class="badge" id="badge">INSECT</span>
              <div class="halo" aria-hidden="true"></div>
              <img id="img" class="bug" alt="">
            </div>
  
            <!-- RIGHT -->
            <div class="panel-right">
              <div class="content">
                <h1 class="title" id="title"></h1>
                <div class="accent" id="accent"></div>
                <p class="meta" id="meta"></p>
                <button class="cart-btn" id="cartBtn" type="button">Add to Cart</button>
              </div>
            </div>
          </div>
  
          <!-- controls -->
          <div class="controls">
            <button class="btn" id="prevBtn" aria-label="Previous" style="display:none">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <div class="dots" id="dots"></div>
            <button class="btn" id="nextBtn" aria-label="Next"  style="display:none">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      `;
      this.shadowRoot.appendChild(wrap);
  
      // refs
      this.$ = (sel) => this.shadowRoot.querySelector(sel);
      this.stage   = this.$(".stage");
      this.slideEl = this.$(".slide");
      this.imgEl   = this.$("#img");
      this.titleEl = this.$("#title");
      this.metaEl  = this.$("#meta");
      this.badgeEl = this.$("#badge");
      this.accent  = this.$("#accent");
      this.classBody = this.$("#classBody");
      this.prevBtn = this.$("#prevBtn");
      this.nextBtn = this.$("#nextBtn");
      this.dotsWrap= this.$("#dots");
      this.cartBtn = this.$("#cartBtn");
  
      // events
      this.prevBtn.addEventListener("click", () => this.prev());
      this.nextBtn.addEventListener("click", () => this.next());
      this.cartBtn.addEventListener("click", () => this._emitAddToCart());
  
      // keyboard (when focused inside component)
      this.shadowRoot.addEventListener("keydown", (e)=>{
        if (e.key === "ArrowRight") this.next();
        if (e.key === "ArrowLeft")  this.prev();
      });
  
      // swipe/drag (FIXED: bind to .slide and ignore interactive targets)
      this._bindSwipe();
    }
  
    /* Public API */
    setItems(items) {
      if (!Array.isArray(items)) return;
      this._items = items;
      this._index = 0;
      this._buildDots();
      this._render(false);
    }
    next(){ this.go(this._index + 1); }
    prev(){ this.go(this._index - 1); }
    go(to, animate=true){
      if (!this._items.length) return;
      this._index = (to + this._items.length) % this._items.length;
      this._render(animate);
    }
  
    attributeChangedCallback(name, _old, val){
      if (name === "data" && val){
        try { this.setItems(JSON.parse(val)); }
        catch(e){ console.warn("Invalid JSON for data attribute", e); }
      }
    }
  
    /* Internal */
    _buildDots(){
      this.dotsWrap.innerHTML = "";
      this._items.forEach((_, i)=>{
        const d = document.createElement("div");
        d.className = "dot" + (i===0 ? " active" : "");
        d.dataset.to = i;
        d.addEventListener("click", ()=> this.go(i));
        this.dotsWrap.appendChild(d);
      });
    }
  
    _render(animate=true){
      const item = this._items[this._index];
      if (!item) return;
      const dots = Array.from(this.dotsWrap.children);
  
      if (animate){
        this.slideEl.classList.remove("enter");
        this.slideEl.classList.add("leave");
        setTimeout(()=>{
          this._swap(item);
          this.slideEl.classList.remove("leave");
          this.slideEl.classList.add("enter");
        }, 120);
      } else {
        this._swap(item);
      }
      dots.forEach((d,k)=> d.classList.toggle("active", k === this._index));
    }
  
    _swap(item){
      this.stage.style.setProperty("--left-color",  item.leftColor || "#1d1b1b");
      this.stage.style.setProperty("--right-color", item.rightColor || "#151414");
      this.accent.style.background = item.rightColor || "#151414";
  
      this.imgEl.src = item.image || "";
      this.imgEl.alt = item.title || "";
      this.titleEl.textContent = item.title || "";
      this.badgeEl.textContent = item.badge || "New Product";
  
      const metaBits = [];
      if (item.careType) metaBits.push(`<span><b>Care type:</b> ${item.careType}</span>`);
      if (item.price)      metaBits.push(`<span><b>Price:</b> ${item.price}</span>`);
      this.metaEl.innerHTML = metaBits.join("");
  
      this.classBody.innerHTML = "";
      const rows = item.classification || {};
      Object.entries(rows).forEach(([k,v])=>{
        const tr = document.createElement("tr");
        tr.innerHTML = `<td class="key">${k}</td><td>${v}</td>`;
        this.classBody.appendChild(tr);
      });
    }
  
    _emitAddToCart(){
      const item = this._items[this._index];
      this.dispatchEvent(new CustomEvent("add-to-cart", {
        detail: { item, index: this._index },
        bubbles: true, composed: true
      }));
    }
  
    /* ---------- Swipe/Drag Navigation (safe for buttons/dots) ---------- */
    _bindSwipe(){
      const el = this.slideEl; // only the slide (NOT the controls)
      let startX = 0, lastX = 0, dragging = false;
      const THRESHOLD = 60;      // px to trigger slide change
      const MAX_DRAG = 140;      // px cap for visual offset
  
      const isInteractive = (t) => !!t.closest?.(".btn, .dots, .dot, button, a");
  
      const onDown = (e) => {
        const target = e.target;
        if (isInteractive(target)) return;           // let buttons/dots work normally
        if (e.button !== undefined && e.button !== 0) return; // only left mouse
        dragging = true;
        startX = (e.touches ? e.touches[0].clientX : e.clientX);
        lastX  = startX;
        el.style.transition = "none";
      };
  
      const onMove = (e) => {
        if (!dragging) return;
        const x = (e.touches ? e.touches[0].clientX : e.clientX);
        const dx = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, x - startX));
        lastX = x;
        el.style.transform = `translateX(${dx}px)`;
        // prevent horizontal gesture from creating a click + allow vertical page scroll
        if (e.cancelable) e.preventDefault();
      };
  
      const onUp = () => {
        if (!dragging) return;
        dragging = false;
        const dx = lastX - startX;
  
        el.style.transition = "transform var(--t-fast) ease";
        el.style.transform = "translateX(0)";
  
        if (Math.abs(dx) >= THRESHOLD) {
          if (dx < 0) this.next(); else this.prev();
        }
      };
  
      // Pointer events preferred
      if (window.PointerEvent) {
        el.addEventListener("pointerdown", onDown, { passive: true });
        el.addEventListener("pointermove", onMove,   { passive: false });
        el.addEventListener("pointerup",   onUp,     { passive: true });
        el.addEventListener("pointercancel", onUp,   { passive: true });
        el.addEventListener("pointerleave",  onUp,   { passive: true });
      } else {
        // Fallback
        el.addEventListener("touchstart", onDown, { passive: true });
        el.addEventListener("touchmove",  onMove, { passive: false });
        el.addEventListener("touchend",   onUp,   { passive: true });
        el.addEventListener("mousedown",  onDown);
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup",   onUp);
      }
    }
  }
  
  customElements.define("berryella-product-slider", BerryellaProductSlider);
  